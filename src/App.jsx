import React, { lazy, Suspense } from 'react';
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
const StudentCheckin = lazy(() => import('./pages/StudentCheckin'));

function App() {
  return (
    <>
    <Router>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-text-secondary text-sm">Loading...</div>}>
      <Routes>
        {/* ── Public Routes ── */}
        <Route path="/" element={<PublicLayout><Landing /></PublicLayout>} />
        <Route path="/events" element={<PublicLayout><EventFeed /></PublicLayout>} />
        <Route path="/e/:slug" element={<PublicLayout><EventDetail /></PublicLayout>} />
        <Route path="/chapters" element={<PublicLayout><ChapterList /></PublicLayout>} />
        <Route path="/chapters/:slug" element={<PublicLayout><ChapterProfile /></PublicLayout>} />
        <Route path="/u/:ocid" element={<PublicLayout><PublicProfile /></PublicLayout>} />

        {/* Student Self-check-in screen (standalone, no layout) */}
        <Route path="/student-checkin.html" element={<StudentCheckin />} />
        <Route path="/student-checkin" element={<StudentCheckin />} />

        {/* Auth callback handlers (no layout) */}
        <Route path="/login" element={<Login />} />
        <Route path="/redirect" element={<Redirect />} />

        {/* ── Authenticated Student Routes ── */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Homepage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-events"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <MyEvents />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DashboardStudent />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/following"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Following />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* ── Organizer Protected Routes ── */}
        {/* All /manage/* routes are gated with requireRole="organizer" */}
        <Route
          path="/manage"
          element={
            <ProtectedRoute requireRole="organizer">
              <DashboardLayout>
                <ManageHub />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/manage/:chapterId"
          element={
            <ProtectedRoute requireRole="organizer">
              <DashboardLayout>
                <ChapterManage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/manage/:chapterId/events/create"
          element={
            <ProtectedRoute requireRole="organizer">
              <DashboardLayout>
                <EventCreate />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/manage/:chapterId/events/:id"
          element={
            <ProtectedRoute requireRole="organizer">
              <DashboardLayout>
                <EventManage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        {/* ── Catch-All 404 Route ── */}
        <Route path="*" element={<NotFoundState title="Page not found" backTo="/" />} />
      </Routes>
      </Suspense>
    </Router>
    <ToastContainer />
    </>
  );
}

export default App;
