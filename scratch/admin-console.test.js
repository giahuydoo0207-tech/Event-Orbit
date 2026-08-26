import assert from 'node:assert/strict';
import test from 'node:test';
import { access, readdir, readFile } from 'node:fs/promises';
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
  const source = await readFile(new URL('../api/chapters-follow.js', import.meta.url), 'utf8');
  assert.match(source, /action\s*===\s*['"]createChapter['"]/);
  assert.match(source, /verifySession\(req\)/);
  assert.match(source, /assertAdmin\(session\)/);
  assert.match(source, /status\(session\s*\?\s*403\s*:\s*401\)/);
  assert.match(source, /\.from\('chapters'\)[\s\S]*?\.insert\(/);
  assert.match(source, /23505|duplicate/i);
  assert.match(source, /status\(409\)/);
  assert.match(source, /\.eq\('slug', chapter\.slug\)\.maybeSingle\(\)/);
  assert.match(source, /\.eq\('ocid', chapter\.ocid\)\.maybeSingle\(\)/);
  assert.match(source, /status\(201\)\.json\(\{ chapter: data \}\)/);
  assert.doesNotMatch(source, /website|domain/i);
});

test('admin console exposes three focused sections with useful local search', async () => {
  const source = await readFile(new URL('../src/pages/AdminReview.jsx', import.meta.url), 'utf8');
  for (const section of ['Event Review', 'Chapter Management', 'Access Control']) {
    assert.match(source, new RegExp(section.replace('&', '\\&')));
  }
  assert.doesNotMatch(source, /\['research',\s*'Research & Lookup'\]/);
  assert.doesNotMatch(source, /ResearchLookup|lookupTab|LookupRows/);
  assert.match(source, /Search events/);
  assert.match(source, /Search chapters/);
  assert.match(source, /Search OCID, role, or chapter/);
  assert.match(source, /Credential lookup requires a dedicated admin-safe API\./);
  assert.match(source, /data-visual-direction="header-b"/);
  assert.match(source, /data-visual-direction="event-review-g"/);
  assert.match(source, /data-visual-direction="chapter-management-c"/);
  assert.match(source, /data-visual-direction="access-control-h"/);
  assert.match(source, /ACADEMIC GOVERNANCE WORKSPACE/);
  assert.match(source, /border-t-\[6px\].*border-t-oc-navy/);
  assert.match(source, /\+ New Chapter/);
  assert.match(source, /createChapterApi/);
  assert.doesNotMatch(source, /rounded-\[(32|36)px\]/);
  assert.doesNotMatch(source, /neon|cosmic|glow/i);
});

test('admin client API posts chapter creation with the verified session cookie', async () => {
  const source = await readFile(new URL('../src/api/mockApi.js', import.meta.url), 'utf8');
  assert.match(source, /fetch\('\/api\/chapters-follow'/);
  assert.match(source, /method:\s*'POST'/);
  assert.match(source, /credentials:\s*'include'/);
  assert.match(source, /action:\s*'createChapter'/);
  assert.match(source, /chapterOcid:/);
});

test('admin chapter creation is consolidated within the Hobby function limit', async () => {
  await assert.rejects(access(new URL('../api/admin/chapters.js', import.meta.url)));

  async function countJsFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const counts = await Promise.all(entries.map((entry) => {
      const child = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);
      return entry.isDirectory() ? countJsFiles(child) : Number(entry.isFile() && entry.name.endsWith('.js'));
    }));
    return counts.reduce((total, count) => total + count, 0);
  }

  assert.ok(await countJsFiles(new URL('../api/', import.meta.url)) <= 12);
});

test('consolidated endpoint preserves follow and unfollow branches', async () => {
  const source = await readFile(new URL('../api/chapters-follow.js', import.meta.url), 'utf8');
  assert.match(source, /action\s*===\s*['"]follow['"]/);
  assert.match(source, /action\s*===\s*['"]unfollow['"]/);
  assert.match(source, /resolveChapterUuid\(supabase, chapterId\)/);
  assert.match(source, /onConflict:\s*['"]chapter_id,user_id['"]/);
});

test('admin route remains permission protected and public event rules remain unchanged', async () => {
  const [app, events] = await Promise.all([
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../api/events.js', import.meta.url), 'utf8'),
  ]);
  assert.match(app, /requireRole="admin"[\s\S]*?<AdminReview/);
  assert.match(events, /\.eq\('status', 'published'\)[\s\S]*?\.is\('deleted_at', null\)/);
});
