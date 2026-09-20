# Working on Akhra

This file is for the person who did not write the code. Read [`README.md`](README.md) for what
Akhra is and how to run it, [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how it is built, and
[`docs/adr/`](docs/adr/README.md) for why — including what was turned down.

## Your first hour

```bash
pnpm install
cp .env.example .env.local     # fill in DATABASE_URL, INVITE_SIGNING_SECRET, the two Clerk keys
pnpm db:migrate
pnpm db:seed                   # 24 districts, 14 institutions, 57 reports, 16 projects, a year of history
pnpm clerk:demo-users          # once per Clerk development instance
pnpm dev
```

Sign in as any persona listed in the README (password `akhra2026`, code `424242` if Clerk asks).
Each role sees a different Akhra: file a report as `citizen+clerk_test@example.com`, validate it as
`district.ranchi+clerk_test@example.com`, take it on as `university+clerk_test@example.com`. An
hour spent walking a report from one end to the other explains the codebase better than reading it.

## Where things live

```
apps/web/src/app/              routes only — pages, layouts, API handlers. Nothing else lives here.
apps/web/src/modules/<name>/   a slice of the product: service, queries, actions, components, README
apps/web/src/components/       what more than one module draws with; ui/ is the primitives
apps/web/src/server/           session, identity, logging, rate limiting, storage, mail
apps/web/src/                  only Next.js's own three: proxy.ts, instrumentation*.ts
apps/web/tests/                vitest, against the test database
apps/web/e2e/                  Playwright, against a built app
packages/shared/               schemas, the status machine, districts, roles, scoring
packages/db/                   schema, migrations, RLS policies, seed data
packages/classifier/           the AI provider chain and duplicate detection
```

Next.js lets you colocate anything beside a route. This project does not: a file under `app/` is a
`page`, a `layout`, a `route` or a metadata convention, and everything else belongs to the module
that owns it. A helper that two routes shared is a helper two routes had to reach across the tree
for.

Each module's README states its public API and the rules it keeps. Read that before changing it.

## Adding a feature, end to end

The example: recording a **site visit** on a project.

1. **Shape it in `packages/shared`.** A Zod schema and any enum belong there, next to the others,
   so the browser, the server and the tests all validate the same thing.
2. **Change the database schema** in `packages/db/src/schema`, then
   `pnpm --filter @akhra/db generate --name site_visits`. Read the generated SQL. If the change
   needs row-level security, add a policy in the same migration; use `generate --custom` for a
   policy-only change. An enum value gets its own migration file — a new label cannot be used in
   the transaction that adds it.
3. **Write the service function** in the owning module. It checks its own authorization — role,
   ownership, district — and reads through `query(actor, …)` so the database enforces it too.
   Multi-step writes go in one transaction (`transitionWithin` is the pattern for status changes).
4. **Expose it** through the module's `index.ts`, and add a server action in `actions.ts` if a form
   calls it. Pages never touch the database.
5. **Add the UI** under the module's `components/`, with every string in
   `apps/web/messages/en.json` **and** `hi.json`. A missing Hindi key is a broken page, not a
   fallback.
6. **Test the rule, not the plumbing.** `apps/web/tests/<module>/` — what the feature must refuse
   is usually more valuable than what it allows.
7. **Write it down.** The module README if the rule is new; an ADR in `docs/adr/` if you turned
   something down to get here.

If the feature adds a step to the path a report travels, add it to
`tests/journey/report-to-solution.test.ts` as well — that file is the only place the handoffs
between modules are checked.

## Before you push

```bash
pnpm ci:local        # lint, typecheck, tests, the production-safety scan, the production build
pnpm format          # prettier
```

CI runs the same things against a real Postgres, twice — development and production configuration.
It also fails on a committed secret, a hardcoded localhost URL, a generated migration that was not
committed, and a colour pair below WCAG AA.

If you changed a page, run the browser suite too. It builds the app, serves it on port 3100 and
opens every public page in both languages, on a phone and a desktop:

```bash
pnpm --filter @akhra/web test:browser:install   # once, ~100 MB
pnpm test:browser
```

It is not in `pnpm ci:local` because the app needs Clerk keys to boot, and CI has none
([ADR 12](docs/adr/0012-two-layers-of-end-to-end-test.md)).

## The rules that are enforced for you

These are not style preferences; each exists because of a bug or a near miss.

- **A module is imported through its `index.ts`.** ESLint fails a deep import.
- **`withoutRls` may not be imported by a page, route, component or server action.** It turns
  row-level security off, so the access check becomes yours to write, in a service or query file,
  beside the query. See `src/modules/README.md` for the categories of legitimate use.
- **No hardcoded URLs.** Read `appUrl` from `@/server/env`.
- **No source file may assign the `super_admin` role** except `promotion.ts` and the bootstrap
  script. A test walks the tree to prove it.
- **Scheduled jobs claim a bounded batch** and never mark rows done unless the work can finish
  ([ADR 10](docs/adr/0010-scheduled-jobs-are-batched.md)).
- **Tests run against their own database** — `pnpm test` never touches your demo data.
- **`.env.example` lists every variable the project reads**, the app's and the tooling's alike. A
  test compares it against the environment schema, so adding one without listing it fails CI.

## Things that will trip you up

- **Next.js here is not the Next.js you know.** Read the guide in
  `apps/web/node_modules/next/dist/docs/` before reaching for a pattern from memory.
- **Drizzle renders `${table.column}` unqualified** inside a raw `sql` fragment with no join, so a
  correlated subquery silently resolves to the inner table. Prefer a separate `count()` query.
- **A scheduled job under test must not be given a future `now`.** It would act on every matching
  row in the database. Backdate the fixture's own timestamps instead.
- **Seed upserts must set `excluded.*`**, or they quietly write a column to its own value.
- **The public figures are cached.** If a change should show up at once, expire them
  (`expirePublicFigures()`), as filing a report does.
