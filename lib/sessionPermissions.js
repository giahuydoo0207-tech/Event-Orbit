export function normalizeSessionIdentity(identity = {}) {
  return String(identity.ocid || identity.user_id || '').trim().toLowerCase();
}

export async function resolveVerifiedAccess(supabase, identity = {}) {
  const ocid = normalizeSessionIdentity(identity);
  const student = Boolean(identity.user_id || identity.ocid || identity.mssv);

  if (!ocid) {
    return { permissions: { student, organizer: false, admin: false }, organizerChapterId: null };
  }

  const [adminResult, organizerResult] = await Promise.all([
    supabase.from('admin_users').select('ocid').eq('ocid', ocid).eq('status', 'active').maybeSingle(),
    supabase.from('chapter_organizers').select('chapter_id').eq('ocid', ocid).eq('status', 'active').maybeSingle(),
  ]);

  if (adminResult.error || organizerResult.error) {
    throw adminResult.error || organizerResult.error;
  }

  return {
    permissions: {
      student,
      organizer: Boolean(organizerResult.data?.chapter_id),
      admin: Boolean(adminResult.data),
    },
    organizerChapterId: organizerResult.data?.chapter_id || null,
  };
}

export async function resolveVerifiedPermissions(supabase, identity = {}) {
  const { permissions } = await resolveVerifiedAccess(supabase, identity);
  return permissions;
}
