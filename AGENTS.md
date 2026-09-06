<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Akhra

SIH problem statement 43, Government of Jharkhand. A platform where citizens report
local problems, AI sorts and deduplicates them, government officers validate them,
universities take them on as student projects, and industry partners back the
solutions. Internal round is Tuesday 8 September, 09:00.

## Stack

Next.js App Router, Tailwind v4, shadcn (new-york, neutral base, teal primary),
Convex for data and file storage, Clerk for identity, Gemini for classification and
embeddings, Leaflet for maps, Recharts for the dashboard.

## Rules

- No comments in the code. Name things so the comment is unnecessary.
- Commit messages read like a person wrote them. No AI phrasing.
- Every Convex mutation and query that touches user data opens with a call to
  `requireUser` or `requireRole` from `convex/lib/auth.ts`. There are no exceptions.
- Officer decisions are written to `auditLog` via `recordAudit` in the same mutation
  that makes the change.
- Exact coordinates are officer-only. Anything shown to universities, industry or the
  public uses the district and a fuzzed coordinate.
- Only the problem text and district may go into a model prompt. No names, no contact
  details, no photographs.
- Colours come from the CSS variables in `src/app/globals.css`. Do not hard-code hex
  values in components.
- Import Convex generated code with the `@convex/*` alias, app code with `@/*`.

## Roles

citizen, officer, faculty, student, industry. Defined in `src/lib/roles.ts` and mirrored
in `convex/schema.ts`. A signed-in user is created as `citizen` and can be switched from
the header for demo purposes.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
