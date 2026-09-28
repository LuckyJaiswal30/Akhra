# Akhra demo

This file has three parts: a five-minute demo for the stage, a full walkthrough that follows two
reports from the citizen to the finish, and what we tested.

Live site: [akhra.imlucky.dev](https://akhra.imlucky.dev). To run it on your own machine, follow
[Running it locally](README.md#running-it-locally) in the README first.

_Each role below names its demo account. They all use the password `akhra2026`, and the code
`424242` if one is asked for. All 52 accounts are listed in the [README](README.md#demo-accounts)._

## Five-minute demo

**Before you start.** Run both walkthroughs below once, so there are reports at every stage to show.
Open each role in its own browser profile, so switching roles takes one click, and keep a
phone-width window for the citizen.

1. **Landing page (20 s).** One line: a citizen reports a problem once, a department or a university
   team fixes it, and the citizen closes it. Switch the page to हिन्दी from the header.
2. **The citizen reports (60 s).** On the phone window, the citizen describes the dark road in their
   own words, in Hindi, English or Hinglish, typed or spoken, pins it on the map and adds a photo.
   Their name and number come from their profile. The receipt shows the reference code and the
   category Akhra picked.
3. **The district officer decides (40 s).** The queue holds only Ranchi's reports, most urgent first,
   each with the reasons for its priority. The officer sends this one to the Urban Development and
   Housing Department, and its 21-day clock starts.
4. **The department acts (30 s).** The department sees the officer's instructions and the due date,
   posts a progress update, then records the finished work. The citizen is told each time.
5. **The citizen closes it (20 s).** From _Your reports_, the citizen confirms the fix. Only the
   reporter can do this: the department cannot close its own work.
6. **A problem that needs research (60 s).** Open the tomato wilt report in the officer's _Ready to
   route_ tab: universities are ranked, each with the reason. Then open the Birsa Agricultural
   University project: the team, the approved proposal, milestones, field tests and Krishi Setu
   Agritech's offer.
7. **The state's view (30 s).** On the state dashboard: reports by month, category and district, the
   district map, and _Who classified each report_, which shows the model on our own server taking
   over whenever the AI services are down.

## Full walkthrough

Two reports, one for each route. Under each role: what that person does, where they do it, and what
changes for everyone else.

### A. Streetlights out on a busy road, fixed by a department (about 10 minutes)

**The problem.** Every streetlight on a stretch of Bariatu Road in Ranchi has been off for three
weeks. It is a routine repair with no research needed, so it goes straight to the department
responsible for street lighting.

**1. Citizen: reports it**
_Demo account: `citizen+clerk_test@example.com` (Ramesh Mahto, Ranchi)_

From **Your reports**, press **Report a problem** and fill in the three steps:

- _What is the problem?_ `Streetlights on Bariatu Road have been off for three weeks`
- _Describe it in detail_ `All eight streetlights between the bus stop and the hostel gate went off after the storm on 12 September. Students walk back from coaching after 8 pm in the dark, and two motorcycles have hit the road divider since.`
- _How many people does this affect?_ **The whole village or ward**, and tick **Someone could be
  hurt**.
- District **Ranchi** is filled in from the profile. Set _Block or ward_ to `Bariatu, ward 22`, tap
  the spot on the map and add a photo of the dark road.
- The contact details come from the profile. Tick the consent box and press **Submit report**.

The receipt shows a reference code and the category Akhra picked, which should be _Urban
Development & Infrastructure_. The
report now sits under **Your reports** at _Stage 1 of 5: Submitted_.

**2. District officer, Ranchi: checks it and picks the department**
_Demo account: `district.ranchi+clerk_test@example.com` (Rakesh Oraon)_

- Open **Validation queue**, tab **Awaiting validation**. The report sits near the top, with its
  priority label and the reasons for it, such as _risk to safety_.
- Check the category Akhra picked. Under **Send to a department**, choose **Urban Development and
  Housing Department** and add a note for them: `Check the feeder pillar near the bus stop. Residents say the whole line went off after the storm.`
- Press **Send to department**.

The report moves to the **With departments** tab. The citizen's tracker now shows _With the
department_ and an answer date 21 days away. The citizen is told in the app, and by email if they
gave one.

**3. Urban Development department: does the work and reports back**
_Demo account: `dept.urban+clerk_test@example.com` (Pooja Sinha, City Manager)_

The report is under **To act on**, with the ward, the district officer's note and the due date.

- While the work is under way, open **Not finished yet? Post a progress update**, write
  `Electrician found a burnt cable at the feeder pillar. New cable ordered, repair on Thursday.` and
  press **Post update**. The report stays open, and the citizen's tracker shows a _Progress update_.
- When the lights are back, under **Record what was done** write
  `Cable replaced and all eight lights tested on 2 October at 7 pm.` and press **Record action taken**.

The report moves to **Waiting on the reporter**, and the citizen is told.

**4. Citizen: confirms the fix, or sends it back**

In **Your reports**, open the report. The tracker shows _The department says this is done_, with
the department's note.

- If the road is lit again, press **Yes, it is fixed**. The report closes: _Stage 5 of 5: Closed_.
- If not, press **No, it is not fixed** and say what is still wrong. It goes back to the
  department's **To act on** list, marked _Reopened_, with the reason. This is allowed once, within 30
  days of the work being recorded.

Only the reporter can make this call. The department officer, pressing the same buttons, is refused.

### B. Tomato plants wilting across a block, solved by a university and an industry partner (about 20 minutes)

**The problem.** For two seasons, tomato plants across several villages of Ormanjhi block wilt and
die just before harvest. No department can repair this. Someone has to find the cause, test a remedy
in the field, and get it to farmers.

**1. Citizen: reports it**
_Demo account: `citizen+clerk_test@example.com`_

Press **Report a problem**:

- _What is the problem?_ `Tomato plants in Ormanjhi wilt and die just before harvest`
- _Describe it in detail_ `For two seasons our tomato plants suddenly droop and die within a few days, even with enough water. Farmers in three nearby villages see the same. Most of us lost half the crop, and the spray from the dealer did not help.`
- _How many people does this affect?_ **Several villages, a block or a town**.
- _Block or ward_ `Ormanjhi block`. Submit.

It should be classified as _Agriculture & Allied_.

**2. District officer, Ranchi: validates it and chooses the university**
_Demo account: `district.ranchi+clerk_test@example.com`_

- In **Awaiting validation**, leave _Decision_ on **Validate** and press **Record decision**.
- Open **Ready to route**. Under _Suggested institutions_, each university is ranked by its
  expertise, faculty, facilities and distance, with the reasons written out. Tick **Birsa
  Agricultural University, Ranchi**, add a note for the citizen, `Sent to BAU's plant protection team.`,
  and press **Route to selected**.

The citizen's tracker shows _Sent to an institution_.

**3. University administrator, BAU: accepts it and forms the team**
_Demo account: `university+clerk_test@example.com` (Dr. Meera Kujur, Dean of Research)_

- Under **Referrals**, press **Accept** on the report, then **Start a project**:
  _Project title_ `Diagnosis and field-tested remedy for tomato wilt in Ormanjhi`,
  _What will your team do?_ `Find the cause from plant and soil samples, test grafted seedlings on two farms, and give farmers a one-page advisory in Hindi.`
  Press **Create project**.
- In the project workspace, use **Add a team member** to add Dr. Rakesh Prasad as **Faculty mentor**
  and Priya Hembrom as **Student**.
- Press **Write the research proposal**. Fill in the abstract, the methodology, the expected
  outcomes and a timeline of 6 months, and press **Submit proposal**.

The proposal waits _with the district officer for review_. No work can start before it is approved.

**4. District officer, Ranchi: approves the plan**

Open **Proposals**, choose **Approve and start the work** and press **Approve proposal**. The
citizen's tracker moves to _Research in progress_, and the citizen is told.

**5. Faculty mentor and student: do the work, milestone by milestone**
_Demo accounts: `faculty+clerk_test@example.com` (Dr. Rakesh Prasad) and `student.priya+clerk_test@example.com` (Priya Hembrom)_

- The mentor adds a milestone with **Add milestone**: `Collect plant and soil samples from 10 farms`,
  with a due date.
- The student presses **Start work** on it and, once the samples are in, **Submit for approval**.
  The district officer presses **Approve** on the same project page.
- The mentor records the field trial under **Record a test**:
  _What was tested_ `Grafted seedlings on a wilt-resistant rootstock`,
  _How it was tested_ `Two farms in Ormanjhi, 40 plants each, over 8 weeks, against ungrafted plants`,
  _Result_ **Passed**, _What it showed_ `3 of 80 grafted plants wilted, against 31 of 80 ungrafted.`
  Failed trials are recorded the same way, because they explain the next change.

**6. Industry partner, Krishi Setu Agritech: offers support**
_Demo account: `industry.agri+clerk_test@example.com` (Sneha Tirkey, Co-founder)_

Under **Discover projects**, open the BAU project. Under _What can you offer?_ tick **Testing and
validation** and **Pilot and deployment**, write
`We run nurseries around Ranchi and can raise grafted seedlings for the pilot and sell them to farmers at cost.`
and press **Send offer**. It shows under **Your offers** as _Awaiting response_.

**7. University administrator, BAU: accepts the partner**

Under **Industry offers**, press **Accept partnership**. Krishi Setu now appears on the project and
on the citizen's tracker.

**8. The team: moves the project forward and records the result**

- Under _Project stage_, choose the next stage and press **Move to**: _Prototype ready_, then _Pilot
  underway_, then _Deployed_, each with a short note for the citizen, such as
  `Grafted seedlings now sold at Krishi Setu nurseries in Ormanjhi.`
- Under **Record an outcome**, choose **Deployment**: _What was achieved?_
  `Grafted seedlings adopted in Ormanjhi`, measured as `Farmers using grafted seedlings`, value `120`.

Every move shows on the citizen's tracker. The outcome counts on the state dashboard and on
`/impact`.

**9. District officer, Ranchi: closes it once the change holds**

On the project page, move it to **Closed**. The record stays public, so anyone can see what was done.

### C. Running the platform (about 5 minutes)

**Super administrator**
_No demo account; make your own as described in [Becoming an administrator](README.md#becoming-an-administrator)._

- **Onboard an organisation** under _Access_: add a university or an industry partner. Its first
  administrator gets an invitation and then adds their own colleagues from their _Team_ tab.
- **Give government access**: invite a district officer for one district, a state-wide officer or a
  department officer.
- **Deal with a spam account** under **People**: find the account and press **Suspend**. The account
  is logged out on every device, and the reports no officer has reviewed yet leave the public pages
  and every count. **Reactivate** lets the person back in. The removed reports stay removed, and
  the person is told they can report a real problem again.

Every action here is written to the audit log.

## If something fails on stage

Every screen in the demo already has sample data. If Gemini and Groq are slow or down, the model on
our own server still classifies reports. If the Wi-Fi drops mid-report, the form keeps what was
typed and sends it once the connection is back.

## Talking points

- **The gap.** People in Jharkhand see problems first, but there is no single place to report them
  and follow them. Universities have students and research labs, and industry has money and
  know-how, but they rarely hear about these problems.
- **What Akhra does.** One report goes to the district officer, who sends it to a department for a
  quick fix, or to the university best suited to solve it, with industry partners joining in.
- **Why people will use it.** It works in Hindi, English and Hinglish, by typing or speaking. On a patchy connection the form keeps what was typed on the phone and waits
  for signal before sending. The reporter follows every step with a reference code, and nothing
  closes until they say it is fixed.
- **Why officers can trust it.** Each district sees only its own reports, enforced by the database
  itself. Every decision is recorded, and overdue reports are raised with the state automatically.
- **Why spam does not swamp it.** A human check on anonymous reports, hourly limits per number and
  per network address, a hidden field that catches form-filling bots, duplicate detection, and a
  person checks every report before it goes anywhere.
- **Why it matches NEP 2020.** Students and faculty work on real problems from their own state, and
  the dashboard shows what came out of it: projects, patents, startups and people reached.

## What we tested

**446 automated tests in 49 files run on every change**, against a real PostgreSQL database, not
mocks. GitHub runs them together with lint, type checks, a production build and a browser check of
every public page in English and Hindi, on a phone and a laptop screen.

**Who can see and change what.**

- A Ranchi officer never sees another district's reports. The database itself refuses the query,
  even when the application's own checks are bypassed.
- A department sees only the reports assigned to it, cannot act on another department's report, and
  cannot validate or route anything.
- The department that did the work cannot confirm it, even when its own staff filed the report.
- Nobody can make themselves an administrator: a session keeps the role the database holds now, not
  the one it started with, and a suspended account loses access at once.
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

- One mobile number, or one account, can file 5 reports an hour.
- One network address can file 20 anonymous reports an hour. This is set higher than the per-number
  limit because a village or a CSC (Common Service Centre) often shares one address, and a bot can
  invent new mobile numbers but not new addresses as easily.
- An anonymous report has to pass Cloudflare Turnstile, a free human check. Most people never see
  a puzzle; at most they tick one box, shown in Hindi on the Hindi page. The server checks every
  token with Cloudflare, and a token works only once. People with an account skip it, because Clerk
  already checked them at sign-up.
- The form has a field people never see. Form-filling bots fill it in, and the report is refused
  before anything is stored.
- Uploads are limited to 20 an hour, and only real images, videos and PDFs are accepted.
- A repeat of the same report is flagged as a likely duplicate, so the officer can merge it into
  the original.
- Every report waits in the district officer's queue until someone validates it, sends it to a
  department or marks it _Not taken up_. Spam never reaches a department or a university.
- A super administrator can suspend a spamming account from _Admin → People_. It loses access on
  every device at once, and its unreviewed reports leave the public pages and every count, while
  reports an officer already accepted stay. Removed reports stay removed even if the account comes
  back.

No check stops every bot: paid services solve captchas with real people. Together these make spam
slow and costly, and whatever gets through still has to pass a district officer.

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
- "Forgot password" did not work for someone who signed up with Google, because such an account
  has no password to reset. It now emails them a sign-in code and lets them choose a password.
- After a password reset, the person landed on a sign-in page that could not sign them in and told
  them to refresh. They now go straight to their dashboard, and anyone already signed in who opens
  a sign-in page is taken to their dashboard instead.
- After a quiet week the dashboard could show week-old figures on first open.
- Messages from the server were in English on Hindi pages, and dates followed the server's clock
  instead of India time.
