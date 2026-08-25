import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const landingSource = () => readFile(new URL('../src/pages/Landing.jsx', import.meta.url), 'utf8');

test('landing tells the three feature stories in a non-overlapping white section', async () => {
  const source = await landingSource();

  assert.match(source, /Chapter Communities/);
  assert.match(source, /Confirmed Attendance/);
  assert.match(source, /Achievement Portfolio/);
  assert.match(source, /bg-white/);
  assert.doesNotMatch(source, /Value Proposition Cards[\s\S]*?relative -mt-12/);
});

test('landing features use distinct illustrations and alternate on desktop', async () => {
  const source = await landingSource();

  assert.match(source, /feature-chapter-communities\.png/);
  assert.match(source, /feature-confirmed-attendance\.png/);
  assert.match(source, /feature-achievement-portfolio\.png/);
  assert.match(source, /imageSide: 'right'/);
  assert.match(source, /imageSide: 'left'/);
  assert.match(source, /lg:order-2/);
  assert.match(source, /lg:grid-cols-2/);
});

test('landing feature copy stays evidence-based and includes all benefit chips', async () => {
  const source = await landingSource();

  for (const benefit of [
    'Follow chapters',
    'Personalized event feed',
    'Campus communities',
    'QR check-in',
    'Verified participation',
    'Attendance record',
    'Credential records',
    'Student profile',
    'Evidence when available',
  ]) {
    assert.match(source, new RegExp(benefit));
  }

  assert.doesNotMatch(source, /on-chain issuance|everything is on-chain/i);
});
