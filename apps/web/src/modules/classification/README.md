# classification

Turns a free-text citizen report into a thematic domain, and flags likely duplicates.

## Public API

```ts
classifyProblem(input): Promise<ClassificationResult>   // domain + confidence + which tier answered
findDuplicates(input): Promise<DuplicateMatch[]>        // open reports in the same district
suggestOrganizations(problem)                           // institutions ranked by fit, with reasons
refreshPriority(tx, problemId, now?)                    // recompute supporters and priority
refreshOpenPriorities(now?)                             // the daily maintenance job
```

## Priority

The validation queue is ordered by `priority_score`, highest first, then by age. The score comes
from `assessPriority` in `packages/shared/src/priority.ts`, which is plain arithmetic, not a model,
so an officer can see exactly why a report is where it is: the reasons are stored with the report
and shown beside it.

| Signal                                                     | Points          |
| ---------------------------------------------------------- | --------------- |
| Reporter says someone could be hurt                        | 35              |
| Words about injury, death, fire, flood, outbreak (EN + HI) | 15              |
| How many people it reaches, from household to block/town   | 0–24            |
| Healthcare or water                                        | 8               |
| Other citizens supporting it                               | 2 each, max 12  |
| Reports merged into it as duplicates                       | 5 each, max 10  |
| Waiting longer than a week                                 | 2 a week, max 8 |

60 and above is critical, 40 high, 22 medium. Supporters and priority are always recomputed from the
rows that justify them (`problem_supports`, duplicates, the report's own fields), never incremented,
so running `refreshPriority` again can only correct a number. It runs on submission, when a citizen
supports or withdraws support, when a duplicate is merged, and daily for open reports.

## Routing by expertise

`suggestOrganizations` scores every active institution with `scoreInstitution` from
`packages/shared/src/expertise.ts`: declared strength in the report's domain (40%), academic
disciplines that bear on it (20%), faculty whose discipline matches (15%), relevant facilities such
as incubation centres and testing labs (10%), and distance from the report's district (15%). An
institution with neither the domain nor a relevant discipline scores zero rather than winning on
proximity alone. The rationale string shown to the officer names the parts that counted.

## How classification works

The provider chain lives in `packages/classifier`, not here. This module is the thin layer
that binds it to configuration and to the database:

- **Config → chain.** `AI_PROVIDER_CHAIN` (default `gemini,groq,tfidf`) is read once and passed
  to `createClassifier()`. Reordering tiers, dropping one, or adding a new one is an env change.
- **Cache.** Results are memoised in `classification_cache` by a SHA-256 of the normalised
  title and description, so repeat submissions cost no quota and return instantly.
- **Fallback logging.** Every tier that falls through is logged at `warn`. A fallback is normal
  operation, not an error — but it should never be silent.

The chain terminates in an offline TF-IDF tier, so `classifyProblem` does not throw on an
outage and submission is never blocked by an AI provider being down.

## How duplicate detection works

Deliberately no LLM. Candidates are narrowed in Postgres using `pg_trgm` similarity, scoped to
open reports in the same district, then re-scored in TypeScript by `TextSimilarityDetector` so
the ranking matches that package's own tests. Both stages are free and deterministic.

## Duplicate detection never returns a confident nothing

`findDuplicates` returns `{ matches, checkedBy, degraded }`, and the three tiers degrade in that
order rather than all-or-nothing:

| Tier            | Needs                                    | Catches                                                                            |
| --------------- | ---------------------------------------- | ---------------------------------------------------------------------------------- |
| Fingerprint     | Nothing but an indexed equality check    | The same report filed twice, in any district, whatever its wording order or casing |
| Text similarity | pg_trgm to shortlist, then local scoring | Reports about the same thing in different words                                    |
| Model judge     | Gemini or Groq                           | Borderline pairs the text score cannot separate                                    |

The fingerprint is a SHA-256 of the report's unique, stemmed, stop-word-stripped tokens, sorted.
It ignores the district on purpose: the same report filed under two districts is still one report.

If the trigram query fails — a missing extension, a timeout — the candidate set falls back to the
most recent open reports in the district and is still scored locally. If the model is unavailable,
the text score stands. Each of these sets `degraded: true`, and **the queue shows that to the
officer**, because a duplicate check that silently returned nothing looks exactly like a report with
no duplicates. Never drop that flag on the floor.

Existing rows get their fingerprint from `pnpm db:fingerprints`; new ones are fingerprinted on
submit.

## Extending it

To add an AI provider, work in `packages/classifier` — implement `IProblemClassifier`, register
it in `createProvider()`, add its name to `AI_PROVIDER_CHAIN`. Nothing in this module changes.

To change how a domain is recognised offline, edit the keyword lexicon in
`packages/shared/src/domains.ts` and re-run `pnpm test` — the labelled fixtures will tell you
whether you helped or hurt.

## The department track

`service-department.ts` holds the half of the flow that does not involve a university:

| Function                                    | Who calls it             | What it does                                                                    |
| ------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------- |
| `listDepartments()`                         | The queue page           | Departments, urban local bodies and panchayat bodies that can be given a report |
| `assignToDepartment()`                      | District officer         | Sends the report to a department and starts the 21-day clock                    |
| `recordActionTaken()`                       | Department officer       | Records what was done; the report waits for the reporter                        |
| `reporterProblemFor()`                      | The tracking page        | Matches a report to the person who filed it, by account or by mobile digits     |
| `confirmResolved()`                         | The reporter             | Closes the report                                                               |
| `reopenReport()`                            | The reporter             | Sends it back once, within 30 days, with a reason                               |
| `autoCloseSettledReports()`                 | The scheduler            | Closes reports the reporter never answered, with a public note saying so        |
| `departmentReports()` / `departmentStats()` | The department dashboard | Only rows assigned to the caller's own department                               |

Deadlines come from `@akhra/shared/service-levels`, and the reminders that chase them live in
`modules/automation`.

## Who each function will accept

`assertCanAct(actor, problem)` in `server/session.ts` is the single scope check. A `gov_admin` is
held to their district; a `dept_officer` is held to the department the report is assigned to and is
never asked about districts, because they work across all of them. Everything in `service-admin.ts`
except `transferDistrict` is additionally limited to `DISTRICT_ROLES` at the action layer — a
department officer cannot validate, route, assign or transfer.

`transferDistrict(actor, problemId, toDistrictCode, reason)` moves a misfiled report to the district
it belongs to instead of rejecting it, which is what CPGRAMS requires. It refuses once a department
has been asked to act, and after two moves. The move appears on the citizen's public timeline.

When changing any of this, the tests that guard the boundaries are
`apps/web/tests/government/boundaries.test.ts`.

**Careful with the scheduler functions.** `autoCloseSettledReports`, `remindInterimUpdates` and
`escalateOverdueReports` act on every matching row in the database. Never test them by passing a
future `now` — that closes real reports alongside the fixture. Backdate the fixture's own timestamps
and call them with the real clock.
