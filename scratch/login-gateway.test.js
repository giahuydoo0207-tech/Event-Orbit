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
