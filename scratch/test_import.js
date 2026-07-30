import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xyz.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy';

console.log('--- Testing Student Lookup in Sessions ---');
console.log('SUPABASE_URL:', SUPABASE_URL ? 'Defined' : 'Undefined');
