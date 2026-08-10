export function getCheckinLookupFailureState(error, isAuthenticated) {
  if (error?.status === 401 || error?.status === 403) return 'connect';
  return isAuthenticated ? 'error' : 'connect';
}
