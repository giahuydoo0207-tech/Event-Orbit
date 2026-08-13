# Phase 2A Tasks

- [x] Add read-only Luma preview mode to the existing import endpoint.
  - Acceptance: auth/ownership checked; no writes/tokens; minimal classified response; configured-key failure is explicit.
  - Verify: focused handler tests and source inspection.
  - Files: `api/import-attendees.js`, `scratch/luma-preview.test.js`.

- [x] Add protected frontend API client and modal source selection.
  - Acceptance: CSV/XLSX behavior remains available; Luma has Preview then explicit Confirm; credentials included.
  - Verify: production build and manual UI flow.
  - Files: `src/api/mockApi.js`, `src/components/AttendeeImportModal.jsx`.

- [x] Run regression and security gates.
  - Acceptance: build and diff pass; API JS count remains 12; no deprecated client session header; no PII logs added.
  - Verify: commands listed in the spec plus safe claim test when configured.
