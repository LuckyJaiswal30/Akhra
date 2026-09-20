# 12. End-to-end means two layers, and only one of them runs in CI

**Status:** Accepted · 2026

## Context

Every module has its own suite, and each proves its own rules. None of them proved that the
handoffs between modules still line up: a report that a district officer validates has to become a
referral an institution can see, a proposal an officer can approve, a project whose completion
shows up on a public page. A change to any one module can break the chain while every suite in the
repository stays green.

Two different things could be tested end to end, and they fail in different ways:

- **the chain** — does a report actually travel from a citizen to a deployed solution;
- **the pages** — do the screens built on that chain render at all.

The pages need a browser, the browser needs a running app, and the app needs Clerk keys to boot,
because `ClerkProvider` and `clerkMiddleware` wrap every route. CI has no Clerk keys, and a fork's
pull request never will.

## Decision

Two layers, with different homes.

`apps/web/tests/journey/` walks one report from submission to public impact figures through the
**server actions the screens post to**, against the test database with row-level security on. It is
part of `pnpm test`, so it runs on every push, and it asserts the refusals too — the neighbouring
district's officer is turned away mid-journey.

`apps/web/e2e/` is a Playwright suite over every page a visitor can reach without an account, in
both languages, on a phone and a desktop: a heading, the right `lang`, no raw message key, an empty
console. It is run with `pnpm test:browser`, builds the app and serves it on port 3100, and is
**not** part of `pnpm ci:local`.

## Alternatives

- **Playwright for the signed-in flows too**, with `@clerk/testing`. It needs a Clerk development
  instance, seeded personas and their passwords in the environment. The journey test covers the
  same rules in a second, against a real database, with nothing to keep in sync.
- **Point Playwright at `pnpm dev`.** Tried; a dozen parallel requests corrupted the development
  server's own `prerender-manifest.json` and every page after that returned 500. A production build
  is also what actually ships.
- **Skip the journey test, trust the module suites.** They cannot see a handoff, which is exactly
  where a refactor breaks things.

## Consequences

- CI still guards the whole chain on every push, without a single secret.
- The browser suite is a deliberate local step — `pnpm test:browser:install` once, then
  `pnpm test:browser`. CI runs it only on a repository that has Clerk keys configured.
- It found two things on its first run: an unknown URL fell through to the framework's own
  black-and-white 404, and Sign in was hidden below 1280px.
- `E2E_BASE_URL` points the same suite at a deployed preview, where the keys do exist.
