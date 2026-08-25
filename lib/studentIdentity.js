export function getStudentIdentityValues(session = {}) {
  return [...new Set(
    [session.user_id, session.ocid, session.mssv]
      .map((value) => String(value || '').trim())
      .filter(Boolean),
  )];
}

export function hasTrustedStudentIdentity(session = {}) {
  return getStudentIdentityValues(session).length > 0;
}
