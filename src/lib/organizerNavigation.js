export function getOrganizerManagePath(organizerSession) {
  return organizerSession?.chapterId || organizerSession?.chapter_id ? '/manage' : '/login';
}

export function getOrganizerChapterRedirect(routeChapterId, organizerSession) {
  if (!organizerSession?.chapterId && !organizerSession?.chapter_id) return '/login';
  return null;
}

export function isOrganizerNavLinkActive(pathname, linkPath) {
  if (linkPath === '/manage/explore') {
    return pathname === linkPath;
  }

  if (linkPath === '/manage') {
    const isExploreRoute =
      pathname === '/manage/explore' || pathname.startsWith('/manage/explore/');
    return !isExploreRoute && (
      pathname === '/manage' || pathname.startsWith('/manage/')
    );
  }

  return pathname === linkPath;
}
