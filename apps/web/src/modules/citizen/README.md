# citizen

Everything a member of the public does: reporting a challenge, and following what happened to it.

## Public API

```ts
submitProblemAction(prev, formData)   // server action used by SubmitForm
submitProblem(actor, payload)         // the write path, callable from anywhere
recordAttachment(actor, file)
listProblems(actor, filter)           // visibility decided by RLS, not by this query
trackByRefCode(refCode)               // public: no session required
supportProblem / withdrawSupport / hasSupported   // "this affects me too", one per account
<SubmitForm />, <StatusTimeline />, <SupportButton />
```

## Design notes

**Anonymous reporting is a first-class path, not a fallback.** Many citizens in rural Jharkhand
will not create an account, so `problems.submitter_id` is nullable and a report is looked up
afterwards by its reference code (`AKH-2026-000123`) — a format designed to be readable over
the phone or written on paper.

**A stale session must never break submission.** A signed cookie can outlive the user row it
names. `resolveSubmitterId` checks the row exists and records the report anonymously if it does
not, rather than raising a foreign-key violation on the most important flow in the product.

**Reference codes are allocated inside the caller's transaction** via `ref_code_counters`, so a
failed submission never burns a number and codes stay gapless.

**Classification happens before the write** so the domain is stored on the row itself. It cannot
block submission — the chain in `packages/classifier` always terminates in an offline tier.

**The reporter tells us how serious it is.** The form asks how many people the problem reaches and
whether anyone could be hurt. Both feed the report's priority, computed in the same transaction as
the insert, so a report never sits in the queue unranked. Citizens with an account can support a
report instead of filing it again; support is one row per person, and the count is derived from
those rows.

## Uploads

Files go through `@/server/file-storage`, which picks a driver from `FILE_STORAGE_DRIVER`
(`local` disk in development, Vercel Blob in production). The uploaded filename is never used
to build a path or an extension: storage keys are random UUIDs and the extension comes from a
MIME allowlist, so a crafted filename cannot traverse or collide. The local driver's read route
sets `Content-Security-Policy: sandbox` and `nosniff`.

## Extending it

The status tracker renders from `status_events`, so any module that appends a row there shows up
in the citizen's timeline automatically — set `isPublic: false` for internal notes. That is the
intended way to surface progress to a reporter without this module knowing about your feature.
