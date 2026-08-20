import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { verifySession } from '../lib/verifySession.js';
import { checkRateLimit } from '../lib/rateLimit.js';
import { classifyMintError, mintBadge } from '../lib/relayer.js';
import { AuthorizationError, assertEventOwnership } from '../lib/authorization.js';
import { serializeSessionCookie } from '../lib/sessionCookie.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const CLAIM_BASE_URL = process.env.CLAIM_BASE_URL || 'https://event-orbit-app.vercel.app';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', 'https://event-orbit-app.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
    if (req.query?.token) {
      return handleGetClaimInfo(req, res);
    }

    if (req.query?.eventId) {
      return handleGetPendingClaims(req, res);
    }

    if (req.query?.mine === '1') {
      return handleGetMyReadyClaims(req, res);
    }

    return res.status(400).json({ error: 'Missing token or eventId query parameter.' });
  }

  // ─── POST: Execute the claim (session required) ───────────────────
  if (req.method === 'POST') {
    return handlePostClaim(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGetMyReadyClaims(req, res) {
  const session = await verifySession(req);
  if (!session || session.role !== 'student') return res.status(401).json({ error: 'Student authentication required.' });

  const select = 'id, claim_token, import_name, expires_at, event:events!pending_claims_event_id_fkey(id, slug, name, datetime)';
  const expiresAfter = new Date().toISOString();
  const queries = [];
  if (session.mssv) queries.push(supabase.from('pending_claims').select(select).eq('status', 'pending').gte('expires_at', expiresAfter).eq('import_mssv', String(session.mssv).trim()));
  if (session.ocid) queries.push(supabase.from('pending_claims').select(select).eq('status', 'pending').gte('expires_at', expiresAfter).eq('import_email', String(session.ocid).trim().toLowerCase()));
  if (!queries.length) return res.status(200).json({ claims: [] });

  const results = await Promise.all(queries);
  const failed = results.find((result) => result.error);
  if (failed) throw failed.error;
  const uniqueClaims = new Map(results.flatMap((result) => result.data || []).map((claim) => [claim.id, claim]));
  const data = [...uniqueClaims.values()].sort((a, b) => new Date(b.expires_at) - new Date(a.expires_at));

  return res.status(200).json({
    claims: (data || []).map((claim) => ({
      id: claim.id,
      claimUrl: `/claim/${claim.claim_token}`,
      participantName: claim.import_name || session.full_name || 'Participant',
      expiresAt: claim.expires_at,
      event: Array.isArray(claim.event) ? claim.event[0] : claim.event,
    }))
  });
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
        error: 'This credential has already been claimed.',
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
      .select('id, name, points, datetime, location, chapter_id, status')
      .eq('id', claim.event_id)
      .eq('status', 'published')
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
 * GET /api/claim?eventId=<uuid>
 * Returns the event's pending claims for an authenticated organizer.
 */
async function handleGetPendingClaims(req, res) {
  const session = await verifySession(req);
  if (!session) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const { eventId } = req.query;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(eventId)) {
      return res.status(400).json({ error: 'Invalid eventId format. Must be a valid UUID.' });
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, chapter_id')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) throw eventError;
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    try {
      assertEventOwnership(session, event);
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ error: error.message });
      }
      throw error;
    }

    const { data: claims, error: queryErr } = await supabase
      .from('pending_claims')
      .select('id, event_id, import_mssv, import_email, import_name, claim_token, status, claimed_by_ocid, claimed_by_eth_address, claimed_at, created_at, expires_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (queryErr) {
      console.error('[PendingClaims] Query error:', queryErr);
      return res.status(500).json({ error: 'Failed to fetch pending claims.' });
    }

    const enrichedClaims = (claims || []).map(c => ({
      id: c.id,
      importMssv: c.import_mssv || null,
      importEmail: c.import_email || null,
      importName: c.import_name || 'Unknown',
      status: c.status,
      claimToken: c.claim_token,
      claimUrl: `${CLAIM_BASE_URL}/claim/${c.claim_token}`,
      claimedByOcid: c.claimed_by_ocid || null,
      claimedByEthAddress: c.claimed_by_eth_address || null,
      claimedAt: c.claimed_at || null,
      createdAt: c.created_at,
      expiresAt: c.expires_at
    }));

    const pendingCount = enrichedClaims.filter(c => c.status === 'pending').length;
    const claimedCount = enrichedClaims.filter(c => c.status === 'claimed').length;

    return res.status(200).json({
      ok: true,
      eventId,
      totalClaims: enrichedClaims.length,
      pendingCount,
      claimedCount,
      claims: enrichedClaims
    });
  } catch (error) {
    console.error('[PendingClaims] Error:', error);
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
      return res.status(409).json({ error: 'This credential has already been claimed.' });
    }

    if (new Date(claim.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This claim link has expired. Please contact the event organizer.' });
    }

    // 2. Verify OCID session
    const session = await verifySession(req);
    if (!session) {
      return res.status(401).json({ error: 'You must be logged in with Open Campus ID to claim this credential.' });
    }
    if (session.role !== 'student' || !session.ocid) {
      return res.status(403).json({ error: 'Credential claims require a student Open Campus ID.' });
    }

    const userId = session.user_id || session.ocid || session.mssv;
    const studentOcid = session.ocid || null;
    const studentMssv = session.mssv || claim.import_mssv || null;
    const studentName = session.full_name || claim.import_name || 'Student';
    const ethAddress = session.eth_address || null;

    const intendedIdentities = [claim.import_mssv, claim.import_email].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean);
    const sessionIdentities = [session.mssv, session.ocid].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean);
    if (intendedIdentities.length && !intendedIdentities.some((identity) => sessionIdentities.includes(identity))) {
      return res.status(403).json({ error: 'This credential claim is assigned to a different participant.' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Invalid session: no user identity found.' });
    }

    const { data: reservationRows, error: reservationError } = await supabase.rpc('reserve_badge_claim', {
      p_claim_token: claimToken,
      p_user_id: userId,
      p_full_name: studentName,
      p_ocid: studentOcid,
      p_mssv: studentMssv,
      p_eth_address: ethAddress,
    });

    if (reservationError) {
      if (reservationError.code === 'P0002') {
        return res.status(404).json({ error: 'The event associated with this claim no longer exists.' });
      }
      console.error('[Claim] Atomic reservation failed:', reservationError);
      return res.status(500).json({ error: 'Failed to reserve this credential claim.' });
    }

    const reservation = reservationRows?.[0];
    if (!reservation) {
      return res.status(409).json({ error: 'This credential has already been claimed or the link has expired.' });
    }
    if (reservation.already_owned) {
      return res.status(409).json({ error: 'You already have a credential for this event.' });
    }

    // 6. Mint SBT on-chain / issue off-chain achievement
    let txHash = null;
    let mintStatus = 'skipped_no_wallet';
    let mocked = false;

    if (ethAddress) {
      try {
        const relayerResult = await mintBadge({
          recipientAddress: ethAddress,
          eventId: reservation.event_id,
          points: reservation.event_points
        });
        txHash = relayerResult.txHash;
        mocked = relayerResult.mocked;
        mintStatus = 'success';
      } catch (mintErr) {
        const classification = classifyMintError(mintErr);
        console.error(JSON.stringify({ component: 'claim', event: 'mint_outcome', ...classification, errorName: mintErr?.name || 'Error' }));
        txHash = null;
        mintStatus = classification.mintStatus;
      }
    }

    // 7. Record achievement
    const { error: achErr } = await supabase
      .from('achievements')
      .update({
        tx_hash: txHash,
        mint_status: mintStatus
      })
      .eq('id', reservation.achievement_id);

    if (achErr) {
      // Unique constraint — badge already issued (race condition safety)
      console.error(JSON.stringify({ component: 'claim', event: 'mint_status_persist_failed', databaseCode: achErr.code || null, message: achErr.message || 'Database update failed' }));
      return res.status(500).json({ error: 'Credential was reserved, but issuance status could not be updated.' });
    }

    // 8. Update pending_claim to 'claimed'
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
        serializeSessionCookie(sessionToken, 604800)
      );
    } catch (sessionErr) {
      // Non-blocking — claim succeeded even if session creation fails
      console.error('[Claim] Session persist failed (non-blocking):', sessionErr);
    }

    console.log('[Claim] Badge claim completed.');

    return res.status(200).json({
      ok: true,
      eventName: reservation.event_name,
      points: reservation.event_points,
      txHash,
      mocked,
      mintStatus,
      userId,
      ocid: studentOcid
    });
  } catch (error) {
    console.error('[Claim POST] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error during credential claim.' });
  }
}
