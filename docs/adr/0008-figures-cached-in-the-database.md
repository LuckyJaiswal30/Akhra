# 8. Expensive figures are cached in a table, not a build

**Status:** Accepted · 2026

## Context

The state dashboard is a dozen aggregates. The public pages show live counts on every visit. A
government portal is read far more often than its numbers change.

## Decision

`analytics_snapshots` holds every expensive set of figures, keyed by who is asking and what they
filtered by. `cachedSnapshot(key, ttl, compute)` is the only way in or out: a stale snapshot is
served immediately and refreshed after the response.

## Alternatives

- **`unstable_cache` / `use cache`.** Next 16 documents `unstable_cache` as replaced, and the
  supported route — Cache Components — is an app-wide migration that changes how every route
  renders. Worth doing one day, on its own, not as a side effect of a caching change.
- **No cache.** One visitor makes twenty thousand others wait on the same `count(*)`.

## Consequences

- The cache is shared by every server reading the same database, and survives a change of
  rendering model: it is a table, not a build flag.
- A failed computation is never stored, so a database blip empties a page for one render rather
  than for the whole time-to-live.
- Filing a report drops the public figures outright, so the person who just reported something
  sees the counter include it.
