# 5. A report belongs to its district, and can be transferred

**Status:** Accepted · 2026

## Context

Jharkhand has 24 districts and an officer in each. A citizen may report a problem they saw while
travelling, or pick the wrong district at sign-up, and a report filed in the wrong place must not
become the citizen's problem.

## Decision

Every report carries the district of the **problem**, not of the reporter. An officer is locked to
their district — in the application and again in row-level security. A misfiled report is
**transferred** to the right district, with a public note on the citizen's timeline, never
rejected. The state desk sees every district; a district officer sees one.

## Alternatives

- **Tie a report to the reporter's profile district.** Blocks a legitimate report and traps anyone
  who picked wrong once. DARPG's CPGRAMS guidelines require transfer, not rejection.
- **Let any officer act on any report.** Removes accountability: nobody is answerable for a
  district's queue.

## Consequences

- Junk is controlled by rate limits, duplicate detection and reject-with-reason, not by locking
  the district.
- An officer's posting is changed by a **reposting order** with a written reason, recorded in the
  audit log — not by sending a second invitation. Nobody may change their own posting.
- Project oversight follows the report's district: the officer who owns the report reviews the
  proposal and approves milestones (`akhra_oversees_project`).
