import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { isOrganizerNavLinkActive } from '../src/lib/organizerNavigation.js';

test('organizer sidebar selects only the route-specific navigation item', () => {
  assert.equal(isOrganizerNavLinkActive('/manage', '/manage'), true);
  assert.equal(isOrganizerNavLinkActive('/manage', '/manage/explore'), false);

  assert.equal(isOrganizerNavLinkActive('/manage/chapter-1', '/manage'), true);
  assert.equal(isOrganizerNavLinkActive('/manage/chapter-1/events/create', '/manage'), true);

  assert.equal(isOrganizerNavLinkActive('/manage/explore', '/manage'), false);
  assert.equal(isOrganizerNavLinkActive('/manage/explore', '/manage/explore'), true);
});

test('Organizer Portal Explore Events links to an organizer-scoped route', async () => {
  const dashboardSource = await readFile(
    new URL('../src/layouts/DashboardLayout.jsx', import.meta.url),
    'utf8',
  );

  assert.match(dashboardSource, /label: 'Explore Events', path: '\/manage\/explore'/);
  assert.doesNotMatch(dashboardSource, /label: 'Explore Events', path: '\/events'/);
});

test('organizer Explore Events renders EventFeed inside the Organizer Portal shell', async () => {
  const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const organizerRoutes = appSource.slice(
    appSource.indexOf('Organizer Protected Routes'),
    appSource.indexOf('Catch-All 404 Route'),
  );

  assert.match(organizerRoutes, /requireRole="organizer"/);
  assert.match(organizerRoutes, /<DashboardLayout \/>/);
  assert.match(organizerRoutes, /path="\/manage\/explore" element=\{<EventFeed \/>\}/);
  assert.doesNotMatch(organizerRoutes, /PublicLayout|Student Hub/);
});

test('public events route remains in PublicLayout', async () => {
  const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

  assert.match(
    appSource,
    /path="\/events" element=\{<PublicLayout><EventFeed \/><\/PublicLayout>\}/,
  );
});
