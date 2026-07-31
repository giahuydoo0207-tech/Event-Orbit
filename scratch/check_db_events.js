import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xyz.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkDb() {
  console.log('--- Inspecting Supabase Chapters & Events Tables ---');
  
  const { data: chapters, error: chErr } = await supabase.from('chapters').select('*');
  console.log('\nSupabase Chapters:', chapters || chErr);

  const { data: events, error: evErr } = await supabase.from('events').select('*');
  console.log('\nSupabase Events:', events || evErr);
}

checkDb();
