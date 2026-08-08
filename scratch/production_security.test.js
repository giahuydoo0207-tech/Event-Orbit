import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  deriveSessionIdentity,
  getOcidJwksUrl,
  verifyOcidIdToken,
} from '../lib/authentication.js';
import {
  assertEventOwnership,
} from '../lib/authorization.js';
import {
  verifySession,
} from '../lib/verifySession.js';
import { mintBadge } from '../lib/relayer.js';

test('login identity is derived from verified OCID claims and server chapter data', () => {
  const identity = deriveSessionIdentity(
    {
      sub: 'ocid-subject-1',
      edu_username: 'student.edu',
      eth_address: '0x1111111111111111111111111111111111111111',
    },
    null,
  );

  assert.deepEqual(identity, {
    user_id: 'student.edu',
    role: 'student',
    chapter_id: null,
    ocid: 'student.edu',
    mssv: null,
    full_name: 'student.edu',
    eth_address: '0x1111111111111111111111111111111111111111',
  });
});

test('matching chapter account is the only path that derives organizer authority', () => {
  const identity = deriveSessionIdentity(
    { sub: 'chapter-subject', edu_username: 'fit.opencampus.edu' },
    { id: '3f74e7d4-06b1-47cf-a9dc-eb7d52b0c531' },
  );

  assert.equal(identity.role, 'organizer');
  assert.equal(identity.chapter_id, '3f74e7d4-06b1-47cf-a9dc-eb7d52b0c531');
});

test('unverified or incomplete OCID claims cannot create an identity', () => {
  assert.throws(() => deriveSessionIdentity({}, null), /identity/i);
});

test('JWKS URL is selected by trusted server configuration', () => {
  assert.equal(
    getOcidJwksUrl('live'),
    'https://static.opencampus.xyz/jwks/jwks-live.json',
  );
  assert.equal(
    getOcidJwksUrl('sandbox'),
    'https://static.opencampus.xyz/jwks/jwks-sandbox.json',
  );
});

test('live OCID verification fails closed without an audience/client ID', async () => {
  await assert.rejects(
    verifyOcidIdToken('x'.repeat(32), { environment: 'live', jwks: async () => null }),
    /OCID_CLIENT_ID/,
  );
});

test('x-user-session is never accepted as authentication', async () => {
  let databaseCalled = false;
  const fakeSupabase = {
    from() {
      databaseCalled = true;
      throw new Error('database must not be called without a cookie');
    },
  };

  const session = await verifySession(
    {
      headers: {
        'x-user-session': Buffer.from(JSON.stringify({ role: 'organizer' })).toString('base64'),
      },
    },
    { supabaseClient: fakeSupabase },
  );

  assert.equal(session, null);
  assert.equal(databaseCalled, false);
});

test('event ownership rejects organizers without a chapter', () => {
  assert.throws(
    () => assertEventOwnership({ role: 'organizer', chapter_id: null }, { chapter_id: 'chapter-a' }),
    /chapter/i,
  );
});

test('event ownership rejects a different chapter', () => {
  assert.throws(
    () => assertEventOwnership({ role: 'organizer', chapter_id: 'chapter-a' }, { chapter_id: 'chapter-b' }),
    /own chapter/i,
  );
});

test('event ownership accepts the event chapter organizer', () => {
  assert.doesNotThrow(() =>
    assertEventOwnership(
      { role: 'organizer', chapter_id: 'chapter-a' },
      { chapter_id: 'chapter-a' },
    ),
  );
});

test('QR nonce uniqueness is scoped to each authenticated student', async () => {
  const schema = await readFile(new URL('../api/schema.sql', import.meta.url), 'utf8');
  assert.match(schema, /primary key\s*\(nonce,\s*user_id\)/i);

  const checkinHandler = await readFile(new URL('../api/checkin.js', import.meta.url), 'utf8');
  assert.match(checkinHandler, /p_nonce:\s*nonce,[\s\S]*?p_user_id:\s*session\.user_id/);
});

test('registrations never exposes an unfiltered attendee list', async () => {
  const source = await readFile(new URL('../api/registrations.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /Case 3:[\s\S]*?\.from\('badge_recipients_view'\)[\s\S]*?\.select\('\*'\)/);
  assert.match(source, /An eventId or userId filter is required/);
});

test('client-supplied capacity is not read by the registration endpoint', async () => {
  const source = await readFile(new URL('../api/registrations.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /const\s*\{\s*eventId\s*,\s*capacity\s*\}\s*=\s*req\.body/);
  assert.match(source, /rpc\('register_for_event'/);
});

test('check-in reserves the achievement atomically before invoking the relayer', async () => {
  const source = await readFile(new URL('../api/checkin.js', import.meta.url), 'utf8');
  const reservationIndex = source.indexOf("rpc('record_qr_checkin'");
  const mintIndex = source.indexOf('mintBadge({');
  assert.ok(reservationIndex >= 0 && mintIndex > reservationIndex);
});

test('claim reserves the achievement atomically before invoking the relayer', async () => {
  const source = await readFile(new URL('../api/claim.js', import.meta.url), 'utf8');
  const reservationIndex = source.indexOf("rpc('reserve_badge_claim'");
  const mintIndex = source.indexOf('mintBadge({');
  assert.ok(reservationIndex >= 0 && mintIndex > reservationIndex);
});

test('relayer fails closed when production credentials are absent', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousMockFlag = process.env.ALLOW_MOCK_MINTING;
  process.env.NODE_ENV = 'production';
  delete process.env.ALLOW_MOCK_MINTING;

  try {
    await assert.rejects(
      mintBadge({
        recipientAddress: '0x1111111111111111111111111111111111111111',
        eventId: '3f74e7d4-06b1-47cf-a9dc-eb7d52b0c531',
        points: 5,
      }),
      /not configured/i,
    );
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousMockFlag === undefined) delete process.env.ALLOW_MOCK_MINTING;
    else process.env.ALLOW_MOCK_MINTING = previousMockFlag;
  }
});
