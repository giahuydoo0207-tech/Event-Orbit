export function getOrganizerEventTimeStatus(event, now = new Date()) {
  if (event.deletedAt) return 'deleted';
  if (!event.datetime) return 'completed';

  const eventDate = new Date(event.datetime);
  const isToday =
    eventDate.getDate() === now.getDate()
    && eventDate.getMonth() === now.getMonth()
    && eventDate.getFullYear() === now.getFullYear();

  if (isToday) return 'ongoing';
  if (eventDate > now) return 'upcoming';
  return 'completed';
}

export function countOrganizerEventsByTab(events, now = new Date()) {
  const counts = {
    all: 0,
    upcoming: 0,
    ongoing: 0,
    completed: 0,
    deleted: 0,
  };

  events.forEach((event) => {
    const status = getOrganizerEventTimeStatus(event, now);
    counts[status] += 1;
    if (status !== 'deleted') counts.all += 1;
  });

  return counts;
}

export function filterOrganizerEventsByTab(events, activeTab, now = new Date()) {
  return events.filter((event) => {
    const status = getOrganizerEventTimeStatus(event, now);
    return activeTab === 'all' ? status !== 'deleted' : status === activeTab;
  });
}

export function isOrganizerEventManageable(event) {
  return !event.deletedAt;
}
