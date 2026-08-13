import assert from 'node:assert/strict';
import fs from 'node:fs';

process.env.SUPABASE_URL ||= 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key';

const { fetchLumaGuests, normalizeLumaGuest, parseLumaEventIdentifier } = await import('../api/import-attendees.js');

assert.equal(parseLumaEventIdentifier('evt-abc_123'), 'evt-abc_123');
assert.equal(parseLumaEventIdentifier('https://luma.com/campus-demo?utm_source=test'), 'campus-demo');
assert.equal(parseLumaEventIdentifier('https://www.luma.com/event/evt-safe'), 'evt-safe');
assert.equal(parseLumaEventIdentifier('http://luma.com/event'), null);
assert.equal(parseLumaEventIdentifier('https://attacker.example/event'), null);

assert.deepEqual(normalizeLumaGuest({
  guest: {
    name: '  Student Name  ',
    email: ' STUDENT@EXAMPLE.EDU ',
    registration_answers: [{ label: 'MSSV', value: ' 20260001 ' }],
    phone_number: 'not-returned'
  }
}), {
  name: 'Student Name',
  email: 'student@example.edu',
  mssv: '20260001'
});

assert.deepEqual(normalizeLumaGuest({ user: { full_name: 'No MSSV', email: 'user@example.edu' } }), {
  name: 'No MSSV',
  email: 'user@example.edu',
  mssv: ''
});

assert.deepEqual(normalizeLumaGuest({ user_name: 'Official Shape', user_email: 'official@example.edu' }), {
  name: 'Official Shape',
  email: 'official@example.edu',
  mssv: ''
});

const handlerSource = fs.readFileSync(new URL('../api/import-attendees.js', import.meta.url), 'utf8');
const previewBranch = handlerSource.slice(
  handlerSource.indexOf("if (mode === 'luma-preview')"),
  handlerSource.indexOf('const issuedList = []')
);
assert.ok(previewBranch.includes('return res.status(200).json'), 'preview must return before import mutations');
assert.equal(/\.insert\(|\.upsert\(|mintBadge\(|randomBytes\(/.test(previewBranch), false, 'preview branch must remain read-only');
assert.equal(previewBranch.includes('claimToken'), false, 'preview must not expose claim tokens');

const previousLumaKey = process.env.LUMA_API_KEY;
delete process.env.LUMA_API_KEY;
await assert.rejects(fetchLumaGuests('evt-demo'), { message: 'Luma integration is not configured.', statusCode: 503 });
if (previousLumaKey) process.env.LUMA_API_KEY = previousLumaKey;

console.log('Luma preview contract: PASS');
