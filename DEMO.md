# Akhra demo

This file has three parts: a five-minute demo for the stage, a full walkthrough you can follow on
your own from the first report to the last step, and what we tested.

Live site: [akhra.imlucky.dev](https://akhra.imlucky.dev). To run it on your own machine, follow
[Running it locally](README.md#running-it-locally) in the README first.

## Accounts used below

Every demo account uses the password `akhra2026`. If Clerk asks for a verification code, type
`424242`. These are Clerk test addresses, so no real email is sent to them and "Forgot password" is
never needed.

| Who                              | Sign in as                               |
| -------------------------------- | ---------------------------------------- |
| District officer, Ranchi         | `district.ranchi+clerk_test@example.com` |
| Department officer, Water        | `dept.water+clerk_test@example.com`      |
| State desk (all 24 districts)    | `gov+clerk_test@example.com`             |
| University admin, BAU Ranchi     | `university+clerk_test@example.com`      |
| Faculty member, BAU Ranchi       | `faculty+clerk_test@example.com`         |
| Industry partner, Krishi Setu    | `industry.agri+clerk_test@example.com`   |
| Citizen with an account (Ranchi) | `citizen+clerk_test@example.com`         |

A citizen does not need an account at all. The full list of 52 accounts is in the
[README](README.md#demo-accounts).

## Five-minute demo

**Before you start.** Open each page once so the first load is quick. Sign in to each account in
its own browser profile, so switching roles takes one click. Keep a phone-width window for the
citizen.

1. **Landing page (20 s).** Open `/`. A citizen reports a problem once, a department or a
   university team fixes it, and the citizen closes it. Switch to हिन्दी from the header.
2. **A citizen reports, with no account (60 s).** Open `/submit` on the phone window. Type the
   problem in Hinglish, for example _"Mohalle ka chapakal teen hafte se kharab hai"_, or press
   _Speak instead_ and say it in Hindi. Choose Ranchi, drop a pin, add a photo and submit. The
   receipt shows the reference code and the category Akhra picked.
3. **The public tracker (15 s).** Paste the code into `/track`. Every step is listed, and the
   reporter's name and number are never shown.
4. **The district officer (40 s).** As the Ranchi officer, open _Validation queue_. Only Ranchi's
   reports are there, highest priority first. Send the new report to the Drinking Water and
   Sanitation Department. The 21-day clock starts.
5. **The department (20 s).** As the Water department officer, record what was done. The reporter
   is told at once, in the language they reported in.
6. **The citizen closes it (30 s).** On the tracker, enter the last 4 digits of the mobile number
   and choose _Yes, it is fixed_. A wrong number is refused, and the department cannot confirm its
   own work.
7. **A problem that needs research (60 s).** As the Ranchi officer, open _Validation queue_, then
   _Ready to route_: universities are ranked, each with the reason. Then, as BAU, open project
   **AKH-2026-000003** (paddy pest advisory) to show the team, the approved proposal, milestones and
   field tests.
8. **The state's view (35 s).** As the state desk, open the dashboard: reports by month, category
   and district, the district map, and _Who classified each report_, which shows the offline model
   taking over when the AI services are down.

## Full walkthrough

Follow these in order. Each step says who you are, where to go, what to press, and what you should
see. Sign out between roles from the name menu at the top right.

### A. A routine problem, fixed by a department (about 10 minutes)

**A1. Citizen: report the problem.** Signed out, open `/submit`.

- _What is the problem?_ `Mohalle ka chapakal teen hafte se kharab hai`
- _Describe it in detail_ `Ratu Road ke ward 12 mein chapakal teen hafte se kharab hai. Paani nahi nikalta, aurton ko door se paani lana padta hai.`
- Press **Next**. Choose district **Ranchi**, type `Ratu Road, ward 12`, tap the map to drop a pin,
  and add a photo if you like. Press **Next**.
- Enter any name and a 10-digit mobile number (remember its last 4 digits). Add your email address
  if you want the updates by email. Tick the consent box and press **Submit report**.

You should see a reference code such as `AKH-2026-000140` and _Classified as Water & Sanitation_.

**A2. Anyone: track it.** Open `/track`, paste the code and press **Look up**. It shows _Stage 1 of
5: Submitted_. Your name is not shown.

**A3. District officer: send it to the department.** Sign in as
`district.ranchi+clerk_test@example.com`. You land on the Ranchi district dashboard.

- Open **Validation queue**. Under **Awaiting validation**, find your report.
- Under **Send to a department**, choose **Drinking Water and Sanitation Department**, write a note
  such as `Please send a mechanic this week`, and press **Send to department**.

You should see _Recorded. It has moved on from this tab._ The tracker now shows _With the
department_ and an answer due date 21 days away.

**A4. Department officer: post a progress update (optional).** Sign in as
`dept.water+clerk_test@example.com`. The report is under **To act on**, with the district officer's
note and the due date.

- Open **Not finished yet? Post a progress update**, write what has been done so far, and press
  **Post update**.

The report stays open, the tracker shows a _Progress update_ entry, and the reporter is told.

**A5. Department officer: record the work.** Under **Record what was done**, write
`Washer and pipe replaced on 26 Sept. Water is flowing again.` and press **Record action taken**.

The report moves to **Waiting on the reporter**. The tracker shows _Action taken_ and asks the
reporter to confirm.

**A6. Check the safeguards.** While still signed in as the department, open the tracker and answer
with the right 4 digits. It is refused: the department that did the work cannot confirm it. Sign
out, then answer with the wrong 4 digits. It is refused: _We could not match that report_.

**A7. Citizen: close it.** Signed out, enter the right last 4 digits and press **Yes, it is fixed**.
The tracker shows _Thank you. This report is now closed._ and _Stage 5 of 5: Closed_.

**A8. Citizen: reopen it.** Open the tracker again. For 30 days after the work was recorded it
offers **No, it is not fixed**, once. Enter the 4 digits, say what is still wrong and press it. The
report goes back to the department under **To act on**, marked _Reopened_, with your reason.

### B. A bigger problem, solved by a university team with an industry partner (about 20 minutes)

**B1. Citizen: report it.** Signed out, open `/submit`, district **Ranchi**:

- _What is the problem?_ `Dhaan ki fasal mein keede lag gaye hain`
- _Describe it in detail_ `Hamare gaon mein dhaan ki fasal par har saal keede lagte hain. Kisan dawa daalte hain par kuch fark nahi padta, aadhi fasal kharab ho jaati hai.`

It should be classified as _Agriculture & Allied_.

**B2. District officer: validate it.** As `district.ranchi+clerk_test@example.com`, open
**Validation queue**. On the report, leave _Decision_ on **Validate** and press **Record decision**.

**B3. District officer: send it to universities.** Open the **Ready to route** tab. Under
_Suggested institutions_, each university is ranked by expertise, faculty, facilities and distance,
with the reason written out. Tick **Birsa Agricultural University**, add an optional note for the
citizen, and press **Route to selected**. The tracker shows _Sent to an institution_.

**B4. University admin: accept it.** Sign in as `university+clerk_test@example.com`. Under
**Referrals**, press **Accept** on the report. Then press **Start a project**, give it a title such as
`Pheromone traps and an SMS pest alert for paddy`, and press **Create project**.

**B5. University admin: form the team.** In the project workspace, under _Team_, use **Add a team
member** to add a faculty member as **Faculty mentor** and at least one **Student**.

**B6. University admin: send the proposal.** Press **Write the research proposal**, fill in the
abstract, methodology, expected outcomes and timeline, and press **Submit proposal**. It shows _With
the district officer for review_. No work can start before approval.

**B7. District officer: approve the proposal.** As the Ranchi officer, open **Proposals**. Choose
**Approve and start the work** and press **Approve proposal**. (You could instead ask for changes
or decline, with a note.) The tracker now shows _Research in progress_, and the citizen is told.

**B8. University team: plan and deliver milestones.** Back as the university admin (or
`faculty+clerk_test@example.com`), open the project. Under _Milestones_, add one with **Add
milestone**, then press **Start work**, and later **Submit for approval**. The district officer
presses **Approve** on it from the same project page.

**B9. University team: record field tests.** Under _Tests_, press **Record a test**: what was tested,
how, the date, the result (passed, failed or inconclusive) and what it showed. Failed tests stay on
record too.

**B10. Industry partner: offer support.** Sign in as `industry.agri+clerk_test@example.com`. Under
**Discover projects**, open the project, tick what you can offer (for example _Funding_ and _Pilot
and deployment_), write a message and press **Send offer**.

**B11. University admin: accept the partner.** Under **Industry offers**, press **Accept
partnership**. The partner now appears on the project and on the public tracker.

**B12. University team: move the stages.** Under _Project stage_, choose the next stage and press
**Move to**: _Prototype ready_, then _Pilot underway_, then _Deployed_, each with an optional note
for the citizen. Under _Outcomes_, press **Record an outcome**, for example a _Deployment_ with the
number of farmers reached. Each move updates the public tracker.

**B13. District officer: close it.** Once the change is holding, the Ranchi officer opens the
project and moves it to **Closed**. The record stays public. The outcome now counts on the state
dashboard and on `/impact`.

### C. Running the platform as a super administrator (about 5 minutes)

**C1. Become the super administrator.** See [Becoming an administrator](README.md#becoming-an-administrator)
in the README. Then sign in and open `/admin`.

**C2. Onboard an organisation.** Under _Onboard an organisation_, add a university or an industry
partner. Akhra emails an invitation to its first administrator, who then invites their own
colleagues from their _Team_ tab.

**C3. Give government access.** Under _Government access_, invite a district officer for one
district, a state-wide officer, or a department officer. Every action on this page is written to
the audit log.

## If something fails on stage

Every screen from step 4 of the five-minute demo already has sample data. If the internet is slow,
the offline model still classifies reports, and the public pages work without signing in.

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
- **Why spam does not swamp it.** Hourly limits per number and per network address, a hidden
  field that catches form-filling bots, duplicate detection, and a person checks every report
  before it goes anywhere.
- **Why it matches NEP 2020.** Students and faculty work on real problems from their own state, and
  the dashboard shows what came out of it: projects, patents, startups and people reached.

## What we tested

**433 automated tests in 48 files run on every change**, against a real PostgreSQL database, not
mocks. GitHub runs them together with lint, type checks, a production build and a browser check of
every public page in English and Hindi, on a phone and a laptop screen.

**Who can see and change what.**

- A Ranchi officer never sees another district's reports. The database itself refuses the query,
  even when the application's own checks are bypassed.
- A department sees only the reports assigned to it, cannot act on another department's report, and
  cannot validate or route anything.
- The department that did the work cannot confirm it, even when its own staff filed the report.
- Nobody can make themselves an administrator: a session keeps the role the database holds now, not
  the one it started with, and a suspended account is signed out.
- The public list and tracker never show who reported a problem, and never show which AI model
  classified it.

**The citizen's safeguards.**

- Only the right last 4 mobile digits let someone confirm or reopen a report. After 5 wrong guesses
  in an hour it stops answering, and a reporter who answers correctly is never counted against that
  limit.
- A report can be reopened once, within 30 days. If the reporter never answers, it closes by itself
  after those 30 days.
- The reporter's name and number are erased one year after the report closes.
- A script disguised as a PDF, a file over 10 MB or an unsupported type is refused. Photos are stored
  privately and shown only to people allowed to see the report.

**Bots and spam.** A bot that floods the form with reports is slowed down at several points, and
none of its reports reaches a department without a person looking at it first.

- One mobile number, or one signed-in account, can file 5 reports an hour.
- One network address can file 20 anonymous reports an hour. This is set higher than the per-number
  limit because a village or a CSC (Common Service Centre) often shares one address, and a bot can
  invent new mobile numbers but not new addresses as easily.
- The form has a field people never see. Form-filling bots fill it in, and the report is refused
  before anything is stored.
- Uploads are limited to 20 an hour, and only real images, videos and PDFs are accepted.
- A repeat of the same report is flagged as a likely duplicate, so the officer can merge it into
  the original.
- Every report waits in the district officer's queue until someone validates it, sends it to a
  department or marks it _Not taken up_. Spam never reaches a department or a university.

A bot spread across many addresses could still get past the limits. For a real launch we would add
a human check such as Cloudflare Turnstile on the report form.

**The AI keeps working when the AI is down.**

- If Gemini fails, Groq answers; if both fail, the offline TF-IDF model still classifies the report.
  A provider that keeps failing is skipped for a minute instead of slowing every report.
- An answer naming a category that does not exist is rejected, not stored.
- The same problem written in English, Hinglish and Hindi is flagged as a likely duplicate. Merged
  reporters keep getting updates, each in their own language.

**Nothing waits forever.**

- A department gets 21 days, as CPGRAMS requires, and a reminder at day 14.
- A report nobody validates is escalated to the district officer and the state, once.
- The dashboard's cached figures are recounted as soon as a report is filed.
- A university cannot start work, plan milestones or record outcomes until the district officer
  approves its proposal, and it cannot approve its own proposal, even by writing to the database.
- One test carries a single report from the citizen all the way to a deployed solution counted on
  the impact page.

**By hand, in a browser.** On 26 September 2026 we ran route A end to end: an anonymous report in
Hinglish, sent to the Water department with a note, the work recorded, a wrong number refused, the
department refused from confirming its own work, the report closed by the reporter, reopened once,
and a progress update posted. On the live site we filed anonymous reports with a photo and a map
pin, and tracked them by their codes.

**Problems we found by testing, and fixed.**

- The reporter was not told when the department said the work was done.
- A closed report could not be reopened from the tracker, although the 30-day window was still open.
- A reporter answering honestly could be locked out by the limit meant for people guessing.
- The department never saw the district officer's instructions, and it was asked for progress
  updates but had no way to post one.
- Reminder emails sent department officers to a page they were not allowed to open.
- After a quiet week the dashboard could show week-old figures on first open.
- Messages from the server were in English on Hindi pages, and dates followed the server's clock
  instead of India time.
