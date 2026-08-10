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
import {
  SESSION_COOKIE_NAME,
  clearSessionCookie,
  readSessionToken,
  serializeSessionCookie,
  setSessionCookieHeader,
  clearSessionCookieHeader,
} from '../lib/sessionCookie.js';
import { resolveChapterUuid } from '../lib/resolveChapter.js';
import { resolveChapterFromEvents } from '../src/lib/chapterResolution.js';

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
    { id: 'ab5a59cc-bfb2-43dc-af19-faaa79b732cd' },
  );

  assert.equal(identity.role, 'organizer');
  assert.equal(identity.chapter_id, 'ab5a59cc-bfb2-43dc-af19-faaa79b732cd');
});

test('auth uses chapters as organizer authority and never depends on a users table', async () => {
  const loginSource = await readFile(new URL('../api/auth/login.js', import.meta.url), 'utf8');
  const sessionSource = await readFile(new URL('../lib/verifySession.js', import.meta.url), 'utf8');

  assert.match(loginSource, /\.from\('chapters'\)[\s\S]*?\.eq\('ocid', tokenOcid\)/);
  assert.match(sessionSource, /\.from\('sessions'\)/);
  assert.doesNotMatch(`${loginSource}\n${sessionSource}`, /\.from\('users'\)/);
});

test('production migration creates sessions and seeds the canonical FIT chapter idempotently', async () => {
  const migration = await readFile(
    new URL('../api/production-blockers-migration.sql', import.meta.url),
    'utf8',
  );

  assert.match(migration, /create table if not exists sessions/i);
  assert.match(migration, /ab5a59cc-bfb2-43dc-af19-faaa79b732cd/i);
  assert.match(migration, /fit\.opencampus\.edu/i);
  assert.match(migration, /on conflict\s*\(slug\)\s*do update/i);
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

test('login session cookie is secure and uses the verifier cookie name', () => {
  const token = 'a'.repeat(64);
  const cookie = serializeSessionCookie(token, 604800);

  assert.equal(SESSION_COOKIE_NAME, 'session');
  assert.match(cookie, /^session=a{64};/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Path=\//);
  assert.match(cookie, /Max-Age=604800/);
  assert.equal(readSessionToken(`other=x; ${SESSION_COOKIE_NAME}=${token}`), token);

  let responseHeader;
  setSessionCookieHeader({
    setHeader(name, value) { responseHeader = [name, value]; },
  }, token, 604800);
  assert.deepEqual(responseHeader, ['Set-Cookie', cookie]);
});

test('logout clears the same root-scoped session cookie', () => {
  const cookie = clearSessionCookie();
  assert.match(cookie, /^session=;/);
  assert.match(cookie, /Path=\//);
  assert.match(cookie, /Max-Age=0/);
  assert.match(cookie, /Expires=Thu, 01 Jan 1970 00:00:00 GMT/);

  let responseHeader;
  clearSessionCookieHeader({
    setHeader(name, value) { responseHeader = [name, value]; },
  });
  assert.deepEqual(responseHeader, ['Set-Cookie', cookie]);
});

test('login and logout handlers apply the shared cookie response contract', async () => {
  const loginSource = await readFile(new URL('../api/auth/login.js', import.meta.url), 'utf8');
  const logoutSource = await readFile(new URL('../api/auth/logout.js', import.meta.url), 'utf8');
  const verifierSource = await readFile(new URL('../lib/verifySession.js', import.meta.url), 'utf8');

  assert.match(loginSource, /setSessionCookieHeader\(res, token, 604800\)/);
  assert.match(logoutSource, /clearSessionCookieHeader\(res\)/);
  assert.match(verifierSource, /readSessionToken\(req\.headers\.cookie\)/);
});

test('OCID callback and protected frontend requests include credentials', async () => {
  const redirectSource = await readFile(new URL('../src/pages/Redirect.jsx', import.meta.url), 'utf8');
  const apiSource = await readFile(new URL('../src/api/mockApi.js', import.meta.url), 'utf8');

  assert.match(redirectSource, /fetch\('\/api\/auth\/login',[\s\S]*?credentials:\s*'include'/);
  assert.doesNotMatch(apiSource, /credentials:\s*'same-origin'/);
  assert.match(apiSource, /fetch\(`\/api\/events[\s\S]*?credentials:\s*'include'/);
  assert.match(apiSource, /fetch\(`\/api\/registrations\?eventId=[\s\S]*?credentials:\s*'include'/);
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

test('organizer chapter is resolved from the database chapter joined to its events', () => {
  const chapterId = '3f74e7d4-06b1-47cf-a9dc-eb7d52b0c531';
  const chapter = resolveChapterFromEvents(chapterId, [
    {
      chapterId,
      chapter: {
        id: chapterId,
        slug: 'fit',
        ocid: 'fit.opencampus.edu',
        name: 'IT Department',
      },
    },
  ]);

  assert.equal(chapter?.id, chapterId);
  assert.equal(chapter?.name, 'IT Department');
});

test('unknown chapter input never falls back to another chapter', async () => {
  const query = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: null }),
  };
  const fakeSupabase = { from: () => query };

  assert.equal(await resolveChapterUuid(fakeSupabase, 'wrong-chapter'), null);
});

test('organizer event loading never requests an unscoped attendee list', async () => {
  const source = await readFile(new URL('../src/api/mockApi.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /fetch\(['"]\/api\/registrations['"]\)/);
  assert.match(source, /fetchEventAttendees\(event\.id\)/);
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
