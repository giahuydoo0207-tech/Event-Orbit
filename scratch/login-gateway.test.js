import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('login gateway preserves all three role choices and return intents', async () => {
  const source = await readFile(new URL('../src/pages/Login.jsx', import.meta.url), 'utf8');

  for (const [role, destination] of [
    ['Student', '/home'],
    ['Manage', '/manage'],
    ['Admin', '/admin'],
  ]) {
    assert.match(source, new RegExp(`title:\\s*'${role}'[\\s\\S]*?destination:\\s*'${destination}'`));
  }

  assert.match(source, /sessionStorage\.setItem\('ocidReturnTo', destination\)/);
  assert.match(source, /signInWithRedirect\(\{ state: 'opencampus' \}\)/);
});

test('login gateway gives every role the same accessible card treatment', async () => {
  const source = await readFile(new URL('../src/pages/Login.jsx', import.meta.url), 'utf8');

  assert.match(source, /roles\.map/);
  assert.match(source, /focus-visible:ring-2/);
  assert.match(source, /Discover events, check in, and view your credential records\./);
  assert.match(source, /Create events, import attendees, and manage check-ins\./);
  assert.match(source, /Review events, publish approved activities, and protect quality\./);
  assert.doesNotMatch(source, /onClick=\{\(\) => handleOCIDLogin\('\/home'\)\}[\s\S]*?bg-accent-blue/);
});

test('login gateway uses a calm identity-product visual treatment', async () => {
  const source = await readFile(new URL('../src/pages/Login.jsx', import.meta.url), 'utf8');

  assert.match(source, /bg-\[#F5F7FF\]/);
  assert.match(source, /border-\[#DCE3F5\]/);
  assert.match(source, /hover:border-oc-turquoise/);
  assert.doesNotMatch(source, /h-\[620px\]|shadow-\[0_22px_60px_rgba\(0,230,195/);
});

test('login gateway fits desktop viewport and keeps the identity headline intact', async () => {
  const source = await readFile(new URL('../src/pages/Login.jsx', import.meta.url), 'utf8');

  assert.match(source, /lg:h-\[100dvh\]/);
  assert.match(source, /lg:overflow-hidden/);
  assert.match(source, /lg:h-full/);
  assert.match(source, /lg:min-h-0/);
  assert.match(source, /Open Campus ID/);
  assert.match(source, /lg:whitespace-nowrap/);
  assert.doesNotMatch(source, /lg:text-\[3\.5rem\]/);
});

test('login gateway keeps the landing link with the brand and omits extra bottom visuals', async () => {
  const source = await readFile(new URL('../src/pages/Login.jsx', import.meta.url), 'utf8');

  assert.match(source, /import \{ Link \} from 'react-router-dom'/);
  assert.match(source, /<Link[\s\S]*?to="\/"[\s\S]*?Back to (?:landing|Event Orbit)/);
  assert.match(source, /<header[\s\S]*?Event Orbit[\s\S]*?Choose your workspace[\s\S]*?<Link/);
  assert.match(source, /lg:justify-start/);
  assert.doesNotMatch(source, /Identity access|Workspace access is checked|h-72 w-72|h-44 w-44/);
});
