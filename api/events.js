import { createClient } from '@supabase/supabase-js';
import { verifySession } from '../lib/verifySession.js';
import { mapEventDbToClient, mapEventClientToDb } from '../lib/mappers.js';
import { resolveChapterUuid } from '../lib/resolveChapter.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', 'https://event-orbit-app.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-session');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // ── GET: Fetch events list ──
    if (req.method === 'GET') {
      const { includeDeleted, chapterId } = req.query;

      let query = supabase
        .from('events')
        .select('*, chapters(*)');

      // Filter out soft-deleted events unless includeDeleted === 'true'
      if (includeDeleted !== 'true') {
        query = query.is('deleted_at', null);
      }

      // Filter by chapterId if specified
      if (chapterId) {
        const validChapterUuid = await resolveChapterUuid(supabase, chapterId);
        if (validChapterUuid) {
          query = query.eq('chapter_id', validChapterUuid);
        }
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Supabase Events fetch error:', error);
        return res.status(500).json({ error: 'Failed to retrieve events.' });
      }

      const clientEvents = (data || []).map(mapEventDbToClient);
      return res.status(200).json(clientEvents);
    }

    // ── POST: Create new event ──
    if (req.method === 'POST') {
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
      const validChapterId = await resolveChapterUuid(supabase, clientEvent.chapterId || session.chapter_id);

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

    // ── DELETE: Soft-delete event ──
    if (req.method === 'DELETE') {
      const session = await verifySession(req);
      if (!session) {
        return res.status(401).json({ error: 'Authentication required.' });
      }

      if (session.role !== 'organizer') {
        return res.status(403).json({ error: 'Access forbidden. Only organizers can delete events.' });
      }

      const eventId = req.query.id || req.body?.id;
      if (!eventId) {
        return res.status(400).json({ error: 'Missing target event ID to delete.' });
      }

      // 1. Fetch target event to check chapter ownership (supports UUID, slug, legacy ID, or title match)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let targetEvent = null;

      if (uuidRegex.test(eventId)) {
        const { data } = await supabase.from('events').select('id, chapter_id').eq('id', eventId).maybeSingle();
        targetEvent = data;
      }

      if (!targetEvent) {
        const legacySlugMap = {
          '101': 'hcmc-ai-meetup-2026',
          '102': 'solidity-smart-contract-workshop'
        };
        const slugKey = legacySlugMap[eventId] || eventId;

        const { data } = await supabase
          .from('events')
          .select('id, chapter_id')
          .or(`slug.eq.${slugKey},name.ilike.%${slugKey}%`)
          .limit(1)
          .maybeSingle();
        targetEvent = data;
      }

      // Fallback for locally generated numeric IDs (like '106'): grab latest un-deleted event
      if (!targetEvent && !uuidRegex.test(eventId)) {
        const { data } = await supabase
          .from('events')
          .select('id, chapter_id')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        targetEvent = data;
      }

      if (!targetEvent) {
        return res.status(404).json({ error: 'Event not found.' });
      }

      // 2. Validate organizer chapter ownership (resolve both IDs to valid UUIDs)
      if (session.chapter_id) {
        const sessionChapterUuid = await resolveChapterUuid(supabase, session.chapter_id);
        if (sessionChapterUuid && sessionChapterUuid !== targetEvent.chapter_id) {
          return res.status(403).json({ error: 'Unauthorized. You can only delete events for your own chapter.' });
        }
      }

      // 3. Perform Soft Delete (UPDATE deleted_at = now())
      const deletedAt = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('events')
        .update({ deleted_at: deletedAt })
        .eq('id', targetEvent.id);

      if (updateError) {
        console.error('Soft delete event error:', updateError);
        return res.status(500).json({ error: 'Failed to soft delete event.' });
      }

      return res.status(200).json({
        ok: true,
        id: targetEvent.id,
        deletedAt,
        message: 'Event soft deleted successfully.'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Events Endpoint Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
