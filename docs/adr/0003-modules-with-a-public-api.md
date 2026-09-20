# 3. The app is modules, each with one public API

**Status:** Accepted · 2026

## Context

Nine areas of work — citizen, classification, university, industry, lifecycle, analytics,
notifications, auth, automation — written over a short period, to be picked up later by people who
did not write them.

## Decision

Each is a folder under `src/modules` with an `index.ts` that is its only public surface. Anything
not exported there is private. A `no-restricted-imports` rule fails CI on a deep import.

## Alternatives

- **Folders by technical layer** (`services/`, `components/`, `queries/`). A feature then lives in
  five places, and nobody can delete anything with confidence.
- **Convention without enforcement.** Holds for about a month.

## Consequences

- A newcomer can read one folder and its README and start working.
- One exception, stated in the ESLint config: a client component may import another module's
  `components/*` directly, because the module's index also carries server-only code and going
  through it would pull `next/server` into the browser bundle.
- Cross-module calls go through `index.ts` in one direction: `citizen` calls `classification`, not
  the reverse. When two modules need each other, the shared idea belongs in `packages/shared`.
