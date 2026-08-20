import { createClient } from '@supabase/supabase-js';
import { readSessionToken } from './sessionCookie.js';

let defaultSupabase;

function getSupabase() {
  if (!defaultSupabase) {
    defaultSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return defaultSupabase;
}

export async function resolveTrustedSessionAuthorization(supabase, session) {
  const ocid = String(session?.ocid || session?.user_id || '').trim().toLowerCase();
  if (!ocid) return null;

  const [adminResult, organizerResult] = await Promise.all([
    supabase
      .from('admin_users')
      .select('ocid')
      .eq('ocid', ocid)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('chapter_organizers')
      .select('chapter_id')
      .eq('ocid', ocid)
      .eq('status', 'active')
      .maybeSingle(),
  ]);

  if (adminResult.error || organizerResult.error) return null;

  if (adminResult.data) {
    return { ...session, role: 'admin', chapter_id: organizerResult.data?.chapter_id || null };
  }
  if (organizerResult.data?.chapter_id) {
    return { ...session, role: 'organizer', chapter_id: organizerResult.data.chapter_id };
  }
  return { ...session, role: 'student', chapter_id: null };
}

export async function verifySession(req, { supabaseClient } = {}) {
  const token = readSessionToken(req.headers.cookie);

  if (!token || token.length !== 64 || !/^[a-f0-9]+$/i.test(token)) return null;

  const supabase = supabaseClient || getSupabase();
  const { data, error } = await supabase
    .from('sessions')
    .select('token, user_id, role, chapter_id, ocid, mssv, full_name, eth_address, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (error || !data || new Date(data.expires_at) < new Date()) return null;
  return resolveTrustedSessionAuthorization(supabase, data);
}
