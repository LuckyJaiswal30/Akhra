# 7. Nothing may depend on a paid or unreachable service

**Status:** Accepted · 2026

## Context

Akhra is built by a student team and demonstrated before it is deployed. A feature that needs a
company registration, a signed contract or a monthly invoice cannot be shown working, and a feature
that cannot be shown working should not be in the repository pretending otherwise.

## Decision

Every dependency must have a path that works for a team with no money and no legal entity. Anything
that does not is removed, not stubbed.

## Alternatives

- **Keep it behind a flag.** Dead code that reads as a finished feature, and misleads a reviewer.
- **Ship it and hope.** It fails in front of the people it was meant to impress.

## Consequences

- **SMS was removed entirely.** Indian transactional SMS needs TRAI DLT registration of a legal
  entity, its sender ID and every template, plus a fee. Reporters hear by in-app notification,
  email and the public tracker.
- Kept, with their ceilings written down in the README: Clerk (free to 50,000 monthly retained
  users; a production instance needs a domain the team controls), Resend (3,000/month, 100/day,
  needs a verified domain), Gemini and Groq free tiers with the offline tier underneath, Neon,
  Vercel Blob, OpenStreetMap tiles for the one map that needs a basemap.
- Vercel's Hobby plan forbids commercial use and runs a cron job at most once a day, so
  `vercel.json` asks for one daily run and every job is written to be idempotent.
