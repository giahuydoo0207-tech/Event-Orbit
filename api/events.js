import { createClient } from '@supabase/supabase-js';
import { verifySession } from '../lib/verifySession.js';
import { mapEventDbToClient, mapEventClientToDb } from '../lib/mappers.js';

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
      // Fetch events along with the linked chapter details
      const { data, error } = await supabase
        .from('events')
        .select('*, chapters(*)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase Events fetch error:', error);
        return res.status(500).json({ error: 'Failed to retrieve events.' });
      }

      const clientEvents = (data || []).map(mapEventDbToClient);
      return res.status(200).json(clientEvents);
    }

    if (req.method === 'POST') {
      // 1. Session & Auth check
      const session = await verifySession(req);
      if (!session) {
        return res.status(401).json({ error: 'Authentication required.' });
      }

      if (session.role !== 'organizer') {
        return res.status(403).json({ error: 'Access forbidden. Only organizers can create events.' });
      }

      const clientEvent = req.body;
      if (!clientEvent || !clientEvent.name) {
        return res.status(400).json({ error: 'Missing required event title.' });
      }

      // Ensure valid chapter_id resolution for Postgres foreign key
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let validChapterId = clientEvent.chapterId || session.chapter_id;

      if (!validChapterId || !uuidRegex.test(validChapterId)) {
        // Resolve target chapter by slug, ocid, or fallback to first chapter in database
        const lookupKey = validChapterId || 'fit';
        const { data: foundChapter } = await supabase
          .from('chapters')
          .select('id')
          .or(`slug.eq.${lookupKey},ocid.eq.${lookupKey}`)
          .limit(1)
          .maybeSingle();

        if (foundChapter) {
          validChapterId = foundChapter.id;
        } else {
          const { data: firstChapter } = await supabase
            .from('chapters')
            .select('id')
            .limit(1)
            .maybeSingle();
          if (firstChapter) {
            validChapterId = firstChapter.id;
          }
        }
      }

      const dbEvent = mapEventClientToDb(clientEvent);
      dbEvent.chapter_id = validChapterId;
      
      // Auto-generate slug if not provided
      if (!dbEvent.slug) {
        dbEvent.slug = clientEvent.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
      }

      const { data, error } = await supabase
        .from('events')
        .insert(dbEvent)
        .select('*, chapters(*)')
        .single();

      if (error) {
        console.error('Supabase Event creation error:', error);
        return res.status(500).json({ 
          error: error.message || 'Failed to store event in database.',
          details: error.details || error.hint || null
        });
      }

      return res.status(201).json(mapEventDbToClient(data));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Events Endpoint Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
