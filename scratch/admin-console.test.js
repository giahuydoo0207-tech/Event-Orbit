import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { normalizeChapterInput } from '../lib/adminChapters.js';

test('chapter input requires all admin-managed identity fields', () => {
  for (const missing of ['name', 'slug', 'category', 'ocid']) {
    const input = { name: 'AI Society', slug: 'ai-society', category: 'Tech', ocid: 'ai.opencampus.edu' };
    delete input[missing];
    assert.throws(() => normalizeChapterInput(input), /required/i);
  }
});

test('chapter input is normalized and does not accept unsupported website data', () => {
  assert.deepEqual(normalizeChapterInput({
    name: '  AI Society  ',
    slug: ' AI-Society ',
    category: ' Tech ',
    ocid: ' AI.OpenCampus.edu ',
    description: '  Student research group.  ',
    website: 'https://example.com',
  }), {
    name: 'AI Society',
    slug: 'ai-society',
    category: 'Tech',
    ocid: 'ai.opencampus.edu',
    description: 'Student research group.',
  });
  assert.throws(() => normalizeChapterInput({ name: 'AI', slug: 'Not valid!', category: 'Tech', ocid: 'ai.edu' }), /slug/i);
});

test('create chapter endpoint is admin-only and maps duplicate database conflicts', async () => {
  const source = await readFile(new URL('../api/admin/chapters.js', import.meta.url), 'utf8');
  assert.match(source, /verifySession\(req\)/);
  assert.match(source, /assertAdmin\(session\)/);
  assert.match(source, /status\(session\s*\?\s*403\s*:\s*401\)/);
  assert.match(source, /\.from\('chapters'\)[\s\S]*?\.insert\(/);
  assert.match(source, /23505|duplicate/i);
  assert.match(source, /status\(409\)/);
  assert.doesNotMatch(source, /website|domain/i);
});

test('admin console exposes four sections, useful search, and truthful limited state', async () => {
  const source = await readFile(new URL('../src/pages/AdminReview.jsx', import.meta.url), 'utf8');
  for (const section of ['Event Review', 'Chapter Management', 'Research & Lookup', 'Access Control']) {
    assert.match(source, new RegExp(section.replace('&', '\\&')));
  }
  assert.match(source, /Search events, chapters, OCID access, credentials/);
  assert.match(source, /No admin lookup data available yet|Requires admin API support/);
  assert.match(source, /createChapterApi/);
  assert.doesNotMatch(source, /rounded-\[(32|36)px\]/);
  assert.doesNotMatch(source, /neon|cosmic|glow/i);
});

test('admin client API posts chapter creation with the verified session cookie', async () => {
  const source = await readFile(new URL('../src/api/mockApi.js', import.meta.url), 'utf8');
  assert.match(source, /fetch\('\/api\/admin\/chapters'/);
  assert.match(source, /method:\s*'POST'/);
  assert.match(source, /credentials:\s*'include'/);
});

test('admin route remains permission protected and public event rules remain unchanged', async () => {
  const [app, events] = await Promise.all([
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../api/events.js', import.meta.url), 'utf8'),
  ]);
  assert.match(app, /requireRole="admin"[\s\S]*?<AdminReview/);
  assert.match(events, /\.eq\('status', 'published'\)[\s\S]*?\.is\('deleted_at', null\)/);
});
