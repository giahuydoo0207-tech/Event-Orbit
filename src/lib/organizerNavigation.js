export function getOrganizerManagePath(organizerSession) {
  const chapterId = organizerSession?.chapterId || organizerSession?.chapter_id;
  return chapterId ? `/manage/${encodeURIComponent(chapterId)}` : '/login';
}

export function normalizeChapterId(value) {
  if (!value) return '';
  try {
    return decodeURIComponent(String(value)).trim().toLowerCase();
  } catch {
    return String(value).trim().toLowerCase();
  }
}

export function getOrganizerChapterRedirect(routeChapterId, organizerSession) {
  const ownedChapterId = organizerSession?.chapterId || organizerSession?.chapter_id;

  if (!ownedChapterId) return '/login';

  if (normalizeChapterId(routeChapterId) === normalizeChapterId(ownedChapterId)) {
    return null;
  }

  return getOrganizerManagePath(organizerSession);
}