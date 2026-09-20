# 1. The database decides who may see a row

**Status:** Accepted · 2026

## Context

Akhra holds reports from citizens, internal notes between officers, documents from university
teams and offers from companies. Every one of those has a different audience, and the same tables
are read by a dozen service functions written by different people at different times.

## Decision

Row-level security in Postgres is the boundary. Each request opens a transaction that sets the
database role and the acting user (`query(actor, …)`), and the policies decide what that
transaction can see or change.

## Alternatives

- **Checks in the application only.** One forgotten `where organizationId = …` leaks another
  institution's documents, and nothing fails visibly. The check lives where it is easiest to
  forget.
- **A query builder that always scopes.** Better, but it only covers queries written through it,
  and raw SQL for aggregates is unavoidable.

## Consequences

- A leak now needs two mistakes: a missing policy _and_ a missing service check.
- Some work has no actor — linking a Clerk account, the scheduled jobs, rate limiting — so
  `withoutRls` exists. Where it is used, the check moves into that function, and ESLint refuses the
  import in any page, route, component or server action. `src/modules/README.md` lists every
  category of legitimate use.
- Policies are migrations, so a change to who may see what is reviewed like any other schema change.
