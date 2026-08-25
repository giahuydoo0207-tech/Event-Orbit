import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { fetchServerSession } from '../api/mockApi';
import { LoadingBar } from './LoadingBar';
import { OrganizerSessionProvider } from '../contexts/OrganizerSessionContext';
import { hasVerifiedPermission } from '../lib/authNavigation';

export function ProtectedRoute({ children, requireRole }) {
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  const [serverSession, setServerSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    fetchServerSession()
      .then((verifiedUser) => {
        if (!active) return;
        setServerSession(verifiedUser);
        setUser({ ...verifiedUser, isAuthenticated: true, method: 'ocid' });
      })
      .catch(() => {
        if (active) setServerSession(null);
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => { active = false; };
  }, [requireRole, setUser]);

  if (checkingSession) {
      return <div className="py-24"><LoadingBar className="max-w-[140px] mx-auto" /></div>;
  }
  if (requireRole) {
    if (!serverSession) return <Navigate to="/login" replace />;
    if (!hasVerifiedPermission(serverSession, requireRole)) {
      return <Navigate to={serverSession.role === 'student' ? '/dashboard' : serverSession.role === 'admin' ? '/admin' : '/manage'} replace />;
    }
    return (
      <OrganizerSessionProvider session={serverSession}>
        {children}
      </OrganizerSessionProvider>
    );
  }

  if (!serverSession || !user.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireRole && user.role !== requireRole) {
    // If student tries to access organizer pages, send to student dashboard
    if (user.role === 'student') {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
}
