import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function verifySession(req) {
  // 1. Try reading session from Cookie
  const rawCookie = req.headers.cookie || '';
  if (rawCookie) {
    const cookies = Object.fromEntries(
      rawCookie.split(';').map((c) => {
        const [key, ...v] = c.trim().split('=');
        return [key, v.join('=')];
      })
    );

    const token = cookies['session'];
    if (token) {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('token', token)
        .single();

      if (!error && data && new Date(data.expires_at) >= new Date()) {
        return data;
      }
    }
  }

  // 2. Dual-Layer Fallback: Try reading x-user-session header sent by client
  const headerSession = req.headers['x-user-session'];
  if (headerSession) {
    try {
      const jsonStr = Buffer.from(headerSession, 'base64').toString('utf8');
      const parsed = JSON.parse(jsonStr);
      if (parsed && (parsed.isAuthenticated || parsed.role)) {
        return {
          user_id: parsed.ocid || parsed.mssv || 'user-session',
          role: parsed.role || 'student',
          chapter_id: parsed.chapterId || null,
          ocid: parsed.ocid || null,
          mssv: parsed.mssv || null,
          full_name: parsed.fullName || 'User',
          eth_address: parsed.ethAddress || null
        };
      }
    } catch (e) {
      console.error('Failed to parse x-user-session header:', e);
    }
  }

  return null;
}
