import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { getPublicPortalLink } from '../src/lib/publicPortalNavigation.js';
import { PublicPortalLink } from '../src/components/PublicPortalLink.js';

test('public portal navigation is role-specific and fails closed', () => {
  assert.deepEqual(getPublicPortalLink({ role: 'admin' }, '/chapters'), { label: 'Student Hub', to: '/home' });
  assert.deepEqual(getPublicPortalLink({ role: 'organizer', chapterId: '123' }, '/chapters/fit'), { label: 'Student Hub', to: '/home' });
  assert.deepEqual(getPublicPortalLink({ role: 'organizer', chapterId: '123' }, '/manage'), { label: 'Organizer Portal', to: '/manage' });
  assert.deepEqual(getPublicPortalLink({ role: 'admin' }, '/admin'), { label: 'Admin Console', to: '/admin' });
  assert.equal(getPublicPortalLink(null, '/chapters'), null);
  assert.equal(getPublicPortalLink({ role: 'student' }, '/admin'), null);
});

test('public chapters header uses the verified server session, not the persisted client role', async () => {
  const source = await readFile(new URL('../src/layouts/PublicLayout.jsx', import.meta.url), 'utf8');
  assert.match(source, /fetchServerSession\(\)/);
  assert.match(source, /<PublicPortalLink\s+session=\{verifiedSession\}\s+pathname=\{location\.pathname\}\s*\/>/);
  assert.doesNotMatch(source, /user\.role\s*===\s*'admin'/);
});

test('the actual public header renders Student Hub for a multi-role account on chapters', () => {
  const markup = renderToStaticMarkup(
    React.createElement(MemoryRouter, null,
      React.createElement(PublicPortalLink, { session: { role: 'admin', chapterId: 'chapter-1' }, pathname: '/chapters' }),
    ),
  );
  assert.match(markup, />Student Hub<\/a>/);
  assert.match(markup, /href="\/home"/);
  assert.doesNotMatch(markup, /Admin Console|href="\/admin"/);
});

test('route context retains authorized manage and admin portal destinations', () => {
  assert.deepEqual(
    getPublicPortalLink({ role: 'organizer', chapterId: 'chapter-1' }, '/manage/chapter-1'),
    { label: 'Organizer Portal', to: '/manage' },
  );
  assert.deepEqual(
    getPublicPortalLink({ role: 'admin', chapterId: 'chapter-1' }, '/admin'),
    { label: 'Admin Console', to: '/admin' },
  );
});

test('public navigation contains no account-specific role override', async () => {
  const source = await readFile(new URL('../src/lib/publicPortalNavigation.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /giahuydoo0207\.edu/i);
  assert.doesNotMatch(source, /displayedOcid/);
});

test('route-context navigation does not modify or special-case account grants', async () => {
  const schema = await readFile(new URL('../api/schema.sql', import.meta.url), 'utf8');
  const blockers = await readFile(new URL('../api/production-blockers-migration.sql', import.meta.url), 'utf8');
  assert.match(schema, /create table admin_users/i);
  assert.match(blockers, /create table if not exists admin_users/i);
});
