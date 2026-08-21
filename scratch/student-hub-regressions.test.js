import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { classifyEventTiming } from '../src/lib/eventTiming.js';
import { getStudentIdentityValues } from '../lib/studentIdentity.js';
import { loadStudentHistory } from '../api/registrations.js';

test('chapter detail uses a stable followed-chapter dependency and a Student Hub route', async () => {
  const profile = await readFile(new URL('../src/pages/ChapterProfile.jsx', import.meta.url), 'utf8');
  const following = await readFile(new URL('../src/pages/Following.jsx', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

  assert.doesNotMatch(profile, /\[slug,\s*user\.isAuthenticated,\s*user\.followedChapterIds\]/);
  assert.match(profile, /JSON\.stringify\(user\.followedChapterIds\s*\|\|\s*\[\]\)/);
  assert.match(following, /linkTo=\{`\/following\/chapters\/\$\{chapter\.slug\}`\}/);
  assert.match(app, /path="\/following\/chapters\/:slug"/);
  assert.match(profile, /Back to Following/);
});

test('event timing compares absolute instants and rejects missing dates', () => {
  const now = Date.parse('2026-08-20T12:00:00.000Z');
  assert.equal(classifyEventTiming('2026-08-20T18:59:59+07:00', now), 'past');
  assert.equal(classifyEventTiming('2026-08-20T19:00:00+07:00', now), 'upcoming');
  assert.equal(classifyEventTiming(null, now), 'unknown');
  assert.equal(classifyEventTiming('not-a-date', now), 'unknown');
});

test('student history queries every known session identity without duplicates', () => {
  assert.deepEqual(
    getStudentIdentityValues({ user_id: 'giahuydoo0207.edu', ocid: 'giahuydoo0207.edu', mssv: '21120001' }),
    ['giahuydoo0207.edu', '21120001'],
  );
});

test('multi-role sessions can use their trusted student identity for My Events', () => {
  assert.deepEqual(
    getStudentIdentityValues({ role: 'admin', ocid: 'giahuydoo0207.edu' }),
    ['giahuydoo0207.edu'],
  );
  assert.deepEqual(
    getStudentIdentityValues({ role: 'organizer', user_id: 'student-42' }),
    ['student-42'],
  );
});

test('My Events rejects sessions without a trusted student identity', () => {
  assert.deepEqual(getStudentIdentityValues({ role: 'admin' }), []);
});

test('registrations requires authentication before serving My Events', async () => {
  const endpoint = await readFile(new URL('../api/registrations.js', import.meta.url), 'utf8');
  const authenticationCheck = endpoint.indexOf('if (!session)');
  const mineBranch = endpoint.indexOf("if (mine === '1')");

  assert.notEqual(authenticationCheck, -1);
  assert.notEqual(mineBranch, -1);
  assert.ok(authenticationCheck < mineBranch);
  assert.match(endpoint.slice(authenticationCheck, mineBranch), /res\.status\(401\)/);
});

test('My Events queries only trusted identities and deduplicates matching records', async () => {
  const ownRow = {
    id: 'own-registration',
    event_id: 'event-1',
    user_id: 'student-42',
    ocid: 'student-42',
  };
  const otherRow = { id: 'other-registration', event_id: 'event-2', ocid: 'student-99' };
  const calls = [];
  const rows = [ownRow, otherRow];
  const supabase = {
    from(table) {
      assert.equal(table, 'badge_recipients_view');
      return {
        select(columns) {
          assert.equal(columns, '*');
          return {
            async in(column, identities) {
              calls.push({ column, identities });
              return {
                data: rows.filter((row) => identities.includes(row[column])),
                error: null,
              };
            },
          };
        },
      };
    },
  };

  const result = await loadStudentHistory(supabase, ['student-42']);

  assert.deepEqual(calls, [
    { column: 'user_id', identities: ['student-42'] },
    { column: 'ocid', identities: ['student-42'] },
    { column: 'mssv', identities: ['student-42'] },
  ]);
  assert.deepEqual(result, [ownRow]);
  assert.equal(result.some((row) => row.id === otherRow.id), false);
});
