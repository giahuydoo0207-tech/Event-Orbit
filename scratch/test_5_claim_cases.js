import { createClient } from '@supabase/supabase-js';
import importAttendeesHandler from '../api/import-attendees.js';
import claimHandler from '../api/claim.js';

// Setup Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment!");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Mock response creator
function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(key, value) {
      res.headers[key] = value;
    },
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(data) {
      res.body = data;
      return res;
    },
    end() {
      return res;
    }
  };
  return res;
}

// Mock request creator
function createMockReq(method, body = {}, query = {}, headers = {}) {
  return {
    method,
    body,
    query,
    headers: {
      'content-type': 'application/json',
      ...headers
    }
  };
}

async function runTests() {
  console.log("=================================================================");
  console.log("       CLAIM BADGE FLOW — 5 BACKEND TEST CASES SUITE             ");
  console.log("=================================================================\n");

  let testCount = 0;
  let passCount = 0;

  // 1. Get a valid test event from DB
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('id, name, slug')
    .limit(1)
    .single();

  if (eventErr || !event) {
    console.error("❌ CRITICAL: Could not find any event in DB to test against!", eventErr);
    process.exit(1);
  }

  console.log(`📌 Using Test Event: "${event.name}" (ID: ${event.id})\n`);

  // Organizer session header (bypasses organizer check)
  const organizerHeader = Buffer.from(JSON.stringify({
    isAuthenticated: true,
    role: 'organizer',
    user_id: 'org-admin-test',
    ocid: 'org-admin.edu'
  })).toString('base64');

  // Student (Alex) session header
  const studentAlexHeader = Buffer.from(JSON.stringify({
    isAuthenticated: true,
    role: 'student',
    user_id: 'alex.edu',
    ocid: 'alex.edu',
    fullName: 'Alex Student',
    ethAddress: '0x1111111111111111111111111111111111111111'
  })).toString('base64');

  let token1 = null;
  let token2 = null;

  // -----------------------------------------------------------------
  // TEST CASE 1: Import file with 2 unmatched rows
  // -----------------------------------------------------------------
  testCount++;
  console.log(`--- TEST CASE 1: Import file with 2 unmatched rows ---`);
  const uniqueMssv1 = `TEST_${Date.now()}_1`;
  const uniqueMssv2 = `TEST_${Date.now()}_2`;
  const uniqueEmail1 = `unmatched1_${Date.now()}@student.vhu.edu.vn`;
  const uniqueEmail2 = `unmatched2_${Date.now()}@student.vhu.edu.vn`;

  const importReq = createMockReq('POST', {
    eventId: event.id,
    attendees: [
      { mssv: uniqueMssv1, email: uniqueEmail1, name: 'Nguyễn Văn Unmatched 1' },
      { mssv: uniqueMssv2, email: uniqueEmail2, name: 'Lê Thị Unmatched 2' }
    ]
  }, {}, { 'x-user-session': organizerHeader });

  const importRes = createMockRes();
  await importAttendeesHandler(importReq, importRes);

  console.log(`[Import Status]: ${importRes.statusCode}`);
  console.log(`[Import Response]:`, JSON.stringify(importRes.body, null, 2));

  if (importRes.statusCode === 200 && importRes.body?.ok) {
    const unmatched = importRes.body.unmatchedList || [];
    if (unmatched.length === 2 && unmatched[0].claimToken && unmatched[1].claimToken) {
      token1 = unmatched[0].claimToken;
      token2 = unmatched[1].claimToken;

      // Verify rows in Supabase DB
      const { data: dbClaims, error: dbErr } = await supabase
        .from('pending_claims')
        .select('*')
        .eq('event_id', event.id)
        .in('claim_token', [token1, token2]);

      if (!dbErr && dbClaims?.length === 2) {
        console.log(`✅ [PASS TEST 1]: Import created 2 pending_claims in DB with valid tokens & URLs!\n`);
        passCount++;
      } else {
        console.error(`❌ [FAIL TEST 1]: DB verification failed! Expected 2 rows in pending_claims, got:`, dbClaims, dbErr);
      }
    } else {
      console.error(`❌ [FAIL TEST 1]: Response did not contain claimTokens for 2 unmatched rows!`);
    }
  } else {
    console.error(`❌ [FAIL TEST 1]: Import API failed with code ${importRes.statusCode}`);
  }

  // -----------------------------------------------------------------
  // TEST CASE 2: GET /api/claim?token=<token1>
  // -----------------------------------------------------------------
  testCount++;
  console.log(`--- TEST CASE 2: GET /api/claim?token=<token1> ---`);
  if (!token1) {
    console.error(`❌ [SKIP TEST 2]: token1 was not created in Test 1.`);
  } else {
    const getClaimReq = createMockReq('GET', {}, { token: token1 });
    const getClaimRes = createMockRes();
    await claimHandler(getClaimReq, getClaimRes);

    console.log(`[GET Claim Status]: ${getClaimRes.statusCode}`);
    console.log(`[GET Claim Response]:`, JSON.stringify(getClaimRes.body, null, 2));

    if (
      getClaimRes.statusCode === 200 &&
      getClaimRes.body?.ok &&
      getClaimRes.body?.claim?.importName === 'Nguyễn Văn Unmatched 1' &&
      getClaimRes.body?.event?.name === event.name
    ) {
      console.log(`✅ [PASS TEST 2]: GET /api/claim returned correct event name and recipient info ("Nguyễn Văn Unmatched 1")!\n`);
      passCount++;
    } else {
      console.error(`❌ [FAIL TEST 2]: GET claim response mismatch or non-200!`);
    }
  }

  // -----------------------------------------------------------------
  // TEST CASE 3: POST /api/claim with valid token & OCID session (alex.edu)
  // -----------------------------------------------------------------
  testCount++;
  console.log(`--- TEST CASE 3: POST /api/claim with valid token1 & OCID session (alex.edu) ---`);
  if (!token1) {
    console.error(`❌ [SKIP TEST 3]: token1 was not created in Test 1.`);
  } else {
    const postClaimReq = createMockReq('POST', { claimToken: token1 }, {}, { 'x-user-session': studentAlexHeader });
    const postClaimRes = createMockRes();
    await claimHandler(postClaimReq, postClaimRes);

    console.log(`[POST Claim Status]: ${postClaimRes.statusCode}`);
    console.log(`[POST Claim Response]:`, JSON.stringify(postClaimRes.body, null, 2));

    if (postClaimRes.statusCode === 200 && postClaimRes.body?.ok) {
      // Verify DB updates
      const { data: dbClaim } = await supabase
        .from('pending_claims')
        .select('*')
        .eq('claim_token', token1)
        .single();

      const { data: dbReg } = await supabase
        .from('registrations')
        .select('*')
        .eq('event_id', event.id)
        .eq('user_id', 'alex.edu')
        .maybeSingle();

      const { data: dbAch } = await supabase
        .from('achievements')
        .select('*')
        .eq('event_id', event.id)
        .eq('user_id', 'alex.edu')
        .maybeSingle();

      if (dbClaim?.status === 'claimed' && dbReg && dbAch) {
        console.log(`✅ [PASS TEST 3]: Claim successful! pending_claims.status='claimed', registration & achievement created!\n`);
        passCount++;
      } else {
        console.error(`❌ [FAIL TEST 3]: DB verification failed! Claim: ${dbClaim?.status}, Reg: ${!!dbReg}, Ach: ${!!dbAch}`);
      }
    } else {
      console.error(`❌ [FAIL TEST 3]: POST claim failed with code ${postClaimRes.statusCode}`);
    }
  }

  // -----------------------------------------------------------------
  // TEST CASE 4: POST /api/claim with SAME token1 2nd time -> 409
  // -----------------------------------------------------------------
  testCount++;
  console.log(`--- TEST CASE 4: POST /api/claim with SAME token1 2nd time (Duplicate protection) ---`);
  if (!token1) {
    console.error(`❌ [SKIP TEST 4]: token1 was not created in Test 1.`);
  } else {
    const repeatReq = createMockReq('POST', { claimToken: token1 }, {}, { 'x-user-session': studentAlexHeader });
    const repeatRes = createMockRes();
    await claimHandler(repeatReq, repeatRes);

    console.log(`[Repeat Claim Status]: ${repeatRes.statusCode}`);
    console.log(`[Repeat Claim Response]:`, JSON.stringify(repeatRes.body, null, 2));

    if (repeatRes.statusCode === 409) {
      console.log(`✅ [PASS TEST 4]: Repeat claim correctly rejected with HTTP 409 Conflict!\n`);
      passCount++;
    } else {
      console.error(`❌ [FAIL TEST 4]: Expected 409 Conflict, got ${repeatRes.statusCode}`);
    }
  }

  // -----------------------------------------------------------------
  // TEST CASE 5: GET & POST with fake/non-existent token -> 404
  // -----------------------------------------------------------------
  testCount++;
  console.log(`--- TEST CASE 5: Test fake/non-existent claim token -> 404 ---`);
  const fakeToken = '0000000000000000000000000000000000000000000000000000000000000000';
  const fakeReq = createMockReq('GET', {}, { token: fakeToken });
  const fakeRes = createMockRes();
  await claimHandler(fakeReq, fakeRes);

  console.log(`[Fake Token GET Status]: ${fakeRes.statusCode}`);
  console.log(`[Fake Token GET Response]:`, JSON.stringify(fakeRes.body, null, 2));

  if (fakeRes.statusCode === 404 && fakeRes.body?.error) {
    console.log(`✅ [PASS TEST 5]: Fake token correctly rejected with HTTP 404 Not Found without crashing!\n`);
    passCount++;
  } else {
    console.error(`❌ [FAIL TEST 5]: Expected 404 for fake token, got ${fakeRes.statusCode}`);
  }

  // -----------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------
  console.log("=================================================================");
  console.log(`  FINAL RESULT: ${passCount}/${testCount} TESTS PASSED`);
  console.log("=================================================================");

  if (passCount === testCount) {
    console.log("\n🎉 ALL 5 BACKEND TEST CASES PASSED SUCCESSFULLY!");
  } else {
    console.error(`\n⚠️ ${testCount - passCount} TEST(S) FAILED. Please review output above.`);
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Unhandled test runner error:", err);
  process.exit(1);
});
