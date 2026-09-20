# 6. A validated report goes to a department or a university

**Status:** Accepted · 2026

## Context

The problem statement asks for a platform that routes societal challenges to universities and
industry. But citizens, panchayats and urban bodies also file the ordinary: a blocked drain, a
handpump that stopped. Sending those to a research team is theatre.

## Decision

After validation an officer chooses one of two tracks. **Department:** the line department gets it
with a 21-day limit, records what was done, and the person who reported it confirms or reopens
within 30 days. **University:** the report is routed to institutions ranked by their declared
expertise, and becomes a project with a proposal, milestones, tests and outcomes.

## Alternatives

- **University track only.** Then a validated drain has two possible endings: rejected, or a
  research project. Judges and officers both read that as naive.
- **Department track only.** That is a grievance portal; the innovation half of the problem
  statement disappears.

## Consequences

- Two roles exist where one would do: `gov_admin` (district or state) and `dept_officer`. Both
  match posts that exist in the real administration.
- Deadlines, reminders, auto-close and the reopen window follow CPGRAMS practice and live in
  `@akhra/shared/service-levels`.
- The citizen sees one timeline whichever track their report took.
