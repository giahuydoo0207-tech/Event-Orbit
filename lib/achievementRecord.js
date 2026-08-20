export function mapAchievementRecord(record) {
  const relatedEvent = record.event || record.events;
  const event = Array.isArray(relatedEvent) ? relatedEvent[0] : relatedEvent;
  const eventId = record.event_id;

  return {
    id: record.id,
    credentialId: record.credential_id,
    eventId,
    eventName: event?.name || 'Verified Event Attendance',
    eventDate: event?.datetime || null,
    issuerName: Array.isArray(event?.chapter) ? event.chapter[0]?.name : event?.chapter?.name || null,
    points: record.points === null || record.points === undefined ? null : Number(record.points),
    earnedAt: record.checked_in_at,
    txHash: record.tx_hash,
    mintStatus: record.mint_status,
    claimStatus: 'claimed',
    tokenId: record.token_id,
    ocid: record.ocid,
  };
}
