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
  assert.equal(isOrganizerNavLinkActive('/manage/explore/events/cyber-security', '/manage/explore'), true);
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
  assert.match(organizerRoutes, /path="\/manage\/explore\/events\/:slug" element=\{<EventDetail \/>\}/);
  assert.doesNotMatch(organizerRoutes, /PublicLayout|Student Hub/);
});

test('EventFeed derives organizer event links from the pathname, not route state', async () => {
  const source = await readFile(new URL('../src/pages/EventFeed.jsx', import.meta.url), 'utf8');
  assert.match(source, /useLocation/);
  assert.match(source, /pathname\.startsWith\('\/manage\/explore'\)/);
  assert.match(source, /`\/manage\/explore\/events\/\$\{event\.slug\}`/);
  assert.match(source, /`\/e\/\$\{event\.slug\}`/);
  assert.doesNotMatch(source, /location\.state/);
});

test('organizer event detail returns to Explore Events while public detail keeps its public back link', async () => {
  const source = await readFile(new URL('../src/pages/EventDetail.jsx', import.meta.url), 'utf8');
  assert.match(source, /pathname\.startsWith\('\/manage\/explore\/events\/'\)/);
  assert.match(source, /Back to Explore Events/);
  assert.match(source, /Back to Events/);
  assert.match(source, /backTo=\{isOrganizerExploreDetail \? '\/manage\/explore' : '\/events'\}/);
});

test('public events route remains in PublicLayout', async () => {
  const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

  assert.match(
    appSource,
    /path="\/events" element=\{<PublicLayout><EventFeed \/><\/PublicLayout>\}/,
  );
  assert.match(appSource, /path="\/e\/:slug" element=\{<PublicLayout><EventDetail \/><\/PublicLayout>\}/);
});
