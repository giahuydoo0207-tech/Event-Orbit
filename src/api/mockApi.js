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

function getAuthHeaders() {
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

export async function fetchEvents() {
  initDB();
  await delay();
  try {
    const res = await fetch('/api/events');
    if (res.ok) {
      const dynamicEvents = await res.json();
      const combined = [...dynamicEvents, ...initialEvents];
      const seen = new Set();
      return combined.filter(e => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      });
    }
  } catch (e) {
    console.warn('Vercel KV fetchEvents failed, falling back to localStorage:', e);
  }
  return JSON.parse(localStorage.getItem(KEYS.EVENTS)) || [];
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
  await delay(800);

  const localEvents = JSON.parse(localStorage.getItem(KEYS.EVENTS)) || [];
  let totalCount = localEvents.length;
  try {
    const res = await fetch('/api/events');
    if (res.ok) {
      const dynamicEvents = await res.json();
      totalCount = dynamicEvents.length + initialEvents.length;
    }
  } catch (e) {}

  const newId = String(totalCount + 101);
  const slug = eventData.name
    ? eventData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    : `event-${newId}`;
  
  const newEvent = {
    ...eventData,
    id: newId,
    slug,
    registered: 0,
    coverImage: eventData.coverImage || `https://picsum.photos/seed/evt-${newId}/800/400`
  };

  try {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'same-origin',
      body: JSON.stringify(newEvent)
    });
    if (res.ok) {
      const created = await res.json();
      return created || newEvent;
    } else {
      const errData = await res.json().catch(() => ({}));
      console.warn('Backend event creation returned status', res.status, errData);
    }
  } catch (e) {
    console.warn('Vercel createEventApi failed, falling back to localStorage:', e);
  }

  const events = JSON.parse(localStorage.getItem(KEYS.EVENTS)) || [];
  events.unshift(newEvent);
  localStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
  return newEvent;
}

// ── Registration & Check-in Endpoints ──

export async function registerForEvent(eventId, student) {
  initDB();
  await delay(700);

  const event = await fetchEventById(eventId);
  const capacity = event ? event.capacity : 50;

  try {
    const res = await fetch('/api/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, student, capacity })
    });
    if (res.ok) {
      const newReg = await res.json();
      return { success: true, registration: newReg };
    } else {
      const errorData = await res.json();
      return { success: false, error: errorData.error || 'Registration failed.' };
    }
  } catch (e) {
    console.warn('Vercel KV registerForEvent failed, falling back to localStorage:', e);
  }

  const regs = JSON.parse(localStorage.getItem(KEYS.REGISTRATIONS)) || [];
  const exists = regs.find(r => r.eventId === eventId && (
    (r.ethAddress && r.ethAddress.toLowerCase() === student.ethAddress?.toLowerCase()) ||
    (r.mssv && r.mssv === student.mssv)
  ));

  if (exists) {
    return { success: false, error: 'You have already registered for this event.' };
  }

  const currentCount = regs.filter(r => r.eventId === eventId).length;
  if (currentCount >= capacity) {
    return { success: false, error: 'This event is full.' };
  }

  const newReg = {
    id: `REG-${Math.floor(Math.random() * 90000 + 10000)}`,
    eventId,
    studentName: student.fullName || 'Anonymous Student',
    ocid: student.ocid || null,
    ethAddress: student.ethAddress || null,
    mssv: student.mssv || null,
    checkedIn: false,
    checkedInAt: null
  };

  regs.push(newReg);
  localStorage.setItem(KEYS.REGISTRATIONS, JSON.stringify(regs));

  const events = JSON.parse(localStorage.getItem(KEYS.EVENTS)) || [];
  const ev = events.find(e => e.id === eventId);
  if (ev) {
    ev.registered = (ev.registered || 0) + 1;
    localStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
  }

  return { success: true, registration: newReg };
}

export async function checkInStudent(qrData, student) {
  initDB();
  await delay(1000);

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
      const errorData = await res.json();
      return { success: false, error: errorData.error || 'Check-in failed.' };
    }
  } catch (e) {
    console.warn('Vercel KV checkInStudent failed, falling back to localStorage:', e);
  }

  // Local storage offline fallback logic
  let eventId = qrData;
  try {
    const decoded = JSON.parse(atob(qrData));
    eventId = decoded.eventId;
  } catch (e) {}

  const event = await fetchEventById(eventId);
  if (!event) return { success: false, error: 'Event not found' };

  const regs = JSON.parse(localStorage.getItem(KEYS.REGISTRATIONS)) || [];
  const achievements = JSON.parse(localStorage.getItem(KEYS.ACHIEVEMENTS)) || [];

  const alreadyCheckedIn = achievements.some(a => a.eventId === eventId && (
    (a.studentWallet && a.studentWallet.toLowerCase() === student.ethAddress?.toLowerCase()) ||
    (a.ocid && a.ocid === student.ocid)
  ));

  if (alreadyCheckedIn) {
    return { success: false, error: 'You have already checked in for this event.' };
  }

  let reg = regs.find(r => r.eventId === eventId && (
    (r.ethAddress && r.ethAddress.toLowerCase() === student.ethAddress?.toLowerCase()) ||
    (r.mssv && r.mssv === student.mssv)
  ));

  if (reg && reg.checkedIn) {
    return { success: false, error: 'You have already checked in for this event.' };
  }

  const checkInTime = new Date().toISOString();
  if (!reg) {
    reg = {
      id: `REG-${Math.floor(Math.random() * 90000 + 10000)}`,
      eventId,
      studentName: student.fullName || `Student ${student.mssv || student.ocid || 'Guest'}`,
      ocid: student.ocid || null,
      ethAddress: student.ethAddress || null,
      mssv: student.mssv || null,
      checkedIn: true,
      checkedInAt: checkInTime
    };
    regs.push(reg);
  } else {
    reg.checkedIn = true;
    reg.checkedInAt = checkInTime;
  }

  const txHash = '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');

  const newAch = {
    id: `ACH-${Math.floor(Math.random() * 90000 + 10000)}`,
    studentWallet: student.ethAddress || null,
    ocid: student.ocid || null,
    eventName: event.name,
    eventId: eventId,
    points: event.points,
    earnedAt: reg.checkedInAt,
    txHash,
    badgeImage: `https://picsum.photos/seed/badge-${eventId}/150/150`
  };

  achievements.unshift(newAch);

  localStorage.setItem(KEYS.REGISTRATIONS, JSON.stringify(regs));
  localStorage.setItem(KEYS.ACHIEVEMENTS, JSON.stringify(achievements));

  const localEvents = JSON.parse(localStorage.getItem(KEYS.EVENTS)) || [];
  const localEv = localEvents.find(e => e.id === eventId);
  if (localEv) {
    if (!regs.find(r => r.eventId === eventId)) {
      localEv.registered = (localEv.registered || 0) + 1;
    }
    localStorage.setItem(KEYS.EVENTS, JSON.stringify(localEvents));
  }

  return { success: true, txHash, achievement: newAch };
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

export async function fetchOrganizerEvents(chapterId) {
  initDB();
  await delay();
  const events = await fetchEvents();
  let regs = [];
  try {
    const res = await fetch('/api/registrations');
    if (res.ok) {
      regs = await res.json();
    }
  } catch (e) {
    regs = JSON.parse(localStorage.getItem(KEYS.REGISTRATIONS)) || [];
  }

  const filteredEvents = chapterId
    ? events.filter(e => e.chapterId === chapterId)
    : events;

  return filteredEvents.map(event => {
    const eventRegs = regs.filter(r => r.eventId === event.id);
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

  const localChapters = JSON.parse(localStorage.getItem(KEYS.CHAPTERS)) || CHAPTERS;

  return localChapters.map(c => {
    if (followersMap[c.id] !== undefined) {
      return { ...c, followerCount: followersMap[c.id] };
    }
    return c;
  });
}

export async function fetchChapterById(id) {
  const chapters = await fetchChapters();
  return chapters.find(c => c.id === id) || null;
}

export async function fetchChapterBySlug(slug) {
  const chapters = await fetchChapters();
  return chapters.find(c => c.slug === slug) || null;
}

export async function toggleFollowChapter(id, isFollow) {
  initDB();
  await delay(200);

  try {
    const res = await fetch('/api/chapters-follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapterId: id,
        action: isFollow ? 'follow' : 'unfollow'
      })
    });
    if (res.ok) {
      const data = await res.json();
      const localChapters = JSON.parse(localStorage.getItem(KEYS.CHAPTERS)) || CHAPTERS;
      const chIdx = localChapters.findIndex(c => c.id === id);
      if (chIdx !== -1) {
        localChapters[chIdx].followerCount = data.followerCount;
        localStorage.setItem(KEYS.CHAPTERS, JSON.stringify(localChapters));
        return localChapters[chIdx];
      }
    }
  } catch (e) {
    console.warn('Vercel KV toggleFollowChapter failed, falling back to localStorage:', e);
  }

  const chapters = JSON.parse(localStorage.getItem(KEYS.CHAPTERS)) || CHAPTERS;
  const chIdx = chapters.findIndex(c => c.id === id);
  if (chIdx !== -1) {
    if (isFollow) {
      chapters[chIdx].followerCount += 1;
    } else {
      chapters[chIdx].followerCount = Math.max(0, chapters[chIdx].followerCount - 1);
    }
    localStorage.setItem(KEYS.CHAPTERS, JSON.stringify(chapters));
    return chapters[chIdx];
  }
  return null;
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
