export function classifyEventTiming(datetime, now = Date.now()) {
  if (!datetime) return 'unknown';
  const eventTime = Date.parse(datetime);
  const comparisonTime = now instanceof Date ? now.getTime() : Number(now);
  if (!Number.isFinite(eventTime) || !Number.isFinite(comparisonTime)) return 'unknown';
  return eventTime < comparisonTime ? 'past' : 'upcoming';
}

