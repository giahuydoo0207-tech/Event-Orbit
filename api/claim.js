import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { verifySession } from '../lib/verifySession.js';
import { checkRateLimit } from '../lib/rateLimit.js';
import { mintBadge } from '../lib/relayer.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', 'https://event-orbit-app.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-session');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rate Limiting
  const rateOk = await checkRateLimit(req);
  if (!rateOk) {
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }

  // ─── GET: Fetch claim info (public, no session required) ──────────
  if (req.method === 'GET') {
    return handleGetClaimInfo(req, res);
  }

  // ─── POST: Execute the claim (session required) ───────────────────
  if (req.method === 'POST') {
    return handlePostClaim(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * GET /api/claim?token=<claim_token>
 * Returns claim info (event name, points, who the link is for) without requiring auth.
 * Used by ClaimBadge.jsx to display info before the student logs in.
 */
async function handleGetClaimInfo(req, res) {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string' || token.length < 32) {
      return res.status(400).json({ error: 'Missing or invalid claim token.' });
    }

    // Fetch pending claim + event info in a single join-like query
    const { data: claim, error: claimErr } = await supabase
      .from('pending_claims')
      .select('id, event_id, import_mssv, import_email, import_name, status, expires_at, claimed_at')
      .eq('claim_token', token)
      .maybeSingle();

    if (claimErr || !claim) {
      return res.status(404).json({ error: 'Claim link not found. It may have been removed or is invalid.' });
    }

    // Check if already claimed
    if (claim.status === 'claimed') {
      return res.status(409).json({
        error: 'This badge has already been claimed.',
        claimedAt: claim.claimed_at
      });
    }

    // Check expiration
    if (new Date(claim.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This claim link has expired. Please contact the event organizer.' });
    }

    // Fetch event details
    const { data: event } = await supabase
      .from('events')
      .select('id, name, points, datetime, location, chapter_id')
      .eq('id', claim.event_id)
      .maybeSingle();

    // Fetch chapter name if available
    let chapterName = null;
    if (event?.chapter_id) {
      const { data: chapter } = await supabase
        .from('chapters')
        .select('name')
        .eq('id', event.chapter_id)
        .maybeSingle();
      chapterName = chapter?.name || null;
    }

    return res.status(200).json({
      ok: true,
      claim: {
        importName: claim.import_name || 'Attendee',
        importMssv: claim.import_mssv || null,
        importEmail: claim.import_email || null,
        status: claim.status,
        expiresAt: claim.expires_at
      },
      event: {
        id: event?.id || claim.event_id,
        name: event?.name || 'Unknown Event',
        points: event?.points || 0,
        datetime: event?.datetime || null,
        location: event?.location || null,
        chapterName
      }
    });
  } catch (error) {
    console.error('[Claim GET] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

/**
 * POST /api/claim
 * Body: { claimToken: "..." }
 * Requires authenticated OCID session. Executes the badge claim:
 * 1. Verify token is valid + pending + not expired
 * 2. Verify user is logged in via OCID
 * 3. Create registration (source: claim_badge)
 * 4. Create achievement + mint SBT
 * 5. Update pending_claim to 'claimed'
 * 6. Create/update session for future auto-matching
 */
async function handlePostClaim(req, res) {
  try {
    const { claimToken } = req.body;
    if (!claimToken || typeof claimToken !== 'string' || claimToken.length < 32) {
      return res.status(400).json({ error: 'Missing or invalid claim token.' });
    }

    // 1. Verify the claim token
    const { data: claim, error: claimErr } = await supabase
      .from('pending_claims')
      .select('id, event_id, import_mssv, import_email, import_name, status, expires_at')
      .eq('claim_token', claimToken)
      .maybeSingle();

    if (claimErr || !claim) {
      return res.status(404).json({ error: 'Claim link not found. It may have been removed or is invalid.' });
    }

    if (claim.status === 'claimed') {
      return res.status(409).json({ error: 'This badge has already been claimed.' });
    }

    if (new Date(claim.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This claim link has expired. Please contact the event organizer.' });
    }

    // 2. Verify OCID session
    const session = await verifySession(req);
    if (!session) {
      return res.status(401).json({ error: 'You must be logged in with Open Campus ID to claim this badge.' });
    }

    const userId = session.user_id || session.ocid || session.mssv;
    const studentOcid = session.ocid || null;
    const studentMssv = session.mssv || claim.import_mssv || null;
    const studentName = session.full_name || claim.import_name || 'Student';
    const ethAddress = session.eth_address || null;

    if (!userId) {
      return res.status(401).json({ error: 'Invalid session: no user identity found.' });
    }

    // 3. Fetch event details
    const { data: event } = await supabase
      .from('events')
      .select('id, name, points')
      .eq('id', claim.event_id)
      .maybeSingle();

    if (!event) {
      return res.status(404).json({ error: 'The event associated with this claim no longer exists.' });
    }

    // 4. Check if badge already exists for this user + event
    const { data: existingAch } = await supabase
      .from('achievements')
      .select('id')
      .eq('event_id', event.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingAch) {
      // Mark the pending_claim as claimed even if badge already exists (idempotent)
      await supabase
        .from('pending_claims')
        .update({
          status: 'claimed',
          claimed_by_ocid: studentOcid,
          claimed_by_eth_address: ethAddress,
          claimed_at: new Date().toISOString()
        })
        .eq('id', claim.id);

      return res.status(409).json({ error: 'You already have a badge for this event.' });
    }

    // 5. Record registration (source: claim_badge)
    await supabase
      .from('registrations')
      .upsert({
        event_id: event.id,
        user_id: userId,
        student_name: studentName,
        ocid: studentOcid,
        mssv: studentMssv,
        eth_address: ethAddress,
        source: 'claim_badge',
        registered_at: new Date().toISOString()
      }, { onConflict: 'event_id,user_id' });

    // 6. Mint SBT on-chain / issue off-chain achievement
    let txHash = null;
    let mintStatus = 'skipped_no_wallet';
    let mocked = false;

    if (ethAddress) {
      try {
        const relayerResult = await mintBadge({
          recipientAddress: ethAddress,
          eventId: event.id,
          points: event.points
        });
        txHash = relayerResult.txHash;
        mocked = relayerResult.mocked;
        mintStatus = mocked ? 'success' : 'minting';
      } catch (mintErr) {
        console.error(`[Claim] Relayer minting failed for ${userId}:`, mintErr);
        txHash = null;
        mintStatus = 'failed';
      }
    }

    // 7. Record achievement
    const { error: achErr } = await supabase
      .from('achievements')
      .insert({
        event_id: event.id,
        user_id: userId,
        ocid: studentOcid,
        credential_id: `cred-claim-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        points: event.points,
        tx_hash: txHash,
        mint_status: mintStatus
      });

    if (achErr && achErr.code === '23505') {
      // Unique constraint — badge already issued (race condition safety)
      await supabase
        .from('pending_claims')
        .update({
          status: 'claimed',
          claimed_by_ocid: studentOcid,
          claimed_by_eth_address: ethAddress,
          claimed_at: new Date().toISOString()
        })
        .eq('id', claim.id);

      return res.status(409).json({ error: 'Badge already issued for this event.' });
    }

    // 8. Update pending_claim to 'claimed'
    await supabase
      .from('pending_claims')
      .update({
        status: 'claimed',
        claimed_by_ocid: studentOcid,
        claimed_by_eth_address: ethAddress,
        claimed_at: new Date().toISOString()
      })
      .eq('id', claim.id);

    // 9. Persist session for future auto-matching (reuse auth/login.js pattern)
    try {
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const sessionExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await supabase.from('sessions').insert({
        token: sessionToken,
        user_id: userId,
        role: 'student',
        chapter_id: null,
        ocid: studentOcid,
        mssv: studentMssv,
        full_name: studentName,
        eth_address: ethAddress,
        expires_at: sessionExpires
      });

      // Set session cookie so the student stays logged in
      res.setHeader(
        'Set-Cookie',
        `session=${sessionToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`
      );
    } catch (sessionErr) {
      // Non-blocking — claim succeeded even if session creation fails
      console.error('[Claim] Session persist failed (non-blocking):', sessionErr);
    }

    console.log(`[Claim] Badge claimed successfully: user=${userId}, event=${event.id}, txHash=${txHash}`);

    return res.status(200).json({
      ok: true,
      eventName: event.name,
      points: event.points,
      txHash,
      mocked,
      mintStatus,
      userId,
      ocid: studentOcid
    });
  } catch (error) {
    console.error('[Claim POST] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error during badge claim.' });
  }
}
