const DESTINATION_PERMISSION = {
  '/home': 'student',
  '/manage': 'organizer',
  '/admin': 'admin',
};

export function hasVerifiedPermission(verifiedUser, permission) {
  return verifiedUser?.permissions?.[permission] === true;
}

export function getPostLoginDestination(verifiedUser, requestedDestination) {
  const requiredPermission = DESTINATION_PERMISSION[requestedDestination];

  return requiredPermission && hasVerifiedPermission(verifiedUser, requiredPermission)
    ? requestedDestination
    : '/home';
}
