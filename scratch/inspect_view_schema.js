import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xyz.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function inspectView() {
  console.log('--- Inspecting Real Supabase badge_recipients_view ---');
  
  const { data: viewData, error: viewErr } = await supabase
    .from('badge_recipients_view')
    .select('*')
    .limit(5);

  if (viewErr) {
    console.error('Error fetching badge_recipients_view:', viewErr);
  } else {
    console.log('Successfully queried badge_recipients_view!');
    console.log('Sample Row Schema:', viewData && viewData.length > 0 ? Object.keys(viewData[0]) : 'Empty view table (0 rows)');
    console.log('Data:', viewData);
  }
}

inspectView();
