import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EVENT_STATUS,
  getEventTransition,
  isPublicEvent,
  organizerCanEdit,
} from '../lib/eventWorkflow.js';

test('only published events are public', () => {
  assert.equal(isPublicEvent({ status: EVENT_STATUS.PUBLISHED, deleted_at: null }), true);
  for (const status of ['draft', 'pending_review', 'rejected', 'approved', 'archived']) {
    assert.equal(isPublicEvent({ status, deleted_at: null }), false);
  }
});

test('organizer cannot publish or edit an event outside draft/rejected', () => {
  assert.equal(organizerCanEdit({ status: 'draft' }), true);
  assert.equal(organizerCanEdit({ status: 'rejected' }), true);
  assert.equal(organizerCanEdit({ status: 'approved' }), false);
  assert.throws(() => getEventTransition('approved', 'publish', 'organizer'));
});

test('review transitions enforce role and rejection reason', () => {
  assert.equal(getEventTransition('draft', 'submit', 'organizer').status, 'pending_review');
  assert.equal(getEventTransition('pending_review', 'approve', 'admin').status, 'approved');
  assert.equal(getEventTransition('approved', 'publish', 'admin').status, 'published');
  assert.throws(() => getEventTransition('pending_review', 'approve', 'organizer'));
  assert.throws(() => getEventTransition('pending_review', 'reject', 'admin', '  '));
  assert.equal(getEventTransition('pending_review', 'reject', 'admin', 'Needs a venue').status, 'rejected');
});
