import assert from 'node:assert/strict';
import test from 'node:test';
import { getPostLoginDestination } from '../src/lib/authNavigation.js';

test('admin can continue to every role entry destination', () => {
  assert.equal(getPostLoginDestination('admin', '/admin'), '/admin');
  assert.equal(getPostLoginDestination('admin', '/manage'), '/manage');
  assert.equal(getPostLoginDestination('admin', '/dashboard'), '/dashboard');
});

test('organizer cannot enter admin and falls back to manage', () => {
  assert.equal(getPostLoginDestination('organizer', '/admin'), '/manage');
  assert.equal(getPostLoginDestination('organizer', '/manage'), '/manage');
  assert.equal(getPostLoginDestination('organizer', '/dashboard'), '/dashboard');
});

test('student always falls back to dashboard unless dashboard was requested', () => {
  assert.equal(getPostLoginDestination('student', '/admin'), '/dashboard');
  assert.equal(getPostLoginDestination('student', '/manage'), '/dashboard');
  assert.equal(getPostLoginDestination('student', '/dashboard'), '/dashboard');
});

test('unknown roles and unrecognized destinations receive a safe fallback', () => {
  assert.equal(getPostLoginDestination('admin', '/events'), '/admin');
  assert.equal(getPostLoginDestination('organizer', 'https://example.com'), '/manage');
  assert.equal(getPostLoginDestination('student', null), '/dashboard');
  assert.equal(getPostLoginDestination('unexpected', '/admin'), '/dashboard');
});
