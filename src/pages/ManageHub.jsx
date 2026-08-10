import React from 'react';
import { Navigate } from 'react-router-dom';
import { useOrganizerSession } from '../contexts/OrganizerSessionContext';
import { getOrganizerManagePath } from '../lib/organizerNavigation';

export function ManageHub() {
  const organizerSession = useOrganizerSession();
  return <Navigate to={getOrganizerManagePath(organizerSession)} replace />;
}

export default ManageHub;
