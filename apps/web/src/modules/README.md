# Modules

Each folder here is an independently ownable slice of Akhra. A new contributor should be able
to open one folder, read its `README.md`, and start working without reading the rest of the app.

## The one rule

**A module may only be imported through its `index.ts`.**

```ts
import { getPlatformStats } from '@/modules/analytics'; // ✅
import { fetchPlatformStats } from '@/modules/analytics/queries'; // ❌ fails lint
```

This is enforced by a `no-restricted-imports` rule in `eslint.config.mjs`, so a boundary
violation fails CI rather than relying on review to catch it. Anything not exported from
`index.ts` is private to the module and can be changed freely.

## Standard file layout

| File          | Responsibility                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------- |
| `index.ts`    | The module's public API. The only file other modules may import.                                  |
| `service.ts`  | Business logic and writes. Each function checks its own authorization: role, ownership, district. |
| `queries.ts`  | Read paths. Database access lives here, not in components.                                        |
| `actions.ts`  | Server actions for forms, answering in the one error shape.                                       |
| `components/` | React components owned by this module.                                                            |
| `README.md`   | What this module does, its public API, and how to extend it.                                      |

Not every module needs every file — add them as the module grows.

## The modules

| Module           | Owns                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| `citizen`        | Problem submission, attachments, support, the public status tracker                            |
| `classification` | Domain classification, duplicate detection, priority, routing to institutions                  |
| `university`     | Routing responses, student and faculty teams, proposals, institution and faculty expertise     |
| `industry`       | Project discovery, expressions of interest, partnerships                                       |
| `lifecycle`      | Proposal review, milestones, deliverables, tests, status transitions, outcomes and IP          |
| `analytics`      | The state and district dashboards, public impact figures and success stories                   |
| `notifications`  | In-app notification centre, email dispatch, message threads                                    |
| `auth`           | Invitations, organisation onboarding, promotion and the audit log (identity itself is Clerk's) |

## Reading and writing the database

There are exactly two ways to reach the database, and choosing between them is the most important
decision in any service function.

```ts
query(actor, (tx) => …)        // row-level security is on: the database itself hides what this
                               // person may not see. Use this by default.
withoutRls(getDb(), (tx) => …) // row-level security is off: the query can see and change every row.
```

**`withoutRls` is not a shortcut; it is a promise.** Turning row-level security off means the check
is now yours to write, in that function, next to the query. Every call site in this app is one of:

| Why it is safe                              | Examples                                                             |
| ------------------------------------------- | -------------------------------------------------------------------- |
| There is no actor yet                       | linking a Clerk account, rate-limit buckets                          |
| The work is the system's own                | scheduled jobs, the email outbox, audit entries, dashboard snapshots |
| It returns nothing about a person           | counts, public impact figures, the classifier cache                  |
| The caller proved who they are first        | `reporterProblemFor` (reference code + phone digits), `supportable`  |
| An explicit check runs in the same function | `assertCanAct`, `mayReadProblemFiles`, `requireInstitutionVoice`     |

If a new call site fits none of those rows, it is a bug waiting to be found by someone else.

**ESLint enforces where it may be used.** A page, route, component or server action cannot import
`withoutRls` at all — those files must call a module function that owns the check. `src/server` may,
because part of it runs before there is an actor to check.

## Cross-module calls

Modules call each other through `index.ts` imports, in one direction where possible.
`citizen` calls `classification`; `classification` does not call `citizen`. When two modules
genuinely need each other, the shared concept belongs in `packages/shared` or `src/server`
instead — that is the signal to extract it.

## Shared infrastructure

Things every module uses live outside this folder, because they are not domain logic:

- `@/server/*` — session and Clerk linking, logging, rate limiting, file storage, mailer
- `@akhra/shared` — Zod schemas, the status machine, domains, districts
- `@akhra/db` — Drizzle schema and the `withUserContext` transaction helper
- `@/components/ui` — Akhra's own UI primitives (buttons, fields, cards, alerts)
