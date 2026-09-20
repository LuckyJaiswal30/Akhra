# 2. Clerk holds the sign-in, Akhra holds the role

**Status:** Accepted · 2026

## Context

A government portal needs email/password, one-time codes, Google sign-in, session revocation and
password resets, in two languages, with no security holes. None of that is the problem Akhra was
built to solve.

## Decision

Clerk owns authentication: credentials, sessions, verification emails, Google. Akhra owns
**authorisation**: the `users` row, its role, its district or organisation. On each request the
Clerk user id is looked up in `users.clerk_user_id`, and only a **verified** email may claim a row.

## Alternatives

- **Auth.js with our own tables.** Tried first; dropped. Password reset, verification emails,
  session revocation and Google linking became the largest source of bugs in the project.
- **Roles in Clerk metadata.** Would put the thing that decides access outside our database, where
  row-level security cannot read it and an audit cannot trace it.

## Consequences

- Nothing a person types can produce a role: sign-up creates a citizen, and every other role comes
  from a signed invitation or the one-time `admin:bootstrap` command. A test walks the source to
  prove no other file assigns `super_admin`.
- Clerk's free tier carries the demo; a production instance needs a domain the team controls (see
  [0007](0007-no-paid-dependencies.md)).
- If Clerk is ever replaced, the seam is `src/server/identity.ts` and `src/server/clerk.ts`.
