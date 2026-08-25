export function getFeedViewState({ requestedKey, loadedKey, status, eventCount }) {
  if (status === 'loading' || loadedKey !== requestedKey) return 'loading';
  if (status === 'error') return 'error';
  return eventCount === 0 ? 'empty' : 'ready';
}
