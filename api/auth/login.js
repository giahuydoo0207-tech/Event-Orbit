import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { checkRateLimit } from '../../lib/rateLimit.js';
import { resolveChapterUuid } from '../../lib/resolveChapter.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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

  // Rate Limiting
  const rateOk = await checkRateLimit(req);
  if (!rateOk) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  try {
    const { ocid, mssv, fullName, role, chapterId, ethAddress } = req.body;

    // Security enforcement: Reject session creation if neither OCID nor MSSV is provided
    if (!ocid && !mssv) {
      return res.status(400).json({ error: 'Valid OCID or Student ID is required to create a session.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const validChapterUuid = await resolveChapterUuid(supabase, chapterId);

    const { error } = await supabase.from('sessions').insert({
      token,
      user_id: ocid || mssv,
      role: role || 'student',
      chapter_id: validChapterUuid,
      ocid: ocid || null,
      mssv: mssv || null,
      full_name: fullName || ocid || mssv,
      eth_address: ethAddress || null,
      expires_at: expiresAt,
    });

    if (error) {
      console.error('Session DB Error:', error);
      return res.status(500).json({ error: 'Database session storage failed.' });
    }

    res.setHeader(
      'Set-Cookie',
      `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`
    );
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Login Endpoint Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
