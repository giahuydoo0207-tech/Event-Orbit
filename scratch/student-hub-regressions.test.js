import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { classifyEventTiming } from '../src/lib/eventTiming.js';
import { getStudentIdentityValues } from '../lib/studentIdentity.js';

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

