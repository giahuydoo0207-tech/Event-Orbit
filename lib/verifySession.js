import { createClient } from '@supabase/supabase-js';
import { readSessionToken } from './sessionCookie.js';

let defaultSupabase;

function getSupabase() {
  if (!defaultSupabase) {
    defaultSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return defaultSupabase;
}

export async function verifySession(req, { supabaseClient } = {}) {
  const token = readSessionToken(req.headers.cookie);

  if (!token || token.length !== 64 || !/^[a-f0-9]+$/i.test(token)) return null;

  const { data, error } = await (supabaseClient || getSupabase())
    .from('sessions')
    .select('token, user_id, role, chapter_id, ocid, mssv, full_name, eth_address, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (error || !data || new Date(data.expires_at) < new Date()) return null;
  if (!['student', 'organizer', 'admin'].includes(data.role)) return null;
  return data;
}
