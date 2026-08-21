import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
const getInitialUser = () => {
  return {
    isAuthenticated: false,
    method: null,
    ocid: null,
    ethAddress: null,
    mssv: null,
    fullName: null,
    email: null,
    role: null,
    permissions: null,
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
        return { user: newUser };
      }),

      logout: ({ skipRequest = false } = {}) => {
        // Clear session on backend in background
        if (!skipRequest) fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(err => console.error('Backend logout failed:', err));

        set(() => {
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
              permissions: null,
              followedChapterIds: [],
              joinedAt: 'September 2025'
            }
          };
        });
      },

      // ── Follow Chapter Actions ──
      followChapter: (chapterId) => set((state) => {
        const followed = state.user.followedChapterIds || [];
        if (followed.includes(chapterId)) return {};
        const updatedFollowed = [...followed, chapterId];
        const updatedUser = { ...state.user, followedChapterIds: updatedFollowed };
        return { user: updatedUser };
      }),

      unfollowChapter: (chapterId) => set((state) => {
        const followed = state.user.followedChapterIds || [];
        const updatedFollowed = followed.filter(id => id !== chapterId);
        const updatedUser = { ...state.user, followedChapterIds: updatedFollowed };
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
      // Authentication is server-owned. Persist preferences and public event cache only.
      partialize: (state) => ({
        user: { ...getInitialUser(), followedChapterIds: state.user.followedChapterIds },
        events: state.events,
      }),
    }
  )
);

export default useStore;
