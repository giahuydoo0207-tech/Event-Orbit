export class AuthorizationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export function assertOrganizer(session) {
  if (!session || session.role !== 'organizer') {
    throw new AuthorizationError('Organizer access required.');
  }
  if (!session.chapter_id) {
    throw new AuthorizationError('Organizer session is not assigned to a chapter.');
  }
}

export function assertEventOwnership(session, event) {
  assertOrganizer(session);
  if (!event || event.chapter_id !== session.chapter_id) {
    throw new AuthorizationError('You can only manage events for your own chapter.');
  }
}
