import React, { lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Eagerly loaded — entry points & small shared components
import Login from './pages/Login';
import Redirect from './pages/Redirect';
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import NotFoundState from './components/NotFoundState';
import ToastContainer from './components/ToastContainer';

// Lazily loaded — split into separate chunks per route
const Landing = lazy(() => import('./pages/Landing'));
const EventFeed = lazy(() => import('./pages/EventFeed'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const ChapterList = lazy(() => import('./pages/ChapterList'));
const ChapterProfile = lazy(() => import('./pages/ChapterProfile'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const Homepage = lazy(() => import('./pages/Homepage'));
const MyEvents = lazy(() => import('./pages/MyEvents'));
const Following = lazy(() => import('./pages/Following'));
const DashboardStudent = lazy(() => import('./pages/DashboardStudent'));
const ManageHub = lazy(() => import('./pages/ManageHub'));
const ChapterManage = lazy(() => import('./pages/ChapterManage'));
const EventCreate = lazy(() => import('./pages/EventCreate'));
const EventManage = lazy(() => import('./pages/EventManage'));
const EventHistory = lazy(() => import('./pages/EventHistory'));
const StudentCheckin = lazy(() => import('./pages/StudentCheckin'));
const ClaimBadge = lazy(() => import('./pages/ClaimBadge'));
const AdminReview = lazy(() => import('./pages/AdminReview'));

function App() {
  return (
    <>
      <Router>
        <Routes>
          {/* ── Public Routes ── */}
          <Route path="/" element={<PublicLayout><Landing /></PublicLayout>} />
          <Route path="/events" element={<PublicLayout><EventFeed /></PublicLayout>} />
          <Route path="/e/:slug" element={<PublicLayout><EventDetail /></PublicLayout>} />
          <Route path="/chapters" element={<PublicLayout><ChapterList /></PublicLayout>} />
          <Route path="/chapters/:slug" element={<PublicLayout><ChapterProfile /></PublicLayout>} />
          <Route path="/u/:ocid" element={<PublicLayout><PublicProfile /></PublicLayout>} />
          <Route path="/claim/:token" element={<ClaimBadge />} />

          {/* Student Self-check-in screen (standalone, no layout) */}
          <Route path="/student-checkin.html" element={<StudentCheckin />} />
          <Route path="/student-checkin" element={<StudentCheckin />} />

          {/* Auth callback handlers (no layout) */}
          <Route path="/login" element={<Login />} />
          <Route path="/redirect" element={<Redirect />} />

          {/* ── Authenticated Student Routes (Shared Persistent DashboardLayout) ── */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/home" element={<Homepage />} />
            <Route path="/my-events" element={<MyEvents />} />
            <Route path="/dashboard" element={<DashboardStudent />} />
            <Route path="/following" element={<Following />} />
            <Route path="/following/chapters/:slug" element={<ChapterProfile />} />
          </Route>

          <Route element={<ProtectedRoute requireRole="admin"><DashboardLayout /></ProtectedRoute>}>
            <Route path="/admin" element={<AdminReview />} />
          </Route>

          {/* ── Organizer Protected Routes (Shared Persistent DashboardLayout) ── */}
          <Route
            element={
              <ProtectedRoute requireRole="organizer">
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/manage" element={<ManageHub />} />
            <Route path="/manage/explore" element={<EventFeed />} />
            <Route path="/manage/explore/events/:slug" element={<EventDetail />} />
            <Route path="/manage/:chapterId" element={<ChapterManage />} />
            <Route path="/manage/:chapterId/events/create" element={<EventCreate />} />
            <Route path="/manage/:chapterId/events/:id" element={<EventManage />} />
            <Route path="/manage/:chapterId/history" element={<EventHistory />} />
            <Route path="/manage/:chapterId/history/:eventId" element={<EventHistory />} />
          </Route>

          {/* ── Catch-All 404 Route ── */}
          <Route path="*" element={<NotFoundState title="Page not found" backTo="/" />} />
        </Routes>
      </Router>
      <ToastContainer />
    </>
  );
}

export default App;
