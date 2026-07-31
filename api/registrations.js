import { createClient } from '@supabase/supabase-js';
import { verifySession } from '../lib/verifySession.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', 'https://event-orbit-app.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-session');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { eventId, userId } = req.query;

      // --- Case 1: filter by event ---
      if (eventId) {
        // Event ID must already be a real Postgres UUID — all legacy mock
        // events were migrated to real Supabase rows in Step 1 of the
        // long-term stability plan, so no slug/legacy resolution is needed
        // or should exist here anymore.
        if (!uuidRegex.test(eventId)) {
          return res.status(400).json({ error: 'Invalid event ID format.' });
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
          return res.status(500).json({ error: 'Failed to load badge recipients.' });
        }

        return res.status(200).json((viewData || []).map(mapViewRow));
      }

      // --- Case 2: filter by user ---
      if (userId) {
        const { data: viewData, error: viewError } = await supabase
          .from('badge_recipients_view')
          .select('*')
          .eq('user_id', userId);

        if (viewError) {
          console.error('badge_recipients_view query error:', viewError);
          return res.status(500).json({ error: 'Failed to load registrations.' });
        }

        return res.status(200).json((viewData || []).map(mapViewRow));
      }

      // --- Case 3: no filter — full admin fetch ---
      const { data: viewData, error: viewError } = await supabase
        .from('badge_recipients_view')
        .select('*');

      if (viewError) {
        console.error('badge_recipients_view query error:', viewError);
        return res.status(500).json({ error: 'Failed to load badge recipients.' });
      }

      return res.status(200).json((viewData || []).map(mapViewRow));
    }

    if (req.method === 'POST') {
      // 1. Session Verification
      const session = await verifySession(req);
      if (!session) {
        return res.status(401).json({ error: 'You must be logged in to register.' });
      }

      const { eventId, capacity } = req.body;
      if (!eventId) {
        return res.status(400).json({ error: 'Missing event ID.' });
      }

      // Event ID must already be a real Postgres UUID — no legacy slug
      // resolution needed anymore (see note above).
      if (!uuidRegex.test(eventId)) {
        return res.status(400).json({ error: 'Invalid event ID format.' });
      }

      // 2. Capacity Check
      if (capacity !== undefined) {
        const { count, error: countError } = await supabase
          .from('registrations')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId);

        if (countError) throw countError;

        if (count >= capacity) {
          return res.status(400).json({ error: 'This event is full. Registration is closed.' });
        }
      }

      // 3. Insert Registration using Session verified metadata
      const { data, error } = await supabase
        .from('registrations')
        .insert({
          event_id: eventId,
          user_id: session.user_id,
          student_name: session.full_name || 'Anonymous Student',
          ocid: session.ocid || null,
          mssv: session.mssv || null,
          eth_address: session.eth_address || null,
          source: 'qr_checkin'
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({ error: 'You have already registered for this event.' });
        }
        if (error.code === '23503') {
          return res.status(404).json({ error: 'Target event not found.' });
        }
        console.error('Registration Insertion Error:', error);
        return res.status(500).json({ error: 'Failed to complete registration.' });
      }

      return res.status(201).json({
        id: data.id,
        eventId: data.event_id,
        studentName: data.student_name,
        ocid: data.ocid,
        mssv: data.mssv,
        ethAddress: data.eth_address,
        registeredAt: data.registered_at,
        checkedIn: false,
        checkedInAt: null,
        mintStatus: 'not_issued',
        source: 'qr_checkin'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Registrations API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}