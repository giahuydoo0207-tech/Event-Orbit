import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { getPostLoginDestination } from '../src/lib/authNavigation.js';
import { resolveVerifiedPermissions } from '../lib/sessionPermissions.js';

const multiRoleSession = {
  role: 'admin',
  chapterId: 'chapter-1',
  permissions: { student: true, organizer: true, admin: true },
};

test('admin and organizer account honors each explicit login intent', () => {
  assert.equal(getPostLoginDestination(multiRoleSession, '/admin'), '/admin');
  assert.equal(getPostLoginDestination(multiRoleSession, '/manage'), '/manage');
  assert.equal(getPostLoginDestination(multiRoleSession, '/home'), '/home');
});

test('non-admin cannot enter admin and safely falls back to Student Hub', () => {
  const organizer = { permissions: { student: true, organizer: true, admin: false } };
  assert.equal(getPostLoginDestination(organizer, '/admin'), '/home');
});

test('non-organizer cannot enter manage and safely falls back to Student Hub', () => {
  const student = { permissions: { student: true, organizer: false, admin: false } };
  assert.equal(getPostLoginDestination(student, '/manage'), '/home');
});

test('unknown roles and unrecognized destinations receive a safe fallback', () => {
  assert.equal(getPostLoginDestination(multiRoleSession, '/events'), '/home');
  assert.equal(getPostLoginDestination(multiRoleSession, 'https://example.com'), '/home');
  assert.equal(getPostLoginDestination(null, '/admin'), '/home');
});

test('active admin grant wins even when the stored session role is organizer', async () => {
  const queries = [];
  const supabase = {
    from(table) {
      return {
        select() {
          return {
            eq(column, value) {
              queries.push({ table, column, value });
              return {
                eq(statusColumn, status) {
                  assert.equal(statusColumn, 'status');
                  assert.equal(status, 'active');
                  return {
                    async maybeSingle() {
                      return table === 'admin_users'
                        ? { data: { ocid: 'giahuydoo0207.edu' }, error: null }
                        : { data: { chapter_id: 'chapter-1' }, error: null };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  const permissions = await resolveVerifiedPermissions(supabase, {
    role: 'organizer',
    ocid: '  GIAHUYDOO0207.EDU ',
  });

  assert.deepEqual(permissions, { student: true, organizer: true, admin: true });
  assert.deepEqual(queries, [
    { table: 'admin_users', column: 'ocid', value: 'giahuydoo0207.edu' },
    { table: 'chapter_organizers', column: 'ocid', value: 'giahuydoo0207.edu' },
  ]);
});

test('Redirect persists and routes with the returned permissions object', async () => {
  const redirect = await readFile(new URL('../src/pages/Redirect.jsx', import.meta.url), 'utf8');
  assert.match(redirect, /permissions:\s*verifiedUser\.permissions/);
  assert.match(redirect, /destination\s*=\s*getPostLoginDestination\(verifiedUser,\s*returnTo\)/);
  assert.doesNotMatch(redirect, /getPostLoginDestination\(verifiedUser\.role/);
});
