import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { verifySession } from '../lib/verifySession.js';
import { checkRateLimit } from '../lib/rateLimit.js';
import { classifyMintError, mintBadge } from '../lib/relayer.js';
import { AuthorizationError, assertEventOwnership, assertOrganizer } from '../lib/authorization.js';
import { getImportEventAvailability } from '../lib/eventWorkflow.js';

const CLAIM_BASE_URL = process.env.CLAIM_BASE_URL || 'https://event-orbit-app.vercel.app';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const LUMA_API_ORIGIN = 'https://public-api.luma.com';
const MAX_IMPORT_ROWS = 500;

export function parseLumaEventIdentifier(input) {
  const value = String(input || '').trim();
  if (!value || value.length > 300) return null;

  if (/^[a-zA-Z0-9_-]{3,100}$/.test(value)) return value;

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !['luma.com', 'www.luma.com'].includes(url.hostname.toLowerCase())) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    const identifier = parts.at(-1);
    return identifier && /^[a-zA-Z0-9_-]{3,100}$/.test(identifier) ? identifier : null;
  } catch {
    return null;
  }
}

function findMssv(guest) {
  const direct = guest.mssv || guest.student_id || guest.studentId;
  if (typeof direct === 'string' || typeof direct === 'number') return String(direct).trim();

  const answers = guest.registration_answers || guest.registrationAnswers || guest.answers || [];
  if (!Array.isArray(answers)) return '';
  const answer = answers.find((item) => /\bmssv\b|student[\s_-]*id|m[aã]\s*sinh\s*vi[eê]n/i.test(String(item?.label || item?.question || '').trim()));
  const value = answer?.value ?? answer?.answer;
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

export function normalizeLumaGuest(entry) {
  const guest = entry?.guest || entry?.user || entry?.person || entry || {};
  return {
    name: String(guest.user_name || guest.name || guest.full_name || guest.fullName || '').trim().slice(0, 200),
    email: String(guest.user_email || guest.email || '').trim().toLowerCase().slice(0, 320),
    mssv: findMssv(guest).slice(0, 64)
  };
}

async function selectInBatches(table, columns, filterColumn, values, eventId) {
  if (!values.length) return [];
  const batches = [];
  for (let index = 0; index < values.length; index += 50) {
    let query = supabase.from(table).select(columns);
    if (eventId) query = query.eq('event_id', eventId);
    batches.push(query.in(filterColumn, values.slice(index, index + 50)));
  }
  const results = await Promise.all(batches);
  if (results.some((result) => result.error)) {
    throw new Error('Unable to classify attendee preview.');
  }
  return results.flatMap((result) => result.data || []);
}

export async function fetchLumaGuests(lumaEvent) {
  const apiKey = process.env.LUMA_API_KEY;
  if (!apiKey) {
    const error = new Error('Luma integration is not configured.');
    error.statusCode = 503;
    throw error;
  }

  let identifier = parseLumaEventIdentifier(lumaEvent);
  if (!identifier) {
    const error = new Error('Enter a valid Luma event URL or event ID.');
    error.statusCode = 400;
    throw error;
  }

  if (!identifier.startsWith('evt-')) {
    const lookupUrl = new URL('/v1/entity/lookup', LUMA_API_ORIGIN);
    lookupUrl.searchParams.set('slug', identifier);
    const lookupResponse = await fetch(lookupUrl, {
      headers: { accept: 'application/json', 'x-luma-api-key': apiKey },
      redirect: 'error',
      signal: AbortSignal.timeout(10000)
    });
    if (!lookupResponse.ok) {
      const error = new Error('Luma event not found or not accessible.');
      error.statusCode = lookupResponse.status === 404 ? 404 : 502;
      throw error;
    }
    const lookup = await lookupResponse.json();
    identifier = String(lookup.event?.api_id || lookup.event?.id || lookup.entity?.api_id || lookup.entity?.id || lookup.api_id || lookup.id || '');
    if (!identifier.startsWith('evt-')) {
      const error = new Error('The Luma URL does not resolve to an event.');
      error.statusCode = 400;
      throw error;
    }
  }

  const guests = [];
  let cursor = '';
  do {
    const url = new URL('/v1/events/guests/list', LUMA_API_ORIGIN);
    url.searchParams.set('event_id', identifier);
    url.searchParams.set('pagination_limit', '100');
    if (cursor) url.searchParams.set('pagination_cursor', cursor);

    const response = await fetch(url, {
      headers: { accept: 'application/json', 'x-luma-api-key': apiKey },
      redirect: 'error',
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      const error = new Error(response.status === 404 ? 'Luma event not found or not accessible.' : 'Unable to retrieve attendees from Luma.');
      error.statusCode = response.status === 404 ? 404 : 502;
      throw error;
    }

    const payload = await response.json();
    const page = payload.entries || payload.guests || payload.data || [];
    if (!Array.isArray(page)) {
      const error = new Error('Luma returned an unsupported attendee response.');
      error.statusCode = 502;
      throw error;
    }
    guests.push(...page.slice(0, MAX_IMPORT_ROWS - guests.length).map(normalizeLumaGuest));
    cursor = guests.length < MAX_IMPORT_ROWS ? String(payload.next_cursor || payload.nextCursor || '') : '';
  } while (cursor);

  return guests;
}

async function classifyPreviewAttendees(attendees, eventId) {
  const seen = new Set();
  const rows = attendees.map((attendee) => {
    const row = { name: attendee.name || '', email: attendee.email || '', mssv: attendee.mssv || '' };
    if ((!row.mssv && !row.email) || (!row.name && !row.email)) {
      return { ...row, status: 'invalid', reason: 'Missing required name/email or student identifier.' };
    }
    const key = row.mssv ? `mssv:${row.mssv}` : `email:${row.email}`;
    if (seen.has(key)) return { ...row, status: 'invalid', reason: 'Duplicate attendee in Luma response.' };
    seen.add(key);
    return row;
  });

  const candidates = rows.filter((row) => !row.status);
  const mssvs = [...new Set(candidates.map((row) => row.mssv).filter(Boolean))];
  const emails = [...new Set(candidates.map((row) => row.email).filter(Boolean))];
  const [sessionsByMssv, sessionsByOcid, registrationsByMssv, claimsByMssv, claimsByEmail] = await Promise.all([
    selectInBatches('sessions', 'user_id, ocid, mssv', 'mssv', mssvs),
    selectInBatches('sessions', 'user_id, ocid, mssv', 'ocid', emails),
    selectInBatches('registrations', 'user_id, ocid, mssv', 'mssv', mssvs),
    selectInBatches('pending_claims', 'import_mssv, status', 'import_mssv', mssvs, eventId),
    selectInBatches('pending_claims', 'import_email, status', 'import_email', emails, eventId)
  ]);

  const studentsByMssv = new Map();
  for (const student of [...registrationsByMssv, ...sessionsByMssv]) {
    if (student.mssv) studentsByMssv.set(student.mssv, student);
  }
  const studentsByEmail = new Map(sessionsByOcid.map((student) => [String(student.ocid || '').toLowerCase(), student]));
  const matchedByRow = new Map();
  for (const row of candidates) {
    matchedByRow.set(row, studentsByMssv.get(row.mssv) || studentsByEmail.get(row.email) || null);
  }

  const userIds = [...new Set([...matchedByRow.values()].filter(Boolean).map((student) => student.user_id || student.ocid || student.mssv))];
  const achievements = await selectInBatches('achievements', 'user_id', 'user_id', userIds, eventId);
  const issuedUserIds = new Set(achievements.map((achievement) => achievement.user_id));
  const claimsByIdentifier = new Map([
    ...claimsByMssv.map((claim) => [`mssv:${claim.import_mssv}`, claim.status]),
    ...claimsByEmail.map((claim) => [`email:${claim.import_email}`, claim.status])
  ]);

  return rows.map((row) => {
    if (row.status) return row;
    const matchedStudent = matchedByRow.get(row);
    if (matchedStudent) {
      const userId = matchedStudent.user_id || matchedStudent.ocid || matchedStudent.mssv;
      const alreadyIssued = issuedUserIds.has(userId);
      return { ...row, status: alreadyIssued ? 'already_issued' : 'matched_existing', reason: alreadyIssued ? 'Credential already issued previously.' : 'Matched an existing OCID/student account.' };
    }
    const claimStatus = claimsByIdentifier.get(row.mssv ? `mssv:${row.mssv}` : `email:${row.email}`);
    const alreadyIssued = claimStatus === 'claimed';
    return { ...row, status: alreadyIssued ? 'already_issued' : 'unmatched', reason: alreadyIssued ? 'Credential already claimed previously.' : 'A claim link will be created after Confirm Import.' };
  });
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', 'https://event-orbit-app.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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

  try {
    assertOrganizer(session);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return res.status(403).json({ error: error.message });
    }
    throw error;
  }

  try {
    const { eventId, attendees } = req.body || {};

    if (!eventId || !Array.isArray(attendees)) {
      return res.status(400).json({ error: 'Invalid payload. Event ID and attendees array are required.' });
    }
    if (attendees.length === 0 || attendees.length > MAX_IMPORT_ROWS) {
      return res.status(400).json({ error: 'Each import batch must contain between 1 and 500 attendees.' });
    }

    // 3. Verify target event by exact Postgres UUID or exact slug
    let targetEvent = null;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (uuidRegex.test(eventId)) {
      const { data } = await supabase
        .from('events')
        .select('id, name, points, chapter_id, status, deleted_at')
        .eq('id', eventId)
        .maybeSingle();
      targetEvent = data;
    } else if (eventId) {
      const { data } = await supabase
        .from('events')
        .select('id, name, points, chapter_id, status, deleted_at')
        .eq('slug', eventId)
        .maybeSingle();
      targetEvent = data;
    }

    if (!targetEvent) {
      return res.status(404).json({ error: 'Target event not found. Please refresh and select the correct event.' });
    }

    const event = targetEvent;

    try {
      assertEventOwnership(session, event);
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ error: error.message });
      }
      throw error;
    }

    const availability = getImportEventAvailability(event);
    if (!availability.allowed) {
      return res.status(availability.status).json({
        error: availability.message,
        code: availability.code,
      });
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

      if (rawMssv.length > 64 || rawEmail.length > 320 || rawName.length > 200) {
        unmatchedList.push({ mssv: rawMssv, email: rawEmail, name: rawName, reason: 'Invalid field length' });
        continue;
      }

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
            reason: 'Credential already claimed via claim link'
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
          reason: 'Credential already issued previously'
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
          mintStatus = 'success';
        } catch (mintErr) {
          const classification = classifyMintError(mintErr);
          console.error(JSON.stringify({ component: 'attendee-import', event: 'mint_outcome', ...classification, errorName: mintErr?.name || 'Error' }));
          txHash = null;
          mintStatus = classification.mintStatus;
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
          reason: 'Credential already issued previously'
        });
        continue;
      }

      if (achErr) {
        console.error(JSON.stringify({ component: 'attendee-import', event: 'mint_status_persist_failed', databaseCode: achErr.code || null, message: achErr.message || 'Database insert failed' }));
        throw new Error('Credential issuance status could not be recorded.');
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
    console.error('Import Attendees API failed:', error?.name || 'Error');
    return res.status(error.statusCode || 500).json({ error: error.message || 'Internal Server Error during attendee import.' });
  }
}
