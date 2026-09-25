# Contributing to Akhra

Read [`README.md`](README.md) to run it and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how
it fits together. The fastest way to learn the code is to walk one report through
[`docs/DEMO.md`](docs/DEMO.md).

## Conventions

- **Routes only in `app/`.** A file under `apps/web/src/app/` is a page, layout, route handler or
  metadata file. Everything else belongs to a module, `components/` or `server/`.
- **Import a module through its `index.ts`.** ESLint fails deep imports such as
  `@/modules/citizen/service`.
- **Authorization lives in the service function**, next to the query: role, ownership, district.
  Read through `query(actor, …)` so row-level security applies too.
- **`withoutRls` only with a reason.** Use it when there is no actor yet (linking an account, rate
  limits), for system work (scheduled jobs, outbox, audit, snapshots), for data that says nothing
  about a person (counts, public figures), or where an explicit check runs in the same function.
  ESLint bans it from pages, routes, components and server actions.
- **Validate at the edge with the shared Zod schemas** in `packages/shared/src/schemas.ts`. Errors
  use the one shape from `packages/shared/src/errors.ts`, returned by `apiRoute()` and
  `runAction()`.
- **Every string goes in both `messages/en.json` and `messages/hi.json`.** A missing key shows up as
  a broken page, so the browser test catches it.
- **Configuration goes in one place.** Domains, districts, roles, deadlines and retention live in
  `packages/shared`. Environment variables go in the env schema, `.env.example` and the README table;
  a test keeps all three identical.
- **Schema changes:** edit `packages/db/src/schema`, run `pnpm db:generate --name <what>`, and read
  the SQL. RLS policies go in the same migration. CI fails if a generated migration is not committed.
- **Scheduled jobs claim a bounded batch** (200 rows) and are safe to run twice.
- **Comments explain why, not what,** in a line or two. No commented-out code.

## UI

- Design tokens (colours, radii, shadows, fonts) are defined once, in `apps/web/src/app/globals.css`.
  Use the Tailwind names (`text-ink`, `bg-sal`, `text-subtle`…), never raw hex values.
- Build from the primitives in `src/components/ui` (`Button`, `Field`, `Alert`, `Card`…) before
  writing new ones.
- Mobile first. Test at 360 px. Every interactive element is keyboard reachable and labelled.
- `pnpm --filter @akhra/web contrast` checks every text/background token pair against WCAG AA.
- Heavy client libraries (charts, maps) load with `next/dynamic` where they render, so other pages
  don't pay for them.
- The logo and icons are in `apps/web/public/brand` and `apps/web/src/app`. The mark is five figures
  around a common ground; keep it as it is.

## Running and testing

```bash
pnpm dev                 # app on :3000
pnpm test                # all Vitest suites against <db>_test (created and migrated for you)
pnpm exec vitest run apps/web/tests/citizen   # one folder
pnpm test:browser        # Playwright smoke test of public pages (needs no Clerk keys)
pnpm ci:local            # lint, typecheck, tests, safety scan, build: run before pushing
pnpm format              # Prettier
```

Write tests for rules, not plumbing: permissions, state transitions, classification, duplicates,
routing and new business logic. Test what must be refused as well as what must be allowed. A new
step in a report's path goes into `tests/journey/report-to-solution.test.ts`.

## Dependency policy

- **Stable releases only.** No canary, beta or rc versions.
- **Patch and minor updates** go in whenever tests pass. Check monthly with `pnpm -r outdated` and
  `pnpm audit`.
- **Major updates** get their own commit, after reading the changelog, with a note in the commit
  message on what changed. Hold back when a tool we depend on doesn't support the new major yet
  (for example, TypeScript 7 until typescript-eslint supports it).
- **Deprecations:** a package marked deprecated on npm is replaced, not pinned. Deprecation warnings
  in `pnpm build`, `pnpm lint` or the test output are treated as bugs.
- **Hosted models:** `GEMINI_MODEL` and `GROQ_MODEL` are configuration. Check each provider's
  deprecation page before a release; the TF-IDF tier keeps things working in the meantime.
- **Runtime:** `engines.node` tracks a supported Node LTS, and CI runs on the current LTS. The
  lockfile is committed, and `pnpm install --frozen-lockfile` must pass.
- **New dependencies** need a reason in the commit message. Prefer the platform or a few lines of
  our own code.

## Things that trip people up

- Next.js 16 changed many APIs. Check `apps/web/node_modules/next/dist/docs/` rather than relying
  on memory.
- A page that never reads the request gets prerendered at build time. `getActor()` marks the render
  as per-request even when sign-in is off.
- Inside a raw `sql` fragment with no join, Drizzle writes `${table.column}` unqualified, so a
  correlated subquery can silently bind to the inner table.
- In tests, never give a scheduled job a future `now`: it would act on every row. Backdate the
  fixture's own timestamps instead.
- Public figures are cached. Call `expirePublicFigures()` when a change must show at once.
