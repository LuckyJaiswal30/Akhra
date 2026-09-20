# 10. Every scheduled job claims a bounded batch

**Status:** Accepted · 2026

## Context

The maintenance endpoint escalates stale reports, chases deadlines, closes settled reports,
reassesses priorities and refreshes dashboards. Each job marks rows as done **before** it notifies
anyone, so that two runs cannot notify twice.

## Decision

A job claims at most 200 rows per run, and `runMaintenance` names in `pending` any job that filled
its batch. Priorities are refreshed oldest-first, tracked by `problems.priority_refreshed_at`.

## Alternatives

- **Process everything in one run.** With ten thousand stale reports the function times out
  half way — and the rows it already claimed are never notified about. Silent, permanent data loss.
- **Notify first, mark afterwards.** Then a crash sends the same escalation twice.

## Consequences

- A run is always short enough to finish inside a serverless function's limit; a backlog drains
  over the following runs instead of being lost.
- Nothing starves: the batch is taken in the order things have been waiting.
- The endpoint's response says what it did and what is still waiting, so a scheduler or a person
  can see a backlog forming.
