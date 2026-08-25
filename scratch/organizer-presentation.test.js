import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const layout = read('src/layouts/DashboardLayout.jsx');
const app = read('src/App.jsx');
const manageHub = read('src/pages/ManageHub.jsx');
const chapterManage = read('src/pages/ChapterManage.jsx');
const eventCreate = read('src/pages/EventCreate.jsx');

assert.match(layout, /label: 'Manage Chapters', path: '\/manage'/);
assert.match(layout, /label: 'Explore Events', path: '\/manage\/explore'/);
assert.match(layout, /isManageSection \? 'organizer-portal'/);

const organizerRoutes = app.slice(app.indexOf('Organizer Protected Routes'), app.indexOf('Catch-All 404 Route'));
assert.match(organizerRoutes, /path="\/manage\/explore" element=\{<EventFeed \/>\}/);
assert.doesNotMatch(organizerRoutes, /Student Hub|Admin Console|PublicLayout/);

for (const [name, source] of [['Manage Hub', manageHub], ['Chapter Manage', chapterManage], ['Event Create', eventCreate]]) {
  assert.doesNotMatch(source, /rounded-\[(?:32|36)px\]/, `${name} must use the organizer radius scale`);
}

for (const action of ['Create New Event', 'Import &amp; Issue Credentials', 'Event History', 'Export CSV']) {
  assert.ok(chapterManage.includes(action), `Missing organizer action: ${action}`);
}
assert.match(chapterManage, /\{ id: 'deleted', label: 'Deleted'/);
assert.doesNotMatch(eventCreate, /handleEnhanceContent|isAiGenerating/);
assert.equal(eventCreate.match(/Event Cover Image/g)?.length, 1);
assert.match(eventCreate, /const themeStyle = THEMES\[selectedTheme\] \|\| THEMES\.Minimal/);

console.log('Organizer presentation regression checks passed.');
