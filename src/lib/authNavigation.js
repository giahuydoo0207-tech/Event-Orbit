const DESTINATION_PERMISSION = {
  '/home': 'student',
  '/manage': 'organizer',
  '/admin': 'admin',
};

export function getPostLoginDestination(verifiedUser, requestedDestination) {
  const requiredPermission = DESTINATION_PERMISSION[requestedDestination];
  const permissions = verifiedUser?.permissions || {};

  return requiredPermission && permissions[requiredPermission] === true
    ? requestedDestination
    : '/home';
}
