export function getPublicPortalLink(session, pathname = '/') {
  if (!session) return null;

  if (pathname.startsWith('/admin')) {
    return session.role === 'admin' ? { label: 'Admin Console', to: '/admin' } : null;
  }

  if (pathname.startsWith('/manage')) {
    const hasChapterAccess = Boolean(session.chapterId || session.chapter_id);
    return (session.role === 'organizer' || session.role === 'admin') && hasChapterAccess
      ? { label: 'Organizer Portal', to: '/manage' }
      : null;
  }

  return { label: 'Student Hub', to: '/home' };
}
