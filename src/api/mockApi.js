import { initialEvents, initialRegistrations, initialAchievements, CHAPTERS } from './mockData';

// Helper to wait simulating latency
const delay = (ms = 600) => new Promise(resolve => setTimeout(resolve, ms));

// LocalStorage Keys
const KEYS = {
  EVENTS: 'orbit_events_react',
  REGISTRATIONS: 'orbit_registrations_react',
  ACHIEVEMENTS: 'orbit_achievements_react',
  CHAPTERS: 'orbit_chapters_react'
};

export function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const raw = localStorage.getItem('orbit_user_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      const u = parsed?.state?.user || parsed?.user || parsed;
      if (u && (u.isAuthenticated || u.role)) {
        headers['x-user-session'] = btoa(unescape(encodeURIComponent(JSON.stringify(u))));
      }
    }
  } catch (e) {
    console.error('Error generating auth headers:', e);
  }
  return headers;
}

// Database Initialization
export function initDB() {
  // If the user has old Phase 1 database version, force reset
  const eventsRaw = localStorage.getItem(KEYS.EVENTS);
  let forceReset = false;

  if (eventsRaw) {
    try {
      const parsed = JSON.parse(eventsRaw);
      const needsReset = parsed.some(e => !e.slug || e.organizerId);
      if (needsReset) {
        forceReset = true;
      }
    } catch (e) {
      forceReset = true;
    }
  }

  if (forceReset) {
    localStorage.removeItem(KEYS.EVENTS);
    localStorage.removeItem(KEYS.REGISTRATIONS);
    localStorage.removeItem(KEYS.ACHIEVEMENTS);
    localStorage.removeItem(KEYS.CHAPTERS);
  }

  if (!localStorage.getItem(KEYS.EVENTS)) {
    localStorage.setItem(KEYS.EVENTS, JSON.stringify(initialEvents));
  }
  if (!localStorage.getItem(KEYS.REGISTRATIONS)) {
    localStorage.setItem(KEYS.REGISTRATIONS, JSON.stringify(initialRegistrations));
  }
  if (!localStorage.getItem(KEYS.ACHIEVEMENTS)) {
    localStorage.setItem(KEYS.ACHIEVEMENTS, JSON.stringify(initialAchievements));
  }
  if (!localStorage.getItem(KEYS.CHAPTERS)) {
    localStorage.setItem(KEYS.CHAPTERS, JSON.stringify(CHAPTERS));
  }
}

// ── Event Endpoints ──

export async function fetchEvents(options = {}) {
  initDB();
  await delay();
  try {
    const params = new URLSearchParams();
    if (options.includeDeleted) params.append('includeDeleted', 'true');
    if (options.chapterId) params.append('chapterId', options.chapterId);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/events${queryString}`, {
      headers: getAuthHeaders(),
      credentials: 'same-origin'
    });
    if (res.ok) {
      const dynamicEvents = await res.json();
      const combined = [...dynamicEvents, ...initialEvents];
      const seen = new Set();
      return combined.filter(e => {
        if (seen.has(e.id)) return false;
        // Filter out deleted unless requested
        if (!options.includeDeleted && e.deletedAt) return false;
        seen.add(e.id);
        return true;
      });
    }
  } catch (e) {
    console.warn('fetchEvents failed, falling back to localStorage:', e);
  }
  const events = JSON.parse(localStorage.getItem(KEYS.EVENTS)) || [];
  if (!options.includeDeleted) {
    return events.filter(e => !e.deletedAt);
  }
  return events;
}

export async function deleteEventApi(eventId) {
  const res = await fetch(`/api/events?id=${eventId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'same-origin'
  });

  if (!res.ok) {
    let errMessage = 'Failed to delete event.';
    try {
      const errData = await res.json();
      errMessage = errData.error || errMessage;
    } catch (e) {}
    throw new Error(errMessage);
  }

  // Also soft-delete in localStorage fallback
  const events = JSON.parse(localStorage.getItem(KEYS.EVENTS)) || [];
  const ev = events.find(e => e.id === eventId || e.slug === eventId);
  if (ev) {
    ev.deletedAt = new Date().toISOString();
    localStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
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
  initDB();
  await delay(600);

  const res = await fetch('/api/events', {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'same-origin',
    body: JSON.stringify(eventData)
  });

  if (!res.ok) {
    let errMessage = 'Failed to store event in database.';
    try {
      const errData = await res.json();
      errMessage = errData.error || errData.details || errMessage;
    } catch (e) {}
    throw new Error(errMessage);
  }

  const created = await res.json();

  // Save real database record to localStorage cache
  const events = JSON.parse(localStorage.getItem(KEYS.EVENTS)) || [];
  events.unshift(created);
  localStorage.setItem(KEYS.EVENTS, JSON.stringify(events));

  return created;
}

// ── Registration & Check-in Endpoints ──

export async function registerForEvent(eventId, student) {
  initDB();
  await delay(400);

  const event = await fetchEventById(eventId);
  const capacity = event ? event.capacity : 50;

  try {
    const res = await fetch('/api/registrations', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'same-origin',
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
  initDB();
  await delay(600);

  try {
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'same-origin',
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
  initDB();
  await delay();
  try {
    let url = '/api/achievements';
    if (student.ocid) {
      url += `?ocid=${encodeURIComponent(student.ocid)}`;
    } else if (student.ethAddress) {
      url += `?wallet=${encodeURIComponent(student.ethAddress)}`;
    }
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const localAchievements = JSON.parse(localStorage.getItem(KEYS.ACHIEVEMENTS)) || [];
      const filteredLocal = localAchievements.filter(a => {
        const walletMatch = student.ethAddress && a.studentWallet && a.studentWallet.toLowerCase() === student.ethAddress.toLowerCase();
        const ocidMatch = student.ocid && a.ocid && a.ocid === student.ocid;
        return walletMatch || ocidMatch;
      });
      const combined = [...data.achievements, ...filteredLocal];
      const seen = new Set();
      const unique = combined.filter(a => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });
      const totalPoints = unique.reduce((sum, item) => sum + item.points, 0);
      return { achievements: unique, totalPoints };
    }
  } catch (e) {
    console.warn('Vercel KV fetchStudentAchievements failed, falling back to localStorage:', e);
  }

  const achievements = JSON.parse(localStorage.getItem(KEYS.ACHIEVEMENTS)) || [];
  const filtered = achievements.filter(a => {
    const walletMatch = student.ethAddress && a.studentWallet && a.studentWallet.toLowerCase() === student.ethAddress.toLowerCase();
    const ocidMatch = student.ocid && a.ocid && a.ocid === student.ocid;
    return walletMatch || ocidMatch;
  });
  const totalPoints = filtered.reduce((sum, item) => sum + item.points, 0);
  return { achievements: filtered, totalPoints };
}

export async function fetchStudentAchievementsByOcid(ocid) {
  initDB();
  await delay();
  try {
    const res = await fetch(`/api/achievements?ocid=${encodeURIComponent(ocid)}`);
    if (res.ok) {
      const data = await res.json();
      const localAchievements = JSON.parse(localStorage.getItem(KEYS.ACHIEVEMENTS)) || [];
      const filteredLocal = localAchievements.filter(a => a.ocid && a.ocid === ocid);
      const combined = [...data.achievements, ...filteredLocal];
      const seen = new Set();
      const unique = combined.filter(a => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });
      const totalPoints = unique.reduce((sum, item) => sum + item.points, 0);
      return { achievements: unique, totalPoints };
    }
  } catch (e) {
    console.warn('Vercel KV fetchStudentAchievementsByOcid failed, falling back to localStorage:', e);
  }

  const achievements = JSON.parse(localStorage.getItem(KEYS.ACHIEVEMENTS)) || [];
  const filtered = achievements.filter(a => a.ocid && a.ocid === ocid);
  const totalPoints = filtered.reduce((sum, item) => sum + item.points, 0);
  return { achievements: filtered, totalPoints };
}

// ── Organizer Endpoints ──

export async function fetchOrganizerEvents(chapterId, includeDeleted = false) {
  initDB();
  await delay();
  const events = await fetchEvents({ includeDeleted, chapterId });
  let regs = [];
  try {
    const res = await fetch('/api/registrations');
    if (res.ok) {
      regs = await res.json();
    }
  } catch (e) {
    regs = JSON.parse(localStorage.getItem(KEYS.REGISTRATIONS)) || [];
  }

  const activeEvents = includeDeleted ? events : events.filter(e => !e.deletedAt);

  return activeEvents.map(event => {
    const eventRegs = regs.filter(r => r.eventId === event.id || r.eventId === event.slug);
    const attendedCount = eventRegs.filter(r => r.checkedIn).length;
    return {
      ...event,
      registeredCount: eventRegs.length,
      attendedCount
    };
  });
}

export async function fetchEventAttendees(eventId) {
  initDB();
  await delay();
  try {
    const res = await fetch(`/api/registrations?eventId=${encodeURIComponent(eventId)}`);
    if (res.ok) {
      const data = await res.json();
      const localRegs = JSON.parse(localStorage.getItem(KEYS.REGISTRATIONS)) || [];
      const filteredLocal = localRegs.filter(r => r.eventId === eventId);
      const combined = [...data, ...filteredLocal];
      const seen = new Set();
      return combined.filter(r => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
    }
  } catch (e) {}

  const regs = JSON.parse(localStorage.getItem(KEYS.REGISTRATIONS)) || [];
  return regs.filter(r => r.eventId === eventId);
}

export async function fetchRegistrationsByUser(user) {
  initDB();
  await delay(400);
  if (!user) return [];
  const userId = user.ocid || user.mssv || user.ethAddress;
  let apiRegs = [];
  try {
    const res = await fetch(`/api/registrations?userId=${encodeURIComponent(userId)}`);
    if (res.ok) {
      apiRegs = await res.json();
    }
  } catch (e) {}

  const localRegs = JSON.parse(localStorage.getItem(KEYS.REGISTRATIONS)) || [];
  const filteredLocal = localRegs.filter(r => 
    (user.ocid && r.ocid === user.ocid) ||
    (user.ethAddress && r.ethAddress?.toLowerCase() === user.ethAddress?.toLowerCase()) ||
    (user.mssv && r.mssv === user.mssv)
  );

  const combined = [...apiRegs, ...filteredLocal];
  const seen = new Set();
  return combined.filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

// Helper to match an event to a chapter across UUID, slug, and legacy IDs
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

export async function fetchChapters() {
  initDB();
  await delay();
  let followersMap = {};
  try {
    const res = await fetch('/api/chapters-follow');
    if (res.ok) {
      followersMap = await res.json();
    }
  } catch (e) {}

  const events = await fetchEvents();
  const localChapters = JSON.parse(localStorage.getItem(KEYS.CHAPTERS)) || CHAPTERS;

  return localChapters.map(c => {
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
  return chapters.find(c => c.id === id || c.slug === id) || null;
}

export async function fetchChapterBySlug(slug) {
  const chapters = await fetchChapters();
  return chapters.find(c => c.slug === slug || c.id === slug) || null;
}

export async function toggleFollowChapter(id, isFollow) {
  initDB();
  await delay(200);

  const res = await fetch('/api/chapters-follow', {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'same-origin',
    body: JSON.stringify({
      chapterId: id,
      action: isFollow ? 'follow' : 'unfollow'
    })
  });

  if (!res.ok) {
    let errMessage = 'Failed to toggle follow status.';
    try {
      const errData = await res.json();
      errMessage = errData.error || errMessage;
    } catch (e) {}
    throw new Error(errMessage);
  }

  const data = await res.json();
  const localChapters = JSON.parse(localStorage.getItem(KEYS.CHAPTERS)) || CHAPTERS;
  const chIdx = localChapters.findIndex(c => c.id === id);
  if (chIdx !== -1) {
    localChapters[chIdx].followerCount = data.followerCount;
    localStorage.setItem(KEYS.CHAPTERS, JSON.stringify(localChapters));
    return localChapters[chIdx];
  }
  return { id, followerCount: data.followerCount };
}

// ── Attendee List Import Endpoint ──

export async function importAttendeesBatchApi(eventId, attendeesBatch) {
  const res = await fetch('/api/import-attendees', {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'same-origin',
    body: JSON.stringify({
      eventId,
      attendees: attendeesBatch
    })
  });

  if (!res.ok) {
    let errMessage = 'Failed to import attendees.';
    try {
      const errData = await res.json();
      errMessage = errData.error || errMessage;
    } catch (e) {}
    throw new Error(errMessage);
  }

  return await res.json();
}
