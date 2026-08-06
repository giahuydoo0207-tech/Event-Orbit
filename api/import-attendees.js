import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { verifySession } from '../lib/verifySession.js';
import { checkRateLimit } from '../lib/rateLimit.js';
import { mintBadge } from '../lib/relayer.js';
import { resolveChapterUuid } from '../lib/resolveChapter.js';

const CLAIM_BASE_URL = process.env.CLAIM_BASE_URL || 'https://event-orbit-app.vercel.app';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', 'https://event-orbit-app.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-session');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Rate Limiting
  const rateOk = await checkRateLimit(req);
  if (!rateOk) {
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }

  // 2. Session Verification & Organizer Check
  const session = await verifySession(req);
  if (!session) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  if (session.role !== 'organizer') {
    return res.status(403).json({ error: 'Forbidden. Only organizers can import attendees and issue badges.' });
  }

  try {
    const { eventId, attendees } = req.body;

    if (!eventId || !Array.isArray(attendees)) {
      return res.status(400).json({ error: 'Invalid payload. Event ID and attendees array are required.' });
    }

    // 3. Verify target event by exact Postgres UUID or exact slug
    let targetEvent = null;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (uuidRegex.test(eventId)) {
      const { data } = await supabase
        .from('events')
        .select('id, name, points, chapter_id')
        .eq('id', eventId)
        .maybeSingle();
      targetEvent = data;
    } else if (eventId) {
      const { data } = await supabase
        .from('events')
        .select('id, name, points, chapter_id')
        .eq('slug', eventId)
        .maybeSingle();
      targetEvent = data;
    }

    if (!targetEvent) {
      return res.status(404).json({ error: 'Target event not found. Please refresh and select the correct event.' });
    }

    const event = targetEvent;

    if (session.chapter_id) {
      const sessionChapterUuid = await resolveChapterUuid(supabase, session.chapter_id);
      if (sessionChapterUuid && sessionChapterUuid !== event.chapter_id) {
        return res.status(403).json({ error: 'Unauthorized. You can only manage events for your own chapter.' });
      }
    }

    const issuedList = [];
    const alreadyIssuedList = [];
    const unmatchedList = [];

    // Track intra-batch duplicates using a Set
    const seenInBatch = new Set();

    for (const attendee of attendees) {
      const rawMssv = (attendee.mssv || attendee.student_id || '').toString().trim();
      const rawEmail = (attendee.email || '').toString().trim().toLowerCase();
      const rawName = (attendee.name || attendee.ten || attendee.fullName || '').toString().trim();

      if (!rawMssv && !rawEmail) {
        unmatchedList.push({
          mssv: rawMssv || 'N/A',
          email: rawEmail || 'N/A',
          name: rawName || 'Unknown',
          reason: 'Row is missing both MSSV and Email'
        });
        continue;
      }

      // Check intra-batch duplicate
      const batchKey = rawMssv ? `mssv:${rawMssv}` : `email:${rawEmail}`;
      if (seenInBatch.has(batchKey)) {
        alreadyIssuedList.push({
          mssv: rawMssv || 'N/A',
          email: rawEmail || 'N/A',
          name: rawName || 'Unknown',
          reason: 'Duplicate row inside the imported file'
        });
        continue;
      }
      seenInBatch.add(batchKey);

      // 4. System Matching Logic (Try mssv first, then email)
      let matchedStudent = null;

      // Query sessions or registrations table for matching student
      if (rawMssv) {
        const { data: byMssv } = await supabase
          .from('sessions')
          .select('user_id, ocid, mssv, full_name, eth_address')
          .eq('mssv', rawMssv)
          .limit(1);

        if (byMssv && byMssv.length > 0) {
          matchedStudent = byMssv[0];
        } else {
          // Try checking registrations table for past matches
          const { data: regByMssv } = await supabase
            .from('registrations')
            .select('user_id, ocid, mssv, student_name, eth_address')
            .eq('mssv', rawMssv)
            .limit(1);
          if (regByMssv && regByMssv.length > 0) {
            matchedStudent = {
              user_id: regByMssv[0].user_id,
              ocid: regByMssv[0].ocid,
              mssv: regByMssv[0].mssv,
              full_name: regByMssv[0].student_name,
              eth_address: regByMssv[0].eth_address
            };
          }
        }
      }

      if (!matchedStudent && rawEmail) {
        const { data: byEmail } = await supabase
          .from('sessions')
          .select('user_id, ocid, mssv, full_name, eth_address')
          .ilike('ocid', rawEmail)
          .limit(1);

        if (byEmail && byEmail.length > 0) {
          matchedStudent = byEmail[0];
        }
      }

      // If still unmatched → create pending_claim for Claim Badge Flow
      if (!matchedStudent) {
        const matchFilter = rawMssv
          ? { event_id: event.id, import_mssv: rawMssv }
          : { event_id: event.id, import_email: rawEmail };

        const { data: existing, error: existingErr } = await supabase
          .from('pending_claims')
          .select('claim_token, status')
          .match(matchFilter)
          .maybeSingle();

        if (existingErr) {
          console.error('[Import] Failed to query pending_claim:', existingErr);
          throw new Error(`Failed to query pending claim: ${existingErr.message}`);
        }

        if (existing?.status === 'claimed') {
          alreadyIssuedList.push({
            mssv: rawMssv || 'N/A',
            email: rawEmail || 'N/A',
            name: rawName || 'Unknown',
            reason: 'Badge already claimed via Claim Badge link'
          });
          continue;
        }

        let finalClaimToken = existing?.claim_token;

        if (!finalClaimToken) {
          finalClaimToken = crypto.randomBytes(32).toString('hex');
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

          const { error: insertErr } = await supabase
            .from('pending_claims')
            .insert({
              event_id: event.id,
              import_mssv: rawMssv || null,
              import_email: rawEmail || null,
              import_name: rawName || null,
              claim_token: finalClaimToken,
              status: 'pending',
              expires_at: expiresAt.toISOString()
            });

          if (insertErr) {
            console.error('[Import] Failed to create pending_claim:', insertErr);
            throw new Error(`Failed to create pending claim: ${insertErr.message}`);
          }
        }

        const claimUrl = `${CLAIM_BASE_URL}/claim/${finalClaimToken}`;
        unmatchedList.push({
          mssv: rawMssv || 'N/A',
          email: rawEmail || 'N/A',
          name: rawName || 'Unknown',
          reason: 'No matching student account found in system',
          claimToken: finalClaimToken,
          claimUrl
        });
        continue;
      }

      const userId = matchedStudent.user_id || matchedStudent.ocid || matchedStudent.mssv || rawMssv;
      const studentName = matchedStudent.full_name || rawName || 'Student Attendee';
      const studentOcid = matchedStudent.ocid || null;
      const studentMssv = matchedStudent.mssv || rawMssv || null;
      const ethAddress = matchedStudent.eth_address || null;

      // 5. Database Duplicate Check (in achievements)
      const { data: existingAch } = await supabase
        .from('achievements')
        .select('id')
        .or(`event_id.eq.${event.id},event_id.eq.${eventId}`)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingAch) {
        alreadyIssuedList.push({
          mssv: studentMssv || 'N/A',
          email: rawEmail || 'N/A',
          name: studentName,
          reason: 'Badge already issued previously'
        });
        continue;
      }

      // 6. Record Registration (Source: import_excel) using exact Postgres Event UUID
      await supabase
        .from('registrations')
        .upsert({
          event_id: event.id,
          user_id: userId,
          student_name: studentName,
          ocid: studentOcid,
          mssv: studentMssv,
          eth_address: ethAddress,
          checked_in: true,
          source: 'import_excel',
          registered_at: new Date().toISOString()
        }, { onConflict: 'event_id,user_id' });

      // 7. Mint SBT On-Chain / Issue Off-Chain Achievement
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
          console.error(`Relayer minting failed for ${userId}:`, mintErr);
          txHash = null;
          mintStatus = 'failed';
        }
      }

      // Record Achievement Badge using exact Postgres Event UUID
      const { error: achErr } = await supabase
        .from('achievements')
        .insert({
          event_id: event.id,
          user_id: userId,
          ocid: studentOcid,
          credential_id: `cred-imp-${Date.now()}-${Math.floor(Math.random()*1000)}`,
          points: event.points,
          tx_hash: txHash,
          mint_status: mintStatus
        });

      if (achErr && achErr.code === '23505') {
        alreadyIssuedList.push({
          mssv: studentMssv || 'N/A',
          email: rawEmail || 'N/A',
          name: studentName,
          reason: 'Badge already issued previously'
        });
        continue;
      }

      issuedList.push({
        mssv: studentMssv || 'N/A',
        email: rawEmail || 'N/A',
        name: studentName,
        status: ethAddress ? (mocked ? 'success_mock' : 'minted_onchain') : 'issued_offchain',
        txHash
      });
    }

    // Build batch claim URL for organizer to share (links to event-scoped claim page)
    const batchClaimUrl = unmatchedList.some(u => u.claimToken)
      ? `${CLAIM_BASE_URL}/claim?event=${event.id}`
      : null;

    return res.status(200).json({
      ok: true,
      processedCount: attendees.length,
      issuedCount: issuedList.length,
      alreadyIssuedCount: alreadyIssuedList.length,
      unmatchedCount: unmatchedList.length,
      issuedList,
      alreadyIssuedList,
      unmatchedList,
      batchClaimUrl
    });
  } catch (error) {
    console.error('Import Attendees API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error during attendee import.' });
  }
}
