# Spec: Clean Academic Admin Console

## Objective
Redesign only `/admin` into a compact academic governance workspace with four in-page sections: Event Review, Chapter Management, Research & Lookup, and Access Control. Preserve all existing event lifecycle, verified OCID, multi-role, session invalidation, public visibility, claim, and credential behavior.

## Tech Stack and Commands
- React 18, React Router 7, Tailwind CSS 3, Zustand, Vercel functions, Supabase.
- Build: `npm.cmd run build`
- Admin regression: `npm.cmd run test:admin-console`
- Existing auth/event regression: repository Node test scripts selected from `scratch/`
- Diff hygiene: `git diff --check`

## Current Data Contract
- `chapters`: `id`, unique required `slug`, required `name`, unique required `ocid`, optional `description`, optional `category`, optional `avatar_gradient`, `follower_count`, `created_at`.
- No chapter website/domain column exists; the form will not invent one.
- Admin console already reads real review events, chapters, `admin_users`, and `chapter_organizers` through server endpoints.
- No admin-safe general user lookup API exists. No fake users will be shown.
- Credentials can be represented only if an existing admin-safe API already exposes truthful claim/issuance fields; otherwise show an explicit limited state.

## Functional Requirements
1. Global search filters the active section without server request spam.
2. Event Review keeps existing review actions and adds status filters plus searchable event/chapter/status rows.
3. Chapter Management lists real chapters through the existing admin console data and creates one through the consolidated `POST /api/chapters-follow` action `{ action: "createChapter", ... }`.
4. Create Chapter validates server-side: active admin session, trimmed name, normalized unique slug, required category, required unique chapter OCID, optional description. It returns 201 on success, 400/401/403/409 with stable error messages otherwise.
5. Research & Lookup has Events, Chapters, Users / OCID Access, Credentials / Claims tabs. Events, chapters, and verified access use current real data. Credentials/claims show a truthful limited state if no safe current API exists.
6. Access Control preserves current grant/revoke/reactivate/delete behavior and session invalidation.
7. UI uses `rounded-xl` panels, `rounded-lg` controls, `rounded-full` only for badges, light shadows, no cosmic/neon decoration.

## Code Style
```jsx
const filteredRows = useMemo(
  () => rows.filter((row) => matchesAdminSearch(row, query)),
  [rows, query],
);
```
Prefer small pure filter/validation helpers, semantic headings/tables, explicit empty states, and existing toast infrastructure.

## Testing Strategy
- RED first: add source/behavior regression tests for section structure, useful search, radius discipline, endpoint authorization/validation/conflict/insert contract, unchanged protected route and event lifecycle assertions.
- GREEN: implement the smallest API/UI changes needed.
- Verify build, admin test script, relevant auth/event tests, and `git diff --check`.
- Attempt isolated localhost browser QA at desktop and mobile; report truthfully if unavailable.

## Boundaries
- Always: server-side admin authorization and validation; use real existing data; preserve RLS boundary and public event safety.
- Ask first: any schema/RLS migration, auth rule change, dependency addition, or exposure of new personal data.
- Never: mock users/credentials as real, mutate Student/Organizer/Login/Landing/Public UI, weaken multi-role/session rules, or run destructive SQL.

## Success Criteria
- Four usable admin sections, global active-section search, consistent summary cards, responsive scan-friendly lists, and honest empty states.
- Create Chapter rejects non-admin, missing/invalid inputs, duplicate slug/OCID; creates a valid row and refreshes the list.
- Existing event review and access-control actions remain wired to their current APIs.
- No schema migration required under the audited contract.

## Open Questions
- None blocking. The required existing `chapters.ocid` field will be labeled “Chapter OCID”; website is omitted because the schema has no such field.
