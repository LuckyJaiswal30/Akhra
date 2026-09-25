<p align="center"><img src="apps/web/public/brand/akhra-logo.svg" alt="Akhra" width="260"></p>

**Akhra (अखरा)** is a platform where people in Jharkhand report local problems. District officers
route each one either to the department that can fix it or to a university team that can research a
solution, and industry partners fund, mentor and deploy what those teams build. The person who
reported the problem follows every step and is the one who closes it.

An _akhra_ is the village commons where a community gathers to decide things together. Akhra is a
Smart India Hackathon prototype, not an official government service.

## What it does

| Problem statement module | Where it lives                                                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Citizen engagement       | Report with photos, video, PDFs, district and map pin; five kinds of submitter; no account needed; draft kept offline; voice input (`modules/citizen`)                   |
| AI problem management    | Gemini → Groq → offline TF-IDF classification, priority score, duplicate detection, expertise-based university ranking (`packages/classifier`, `modules/classification`) |
| University collaboration | Referral inbox, student and faculty teams, versioned proposals (`modules/university`)                                                                                    |
| Industry partnership     | Six kinds of partner, nine kinds of offer, from mentoring to technology transfer (`modules/industry`)                                                                    |
| Project lifecycle        | Proposal approval, milestones, documents, field tests, outcomes and IP, stage advancement (`modules/lifecycle`)                                                          |
| Analytics                | State and district dashboards, district map, sector × district grid, CSV export, public impact page (`modules/analytics`)                                                |
| Notifications            | In-app notification centre, email, a public and internal thread per report, scheduled reminders and escalations (`modules/notifications`, `modules/automation`)          |

What sets it apart:

- **The reporter closes the loop.** A department's fix is only closed when the reporter confirms it; they can reopen it within 30 days.
- **Routing that explains itself.** Institutions are ranked on stated expertise, faculty, facilities and distance, and the officer sees every reason.
- **Classification that keeps working.** If Gemini and Groq are unreachable, an offline bilingual classifier answers.
- **Each district sees only its own reports**, enforced by PostgreSQL row-level security as well as the app.
- **Built for weak connections.** A half-written report survives a lost signal, the map is plain SVG, and public pages work even without the identity provider.

## Quick start

Needs Node.js 22.12+ (24 LTS recommended), pnpm 11 and PostgreSQL 15+.

```bash
git clone https://github.com/LuckyJaiswal30/Akhra.git && cd Akhra
pnpm install
docker run -d --name akhra-db -e POSTGRES_USER=akhra -e POSTGRES_PASSWORD=akhra -e POSTGRES_DB=akhra -p 5432:5432 postgres:17
cp .env.example .env.local
```

In `.env.local` set `DATABASE_URL="postgresql://akhra:akhra@localhost:5432/akhra"` and
`INVITE_SIGNING_SECRET` (`openssl rand -base64 48`). Then:

```bash
pnpm db:migrate
pnpm db:seed      # 24 districts, sample institutions, partners, reports and projects
pnpm dev          # http://localhost:3000
```

That is enough for the public site, anonymous reporting, the tracker and the impact pages. To use
the officer, university and industry portals, add free Clerk development keys
(`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`) and run `pnpm clerk:demo-users` once. The
demo accounts and a five-minute walkthrough are in [`docs/DEMO.md`](docs/DEMO.md).

Seed data is sample data. Public pages label it as such while `ALLOW_SEED=true`.

## Environment variables

Every variable is validated at boot by the Zod schema in `packages/shared/src/env.ts`, and a test
fails if this table, `.env.example` and the schema disagree. Everything optional has a working
local default: email is logged to the console, files go to local disk, and classification falls
back to the offline tier.

| Variable                            | Needed        | Default                         | Purpose                                                       |
| ----------------------------------- | ------------- | ------------------------------- | ------------------------------------------------------------- |
| `DATABASE_URL`                      | Required      | —                               | PostgreSQL connection string                                  |
| `DATABASE_POOL_MAX`                 | Optional      | `5`                             | Connections per server instance                               |
| `INVITE_SIGNING_SECRET`             | Required      | —                               | Signs invitation links (`openssl rand -base64 48`, 32+ chars) |
| `INVITE_TTL_HOURS`                  | Optional      | `72`                            | How long an invitation link stays valid                       |
| `NEXT_PUBLIC_APP_URL`               | Required      | —                               | Public URL of the app, e.g. `http://localhost:3000`           |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | For sign-in   | —                               | Clerk publishable key                                         |
| `CLERK_SECRET_KEY`                  | For sign-in   | —                               | Clerk secret key                                              |
| `CLERK_WEBHOOK_SIGNING_SECRET`      | Deployed      | —                               | Verifies Clerk webhooks at `/api/webhooks/clerk`              |
| `CRON_SECRET`                       | Deployed      | —                               | Bearer token for `/api/cron/maintenance`                      |
| `AI_PROVIDER_CHAIN`                 | Optional      | `gemini,groq,tfidf`             | Classifier tiers, tried in order                              |
| `AI_TIMEOUT_MS`                     | Optional      | `6000`                          | Per-call timeout for an AI provider                           |
| `AI_BREAKER_THRESHOLD`              | Optional      | `3`                             | Failures before a provider is skipped                         |
| `AI_BREAKER_COOLDOWN_MS`            | Optional      | `60000`                         | How long a failing provider is skipped                        |
| `GEMINI_API_KEY`                    | Optional      | tier skipped                    | Google AI Studio key                                          |
| `GEMINI_MODEL`                      | Optional      | `gemini-3.6-flash`              | Gemini model ID                                               |
| `GROQ_API_KEY`                      | Optional      | tier skipped                    | Groq key                                                      |
| `GROQ_MODEL`                        | Optional      | `openai/gpt-oss-20b`            | Groq model ID                                                 |
| `MAIL_DRIVER`                       | Optional      | `console`                       | `console` logs email; `resend` sends it                       |
| `RESEND_API_KEY`                    | With `resend` | —                               | Resend API key                                                |
| `MAIL_FROM`                         | Optional      | `Akhra <onboarding@resend.dev>` | Sender address                                                |
| `FILE_STORAGE_DRIVER`               | Optional      | `local`                         | `local` disk or Vercel `blob`                                 |
| `LOCAL_UPLOAD_DIR`                  | Optional      | `.uploads`                      | Upload folder for the `local` driver                          |
| `MAX_UPLOAD_BYTES`                  | Optional      | `10485760`                      | Largest accepted attachment                                   |
| `BLOB_READ_WRITE_TOKEN`             | With `blob`   | —                               | Vercel Blob token                                             |
| `RATE_LIMIT_SUBMISSIONS_PER_HOUR`   | Optional      | `5`                             | Reports one visitor can file per hour                         |
| `LOG_LEVEL`                         | Optional      | `info`                          | `silent`, `fatal`, `error`, `warn`, `info`, `debug`, `trace`  |
| `ALLOW_SEED`                        | Optional      | `false`                         | `true` allows `pnpm db:seed` (never in production)            |
| `TEST_DATABASE_URL`                 | Tests         | `<db>_test`                     | Database the test suite owns                                  |
| `E2E_BASE_URL`                      | Tests         | —                               | Run browser tests against an already running app              |

## Commands

| Command                                       | What it does                                                                  |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| `pnpm dev` / `pnpm build`                     | Run the app in development / build it for production                          |
| `pnpm lint` / `pnpm typecheck`                | ESLint (including module-boundary rules) / TypeScript in every package        |
| `pnpm test`                                   | Unit, integration and row-level-security tests on a separate test database    |
| `pnpm test:browser`                           | Playwright smoke test of every public page, both languages, phone and desktop |
| `pnpm ci:local`                               | Everything CI runs                                                            |
| `pnpm db:migrate` / `db:seed` / `db:generate` | Apply migrations / load sample data / generate a migration from the schema    |
| `pnpm clerk:demo-users`                       | Create the demo accounts in a Clerk development instance                      |
| `pnpm admin:bootstrap`                        | Reserve the first super administrator                                         |
| `pnpm cron:local`                             | Run the nightly maintenance jobs against a local server                       |
| `pnpm email:preview`                          | Render every email to `.email-previews/`                                      |

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): how it is built, why each technology was chosen, and likely judge questions.
- [`docs/DEMO.md`](docs/DEMO.md): the five-minute demo script.
- [`CONTRIBUTING.md`](CONTRIBUTING.md): conventions, testing and the dependency policy.

## Credits

IBM Plex Sans and IBM Plex Sans Devanagari (SIL Open Font License 1.1). District boundaries from
[geoBoundaries](https://www.geoboundaries.org/) (ODbL 1.0), sourced from the Local Government
Directory. Icons by [Lucide](https://lucide.dev) (ISC). The Akhra logo is original to this project.

Code under the [MIT License](LICENSE).
