import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('EventCreate does not render the unimplemented AI enhancement control', async () => {
  const source = await readFile(new URL('../src/pages/EventCreate.jsx', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /handleEnhanceContent/);
  assert.doesNotMatch(source, /isAiGenerating/);
});
