import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEMO_ACCOUNTS } from '../api/mockData';

const LOCAL_USER_KEY = 'orbit_user_session';

const getInitialUser = () => {
  try {
    const saved = localStorage.getItem(LOCAL_USER_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate followedOrgIds to followedChapterIds if needed
      if (parsed && !parsed.followedChapterIds) {
        parsed.followedChapterIds = parsed.followedOrgIds || [];
      }
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load user session', e);
  }
  return {
    isAuthenticated: false,
    method: null,
    ocid: null,
    ethAddress: null,
    mssv: null,
    fullName: null,
    email: null,
    role: null,
    followedChapterIds: [], // Chapters (calendars) this user follows
    // TODO: get from real OCID creation timestamp when integrating backend
    joinedAt: 'September 2025'
  };
};

export const useStore = create(
  persist(
    (set, get) => ({
      // ── Authentication State ──
      user: getInitialUser(),

      setUser: (userData) => set((state) => {
        const newUser = { ...state.user, ...userData };
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(newUser));
        return { user: newUser };
      }),

      loginAsDemo: (role) => set((state) => {
        const account = DEMO_ACCOUNTS[role];
        const newUser = {
          ...state.user,
          isAuthenticated: true,
          method: 'mssv',
          mssv: account.mssv,
          ocid: account.ocid,
          fullName: account.fullName,
          role: account.role,
          chapterId: account.chapterId || null,
          email: `${account.mssv.toLowerCase()}@opencampus.org`,
          // Reset followedChapterIds on role switch to avoid mixing demo data
          followedChapterIds: account.role === 'student' ? ['org-001'] : [],
        };
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(newUser));
        return { user: newUser };
      }),

      logout: () => set(() => {
        localStorage.removeItem(LOCAL_USER_KEY);
        return {
          user: {
            isAuthenticated: false,
            method: null,
            ocid: null,
            ethAddress: null,
            mssv: null,
            fullName: null,
            email: null,
            role: null,
            followedChapterIds: [],
            joinedAt: 'September 2025'
          }
        };
      }),

      // ── Follow Chapter Actions ──
      followChapter: (chapterId) => set((state) => {
        const followed = state.user.followedChapterIds || [];
        if (followed.includes(chapterId)) return {};
        const updatedFollowed = [...followed, chapterId];
        const updatedUser = { ...state.user, followedChapterIds: updatedFollowed };
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(updatedUser));
        return { user: updatedUser };
      }),

      unfollowChapter: (chapterId) => set((state) => {
        const followed = state.user.followedChapterIds || [];
        const updatedFollowed = followed.filter(id => id !== chapterId);
        const updatedUser = { ...state.user, followedChapterIds: updatedFollowed };
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(updatedUser));
        return { user: updatedUser };
      }),

      // ── Events State ──
      events: {
        upcoming: [],
        past: [],
        all: [],
        currentEvent: null,
      },

      setEvents: (eventList) => set((state) => {
        const now = new Date();
        const upcoming = eventList.filter(e => new Date(e.datetime) >= now);
        const past = eventList.filter(e => new Date(e.datetime) < now);
        return {
          events: {
            ...state.events,
            all: eventList,
            upcoming,
            past
          }
        };
      }),

      setCurrentEvent: (event) => set((state) => ({
        events: {
          ...state.events,
          currentEvent: event
        }
      })),

      // ── Registrations State ──
      registrations: [],
      setRegistrations: (regs) => set({ registrations: regs }),

      // ── Dashboard View ──
      achievements: [],
      setAchievements: (achs) => set({ achievements: achs })
    }),
    {
      name: 'eduai-orbit-session', // key in localStorage
      storage: createJSONStorage(() => localStorage),
      // Only persist user session & events, ignore transient state
      partialize: (state) => ({
        user: state.user,
        events: state.events,
      }),
    }
  )
);

export default useStore;
