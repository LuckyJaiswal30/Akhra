# Architecture

How Akhra is built, why, and where to change it. Conventions for day-to-day work are in
[`CONTRIBUTING.md`](../CONTRIBUTING.md).

## Structure

```
apps/web/                 Next.js 16 app (App Router), the only deployable
  src/app/                routes only: pages, layouts, API route handlers
  src/modules/<name>/     one slice of the product each (see below)
  src/components/         UI shared by several modules; ui/ holds the primitives
  src/server/             session, identity linking, env, logging, mail, storage, rate limits
  messages/{en,hi}.json   every user-facing string, in English and Hindi
  tests/ e2e/             Vitest (against a test database) and Playwright
packages/shared/          domains, districts, roles, status machine, service levels, Zod schemas, env schema
packages/db/              Drizzle schema, SQL migrations (including RLS policies), seed data, scripts
packages/classifier/      the Gemini → Groq → TF-IDF chain and duplicate judging
```

## Modules

| Module           | Owns                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| `citizen`        | Report submission, attachments, drafts, support ("me too"), the public tracker, contact retention |
| `classification` | Classification, duplicates, priority, triage decisions, department track, university ranking      |
| `university`     | Referral inbox, teams, proposals, institution and faculty expertise                               |
| `industry`       | Project discovery, offers of support and their decisions                                          |
| `lifecycle`      | Proposal review, milestones, documents, field tests, outcomes and IP, stage changes               |
| `analytics`      | Dashboards, public impact figures, success stories, CSV export, cached snapshots                  |
| `notifications`  | Notification centre, email outbox, per-report threads                                             |
| `automation`     | The nightly maintenance run (escalations, reminders, priorities, retention, snapshots)            |
| `auth`           | Invitations, onboarding, promotion, audit log (sign-in itself is Clerk's)                         |

**Boundary rule:** a module is imported only through its `index.ts` (`@/modules/citizen`, never
`@/modules/citizen/service`). ESLint fails a deep import. Inside a module, `service.ts` holds writes
and authorization, `queries.ts` reads, `actions.ts` server actions, `components/` its UI. Shared
concepts go down into `packages/shared`, never sideways between modules.

## How a report flows

```
submit (citizen/actions) → classifyProblem + findDuplicates → problems row + status_events
      → district officer validates (classification)
          ├─ department track: assigned → action_taken → reporter confirms or reopens → closed
          └─ research track: routed → university accepts → project + proposal → officer approves
                 → in_progress → prototyped → piloted → deployed → outcomes recorded → closed
```

- The legal moves are one table in `packages/shared/src/status-machine.ts`, read by the API guard,
  the UI and the tests.
- Every change appends a `status_events` row. The tracker, notifications and the analytics funnel
  all read from that one table.
- Deadlines live in `packages/shared/src/service-levels.ts`. They follow CPGRAMS: 3 days to triage,
  21 days to fix, an interim update at 14 days, 30 days to reopen, and contact details erased 365
  days after closure.
- When an officer merges a duplicate, its reporter keeps their own reference code, and their tracker
  points to the surviving report. Every later update is sent to them too
  (`findReporters` in `modules/notifications/recipients.ts`). Merges into a report that is itself
  merged later carry over.
- `tests/journey/report-to-solution.test.ts` walks one report through the whole research track.

## Who can see and do what

- **Sign-in is Clerk's; authority is Akhra's.** Roles, organisations, districts and suspension live
  in Akhra's `users` table. Anyone can create a citizen account. Every other role comes only from an
  HMAC-signed, single-use, expiring invitation (`modules/auth/invites.ts`).
- **Layer 1: the service.** Every server action and route handler calls `requireActor` or
  `requireRole` (`server/session.ts`), and each service function checks the role, the ownership and
  the district itself.
- **Layer 2: the database.** Request queries run through `query(actor, …)`, which switches to the
  non-owner `akhra_app` role and sets the actor for row-level security policies. A district officer
  cannot read another district's row even through a query that forgot its filter
  (`packages/db/tests/rls.test.ts`, `tests/government/district-scope.test.ts`). `withoutRls` exists
  for system work and is banned by ESLint from pages, routes, components and actions.
- **Files** are served only through `/api/files`, which checks access on every request. Types are
  checked by their file signature, not just the declared type.
- **Without Clerk keys** (`server/sign-in-mode.ts`), the public site, anonymous reporting and the
  tracker still run. The portals show that sign-in is not configured.

## AI: classification, duplicates, routing

- `packages/classifier` has one interface, `IProblemClassifier`. `ChainClassifier` tries the
  providers in `AI_PROVIDER_CHAIN` order.
- The chain falls through on an error, an HTTP 429, a timeout (`AI_TIMEOUT_MS`), a missing key, or a
  response that fails Zod validation.
- A circuit breaker skips a failing tier for `AI_BREAKER_COOLDOWN_MS`.
- The TF-IDF tier is always appended and cannot fail.
- Model IDs come from `GEMINI_MODEL` and `GROQ_MODEL`.
- **Prompt injection is contained by the output contract.** A model may only return a domain from
  the fixed enum; anything else fails validation and falls to the next tier.
- **Duplicates:** `pg_trgm` narrows candidates in the same district, text similarity keeps a
  shortlist of at most 8, and an LLM judge may confirm matches from that shortlist only.
- **Routing:** `scoreInstitution` (`packages/shared/src/expertise.ts`) weighs domain strength,
  relevant disciplines, faculty count, facilities and distance, and returns the reasons shown to the
  officer.

## Scheduled work and caching

One endpoint, `/api/cron/maintenance`, is called daily by Vercel Cron (`vercel.json`) with
`CRON_SECRET`. It runs:

- escalations
- interim and overdue reminders
- auto-close
- invitation and milestone reminders
- priority refresh
- contact erasure
- rate-limit pruning
- dashboard snapshots

Each job claims at most 200 rows, so a run always finishes and a backlog drains over the following
nights. One failing job never stops the others. Expensive figures are cached in the
`analytics_snapshots` table, not a framework cache, so every server instance shares them.

## Where each problem statement requirement lives

| Requirement                                               | Code                                                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Submission with media, location, documents                | `modules/citizen` (`submitProblem`, `components/submit-form.tsx`), `server/file-storage.ts`       |
| Submitters: citizens, groups, PRIs, ULBs, departments     | `SUBMITTER_TYPES` in `packages/shared/src/schemas.ts`                                             |
| AI categorisation into the 10 domains                     | `packages/classifier`, `DOMAINS` in `packages/shared/src/domains.ts`                              |
| Prioritisation, deduplication                             | `modules/classification/priority.ts`, `findDuplicates` in `modules/classification/service.ts`     |
| Routing by expertise and capability                       | `suggestOrganizations` in `modules/classification/routing.ts`, `packages/shared/src/expertise.ts` |
| Teams, mentors, proposals                                 | `modules/university/service.ts`                                                                   |
| Industry, startups, MSMEs, CSR, labs, hubs                | `PARTNER_KINDS` and `OFFER_TYPES` in `packages/shared`, `modules/industry/service.ts`             |
| Milestones, documents, approvals, tests, IP               | `modules/lifecycle/service.ts`, `modules/lifecycle/proposals.ts`                                  |
| Dashboards: districts, sectors, patents, startups, impact | `modules/analytics/dashboard.ts`, `/government`, `/impact`                                        |
| Notifications and communication                           | `modules/notifications`, `modules/automation`                                                     |

## Extending it

- **A university, industry partner or department** is data. A super administrator onboards the
  organisation from _Administration_, and its admin states its expertise and facilities in the
  profile. No code changes.
- **A district** means one entry in `JHARKHAND_DISTRICTS` (`packages/shared/src/districts.ts`), its
  outline via `pnpm --filter @akhra/shared build:district-shapes`, then `pnpm db:seed` to load the
  reference row.
- **A domain** means one entry in `DOMAINS` plus its `DOMAIN_DEFINITIONS` (labels and keywords in
  both languages) and `DOMAIN_DISCIPLINES`. Both are `Record<Domain, …>`, so the compiler lists
  anything missing. Then run `pnpm db:generate` for the enum migration.
- **An AI provider** means implementing `IProblemClassifier`, registering it in
  `packages/classifier/src/factory.ts`, and adding its name to `AI_PROVIDER_CHAIN`.
- **A deadline or retention period** is one constant in `service-levels.ts`.

## Why we chose it

| Choice                            | Why                                                                                                                                                             |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js 16, React 19, TypeScript  | One codebase for pages, server actions and API routes; server rendering keeps pages light on slow phones; the largest hiring pool for a team that will change   |
| PostgreSQL + Drizzle              | Dashboards are SQL aggregates; row-level security gives a second lock on district data; standard Postgres can move to NIC or a state data centre with `pg_dump` |
| Clerk for sign-in                 | We have no domain to send email from. Clerk's free tier sends sign-up codes, resets and invitations itself, and handles password hashing and breach checks      |
| `MAIL_DRIVER=console` by default  | Notification email goes through an outbox either way. Resend needs a verified domain to email anyone but yourself, so the demo logs instead of failing          |
| Gemini → Groq → TF-IDF            | Both hosted models have free tiers; a second provider covers the first's quota and outages; the offline tier means reporting never depends on a third party     |
| Tailwind CSS 4, own UI primitives | Design tokens live in one file (`globals.css`); no component library to track or restyle                                                                        |
| next-intl                         | Hindi and English with typed message keys and locale routing                                                                                                    |
| Plain SVG district map            | No tile server, no map library, no API key; it loads with the page on a slow connection                                                                         |
| Vitest + Playwright               | Tests run against a real Postgres (RLS cannot be mocked); a browser smoke test covers every public page in both languages                                       |

Versions are current stable releases (September 2026): Next.js 16.3, React 19.2, TypeScript 6.0,
Drizzle 0.45, Zod 4, Tailwind 4, Vitest 5, ESLint 10, Node 22.12+ (CI on 24 LTS). TypeScript stays on
6.0 rather than 7.0 because typescript-eslint supports up to 6.0.

## Likely judge questions

- **"What if the AI is down or out of quota?"** Reporting still works. The chain falls to the
  offline TF-IDF classifier, and the officer can correct the domain. Each report records which tier
  classified it.
- **"How do you stop duplicate reports?"** Each submission is checked against open reports in the
  same district by fingerprint, trigram similarity and, when a key is set, an LLM judge. The officer
  merges duplicates, which raises the original's priority.
- **"Why would an officer use this over CPGRAMS?"** It follows the same deadlines and adds the
  research track, where CPGRAMS ends. Routine grievances still go to a department; systemic ones get
  a university team and industry backing.
- **"Can a district officer see other districts?"** No. The service refuses, and the database
  policies hide the rows even if the service forgot.
- **"What about villages with no signal?"** Drafts survive on the device, the map is SVG, pages
  ship about half the JavaScript they used to, and the description can be spoken. SMS was left out
  because no free SMS gateway exists; tracking works by reference code.
- **"DPDP Act compliance?"** The report form states why contact details are collected and how long
  they are kept. They are never public, and a nightly job erases them a year after closure. The
  Account page shows and corrects what is held. A named Grievance Officer would come with a real
  operator. We do not claim certification.
- **"How does this scale?"** Stateless servers, one Postgres, bounded batch jobs, cached figures in a
  table, lists capped at 100 rows, and indexes on status, district, domain and dates. A new district
  or domain is configuration.
- **"Why Clerk instead of your own auth?"** We have no custom domain to send email, and identity is
  the part most dangerous to get wrong. Clerk handles credentials; Akhra keeps every authorization
  decision.
- **"Are the numbers on the landing page real?"** No. They come from the seed data and are labelled
  as sample data.
