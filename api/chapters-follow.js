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
      // Fetch follower counts for all chapters
      const { data, error } = await supabase
        .from('chapters')
        .select('id, follower_count');

      if (error) {
        console.error('Supabase Chapters Follow fetch error:', error);
        return res.status(500).json({ error: 'Failed to retrieve follow counts.' });
      }

      const followersMap = {};
      (data || []).forEach(c => {
        followersMap[c.id] = c.follower_count || 0;
      });

      return res.status(200).json(followersMap);
    }

    if (req.method === 'POST') {
      // 1. Session check
      const session = await verifySession(req);
      if (!session) {
        return res.status(401).json({ error: 'Authentication required to follow/unfollow chapters.' });
      }

      const { chapterId, action } = req.body;
      if (!chapterId || !action) {
        return res.status(400).json({ error: 'Missing chapterId or action.' });
      }

      if (action === 'follow') {
        // Record follow in database (unique constraint protects against duplicate clicks)
        const { error: followError } = await supabase
          .from('chapter_follows')
          .insert({
            chapter_id: chapterId,
            user_id: session.user_id
          });

        if (!followError) {
          // Increment the follower_count of the chapter
          const { data: chapter } = await supabase
            .from('chapters')
            .select('follower_count')
            .eq('id', chapterId)
            .single();
          
          if (chapter) {
            const newCount = (chapter.follower_count || 0) + 1;
            await supabase
              .from('chapters')
              .update({ follower_count: newCount })
              .eq('id', chapterId);
          }
        }
      } else if (action === 'unfollow') {
        // Delete follow entry
        const { data: deletedRows, error: unfollowError } = await supabase
          .from('chapter_follows')
          .delete()
          .eq('chapter_id', chapterId)
          .eq('user_id', session.user_id)
          .select();

        // Decrement follower_count only if a follow entry was actually deleted
        if (!unfollowError && deletedRows && deletedRows.length > 0) {
          const { data: chapter } = await supabase
            .from('chapters')
            .select('follower_count')
            .eq('id', chapterId)
            .single();
          
          if (chapter) {
            const newCount = Math.max(0, (chapter.follower_count || 0) - 1);
            await supabase
              .from('chapters')
              .update({ follower_count: newCount })
              .eq('id', chapterId);
          }
        }
      } else {
        return res.status(400).json({ error: 'Invalid action. Must be follow or unfollow.' });
      }

      // Query the final count to return to the client
      const { data: updatedChapter } = await supabase
        .from('chapters')
        .select('follower_count')
        .eq('id', chapterId)
        .single();

      return res.status(200).json({ 
        chapterId, 
        followerCount: updatedChapter ? updatedChapter.follower_count : 0 
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Chapters Follow API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
