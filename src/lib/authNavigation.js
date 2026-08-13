const ROLE_DESTINATIONS = {
  admin: new Set(['/admin', '/manage', '/dashboard']),
  organizer: new Set(['/manage', '/dashboard']),
  student: new Set(['/dashboard']),
};

const ROLE_HOME = {
  admin: '/admin',
  organizer: '/manage',
  student: '/dashboard',
};

export function getPostLoginDestination(role, requestedDestination) {
  const allowedDestinations = ROLE_DESTINATIONS[role];
  const fallback = ROLE_HOME[role] || ROLE_HOME.student;

  return allowedDestinations?.has(requestedDestination)
    ? requestedDestination
    : fallback;
}
