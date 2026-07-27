import { createClient } from '@supabase/supabase-js';
import { verifySession } from '../lib/verifySession.js';

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

  try {
    if (req.method === 'GET') {
      const { eventId, userId } = req.query;

      if (eventId) {
        // 1. Resolve event UUID (supports UUID, slug, or legacy mock ID)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        let realEventId = eventId;

        if (!uuidRegex.test(eventId)) {
          const legacySlugMap = {
            '101': 'hcmc-ai-meetup-2026',
            '102': 'solidity-smart-contract-workshop'
          };
          const slugKey = legacySlugMap[eventId] || eventId;

          const { data: matchedEv } = await supabase
            .from('events')
            .select('id, chapter_id')
            .or(`slug.eq.${slugKey},name.ilike.%${slugKey}%`)
            .limit(1)
            .maybeSingle();

          if (matchedEv) {
            realEventId = matchedEv.id;
          }
        }

        // If realEventId is still not a valid UUID format, return empty list safely
        if (!uuidRegex.test(realEventId)) {
          return res.status(200).json([]);
        }

        // 2. Fetch registrations for the target event
        const { data: regs, error: regsError } = await supabase
          .from('registrations')
          .select('*')
          .eq('event_id', realEventId);

        if (regsError) throw regsError;

        // 3. Fetch achievements for badge mint status and check-in timestamp
        const { data: achs, error: achsError } = await supabase
          .from('achievements')
          .select('*')
          .eq('event_id', realEventId);

        if (achsError) throw achsError;

        // 4. Combine in memory to form enriched attendee records
        const responseData = (regs || []).map(r => {
          const ach = (achs || []).find(a => a.user_id === r.user_id);
          return {
            id: r.id,
            eventId: r.event_id,
            userId: r.user_id,
            studentName: r.student_name || 'Anonymous Student',
            ocid: r.ocid || null,
            mssv: r.mssv || null,
            ethAddress: r.eth_address || null,
            registeredAt: r.registered_at,
            checkedIn: !!ach,
            checkedInAt: ach ? ach.checked_in_at : null,
            mintStatus: ach ? (ach.mint_status || 'success') : 'not_issued',
            txHash: ach ? ach.tx_hash : null,
            credentialId: ach ? ach.credential_id : null,
            source: r.source || 'qr_checkin'
          };
        });

        return res.status(200).json(responseData);
      }

      if (userId) {
        // Fetch registrations for a specific user
        const { data: regs, error: regsError } = await supabase
          .from('registrations')
          .select('*')
          .eq('user_id', userId);

        if (regsError) throw regsError;

        const { data: achs, error: achsError } = await supabase
          .from('achievements')
          .select('*')
          .eq('user_id', userId);

        if (achsError) throw achsError;

        const responseData = (regs || []).map(r => {
          const ach = (achs || []).find(a => a.event_id === r.event_id);
          return {
            id: r.id,
            eventId: r.event_id,
            userId: r.user_id,
            registeredAt: r.registered_at,
            checkedIn: !!ach,
            checkedInAt: ach ? ach.checked_in_at : null,
            mintStatus: ach ? (ach.mint_status || 'success') : 'not_issued',
            txHash: ach ? ach.tx_hash : null,
            source: r.source || 'qr_checkin'
          };
        });

        return res.status(200).json(responseData);
      }

      // Fetch all registrations (fallback/admin fetch)
      const { data: regs, error: regsError } = await supabase
        .from('registrations')
        .select('*');

      if (regsError) throw regsError;

      const { data: achs, error: achsError } = await supabase
        .from('achievements')
        .select('*');

      if (achsError) throw achsError;

      const responseData = (regs || []).map(r => {
        const ach = (achs || []).find(a => a.event_id === r.event_id && a.user_id === r.user_id);
        return {
          id: r.id,
          eventId: r.event_id,
          studentName: r.student_name || 'Anonymous Student',
          ocid: r.ocid,
          mssv: r.mssv,
          ethAddress: r.eth_address,
          registeredAt: r.registered_at,
          checkedIn: !!ach,
          checkedInAt: ach ? ach.checked_in_at : null,
          mintStatus: ach ? (ach.mint_status || 'success') : 'not_issued',
          txHash: ach ? ach.tx_hash : null,
          source: r.source || 'qr_checkin'
        };
      });

      return res.status(200).json(responseData);
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

      // Resolve event UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let realEventId = eventId;
      if (!uuidRegex.test(eventId)) {
        const legacySlugMap = {
          '101': 'hcmc-ai-meetup-2026',
          '102': 'solidity-smart-contract-workshop'
        };
        const slugKey = legacySlugMap[eventId] || eventId;

        const { data: matchedEv } = await supabase
          .from('events')
          .select('id')
          .or(`slug.eq.${slugKey},name.ilike.%${slugKey}%`)
          .limit(1)
          .maybeSingle();

        if (matchedEv) {
          realEventId = matchedEv.id;
        }
      }

      // 2. Capacity Check
      if (capacity !== undefined) {
        const { count, error: countError } = await supabase
          .from('registrations')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', realEventId);

        if (countError) throw countError;

        if (count >= capacity) {
          return res.status(400).json({ error: 'This event is full. Registration is closed.' });
        }
      }

      // 3. Insert Registration using Session verified metadata
      const { data, error } = await supabase
        .from('registrations')
        .insert({
          event_id: realEventId,
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
