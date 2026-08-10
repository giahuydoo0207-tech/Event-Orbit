import React from 'react';
import { Navigate } from 'react-router-dom';
import { useOrganizerSession } from '../contexts/OrganizerSessionContext';

export function ManageHub() {
  const organizerSession = useOrganizerSession();
  if (!organizerSession?.chapterId) {
    return <Navigate to="/login" replace />;
  }
  return (
    <Navigate
      to={`/manage/${encodeURIComponent(organizerSession.chapterId)}`}
      replace
    />
  );
}

export default ManageHub;
