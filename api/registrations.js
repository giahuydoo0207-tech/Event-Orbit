import { createClient } from '@supabase/supabase-js';
import { verifySession } from '../lib/verifySession.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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
    if (req.method === 'GET') {
      const { eventId, userId } = req.query;

      if (eventId) {
        // Fetch registrations for a specific event
        const { data: regs, error: regsError } = await supabase
          .from('registrations')
          .select('*')
          .eq('event_id', eventId);

        if (regsError) throw regsError;

        // Fetch check-in data (achievements) for this event
        const { data: achs, error: achsError } = await supabase
          .from('achievements')
          .select('user_id, checked_in_at')
          .eq('event_id', eventId);

        if (achsError) throw achsError;

        // Combine registrations and check-in statuses in memory
        const responseData = (regs || []).map(r => {
          const ach = (achs || []).find(a => a.user_id === r.user_id);
          return {
            id: r.id,
            eventId: r.event_id,
            studentName: r.student_name || 'Anonymous Student',
            ocid: r.ocid,
            mssv: r.mssv,
            ethAddress: r.eth_address,
            registeredAt: r.registered_at,
            checkedIn: !!ach,
            checkedInAt: ach ? ach.checked_in_at : null
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
          .select('event_id, checked_in_at')
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
            checkedInAt: ach ? ach.checked_in_at : null
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
        .select('event_id, user_id, checked_in_at');

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
          checkedInAt: ach ? ach.checked_in_at : null
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
          eth_address: session.eth_address || null
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

      // Map back to expected client structure
      return res.status(201).json({
        id: data.id,
        eventId: data.event_id,
        studentName: data.student_name,
        ocid: data.ocid,
        mssv: data.mssv,
        ethAddress: data.eth_address,
        registeredAt: data.registered_at,
        checkedIn: false,
        checkedInAt: null
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Registrations API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
