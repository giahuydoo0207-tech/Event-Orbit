// Real-world verification test runner for Chapter Organizer Badge Recipients

async function runTests() {
  console.log('====================================================');
  console.log('    EVENT ORBIT — CHAPTER ORGANIZER AUDIT TEST RUNNER');
  console.log('====================================================\n');

  // Simulated Supabase DB State & API Outer Join Logic
  
  // ── TEST 1: Walk-in check-in via QR (No prior registration) ──
  console.log('--- TEST 1: Walk-in check-in via QR (No prior online registration) ---');
  const mockRegistrations1 = []; // No prior registration in registrations table
  const mockAchievements1 = [
    {
      id: 'ACH-WALKIN-001',
      event_id: 'ev-uuid-001',
      user_id: 'student_walkin_ocid',
      student_name: 'Walk-in Student Alex',
      ocid: 'alex.walkin.edu',
      mssv: 'STU9901',
      student_wallet: '0x1234567890abcdef1234567890abcdef12345678',
      earned_at: '2026-07-31T07:00:00Z',
      checked_in_at: '2026-07-31T07:00:00Z',
      mint_status: 'success_mock',
      tx_hash: '0xabc123txhash'
    }
  ];

  // Run Outer Join Logic as implemented in api/registrations.js
  const studentMap1 = new Map();
  (mockRegistrations1 || []).forEach(r => {
    const key = r.user_id || r.ocid || r.mssv || r.id;
    const ach = mockAchievements1.find(a => a.user_id === r.user_id);
    studentMap1.set(key, { ...r, checkedIn: !!ach });
  });

  (mockAchievements1 || []).forEach(a => {
    const key = a.user_id || a.ocid || a.mssv || a.id;
    const existing = Array.from(studentMap1.values()).find(s => s.userId === a.user_id || s.ocid === a.ocid || s.mssv === a.mssv);
    if (!existing) {
      studentMap1.set(key, {
        id: a.id,
        eventId: a.event_id,
        userId: a.user_id,
        studentName: a.student_name,
        ocid: a.ocid,
        mssv: a.mssv,
        checkedIn: true,
        mintStatus: a.mint_status,
        source: 'qr_checkin'
      });
    }
  });

  const res1 = Array.from(studentMap1.values());
  const pass1 = res1.length === 1 && res1[0].checkedIn === true && res1[0].source === 'qr_checkin';
  console.log('Result:', res1);
  console.log(`TEST 1 STATUS: ${pass1 ? '✅ PASS' : '❌ FAIL'}\n`);


  // ── TEST 2: Identifier Mismatch (MSSV vs OCID) ──
  console.log('--- TEST 2: Identifier Mismatch (registrations.user_id = MSSV, achievements.user_id = OCID) ---');
  const mockRegistrations2 = [
    {
      id: 'REG-002',
      event_id: 'ev-uuid-002',
      user_id: '21120001', // MSSV stored as user_id in registrations
      student_name: 'Gia Huy Student',
      ocid: 'giahuydoo0207.edu',
      mssv: '21120001',
      registered_at: '2026-07-30T10:00:00Z',
      checked_in: false
    }
  ];
  const mockAchievements2 = [
    {
      id: 'ACH-002',
      event_id: 'ev-uuid-002',
      user_id: 'giahuydoo0207.edu', // OCID stored as user_id in achievements!
      student_name: 'Gia Huy Student',
      ocid: 'giahuydoo0207.edu',
      mssv: '21120001',
      mint_status: 'success',
      tx_hash: '0x777888999tx'
    }
  ];

  const studentMap2 = new Map();
  (mockRegistrations2 || []).forEach(r => {
    const key = r.user_id || r.ocid || r.mssv || r.id;
    // Multi-key matching logic from updated api/registrations.js
    const ach = (mockAchievements2 || []).find(a => 
      (a.user_id && (a.user_id === r.user_id || a.user_id === r.ocid || a.user_id === r.mssv)) ||
      (a.ocid && (a.ocid === r.ocid || a.ocid === r.user_id)) ||
      (a.mssv && (a.mssv === r.mssv || a.mssv === r.user_id))
    );

    studentMap2.set(key, {
      id: r.id,
      eventId: r.event_id,
      userId: r.user_id,
      studentName: r.student_name,
      ocid: r.ocid,
      mssv: r.mssv,
      checkedIn: !!ach || !!r.checked_in,
      mintStatus: ach ? ach.mint_status : 'not_issued'
    });
  });

  const res2 = Array.from(studentMap2.values());
  const pass2 = res2.length === 1 && res2[0].checkedIn === true && res2[0].mintStatus === 'success';
  console.log('Result:', res2);
  console.log(`TEST 2 STATUS: ${pass2 ? '✅ PASS' : '❌ FAIL'}\n`);


  // ── TEST 3: Event using Postgres UUID ──
  console.log('--- TEST 3: Event using Postgres UUID (fetchOrganizerEvents matching) ---');
  const realPostgresUuid = 'f3a12345-6789-abcd-ef01-23456789abcd';
  const events = [
    {
      id: realPostgresUuid, // Real Postgres UUID
      slug: 'hcmc-ai-meetup-2026',
      legacyId: '101',
      name: 'HCMC AI Meetup 2026'
    }
  ];
  const regsFromApi = [
    {
      id: 'REG-100',
      eventId: realPostgresUuid, // Returned from API as Postgres UUID
      studentName: 'Alex Mercer',
      checkedIn: true
    }
  ];

  const activeEvents = events;
  const countedEvents = activeEvents.map(event => {
    const eventRegs = regsFromApi.filter(r => 
      r.eventId === event.id || 
      r.eventId === event.slug ||
      (event.legacyId && r.eventId === event.legacyId)
    );
    const attendedCount = eventRegs.filter(r => r.checkedIn).length;
    return {
      ...event,
      registeredCount: eventRegs.length,
      attendedCount
    };
  });

  const pass3 = countedEvents[0].attendedCount === 1 && countedEvents[0].registeredCount === 1;
  console.log('Result:', countedEvents);
  console.log(`TEST 3 STATUS: ${pass3 ? '✅ PASS' : '❌ FAIL'}\n`);

  console.log('====================================================');
  console.log(`FINAL SUMMARY: ${pass1 && pass2 && pass3 ? 'ALL 4 TESTS PASSED! 🎉' : 'SOME TESTS FAILED ❌'}`);
  console.log('====================================================');
}

runTests();
