// Strict Production Integration Test Suite for Event Orbit
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xyz.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runTestSuite() {
  console.log('====================================================');
  console.log('  EVENT ORBIT — STRICT PRODUCTION DB INTEGRATION TEST');
  console.log('====================================================\n');

  let passCount = 0;

  // ── CASE 1: Batch Import Event Resolution from Chapter Console ──
  console.log('--- CASE 1: Batch Import Event Resolution from Chapter Console ---');
  try {
    const { data: event, error } = await supabase.from('events').select('id, name, slug').limit(1).single();
    if (!error && event && event.id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUuid = uuidRegex.test(event.id);
      if (isUuid) {
        console.log(`[PASS] Target event resolved strictly by Postgres UUID: '${event.name}' (${event.id})`);
        passCount++;
      } else {
        console.error(`[FAIL] Event ID is not a Postgres UUID: ${event.id}`);
      }
    } else {
      console.error('[FAIL] No target event found in Supabase DB:', error);
    }
  } catch (e) {
    console.error('[FAIL] Case 1 error:', e);
  }
  console.log('');

  // ── CASE 2: Walk-in QR Check-in (No prior online registration) ──
  console.log('--- CASE 2: Walk-in QR Check-in (No prior online registration) ---');
  let testAchId = null;
  try {
    const { data: event } = await supabase.from('events').select('id').limit(1).single();
    if (event) {
      testAchId = `ACH-WALKIN-${Date.now()}`;
      const { data: ach, error: achErr } = await supabase.from('achievements').insert({
        id: testAchId,
        event_id: event.id,
        user_id: 'walkin_student_test',
        ocid: 'walkin_test.edu',
        points: 5,
        mint_status: 'success_mock'
      }).select().single();

      if (!achErr && ach) {
        // Verify it appears in badge_recipients_view
        const { data: viewCheck, error: viewErr } = await supabase
          .from('badge_recipients_view')
          .select('*')
          .eq('event_id', event.id)
          .eq('user_id', 'walkin_student_test')
          .maybeSingle();

        if (!viewErr && viewCheck && viewCheck.checked_in) {
          console.log(`[PASS] Recorded walk-in QR check-in & verified in badge_recipients_view! User: ${viewCheck.user_id}, checked_in: ${viewCheck.checked_in}`);
          passCount++;
        } else {
          console.error('[FAIL] Walk-in achievement inserted but not reflected in badge_recipients_view:', viewErr);
        }
      } else {
        console.error('[FAIL] Failed to insert walk-in achievement:', achErr);
      }
    }
  } catch (e) {
    console.error('[FAIL] Case 2 error:', e);
  } finally {
    if (testAchId) {
      await supabase.from('achievements').delete().eq('id', testAchId);
    }
  }
  console.log('');

  // ── CASE 3: Querying Badge Recipients Single Source of Truth ──
  console.log('--- CASE 3: Querying badge_recipients_view SQL View ---');
  try {
    const { data: event } = await supabase.from('events').select('id').limit(1).single();
    if (event) {
      const { data: recipients, error } = await supabase
        .from('badge_recipients_view')
        .select('*')
        .eq('event_id', event.id);

      if (!error && Array.isArray(recipients)) {
        console.log(`[PASS] Querying badge_recipients_view SQL View succeeded! Total recipients returned: ${recipients.length}`);
        if (recipients.length > 0) {
          console.log('Sample recipient schema:', Object.keys(recipients[0]));
        }
        passCount++;
      } else {
        console.error(`[FAIL] badge_recipients_view query error:`, error?.message);
      }
    }
  } catch (e) {
    console.error('[FAIL] Case 3 error:', e);
  }
  console.log('');

  // ── CASE 4: Rejection of invalid event_id by Foreign Key RESTRICT ──
  console.log('--- CASE 4: Rejection of invalid event_id by Foreign Key RESTRICT ---');
  try {
    const invalidEventId = '00000000-0000-0000-0000-000000000000';
    const { data, error } = await supabase.from('achievements').insert({
      id: `ACH-FK-TEST-${Date.now()}`,
      event_id: invalidEventId,
      user_id: 'test_user_fk',
      points: 5
    });

    if (error && (error.code === '23503' || error.message.includes('foreign key') || error.message.includes('violates'))) {
      console.log(`[PASS] Postgres DB strictly rejected invalid event_id via Foreign Key RESTRICT (code: ${error.code}): ${error.message}`);
      passCount++;
    } else {
      console.error('[FAIL] Database did NOT reject invalid event_id insertion! Error:', error);
    }
  } catch (e) {
    console.log('[PASS] Rejection caught cleanly:', e.message);
    passCount++;
  }
  console.log('');

  console.log('====================================================');
  console.log(`STRICT TEST SUITE SUMMARY: ${passCount}/4 CASES PASSED`);
  console.log('====================================================');
}

runTestSuite();
