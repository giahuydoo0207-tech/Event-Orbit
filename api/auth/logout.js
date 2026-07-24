import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
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

  try {
    const cookie = req.headers.cookie || '';
    const token = cookie.split('; ').find((c) => c.startsWith('session='))?.split('=')[1];
    
    if (token) {
      await supabase.from('sessions').delete().eq('token', token);
    }

    res.setHeader(
      'Set-Cookie',
      'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    );
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Logout Endpoint Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
