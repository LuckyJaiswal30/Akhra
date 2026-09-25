# Five-minute demo

**Before you present**

- Run `pnpm db:seed` to reset the demo state.
- With Clerk keys set, run `pnpm clerk:demo-users` once per Clerk development instance.
- Load each page once so the first request is not slow.
- Every account's password is **`akhra2026`**. If Clerk asks for a code, type **`424242`**.

| Account                                  | Role                                   |
| ---------------------------------------- | -------------------------------------- |
| `citizen+clerk_test@example.com`         | Citizen                                |
| `district.ranchi+clerk_test@example.com` | District officer, Ranchi               |
| `gov+clerk_test@example.com`             | State desk (all districts)             |
| `university+clerk_test@example.com`      | University admin, BAU Ranchi           |
| `industry.agri+clerk_test@example.com`   | Industry partner, Krishi Setu Agritech |

All figures come from seed data, and the site says so.

---

**0:00 Landing page (30 s).** Open `/`. Say it in one line: _"A citizen reports it once; a
department fixes it, or a university team backed by industry solves it; the citizen closes it."_
Point to the two actions (report, track by reference code), the sample-data label on the figures
and the five steps. Switch to हिन्दी in the header.

**0:30 A citizen reports, with no account (60 s).**

- Open `/submit` on a phone-width window. Describe a problem in Hindi, or press _बोलकर लिखें_ and
  speak it (Chrome).
- Choose **Ranchi**, drop a pin and add a photo.
- Turn the network off in DevTools: the offline notice appears, and the draft survives a reload.
  Turn it back on and submit.
- The receipt shows the reference code, the AI's category and any likely duplicates. Which tier
  classified it (Gemini, Groq or offline) is recorded for the officer and the dashboard.

**1:30 Public tracker (15 s).** Paste the code into `/track`: the timeline, with no sign-in.

**1:45 The district decides (60 s).**

- Sign in as the Ranchi officer. The queue holds Ranchi's reports only, sorted by priority, each
  with its photo, category and duplicate candidates.
- Validate the new report. For a routine fix, _Send to department_ starts the 21-day clock.
- For a systemic problem, sign in as the state desk, open _Ready to route_ and show the ranked
  universities with their reasons ("domain strength, disciplines, faculty, distance"). Route it.

**2:45 The university and industry (60 s).**

- Sign in as BAU and open project **AKH-2026-000003** (pest advisory): team, versioned proposal,
  milestones, field tests, documents.
- Advance the stage and record an outcome.
- Open _Industry offers_ and accept Krishi Setu's offer. Optionally show the partner's
  _Discover projects_ view, which lists only vetted projects.

**3:45 The loop closes (30 s).** Open `/track?ref=AKH-2026-000003`. The public timeline shows the
stage, the industry partner and the team's public update, with no internal notes.

**4:15 The state's view (45 s).**

- As the state desk, open _Dashboard_: reports by month, domain and district, the funnel, patents,
  startups, people reached, partnerships by kind.
- Filter by one domain and every figure re-scopes.
- End on _Who classified each report_: the AI tiers versus the offline fallback. Classification
  never goes down.

**If something fails on stage:** every screen from step 1:45 onwards is already populated by the
seed data. Without Clerk keys, steps 0:00 to 1:45 still work in full.
