# 11. Tests run against their own database

**Status:** Accepted · 2026

## Context

Several functions under test act on **every** row they can see: escalation, reminders,
auto-closing. Run against the development database, they escalated real demo reports and filled
real inboxes — and the demo data had to be rebuilt.

## Decision

Tests run against `<database>_test` (or `TEST_DATABASE_URL`). Vitest's global setup creates it if
missing, applies every migration and loads the districts before any suite runs.

## Alternatives

- **One database with careful cleanup.** One forgotten cleanup and the demo data is wrong in a way
  nobody notices until the demo.
- **Mock the database.** Then row-level security — the thing most worth testing — is not tested at
  all.

## Consequences

- `pnpm test` is safe to run at any moment, including minutes before a demo.
- The RLS suite tests the real policies, because it runs against a real schema.
- A scheduled job must still never be tested by passing a future `now`: that acts on every matching
  row. Backdate the fixture instead.
