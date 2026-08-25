import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { getFeedViewState } from '../src/lib/feedViewState.js';

test('an unresolved feed renders loading instead of the empty state', () => {
  assert.equal(getFeedViewState({
    requestedKey: '[]',
    loadedKey: null,
    status: 'loading',
    eventCount: 0
  }), 'loading');
});

test('a changed feed request does not expose stale empty results', () => {
  assert.equal(getFeedViewState({
    requestedKey: '["chapter-2"]',
    loadedKey: '[]',
    status: 'ready',
    eventCount: 0
  }), 'loading');
});

test('empty is rendered only after the current feed request completes', () => {
  assert.equal(getFeedViewState({
    requestedKey: '["chapter-2"]',
    loadedKey: '["chapter-2"]',
    status: 'ready',
    eventCount: 0
  }), 'empty');
});

test('feed errors remain separate from empty results', () => {
  assert.equal(getFeedViewState({
    requestedKey: '["chapter-2"]',
    loadedKey: '["chapter-2"]',
    status: 'error',
    eventCount: 0
  }), 'error');
});

test('completed feeds with events render the existing card feed', () => {
  assert.equal(getFeedViewState({
    requestedKey: '["chapter-2"]',
    loadedKey: '["chapter-2"]',
    status: 'ready',
    eventCount: 2
  }), 'ready');
});

test('Student Home binds loading, error, and empty UI to the explicit feed state', async () => {
  const homepage = await readFile(new URL('../src/pages/Homepage.jsx', import.meta.url), 'utf8');

  assert.match(homepage, /feedViewState === 'loading'/);
  assert.match(homepage, /feedViewState === 'error'/);
  assert.match(homepage, /feedViewState === 'empty'/);
  assert.doesNotMatch(homepage, /feedEvents\.length === 0\s*\?/);
});
