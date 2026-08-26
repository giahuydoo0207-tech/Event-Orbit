import { createClient } from '@supabase/supabase-js';
import { verifySession } from '../lib/verifySession.js';
import { resolveChapterUuid } from '../lib/resolveChapter.js';
import { AuthorizationError, assertAdmin } from '../lib/authorization.js';
import { normalizeChapterInput } from '../lib/adminChapters.js';

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
      const session = await verifySession(req);

      // Fetch follower counts for all chapters
      const { data: chapters, error } = await supabase
        .from('chapters')
        .select('id, slug, ocid, follower_count');

      if (error) {
        console.error('Supabase Chapters Follow fetch error:', error);
        return res.status(500).json({ error: 'Failed to retrieve follow counts.' });
      }

      const followersMap = {};
      (chapters || []).forEach(c => {
        const count = c.follower_count || 0;
        followersMap[c.id] = count;
        if (c.slug) followersMap[c.slug] = count;
        if (c.ocid) followersMap[c.ocid] = count;
      });

      let followedChapterIds = [];
      if (session) {
        const userId = session.user_id || session.ocid;
        const { data: follows } = await supabase
          .from('chapter_follows')
          .select('chapter_id, chapters(id, slug, ocid)')
          .eq('user_id', userId);

        if (follows) {
          follows.forEach(f => {
            if (f.chapter_id) followedChapterIds.push(f.chapter_id);
            if (f.chapters?.id) followedChapterIds.push(f.chapters.id);
            if (f.chapters?.slug) followedChapterIds.push(f.chapters.slug);
            if (f.chapters?.ocid) followedChapterIds.push(f.chapters.ocid);
          });
          followedChapterIds = Array.from(new Set(followedChapterIds));
        }
      }

      return res.status(200).json({
        followersMap,
        followedChapterIds
      });
    }

    if (req.method === 'POST') {
      // 1. Session check
      const session = await verifySession(req);
      if (!session) {
        return res.status(401).json({ error: 'Authentication required to follow/unfollow chapters.' });
      }

      const { chapterId, action } = req.body || {};
      if (action === 'createChapter') {
        return createChapter(req, res, session);
      }
      if (!chapterId || !action) {
        return res.status(400).json({ error: 'Missing chapterId or action.' });
      }

      const targetChapterUuid = await resolveChapterUuid(supabase, chapterId);
      if (!targetChapterUuid) {
        return res.status(404).json({ error: 'Chapter not found.' });
      }

      const userId = session.user_id || session.ocid;

      if (action === 'follow') {
        // Record follow in database (unique constraint protects against duplicates)
        const { error: followError } = await supabase
          .from('chapter_follows')
          .upsert({
            chapter_id: targetChapterUuid,
            user_id: userId
          }, { onConflict: 'chapter_id,user_id' });

        if (!followError) {
          // Increment the follower_count of the chapter
          const { data: chapter } = await supabase
            .from('chapters')
            .select('follower_count')
            .eq('id', targetChapterUuid)
            .single();
          
          if (chapter) {
            const newCount = (chapter.follower_count || 0) + 1;
            await supabase
              .from('chapters')
              .update({ follower_count: newCount })
              .eq('id', targetChapterUuid);
          }
        }
      } else if (action === 'unfollow') {
        // Delete follow entry
        const { data: deletedRows, error: unfollowError } = await supabase
          .from('chapter_follows')
          .delete()
          .eq('chapter_id', targetChapterUuid)
          .eq('user_id', userId)
          .select();

        // Decrement follower_count only if a follow entry was actually deleted
        if (!unfollowError && deletedRows && deletedRows.length > 0) {
          const { data: chapter } = await supabase
            .from('chapters')
            .select('follower_count')
            .eq('id', targetChapterUuid)
            .single();
          
          if (chapter) {
            const newCount = Math.max(0, (chapter.follower_count || 0) - 1);
            await supabase
              .from('chapters')
              .update({ follower_count: newCount })
              .eq('id', targetChapterUuid);
          }
        }
      } else {
        return res.status(400).json({ error: 'Invalid action. Must be follow or unfollow.' });
      }

      // Query the final count to return to the client
      const { data: updatedChapter } = await supabase
        .from('chapters')
        .select('follower_count')
        .eq('id', targetChapterUuid)
        .single();

      return res.status(200).json({ 
        chapterId,
        chapterUuid: targetChapterUuid,
        followerCount: updatedChapter ? updatedChapter.follower_count : 0 
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Chapters Follow API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

async function createChapter(req, res, session) {
  try {
    assertAdmin(session);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return res.status(session ? 403 : 401).json({ error: error.message });
    }
    throw error;
  }

  let chapter;
  try {
    chapter = normalizeChapterInput({ ...req.body, ocid: req.body?.chapterOcid });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const [slugMatch, ocidMatch] = await Promise.all([
    supabase.from('chapters').select('id').eq('slug', chapter.slug).maybeSingle(),
    supabase.from('chapters').select('id').eq('ocid', chapter.ocid).maybeSingle(),
  ]);
  if (slugMatch.error || ocidMatch.error) throw slugMatch.error || ocidMatch.error;
  if (slugMatch.data) return res.status(409).json({ error: 'A chapter with this slug already exists.' });
  if (ocidMatch.data) return res.status(409).json({ error: 'A chapter with this Chapter OCID already exists.' });

  const { data, error } = await supabase
    .from('chapters')
    .insert({ ...chapter, avatar_gradient: 'from-blue-600 to-cyan-600' })
    .select('id, slug, name, ocid, description, category, avatar_gradient, follower_count, created_at')
    .single();

  if (error) {
    if (error.code === '23505' || /duplicate/i.test(error.message || '')) {
      return res.status(409).json({ error: 'A chapter with this slug or Chapter OCID already exists.' });
    }
    throw error;
  }
  return res.status(201).json({ chapter: data });
}
