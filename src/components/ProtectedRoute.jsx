import React from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

export function ProtectedRoute({ children, requireRole }) {
  const user = useStore((state) => state.user);

  if (!user.isAuthenticated) {
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
