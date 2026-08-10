import { CHAPTERS } from './mockData';
import { resolveChapterFromEvents } from '../lib/chapterResolution';

export function getAuthHeaders() {
  return { 'Content-Type': 'application/json' };
}

async function parseErrorMessage(res, fallback) {
  try {
    const errData = await res.json();
    return errData.error || errData.details || fallback;
  } catch (e) {
    return fallback;
  }
}

export async function fetchServerSession() {
  const res = await fetch('/api/auth/login', {
    method: 'GET',
    credentials: 'include'
  });
  if (!res.ok) {
    const error = new Error(await parseErrorMessage(res, 'Authentication required.'));
    error.status = res.status;
    throw error;
  }

  const { user } = await res.json();
  if (!user || !['student', 'organizer'].includes(user.role)) {
    throw new Error('Server returned an invalid session identity.');
  }
  if (user.role === 'organizer' && !/^[0-9a-f-]{36}$/i.test(user.chapterId || '')) {
    throw new Error('Organizer session is not assigned to a valid chapter.');
  }
  return user;
}

// ── Event Endpoints ──

export async function fetchEvents(options = {}) {
  const params = new URLSearchParams();
  if (options.includeDeleted) params.append('includeDeleted', 'true');
  if (options.chapterId) params.append('chapterId', options.chapterId);

  const queryString = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`/api/events${queryString}`, {
    headers: getAuthHeaders(),
    credentials: 'include'
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Failed to load events.'));
  }

  return await res.json();
}

export async function deleteEventApi(eventId) {
  const res = await fetch(`/api/events?id=${eventId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include'
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Failed to delete event.'));
  }

  return await res.json();
}

export async function fetchEventById(id) {
  const events = await fetchEvents();
  return events.find(e => e.id === id) || null;
}

export async function fetchEventBySlug(slug) {
  const events = await fetchEvents();
  return events.find(e => e.slug === slug) || null;
}

export async function createEventApi(eventData) {
  const res = await fetch('/api/events', {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(eventData)
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Failed to store event in database.'));
  }

  return await res.json();
}

// ── Registration & Check-in Endpoints ──

export async function registerForEvent(eventId, student) {
  const event = await fetchEventById(eventId);
  const capacity = event ? event.capacity : 50;

  try {
    const res = await fetch('/api/registrations', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ eventId, student, capacity })
    });
    if (res.ok) {
      const newReg = await res.json();
      return { success: true, registration: newReg };
    } else {
      const errorData = await res.json().catch(() => ({}));
      return { success: false, error: errorData.error || 'Registration failed.' };
    }
  } catch (e) {
    return { success: false, error: e.message || 'Network error during registration.' };
  }
}

export async function checkInStudent(qrData, student) {
  try {
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ qrData })
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, txHash: data.txHash, points: data.points };
    } else {
      const errorData = await res.json().catch(() => ({}));
      return { success: false, error: errorData.error || 'Check-in failed.' };
    }
  } catch (e) {
    return { success: false, error: e.message || 'Network error during check-in.' };
  }
}

// ── Student Achievement Endpoints ──

export async function fetchStudentAchievements(student) {
  const res = await fetch('/api/achievements', {
    headers: getAuthHeaders(),
    credentials: 'include'
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Failed to load achievements.'));
  }

  const data = await res.json();
  const totalPoints = (data.achievements || []).reduce((sum, item) => sum + item.points, 0);
  return { achievements: data.achievements || [], totalPoints };
}

export async function fetchStudentAchievementsByOcid(ocid) {
  const res = await fetch(`/api/achievements?public=1&ocid=${encodeURIComponent(ocid)}`);
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Failed to load achievements.'));
  }

  const data = await res.json();
  const totalPoints = (data.achievements || []).reduce((sum, item) => sum + item.points, 0);
  return { achievements: data.achievements || [], totalPoints };
}

// ── Organizer Endpoints ──

export async function fetchOrganizerEvents(chapterId, includeDeleted = false) {
  const events = await fetchEvents({ includeDeleted, chapterId });

  const activeEvents = includeDeleted ? events : events.filter(e => !e.deletedAt);

  return Promise.all(activeEvents.map(async event => {
    // The hardened registrations API requires an event scope and verifies
    // ownership before returning attendee data.
    const eventRegs = await fetchEventAttendees(event.id);
    // Events only ever carry a real Postgres UUID now (see the long-term
    // stability plan) — no slug/legacyId fallback needed here.
    const attendedCount = eventRegs.filter(r => r.checkedIn).length;
    return {
      ...event,
      registeredCount: eventRegs.length,
      attendedCount
    };
  }));
}

export async function fetchEventAttendees(eventId) {
  const res = await fetch(`/api/registrations?eventId=${encodeURIComponent(eventId)}`, {
    credentials: 'include'
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Failed to load attendees.'));
  }
  return await res.json();
}

export async function fetchRegistrationsByUser(user) {
  if (!user) return [];
  const userId = user.ocid || user.mssv || user.ethAddress;

  const res = await fetch(`/api/registrations?userId=${encodeURIComponent(userId)}`, {
    credentials: 'include'
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Failed to load your registrations.'));
  }
  return await res.json();
}

// Helper to match an event to a chapter across UUID, slug, and legacy chapter IDs
// (chapters themselves still use a mix of UUID/slug — this is a separate,
// intentional mapping, not the event-legacy-ID pattern that was removed)
export function isEventInChapter(event, chapter) {
  if (!event || !chapter) return false;

  const legacyMap = {
    'org-001': 'fit',
    'org-002': 'arts',
    'org-003': 'hub',
    'org-004': 'youth',
    'fit': 'org-001',
    'arts': 'org-002',
    'hub': 'org-003',
    'youth': 'org-004'
  };

  const eChId = String(event.chapterId || '').trim();
  const eChSlug = String(event.chapter?.slug || '').trim();
  const cId = String(chapter.id || '').trim();
  const cSlug = String(chapter.slug || '').trim();

  if (eChId && (eChId === cId || eChId === cSlug)) return true;
  if (eChSlug && (eChSlug === cSlug || eChSlug === cId)) return true;
  if (legacyMap[eChId] && (legacyMap[eChId] === cId || legacyMap[eChId] === cSlug)) return true;
  if (legacyMap[cId] && (legacyMap[cId] === eChId || legacyMap[cId] === eChSlug)) return true;

  return false;
}

// ── Chapter Endpoints ──
// NOTE: chapters still come from the hardcoded CHAPTERS list, not a real
// /api/chapters endpoint. This wasn't in scope for this cleanup pass — flag
// separately if Chapters should be migrated to Supabase like Events were.

export async function fetchChapters() {
  let followersMap = {};
  const res = await fetch('/api/chapters-follow');
  if (res.ok) {
    followersMap = await res.json();
  }

  const events = await fetchEvents();

  return CHAPTERS.map(c => {
    const realEventCount = events.filter(e => !e.deletedAt && isEventInChapter(e, c)).length;
    const followerCount = followersMap[c.id] !== undefined ? followersMap[c.id] : (c.followerCount || 0);
    return {
      ...c,
      eventsHosted: realEventCount,
      followerCount
    };
  });
}

export async function fetchChapterById(id) {
  const chapters = await fetchChapters();
  const knownChapter = chapters.find(c => c.id === id || c.slug === id || c.ocid === id);
  if (knownChapter) return knownChapter;

  const events = await fetchEvents({ chapterId: id });
  return resolveChapterFromEvents(id, events);
}

export async function fetchChapterBySlug(slug) {
  const chapters = await fetchChapters();
  return chapters.find(c => c.slug === slug || c.id === slug) || null;
}

export async function toggleFollowChapter(id, isFollow) {
  const res = await fetch('/api/chapters-follow', {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify({
      chapterId: id,
      action: isFollow ? 'follow' : 'unfollow'
    })
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Failed to toggle follow status.'));
  }

  const data = await res.json();
  return { id, followerCount: data.followerCount };
}

// ── Attendee List Import Endpoint ──

export async function importAttendeesBatchApi(eventId, attendeesBatch) {
  const res = await fetch('/api/import-attendees', {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify({
      eventId,
      attendees: attendeesBatch
    })
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Failed to import attendees.'));
  }

  return await res.json();
}
