import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('EventCreate does not render the unimplemented AI enhancement control', async () => {
  const source = await readFile(new URL('../src/pages/EventCreate.jsx', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /handleEnhanceContent/);
  assert.doesNotMatch(source, /isAiGenerating/);
});

test('EventCreate renders only the lower Event Cover Image control', async () => {
  const source = await readFile(new URL('../src/pages/EventCreate.jsx', import.meta.url), 'utf8');

  assert.equal(source.match(/Event Cover Image/g)?.length, 1);
  assert.doesNotMatch(source, /Use placeholder/);
  assert.match(source, /Preset \/ Keyword/);
  assert.match(source, /Upload Image File/);
  assert.match(source, /Custom image loaded for preview\./);
});

test('Event Page Theme state controls the live preview theme tokens', async () => {
  const source = await readFile(new URL('../src/pages/EventCreate.jsx', import.meta.url), 'utf8');

  assert.match(source, /const themeStyle = THEMES\[selectedTheme\] \|\| THEMES\.Minimal/);
  assert.match(source, /\$\{themeStyle\.bg\}/);
  assert.match(source, /\$\{themeStyle\.text\}/);
  assert.match(source, /\$\{themeStyle\.border\}/);
  assert.doesNotMatch(source, /themeStyle\.(?:card|badge)/);
});
