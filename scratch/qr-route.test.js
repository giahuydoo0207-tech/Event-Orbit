import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getQrAvailability } from '../lib/qrAvailability.js';

test('QR is available only for published events', () => {
  assert.equal(getQrAvailability({ status: 'published' }).available, true);
  for (const status of ['draft', 'pending_review', 'rejected', 'approved', 'archived']) {
    assert.deepEqual(getQrAvailability({ status }), {
      available: false,
      status: 409,
      code: 'EVENT_NOT_PUBLISHED',
      message: 'QR check-in is only available for published events.',
    });
  }
});

test('QR generation does not persist or reuse a server token', async () => {
  const source = await readFile(new URL('../api/events/[id]/qr.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /from\(['"]qr_nonces['"]\)/);
  assert.match(source, /randomUUID\(\)/);
  assert.match(source, /5 \* 60 \* 1000/);
});

test('QR diagnostics never log payload, nonce, signature, or secret', async () => {
  const source = await readFile(new URL('../api/events/[id]/qr.js', import.meta.url), 'utf8');
  const logCalls = source.match(/writeQrLog\([^;]+/g) || [];
  for (const call of logCalls) {
    assert.doesNotMatch(call, /\{[^}]*\b(qrData|nonce|signature)\b/);
    assert.doesNotMatch(call, /process\.env\.QR_SECRET/);
  }
});

test('event manager stops loading and renders the server QR error', async () => {
  const source = await readFile(new URL('../src/pages/EventManage.jsx', import.meta.url), 'utf8');
  assert.match(source, /if \(!res\.ok\) throw new Error\(data\.error/);
  assert.match(source, /setQrError\(err\.message/);
  assert.match(source, /setIsQrLoading\(false\)/);
  assert.match(source, /Check-in QR unavailable/);
  assert.doesNotMatch(source, /student-checkin\?eventId=/);
});
