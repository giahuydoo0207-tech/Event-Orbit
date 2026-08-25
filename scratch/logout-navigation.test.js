import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

test('logout clears client identity and intent state while awaiting server logout', async () => {
  const previousLocalStorage = globalThis.localStorage;
  const previousSessionStorage = globalThis.sessionStorage;
  const previousFetch = globalThis.fetch;
  const localStorage = createMemoryStorage({
    'eduai-orbit-session': JSON.stringify({
      state: { user: { isAuthenticated: true, ocid: 'previous-user.edu' } },
      version: 0,
    }),
    ocidReturnTo: '/admin',
  });
  const sessionStorage = createMemoryStorage({ ocidReturnTo: '/manage' });
  let resolveLogout;

  globalThis.localStorage = localStorage;
  globalThis.sessionStorage = sessionStorage;
  globalThis.fetch = () => new Promise((resolve) => {
    resolveLogout = () => resolve({ ok: true });
  });

  try {
    const { useStore } = await import(`../src/store/useStore.js?logout-test=${Date.now()}`);
    useStore.getState().setUser({ isAuthenticated: true, ocid: 'previous-user.edu' });

    const logoutPromise = useStore.getState().logout();

    assert.equal(useStore.getState().user.isAuthenticated, false);
    assert.equal(useStore.getState().user.ocid, null);
    assert.equal(sessionStorage.getItem('ocidReturnTo'), null);
    assert.equal(localStorage.getItem('ocidReturnTo'), null);
    assert.ok(logoutPromise instanceof Promise);

    resolveLogout();
    await logoutPromise;
    assert.doesNotMatch(localStorage.getItem('eduai-orbit-session') || '', /previous-user\.edu/);
  } finally {
    globalThis.localStorage = previousLocalStorage;
    globalThis.sessionStorage = previousSessionStorage;
    globalThis.fetch = previousFetch;
  }
});

test('layouts await logout before navigating and public session failure clears stale auth', async () => {
  const publicLayout = await readFile(new URL('../src/layouts/PublicLayout.jsx', import.meta.url), 'utf8');
  const dashboardLayout = await readFile(new URL('../src/layouts/DashboardLayout.jsx', import.meta.url), 'utf8');

  assert.match(publicLayout, /const handleLogout = async \(\) => \{\s*setVerifiedSession\(null\);\s*await logout\(\);\s*navigate\('\/', \{ replace: true \}\);/);
  assert.match(dashboardLayout, /const handleLogout = async \(\) => \{\s*await logout\(\);\s*navigate\('\/', \{ replace: true \}\);/);
  assert.match(publicLayout, /catch\(\(\) => \{[\s\S]*?logout\(\{ skipRequest: true \}\)/);
});

test('credential reconnect waits for logout before starting a new OCID login', async () => {
  const claimBadge = await readFile(new URL('../src/pages/ClaimBadge.jsx', import.meta.url), 'utf8');

  assert.match(
    claimBadge,
    /const reconnect = async \(\) => \{\s*await logout\(\);\s*ocAuth\.signInWithRedirect/,
  );
});

test('logout endpoint clears the cookie even if session deletion fails', async () => {
  const source = await readFile(new URL('../api/auth/logout.js', import.meta.url), 'utf8');
  const clearCookieIndex = source.indexOf('clearSessionCookieHeader(res)');
  const deleteIndex = source.indexOf("from('sessions').delete()");

  assert.ok(clearCookieIndex >= 0);
  assert.ok(deleteIndex >= 0);
  assert.ok(clearCookieIndex < deleteIndex);
});
