export function mapAchievementRecord(record) {
  const relatedEvent = record.event || record.events;
  const event = Array.isArray(relatedEvent) ? relatedEvent[0] : relatedEvent;
  const eventId = record.event_id;

  return {
    id: record.id,
    credentialId: record.credential_id,
    eventId,
    eventName: event?.name || 'Verified Event Attendance',
    points: Number(record.points) || 0,
    earnedAt: record.checked_in_at,
    txHash: record.tx_hash,
    mintStatus: record.mint_status,
    ocid: record.ocid,
    badgeImage: event?.cover_image || `https://picsum.photos/seed/badge-${eventId}/150/150`,
  };
}
