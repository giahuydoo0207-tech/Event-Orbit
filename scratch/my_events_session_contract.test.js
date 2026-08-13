import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('My Events loads registrations from the cookie session without a client identity', async () => {
  const apiClient = await readFile(new URL('../src/api/mockApi.js', import.meta.url), 'utf8');
  const page = await readFile(new URL('../src/pages/MyEvents.jsx', import.meta.url), 'utf8');
  const endpoint = await readFile(new URL('../api/registrations.js', import.meta.url), 'utf8');

  assert.match(apiClient, /fetch\('\/api\/registrations\?mine=1',[\s\S]*?credentials:\s*'include'/);
  assert.doesNotMatch(apiClient, /registrations\?userId=/);
  assert.match(page, /fetchMyEventRegistrations\(\)/);
  assert.doesNotMatch(page, /fetchRegistrationsByUser\(user\.id\)/);
  assert.match(endpoint, /mine\s*===\s*'1'/);
  assert.match(endpoint, /\.eq\('user_id',\s*session\.user_id\)/);
});
