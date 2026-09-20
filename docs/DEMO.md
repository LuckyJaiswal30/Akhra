# Judge demo — the full loop in under four minutes

Demo accounts sign in through Clerk with the password **`akhra2026`**. Create them once per Clerk
development instance with `pnpm clerk:demo-users` (after `pnpm db:seed`). They are Clerk test
addresses: if Clerk asks for a code, type **`424242`**. The super admin is not seeded: reserve it
once with `pnpm admin:bootstrap --email <you> --name "<your name>"`, then create your account with
that email on the _Create Account_ tab (see the README). Load the app once before presenting: Neon
scales to zero after five idle minutes and the first request pays the wake-up.

To restore the demo state at any time: `pnpm db:seed` (the super admin and the Clerk links are kept).

---

0. **Access is closed.** Open `/sign-up`: the form creates a citizen and nothing else, and says
   that university, industry and government accounts come by invitation. A real address receives
   Clerk's 6-digit code; a `+clerk_test` address takes `424242`.
   Sign in as the super admin and open _Administration_. Onboard an institution with its MOU
   number and one official contact email: Clerk emails the invitation. Open it, set a name and a
   password, then **Accept invitation**. The new university admin can now invite colleagues from
   _Team_, but only into their own university and never above their own role. Signed in as the
   wrong person, the invitation page says so and offers to sign out.

1. **A citizen reports a problem — no account, on a phone, in Hindi.**
   Open `/submit`, switch the language to हिंदी, and describe a problem ("our handpump water has
   turned yellow…"). Pick **Ranchi** as the district, drop a pin, add a photo, submit. The
   receipt names the category and which tier of the AI chain classified it (Gemini, Groq, or the offline keyword model). Copy the
   reference code.

2. **The citizen tracks it.** Paste the code into `/track`. The page shows _Stage 1 of 8:
   Submitted_, and fills in on its own as every other stakeholder acts.

3. **The district validates, the state routes.** Sign in as
   **`district.ranchi+clerk_test@example.com`** (District Officer, Ranchi). The queue holds only
   Ranchi's reports, each with its photo, detected category and any likely duplicates. Validate it
   (or, for a routine issue, _Resolve locally_ with a note the citizen sees). Reports from other
   districts are not there, and cannot be acted on. Then sign in as
   **`gov+clerk_test@example.com`** (state-wide) and open _Ready to route_: institutions are ranked
   with their reasoning shown ("Domain strength 5/5, 81 km away, match 81%"). Route it.

4. **A university takes it on.** Sign in as **`university+clerk_test@example.com`** (BAU Ranchi).
   The bell shows the new referral. Open the seeded pest-advisory project **AKH-2026-000003** to
   show the workspace: team, versioned proposal, milestones, documents that only the team can
   download. Advance the stage to _Pilot_ and record an outcome ("214 farmers enrolled").

5. **Industry commits.** Still as BAU, open _Industry offers_: Krishi Setu Agritech has offered
   ₹5,00,000, mentorship and deployment. **Accept** it. (To show the partner's side, sign in as
   `industry.agri+clerk_test@example.com` and open _Discover projects_: only university-vetted
   work is listed, never raw reports.)

6. **The loop closes for the citizen.** Open `/track?ref=AKH-2026-000003`. The public timeline
   now reads _Pilot underway_ and _"Krishi Setu Agritech has joined as an industry partner"_, with
   the team's public update in the conversation, and none of its internal notes.

7. **The state sees the whole picture.** Back as `gov+clerk_test@example.com`, open _Dashboard_:
   reports by month, by category and by district, how far reports get, funding committed,
   outcomes. Filter to one category and every figure re-scopes. Finish on **"Who classified each
   report"**: it shows which reports the AI tiers answered and which fell back to the keyword
   model. Classification never goes down, key or no key.

---

**If something goes wrong on stage:** every flow from step 1 on also works from seeded data
alone. The queue, referrals, offers, projects and dashboard are all populated before step 1.
