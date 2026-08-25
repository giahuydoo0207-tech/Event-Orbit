import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { getImportEventAvailability } from '../lib/eventWorkflow.js';
import { getStudentIdentityValues, hasTrustedStudentIdentity } from '../lib/studentIdentity.js';
import { CredentialEvidenceRow } from '../src/components/CredentialEvidenceRow.js';

const realHash = `0x${'a'.repeat(64)}`;

test('public event ID and slug reads enforce published non-deleted visibility', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) =>
    readFile(new URL('../api/events.js', import.meta.url), 'utf8'),
  );

  const idBranch = source.slice(source.indexOf('if (targetId)'), source.indexOf('if (slug)'));
  const slugBranch = source.slice(source.indexOf('if (slug)'), source.indexOf('let query'));
  for (const branch of [idBranch, slugBranch]) {
    assert.match(branch, /\.eq\('status',\s*'published'\)/);
    assert.match(branch, /\.is\('deleted_at',\s*null\)/);
  }
});

test('protected management fetch remains separate from public event reads', async () => {
  const { readFile } = await import('node:fs/promises');
  const api = await readFile(new URL('../api/events.js', import.meta.url), 'utf8');
  const client = await readFile(new URL('../src/api/mockApi.js', import.meta.url), 'utf8');
  const page = await readFile(new URL('../src/pages/EventManage.jsx', import.meta.url), 'utf8');

  assert.match(api, /privateRead[\s\S]*?verifySession[\s\S]*?assertEventOwnership/);
  assert.match(client, /fetchManagedEventById/);
  const publicIdFetch = client.slice(client.indexOf('export async function fetchEventById'), client.indexOf('export async function fetchManagedEventById'));
  assert.doesNotMatch(publicIdFetch, /includeDeleted/);
  assert.match(page, /fetchManagedEventById\(id\)/);
});

test('attendee import rejects every non-published or deleted event', () => {
  for (const status of ['draft', 'pending_review', 'approved', 'rejected', 'archived']) {
    assert.deepEqual(getImportEventAvailability({ status, deleted_at: null }), {
      allowed: false,
      status: 409,
      code: 'EVENT_NOT_PUBLISHED',
      message: 'Attendee import is only available for published events.',
    });
  }
  assert.equal(getImportEventAvailability({ status: 'published', deleted_at: '2026-01-01' }).allowed, false);
  assert.equal(getImportEventAvailability({ status: 'published', deleted_at: null }).allowed, true);
});

test('public credential evidence renders off-chain records without explorer links', () => {
  for (const txHash of [null, '', '0xMOCK123', 'invalid']) {
    const markup = renderToStaticMarkup(React.createElement(CredentialEvidenceRow, {
      achievement: { id: 'credential-1', eventName: 'Demo', points: 10, txHash },
    }));
    assert.match(markup, /Not available/);
    assert.doesNotMatch(markup, /blockscout|href=/i);
  }
});

test('public credential evidence links only a real transaction hash', () => {
  const markup = renderToStaticMarkup(React.createElement(CredentialEvidenceRow, {
    achievement: { id: 'credential-1', eventName: 'Demo', points: 10, txHash: realHash },
  }));
  assert.match(markup, /blockscout/);
  assert.match(markup, new RegExp(realHash));
});

test('multi-role sessions can claim only with a trusted student identity', async () => {
  assert.equal(hasTrustedStudentIdentity({ role: 'admin', permissions: { admin: true, student: true }, ocid: 'learner.edu' }), true);
  assert.deepEqual(getStudentIdentityValues({ role: 'organizer', user_id: 'student-1' }), ['student-1']);
  assert.equal(hasTrustedStudentIdentity({ role: 'admin', permissions: { admin: true }, ocid: null, user_id: null, mssv: null }), false);

  const { readFile } = await import('node:fs/promises');
  const server = await readFile(new URL('../api/claim.js', import.meta.url), 'utf8');
  const client = await readFile(new URL('../src/pages/ClaimBadge.jsx', import.meta.url), 'utf8');
  assert.match(server, /hasTrustedStudentIdentity\(session\)/);
  assert.doesNotMatch(server, /session\.role !== 'student'/);
  assert.match(client, /hasTrustedStudentIdentity\(user\)/);
});
