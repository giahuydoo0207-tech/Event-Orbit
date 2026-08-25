import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const layout = read('src/layouts/DashboardLayout.jsx');
const app = read('src/App.jsx');
const home = read('src/pages/Homepage.jsx');
const myEvents = read('src/pages/MyEvents.jsx');
const achievements = read('src/components/CredentialCard.jsx');
const following = read('src/pages/Following.jsx');
const chapter = read('src/pages/ChapterProfile.jsx');
const studentStyles = read('src/index.css');

for (const [label, path] of [
  ['Home', '/home'],
  ['My Events', '/my-events'],
  ['My Achievements', '/dashboard'],
  ['Following', '/following'],
]) {
  assert.match(layout, new RegExp(`label: '${label}', path: '${path}'`));
}

for (const route of ['/home', '/my-events', '/dashboard', '/following', '/following/chapters/:slug']) {
  assert.ok(app.includes(`path="${route}"`), `Missing protected Student Hub route: ${route}`);
}

for (const state of ["'loading'", "'error'", "'empty'"]) {
  assert.ok(home.includes(`feedViewState === ${state}`), `Home must preserve the ${state} state`);
}
assert.ok(home.includes("getFeedViewState({"), 'Home must derive its view state before showing an empty feed');

assert.doesNotMatch(myEvents, /student-page-mark/, 'My Events must not render a meaningless corner orbit mark');
assert.doesNotMatch(following, /student-page-mark/, 'Following must not render a meaningless corner orbit mark');
assert.doesNotMatch(studentStyles, /\.student-page-mark/, 'Removed corner decoration must not retain unused styling');
for (const [name, source] of [['Home', home], ['My Events', myEvents], ['Achievements', read('src/pages/DashboardStudent.jsx')], ['Following', following]]) {
  assert.doesNotMatch(source, /rounded-3xl|rounded-\[(?:32|36)px\]/, `${name} must use the disciplined Student Hub radius scale`);
}

for (const tab of ['Upcoming', 'Past', 'All Events']) {
  assert.ok(myEvents.includes(`'${tab}'`), `Missing My Events tab: ${tab}`);
}

for (const field of ['Claim status', 'Issuance status', 'Credential ID', 'Transaction']) {
  assert.ok(achievements.includes(field), `Missing truthful credential field: ${field}`);
}
assert.ok(achievements.includes('hasRealTransaction(credential)'), 'Transaction evidence must remain truth-gated');

assert.ok(following.includes('linkTo={`/following/chapters/${chapter.slug}`}'), 'Followed chapter cards must stay in Student Hub context');
assert.ok(chapter.includes("location.pathname.startsWith('/following/chapters/')"), 'Chapter detail must detect Student Hub context');
assert.ok(chapter.includes("isStudentFollowingRoute ? '/following' : '/chapters'"), 'Student chapter detail must return to Following');

const studentNavBlock = layout.slice(layout.indexOf(": [\n        { label: 'Home'"), layout.indexOf('  return ('));
assert.doesNotMatch(studentNavBlock, /Organizer Portal|Admin Console/);

console.log('Student Hub presentation regression checks passed.');
