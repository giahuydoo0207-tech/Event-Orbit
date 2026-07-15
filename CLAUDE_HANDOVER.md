# Event Orbit — Claude Handover Report (React Rebuild & Luma Integration)

This document provides a comprehensive summary of the React SPA codebase built for the **Event Orbit** project. It is designed to get another developer or AI assistant (specifically Claude) up to speed with the architecture, code location, mock API layer, and authentication setup.

---

## 1. Project Overview & Architecture

Event Orbit is a student event discovery and verification portal that rewards students with Soulbound Tokens (SBT) representing movement points.
- **Frontend Framework:** React 18 SPA built with Vite.
- **Styling:** Tailwind CSS (traditional PostCSS config) with Open Campus colors (Navy `#1a2a4a`, Accent Blue `#3b82f6`).
- **Typography & Assets:** English labels, `Inter` font, **no icons/emojis** (typography and border-based hierarchy).
- **Session & Routing:** React Router v6, Zustand for global state management.
- **Sandbox Authentication:** Integrates Open Campus ID (OCID) Connect SDK in sandbox mode, alongside a local Student ID (MSSV) fallback.

---

## 2. Key Directories & File Mapping

All source code is located under `/src/`:

```
src/
├── main.jsx                 # Bootstraps React + OCConnect (sandbox mode)
├── App.jsx                  # Route definitions (12 pages/endpoints)
├── index.css                # Tailwind directives
│
├── store/
│   └── useStore.js          # Zustand store (user session, theme, followedOrgIds calendars)
│
├── api/
│   ├── mockData.js          # Seed database (events, ORGANIZERS, registrations, achievements)
│   └── mockApi.js           # CRUD endpoints with simulated network delays (600ms - 1000ms)
│
├── components/
│   └── ProtectedRoute.jsx   # Auth guard restricting organizer portals to organizers
│
├── layouts/
│   ├── PublicLayout.jsx     # Navigation header (Events, Discover, Calendar links) + explore feed layout
│   └── DashboardLayout.jsx  # Side navigation with class toggles for mobile viewports
│
└── pages/
    ├── Homepage.jsx         # Event discovery feed (Upcoming/Past/All) + tagParam query parsing
    ├── Login.jsx            # Gateway containing OCID redirections + MSSV forms
    ├── Redirect.jsx         # OIDC redirect callback endpoint handler (LoginCallBack)
    ├── EventCreate.jsx      # Form with real-time autotag matching + theme live previews
    ├── EventDetail.jsx      # Event profile containing registration, QR modals and scanners
    ├── DashboardStudent.jsx # Student achievement logs + badges wall galleries
    ├── DashboardOrganizer.jsx# Admin metrics (total check-ins) + CSV export report download
    ├── EventManage.jsx      # Attendance console displaying QR codes + manual check-in overrides
    ├── StudentCheckin.jsx   # Standalone check-in verification path matching scanned QR codes
    ├── Discover.jsx         # Category browse chips + host chapters listing tabs [NEW]
    ├── Following.jsx        # Subscribed calendars list + Luma empty states [NEW]
    ├── OrganizerProfile.jsx # Chapter details + follower counts + hosted events list [NEW]
    └── PublicProfile.jsx    # Public OCID achievements profile + explorer transaction receipts [NEW]
```

---

## 3. Core Logic & SDK Integrations

### 3.1 Open Campus ID (OCID) Integration
Initialized in `main.jsx` using `@opencampus/ocid-connect-js`:
- Client ID: `sandbox-demo` (sandbox mode does not require strict domain whitelisting).
- Redirect URI: `http://localhost:5173/redirect`
- Redirection flows:
  - Triggered in `Login.jsx` via `ocAuth.signInWithRedirect({ state: 'opencampus' })`.
  - Resolved in `Redirect.jsx` using the `<LoginCallBack />` component.
  - Fallbacks to a mock student session if run locally without OIDC connectivity to keep the developer demo functional.

### 3.2 Mock API Layer (`src/api/mockApi.js`)
To simulate server behavior during the hackathon frontend phase:
- Functions intercept fetches, interacting with localStorage keys: `orbit_events_react`, `orbit_registrations_react`, `orbit_achievements_react`, `orbit_organizers_react`.
- Methods use `await delay(ms)` to simulate network delays.
- Check-in logic blocks double check-ins by scanning database histories before issuing badges and generating mock transaction receipts.
- **Safety check**: Achievements query functions match strictly by `ocid` route parameters inside `fetchStudentAchievementsByOcid` to prevent account badges leaking between public profile views.

### 3.3 Dynamic 10 Themes System (`src/pages/EventCreate.jsx`)
Themes alter background overlays, borders, and button elements on the event details page. It is defined as:
```javascript
export const THEMES = {
  Minimal:  { bg: 'bg-white', text: 'text-slate-900', ... },
  Confetti: { bg: 'bg-red-50/30', text: 'text-red-950', ... },
  Emoji:    { bg: 'bg-yellow-50/30', text: 'text-yellow-950', ... },
  Pattern:  { bg: 'bg-sky-50/30', text: 'text-sky-950', ... },
  Seasonal: { bg: 'bg-green-50/30', text: 'text-green-950', ... },
  Tech:     { bg: 'bg-slate-900', text: 'text-slate-100', ... },
  Art:      { bg: 'bg-purple-50/30', text: 'text-purple-950', ... },
  Retro:    { bg: 'bg-orange-50/30', text: 'text-orange-950', ... },
  Nature:   { bg: 'bg-lime-50/30', text: 'text-lime-950', ... },
  Festival: { bg: 'bg-pink-50/30', text: 'text-pink-950', ... },
};
```
Real-time binding applies these classes to the preview wrapper in `EventCreate.jsx` and the landing container in `EventDetail.jsx`.

### 3.4 Live Polling & Scanner
- `EventManage.jsx` simulates real-time attendance tracking by polling `fetchEventAttendees` list every 4 seconds.
- `EventDetail.jsx` mounts `Html5QrcodeScanner` inside a modal. When scanned, it parses the query string matching `eventId` to trigger checking-in.

---

## 4. How to run
- Configure `.env` with `VITE_OCID_CLIENT_ID` and `VITE_OCID_REDIRECT_URI`.
- Launch via `npm install && npm run dev`.
- Production bundle can be compiled via `npm run build`.
