import { createClient } from '@supabase/supabase-js';
import { AuthorizationError, assertAdmin } from '../../lib/authorization.js';
import { normalizeChapterInput } from '../../lib/adminChapters.js';
import { verifySession } from '../../lib/verifySession.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://event-orbit-app.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const session = await verifySession(req);
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
    chapter = normalizeChapterInput(req.body);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
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
  } catch (error) {
    console.error('Admin chapter creation failed:', error?.name || 'Error');
    return res.status(500).json({ error: 'Unable to create chapter.' });
  }
}
