export const SESSION_COOKIE_NAME = 'session';

const COOKIE_ATTRIBUTES = 'HttpOnly; Secure; SameSite=Lax; Path=/';

export function serializeSessionCookie(token, maxAgeSeconds) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) {
    throw new Error('Session token must be a 64-character hexadecimal value.');
  }
  if (!Number.isInteger(maxAgeSeconds) || maxAgeSeconds <= 0) {
    throw new Error('Session cookie Max-Age must be a positive integer.');
  }
  return `${SESSION_COOKIE_NAME}=${token}; ${COOKIE_ATTRIBUTES}; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE_NAME}=; ${COOKIE_ATTRIBUTES}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function setSessionCookieHeader(res, token, maxAgeSeconds) {
  res.setHeader('Set-Cookie', serializeSessionCookie(token, maxAgeSeconds));
}

export function clearSessionCookieHeader(res) {
  res.setHeader('Set-Cookie', clearSessionCookie());
}

export function readSessionToken(rawCookie = '') {
  return String(rawCookie)
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1) || null;
}
