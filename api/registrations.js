import { createClient } from '@supabase/supabase-js';
import { verifySession } from '../lib/verifySession.js';
import { AuthorizationError, assertEventOwnership } from '../lib/authorization.js';
import { getStudentIdentityValues } from '../lib/studentIdentity.js';

let defaultSupabase;

function getSupabase() {
  if (!defaultSupabase) {
    defaultSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return defaultSupabase;
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mapViewRow(v) {
  return {
    id: v.id,
    eventId: v.event_id,
    userId: v.user_id,
    studentName: v.student_name,
    ocid: v.ocid,
    mssv: v.mssv,
    ethAddress: v.eth_address,
    registeredAt: v.registered_at,
    checkedIn: v.checked_in,
    checkedInAt: v.checked_in_at,
    mintStatus: v.mint_status,
    txHash: v.tx_hash,
    credentialId: v.credential_id,
    source: v.source
  };
}

export async function loadStudentHistory(supabaseClient, identities) {
  const historyQueries = ['user_id', 'ocid', 'mssv'].map((column) =>
    supabaseClient.from('badge_recipients_view').select('*').in(column, identities)
  );
  const historyResults = await Promise.all(historyQueries);
  const failedQuery = historyResults.find(({ error }) => error);

  if (failedQuery) throw failedQuery.error;

  const uniqueRows = new Map();
  for (const { data } of historyResults) {
    for (const row of data || []) {
      const key = row.id || `${row.event_id}:${row.user_id || row.ocid || row.mssv}`;
      uniqueRows.set(key, row);
    }
  }
  return [...uniqueRows.values()];
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', 'https://event-orbit-app.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const supabase = getSupabase();
    if (req.method === 'GET') {
      const { eventId, mine } = req.query;
      const session = await verifySession(req);
      if (!session) {
        return res.status(401).json({ error: 'Authentication required.' });
      }

      // --- Case 1: filter by event ---
      if (eventId) {
        // Event ID must already be a real Postgres UUID — all legacy mock
        // events were migrated to real Supabase rows in Step 1 of the
        // long-term stability plan, so no slug/legacy resolution is needed
        // or should exist here anymore.
        if (!uuidRegex.test(eventId)) {
          return res.status(400).json({ error: 'Invalid event ID format.' });
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

        // Single source of truth — no fallback. If the view errors, the
        // request fails loudly instead of silently reconstructing the join
        // by hand.
        const { data: viewData, error: viewError } = await supabase
          .from('badge_recipients_view')
          .select('*')
          .eq('event_id', eventId);

        if (viewError) {
          console.error('badge_recipients_view query error:', viewError);
          return res.status(500).json({ error: 'Failed to load credential recipients.' });
        }

        return res.status(200).json((viewData || []).map(mapViewRow));
      }

      // --- Case 2: current student's own event history ---
      if (mine === '1') {
        const identities = getStudentIdentityValues(session);
        if (!identities.length) {
          return res.status(403).json({ error: 'Student identity required.' });
        }

        let rows;
        try {
          rows = await loadStudentHistory(supabase, identities);
        } catch (error) {
          console.error('badge_recipients_view student history query error:', error);
          return res.status(500).json({ error: 'Failed to load registrations.' });
        }
        return res.status(200).json(rows.map(mapViewRow));
      }

      // --- Case 3: no filter — full admin fetch ---
      return res.status(400).json({ error: 'An eventId or mine filter is required.' });
    }

    if (req.method === 'POST') {
      // 1. Session Verification
      const session = await verifySession(req);
      if (!session) {
        return res.status(401).json({ error: 'You must be logged in to register.' });
      }

      const { eventId } = req.body;
      if (!eventId) {
        return res.status(400).json({ error: 'Missing event ID.' });
      }

      // Event ID must already be a real Postgres UUID — no legacy slug
      // resolution needed anymore (see note above).
      if (!uuidRegex.test(eventId)) {
        return res.status(400).json({ error: 'Invalid event ID format.' });
      }

      const { data: registrationRows, error } = await supabase.rpc('register_for_event', {
        p_event_id: eventId,
        p_user_id: session.user_id,
        p_full_name: session.full_name || 'Student',
        p_ocid: session.ocid || null,
        p_mssv: session.mssv || null,
        p_eth_address: session.eth_address || null,
      });

      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({ error: 'You have already registered for this event.' });
        }
        if (error.code === '23503') {
          return res.status(404).json({ error: 'Target event not found.' });
        }
        if (error.code === 'P0002') {
          return res.status(404).json({ error: 'Target event not found.' });
        }
        if (error.code === 'P0001' && error.message === 'event_full') {
          return res.status(409).json({ error: 'This event is full. Registration is closed.' });
        }
        console.error('Registration Insertion Error:', error);
        return res.status(500).json({ error: 'Failed to complete registration.' });
      }

      const registration = registrationRows?.[0];
      if (!registration) {
        return res.status(500).json({ error: 'Registration completed without a result row.' });
      }
      return res.status(201).json({
        id: registration.registration_id,
        eventId,
        studentName: session.full_name || 'Student',
        ocid: session.ocid || null,
        mssv: session.mssv || null,
        ethAddress: session.eth_address || null,
        registeredAt: registration.registration_created_at,
        checkedIn: false,
        checkedInAt: null,
        mintStatus: 'not_issued',
        source: 'event_registration'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Registrations API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
