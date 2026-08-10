export function getOrganizerManagePath(organizerSession) {
  const chapterId = organizerSession?.chapterId;
  return chapterId ? `/manage/${encodeURIComponent(chapterId)}` : '/login';
}

export function getOrganizerChapterRedirect(routeChapterId, organizerSession) {
  if (!organizerSession?.chapterId) return '/login';
  if (routeChapterId === organizerSession.chapterId) return null;
  return getOrganizerManagePath(organizerSession);
}
