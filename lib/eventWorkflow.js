export const EVENT_STATUS = Object.freeze({
  DRAFT: 'draft', PENDING_REVIEW: 'pending_review', REJECTED: 'rejected',
  APPROVED: 'approved', PUBLISHED: 'published', ARCHIVED: 'archived',
});

export function isPublicEvent(event) {
  return event?.status === EVENT_STATUS.PUBLISHED && !event.deleted_at;
}

export function organizerCanEdit(event) {
  return [EVENT_STATUS.DRAFT, EVENT_STATUS.REJECTED].includes(event?.status);
}

export function getImportEventAvailability(event) {
  if (event?.status !== EVENT_STATUS.PUBLISHED || event?.deleted_at) {
    return {
      allowed: false,
      status: 409,
      code: 'EVENT_NOT_PUBLISHED',
      message: 'Attendee import is only available for published events.',
    };
  }
  return { allowed: true, status: 200, code: 'IMPORT_AVAILABLE', message: null };
}

export function getEventTransition(currentStatus, action, actorRole, reason = '') {
  const now = new Date().toISOString();
  if (action === 'submit' && ['organizer', 'admin'].includes(actorRole) && ['draft', 'rejected'].includes(currentStatus)) {
    return { status: EVENT_STATUS.PENDING_REVIEW, rejection_reason: null, reviewed_by: null, reviewed_at: null };
  }
  if (action === 'approve' && actorRole === 'admin' && currentStatus === 'pending_review') {
    return { status: EVENT_STATUS.APPROVED, rejection_reason: null, reviewed_at: now };
  }
  if (action === 'reject' && actorRole === 'admin' && currentStatus === 'pending_review') {
    const rejectionReason = String(reason || '').trim();
    if (!rejectionReason) throw new Error('A rejection reason is required.');
    return { status: EVENT_STATUS.REJECTED, rejection_reason: rejectionReason, reviewed_at: now };
  }
  if (action === 'publish' && actorRole === 'admin' && currentStatus === 'approved') {
    return { status: EVENT_STATUS.PUBLISHED, published_at: now };
  }
  throw new Error('This event transition is not allowed.');
}
