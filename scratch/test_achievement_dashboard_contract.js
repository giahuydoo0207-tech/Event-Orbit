import assert from 'node:assert/strict';
import { mapAchievementRecord } from '../lib/achievementRecord.js';

const persistedCheckin = {
  id: 'achievement-001',
  event_id: 'event-finance-manage',
  user_id: 'giahuydoo0207.edu',
  ocid: 'giahuydoo0207.edu',
  credential_id: 'cred-001',
  points: 3,
  tx_hash: '0xMOCK123',
  mint_status: 'success',
  checked_in_at: '2026-08-07T10:00:00.000Z',
  events: {
    name: 'Finance Manage',
    cover_image: null,
  },
};

const credential = mapAchievementRecord(persistedCheckin);

assert.deepEqual(credential, {
  id: 'achievement-001',
  credentialId: 'cred-001',
  eventId: 'event-finance-manage',
  eventName: 'Finance Manage',
  points: 3,
  earnedAt: '2026-08-07T10:00:00.000Z',
  txHash: '0xMOCK123',
  mintStatus: 'success',
  ocid: 'giahuydoo0207.edu',
  badgeImage: 'https://picsum.photos/seed/badge-event-finance-manage/150/150',
});

assert.equal([credential].reduce((sum, item) => sum + item.points, 0), 3);
console.log('Achievement dashboard contract: PASS');
