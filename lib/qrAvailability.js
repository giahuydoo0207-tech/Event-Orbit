export function getQrAvailability(event) {
  if (!event) return { available: false, status: 404, code: 'EVENT_NOT_FOUND', message: 'Event not found.' };
  if (event.status !== 'published') {
    return {
      available: false,
      status: 409,
      code: 'EVENT_NOT_PUBLISHED',
      message: 'QR check-in is only available for published events.',
    };
  }
  return { available: true, status: 200, code: 'QR_AVAILABLE', message: null };
}
