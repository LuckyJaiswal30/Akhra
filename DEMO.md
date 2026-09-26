# Akhra demo

A five-minute walk through one report, from the citizen who files it to the fix, and then a
bigger problem that goes to a university team. The demo accounts and their password are in the
[README](README.md#demo-accounts).

## Before the demo

- Run `pnpm db:seed` to reset the sample data, then `pnpm clerk:demo-users` once.
- Open each page once so the first load is not slow on stage.
- Sign in to each demo account in its own browser profile, so switching roles takes one click.
- Keep a phone-width window ready for the citizen part.

## The demo

**1. Landing page (20 s).** Open `/`. One line: a citizen reports a problem once, a department or a
university team fixes it, and the citizen closes it. Switch the page to हिन्दी from the header.

**2. A citizen reports, with no account (60 s).**

- Open `/submit` in the phone-width window.
- Write the problem in Hinglish, for example _"Hamare tole ka chapakal do mahine se kharab hai"_,
  or press _Speak instead_ and say it in Hindi.
- Choose Ranchi, drop a pin and add a photo. Submit.
- The receipt shows the reference code, the category Akhra picked, and any likely duplicates,
  including ones written in another language.

**3. The public tracker (15 s).** Paste the code into `/track`. The timeline shows each step, and the
reporter's name is never shown.

**4. The district officer decides (40 s).** Sign in as the Ranchi officer. The queue has only
Ranchi's reports, sorted by priority. Validate the new report and send it to the Drinking Water and
Sanitation Department. The 21-day clock starts.

**5. The department acts (20 s).** Sign in as the Water department officer and record what was done.
The reporter is told straight away, in the language they reported in.

**6. The citizen closes the loop (30 s).** Back on the tracker, enter the last 4 digits of the mobile
number and choose _Yes, it is fixed_. Point out that a wrong guess is refused, and that the report
could instead be reopened once within 30 days.

**7. A problem that needs research (60 s).**

- Sign in as the state desk, open _Ready to route_ and show the ranked universities with the reason
  for each.
- Sign in as Birsa Agricultural University and open project **AKH-2026-000003** (paddy pest advisory):
  team, proposal, milestones and field tests.
- Sign in as Krishi Setu Agritech and show how an industry partner offers support.

**8. The state's view (35 s).** As the state desk, open the dashboard: reports by month, category and
district, the district map, and _Who classified each report_, which shows the offline model taking
over whenever the AI services are down.

## If something fails on stage

Every screen from step 4 onwards already has sample data. If the internet is slow, the offline model
still classifies reports, and the public pages work without signing in.

## Talking points

- **The gap.** People in Jharkhand see problems first, but there is no single place to report them
  and follow them. Universities have students and research labs, and industry has money and
  know-how, but they rarely hear about these problems.
- **What Akhra does.** One report goes to the district officer, who sends it to a department for a
  quick fix, or to the university best suited to solve it, with industry partners joining in.
- **Why people will use it.** No account is needed. It works in Hindi, English and Hinglish, by
  typing or speaking, and on a slow phone connection. The reporter follows every step with a
  reference code, and nothing closes until they say it is fixed.
- **Why officers can trust it.** Each district sees only its own reports, enforced by the database
  itself. Every decision is recorded, and overdue reports are raised with the state automatically.
- **Why it matches NEP 2020.** Students and faculty work on real problems from their own state, and
  the dashboard shows what came out of it: projects, patents, startups and people reached.

## What we tested

**Automatic checks.** Every change runs 428 tests on a real database: who may see and change which
report, every status change, classification and duplicate checks, and one report walked from the
citizen to a deployed solution. A browser check opens every public page in English and Hindi, on a
phone and a laptop screen.

**On the running app.**

- A report filed with no account, with a photo and a map pin, then tracked by its code.
- The full department path: sent to the Water department, marked done, confirmed by the reporter,
  reopened, fixed again and closed.
- A wrong phone number refused, an officer from another district refused, and a department refused
  when it tried to confirm its own work.
- The same problem reported in Hinglish and in Hindi, and caught as a duplicate.
- Every public page in a 360-pixel-wide phone browser, in both languages.

**Bugs found and fixed.**

- The reporter was not told when the department said the work was done.
- A closed report could not be reopened from the tracker, even within 30 days.
- A reporter answering honestly could be locked out by the limit meant for guessers.
- Spoken Hindi came out garbled on the English page.
- Dates followed the server's clock, not India time.
- Messages from the server were in English on Hindi pages.
- Drop-down lists looked broken in Safari.
