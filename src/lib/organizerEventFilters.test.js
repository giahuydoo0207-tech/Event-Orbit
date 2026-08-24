import test from 'node:test';
import assert from 'node:assert/strict';

import {
  countOrganizerEventsByTab,
  filterOrganizerEventsByTab,
  isOrganizerEventManageable,
} from './organizerEventFilters.js';

const now = new Date('2026-08-24T12:00:00Z');
const events = [
  { id: 'upcoming', datetime: '2026-08-25T12:00:00Z', status: 'published' },
  { id: 'today', datetime: '2026-08-24T18:00:00Z', status: 'pending_review' },
  { id: 'completed', datetime: '2026-08-20T12:00:00Z', status: 'published' },
  { id: 'deleted-draft', datetime: '2026-08-25T12:00:00Z', status: 'draft', deletedAt: '2026-08-23T12:00:00Z' },
];

test('All contains and counts only non-deleted organizer events', () => {
  assert.deepEqual(
    filterOrganizerEventsByTab(events, 'all', now).map((event) => event.id),
    ['upcoming', 'today', 'completed'],
  );
  assert.equal(countOrganizerEventsByTab(events, now).all, 3);
});

test('Deleted contains and counts only deleted organizer events', () => {
  assert.deepEqual(
    filterOrganizerEventsByTab(events, 'deleted', now).map((event) => event.id),
    ['deleted-draft'],
  );
  assert.equal(countOrganizerEventsByTab(events, now).deleted, 1);
});

test('deleted drafts are not manageable organizer events', () => {
  assert.equal(isOrganizerEventManageable(events[3]), false);
  assert.equal(isOrganizerEventManageable(events[0]), true);
});
