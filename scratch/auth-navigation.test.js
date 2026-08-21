import assert from 'node:assert/strict';
import test from 'node:test';
import { getPostLoginDestination } from '../src/lib/authNavigation.js';

const multiRoleSession = {
  role: 'admin',
  chapterId: 'chapter-1',
  permissions: { student: true, organizer: true, admin: true },
};

test('admin and organizer account honors each explicit login intent', () => {
  assert.equal(getPostLoginDestination(multiRoleSession, '/admin'), '/admin');
  assert.equal(getPostLoginDestination(multiRoleSession, '/manage'), '/manage');
  assert.equal(getPostLoginDestination(multiRoleSession, '/home'), '/home');
});

test('non-admin cannot enter admin and safely falls back to Student Hub', () => {
  const organizer = { permissions: { student: true, organizer: true, admin: false } };
  assert.equal(getPostLoginDestination(organizer, '/admin'), '/home');
});

test('non-organizer cannot enter manage and safely falls back to Student Hub', () => {
  const student = { permissions: { student: true, organizer: false, admin: false } };
  assert.equal(getPostLoginDestination(student, '/manage'), '/home');
});

test('unknown roles and unrecognized destinations receive a safe fallback', () => {
  assert.equal(getPostLoginDestination(multiRoleSession, '/events'), '/home');
  assert.equal(getPostLoginDestination(multiRoleSession, 'https://example.com'), '/home');
  assert.equal(getPostLoginDestination(null, '/admin'), '/home');
});
