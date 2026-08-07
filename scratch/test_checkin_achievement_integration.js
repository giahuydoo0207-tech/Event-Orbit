import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import checkinHandler from '../api/checkin.js';
import achievementsHandler from '../api/achievements.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const testUserId = `codex-checkin-${Date.now()}.edu`;
const sessionToken = randomUUID();
const nonces = [];

function responseCapture() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { return this; },
  };
}

function signedQr(eventId) {
  const nonce = randomUUID();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  const payload = { eventId, nonce, expiresAt };
  const signature = createHmac('sha256', process.env.QR_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
  nonces.push(nonce);
  return Buffer.from(JSON.stringify({ ...payload, signature })).toString('base64');
}

function authenticatedHeaders() {
  return { cookie: `session=${sessionToken}` };
}

function checkinRequest(eventId) {

  return {
    method: 'POST',
    headers: {
      ...authenticatedHeaders(),
      'x-forwarded-for': `integration-${testUserId}`,
    },
    socket: {},
    body: { qrData: signedQr(eventId) },
  };
}

try {
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, name, points')
    .eq('name', 'Finance Manage')
    .limit(1)
    .maybeSingle();

  if (eventError) throw eventError;
  assert.ok(event, 'Finance Manage event must exist for the integration test');

  const { error: sessionError } = await supabase.from('sessions').insert({
    token: sessionToken,
    user_id: testUserId,
    role: 'student',
    ocid: testUserId,
    full_name: 'Codex Integration Student',
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  if (sessionError) throw sessionError;

  const checkinResponse = responseCapture();
  await checkinHandler(checkinRequest(event.id), checkinResponse);
  assert.equal(checkinResponse.statusCode, 200, JSON.stringify(checkinResponse.body));
  assert.equal(checkinResponse.body.points, event.points);

  const { data: registration, error: registrationError } = await supabase
    .from('registrations')
    .select('event_id, user_id, source')
    .eq('event_id', event.id)
    .eq('user_id', testUserId)
    .maybeSingle();
  if (registrationError) throw registrationError;
  assert.ok(registration, 'Successful walk-in check-in must persist a registration');
  assert.equal(registration.source, 'qr_checkin');

  const dashboardResponse = responseCapture();
  await achievementsHandler({
    method: 'GET',
    headers: authenticatedHeaders(),
    query: { userId: 'another-user.edu' },
  }, dashboardResponse);
  assert.equal(dashboardResponse.statusCode, 200, JSON.stringify(dashboardResponse.body));
  assert.equal(dashboardResponse.body.achievements.length, 1);
  assert.equal(dashboardResponse.body.achievements[0].eventName, event.name);
  assert.equal(dashboardResponse.body.achievements[0].points, event.points);
  assert.equal(dashboardResponse.body.totalPoints, event.points);

  const unauthenticatedResponse = responseCapture();
  await achievementsHandler({ method: 'GET', headers: {}, query: {} }, unauthenticatedResponse);
  assert.equal(unauthenticatedResponse.statusCode, 401);

  const forgedHeaderResponse = responseCapture();
  await achievementsHandler({
    method: 'GET',
    headers: {
      'x-user-session': Buffer.from(JSON.stringify({
        isAuthenticated: true,
        role: 'student',
        ocid: testUserId,
      })).toString('base64'),
    },
    query: {},
  }, forgedHeaderResponse);
  assert.equal(forgedHeaderResponse.statusCode, 401);

  const duplicateResponse = responseCapture();
  await checkinHandler(checkinRequest(event.id), duplicateResponse);
  assert.equal(duplicateResponse.statusCode, 409, JSON.stringify(duplicateResponse.body));
  assert.match(duplicateResponse.body.error, /already checked in/i);

  console.log(`Check-in achievement integration: PASS (${event.name}, ${event.points} points)`);
} finally {
  await supabase.from('achievements').delete().eq('user_id', testUserId);
  await supabase.from('registrations').delete().eq('user_id', testUserId);
  await supabase.from('sessions').delete().eq('token', sessionToken);
  if (nonces.length > 0) await supabase.from('qr_nonces').delete().in('nonce', nonces);
}
