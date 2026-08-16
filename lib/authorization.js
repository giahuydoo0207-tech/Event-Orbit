export class AuthorizationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export function assertOrganizer(session) {
  if (!session || (session.role !== 'organizer' && session.role !== 'admin')) {
    throw new AuthorizationError('Organizer access required.');
  }
  if (session.role !== 'admin' && !session.chapter_id) {
    throw new AuthorizationError('Organizer session is not assigned to a chapter.');
  }
}

export function assertAdmin(session) {
  if (!session || session.role !== 'admin') {
    throw new AuthorizationError('Admin access required.');
  }
}

export function assertEventOwnership(session, event) {
  if (session?.role === 'admin') {
    return; // Superuser access
  }
  assertOrganizer(session);
  if (!event || event.chapter_id !== session.chapter_id) {
    throw new AuthorizationError('You can only manage events for your own chapter.');
  }
}
