# Spec and Implementation Plan: Luma Pull Preview and Confirm

## Objective
Allow an authenticated organizer to choose Luma in the existing attendee import modal, enter a Luma event URL or ID, preview a minimal normalized attendee list without mutations, and explicitly confirm through the existing import/issue/claim flow.

## API Contract
- `POST /api/import-attendees` with `{ mode: "luma-preview", eventId, lumaEvent }` returns `{ ok, source, attendees, summary }`.
- Preview attendee fields are limited to `name`, `email`, `mssv`, `status`, and `reason`; no claim token or raw Luma payload is returned.
- Existing `{ eventId, attendees }` requests remain unchanged and perform Confirm/import mutations.
- Missing server-side `LUMA_API_KEY` returns HTTP 503 with `Luma integration is not configured.`

## Commands
- Build: `npm run build`
- Claim regression: `npm run test:claim` when a safe test database/session is available
- Static gates: `git diff --check`, count API JS files, and search for the deprecated client session header.

## Project Structure and Style
- Extend `api/import-attendees.js`; do not add an API function.
- Extend `src/api/mockApi.js` for the protected preview request.
- Extend `src/components/AttendeeImportModal.jsx` while preserving current CSV/XLSX behavior and OC brand classes.
- Use existing JavaScript/React conventions, `credentials: 'include'`, server-only environment access, bounded inputs, and field allowlists.

## Testing Strategy
- Add focused non-mutating contract tests for input parsing/normalization and preview response safety where the existing harness permits.
- Run the production build and static security/function-count gates.
- Treat live Luma and DB mutation checks as manual/integration tests requiring configured credentials.

## Boundaries
- Always: verify session, organizer role, and event ownership before Luma fetch or DB reads; cap attendee count; suppress PII logs.
- Ask first: schema changes, dependencies, new functions, webhooks, background sync.
- Never: mutate during Preview, expose Luma key/raw payload, create claim tokens during Preview, use the deprecated client session header, or alter Claim/QR/auth behavior.

## Success Criteria
- CSV/XLSX flow remains backward compatible.
- Luma Preview is read-only and classifies matched, already issued, unmatched, and invalid attendees.
- Confirm alone invokes the existing import flow and creates claim links for unmatched attendees.
- All mandatory verification gates pass or are reported with an evidence-based environment blocker.

## Architecture Decisions
- Reuse the existing import endpoint and mutation path to keep the Vercel function count unchanged.
- Construct all Luma API URLs server-side against the fixed official host; organizer input is parsed only as an event identifier.
- Use the official `x-luma-api-key` server header and a bounded paginated guest-list adapter.
- Do not persist preview state server-side; Confirm submits the normalized preview rows to the already-authorized existing import contract.

## Risks and Mitigations
- Luma response variants: accept only explicit known container/person fields and discard everything else.
- PII exposure: minimal response allowlist and no attendee logging.
- Accidental mutation: preview returns before the existing mutation loop and never calls insert/upsert/mint/token generation.
- Unauthorized cross-chapter import: existing event ownership check runs before either mode.

## Open Questions
- Live Luma verification requires a Plus-scoped `LUMA_API_KEY`; without it the adapter intentionally fails closed.
