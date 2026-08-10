export function getOrganizerManagePath(organizerSession) {
  return organizerSession?.chapterId || organizerSession?.chapter_id ? '/manage' : '/login';
}

export function getOrganizerChapterRedirect(routeChapterId, organizerSession) {
  if (!organizerSession?.chapterId && !organizerSession?.chapter_id) return '/login';
  return null;
}
