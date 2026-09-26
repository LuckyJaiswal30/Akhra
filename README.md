<p align="center"><img src="apps/web/public/brand/akhra-logo.svg" alt="Akhra" width="260"></p>

**Akhra (अखरा)** lets people in Jharkhand report local problems. A district officer checks each
report and sends it either to the government department that can fix it, or, if the problem is
bigger than one repair, to a university team with industry partners behind it. The person who
reported it can follow every step with a reference code, and the report closes only when they
confirm the fix.

An _akhra_ is the village ground where people meet to decide things together. This is our Smart
India Hackathon prototype, not an official government service.

## Problem statement

- **Smart India Hackathon problem statement ID:** 26043
- **Title:** A digital platform to crowdsource societal challenges and facilitate collaborative
  problem solving through universities and industry partnerships
- **Organisation:** Government of Jharkhand
- **Department:** Department of Higher & Technical Education
- **Category:** Software
- **Theme:** Smart Education
- **Live demo:** [akhra.imlucky.dev](https://akhra.imlucky.dev)

A step-by-step demo is in [DEMO.md](DEMO.md).

### What the problem statement asks for, and where it is in Akhra

| Asked for                | In Akhra                                                                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Citizen engagement       | Individuals, community groups, Panchayati Raj institutions, urban local bodies and government departments report with photos, video, PDFs and a map pin |
| AI problem management    | Automatic category (Gemini, then Groq, then an offline model), a priority score, duplicate detection across languages, and university ranking           |
| University collaboration | Referral inbox, accept or decline, student and faculty teams with a faculty mentor, versioned proposals                                                 |
| Industry partnership     | Corporates, startups, MSMEs, CSR foundations, research labs and innovation hubs offer mentoring, funding, co-development, pilots or technology transfer |
| Project lifecycle        | Proposal approval, milestones, documents, field tests, outcomes and patents (filed, published, granted), and the stage of each project                  |
| Analytics dashboard      | Reports by month, category and district, a district map, institution and industry participation, completion rate, patents, startups and people reached  |
| Notifications            | In-app notifications, email, a conversation on every report, and nightly reminders and escalations                                                      |

Two things go beyond the brief. A routine problem, like a broken chapakal, goes straight to the
department that can fix it, with a 21-day deadline. And every report closes only when the person
who reported it confirms the fix.

## Features

- **Citizens** report with photos, video or PDFs, a district and a map pin. They can write in Hindi,
  English or Hinglish, or speak the report. No account is needed, and a half-written report is saved
  on the phone. Updates come back in the language they reported in.
- **Classification** tries Gemini, then Groq, then an offline TF-IDF model, so it still works without
  internet. It also scores priority and flags likely duplicates, even when the same problem was
  reported in another language.
- **District officers** see only their own district's reports, enforced by PostgreSQL row-level
  security as well as the app.
- **Universities** get referrals ranked by expertise, faculty, facilities and distance, then form
  teams, submit proposals, and track milestones and field tests.
- **Industry partners** can offer funding, mentoring, pilots or technology transfer to vetted projects.
- **The state** sees dashboards by district and sector, a district map and CSV export. The public
  gets an impact page.
- **Notifications** go out in the app and by email, with reminders and escalations run nightly.
- **Reporters close the loop.** They confirm a department's fix, or reopen it within 30 days.

## Team

| Name             | GitHub                                                               | Role                                              |
| ---------------- | -------------------------------------------------------------------- | ------------------------------------------------- |
| Lucky Jaiswal    | [@LuckyJaiswal30](https://github.com/LuckyJaiswal30)                 | Development, design and architecture              |
| Chetan Pathak    | [@ChetanPathak21](https://github.com/ChetanPathak21)                 | Planning, problem research, presentation and demo |
| Anshika Mishra   | [@anshikam0618-a11y](https://github.com/anshikam0618-a11y)           | Testing, bug finding, presentation and demo       |
| Kavya Tripathi   | [@kavyatri9090](https://github.com/kavyatri9090)                     | UI ideas and feedback                             |
| Shashank Mishra  | [@1ShashankMishra](https://github.com/1ShashankMishra)               | Presentation preparation                          |
| Kavya Srivastava | [@kavyasrivastava769-bot](https://github.com/kavyasrivastava769-bot) | Presentation preparation                          |

## Running it locally

You need Node.js 22.12 or newer, pnpm 11, and PostgreSQL 15 or newer (Docker is easiest).

```bash
git clone https://github.com/LuckyJaiswal30/Akhra.git && cd Akhra
pnpm install
docker run -d --name akhra-db -e POSTGRES_USER=akhra -e POSTGRES_PASSWORD=akhra -e POSTGRES_DB=akhra -p 5432:5432 postgres:17
cp .env.example .env.local
```

In `.env.local`, set `DATABASE_URL="postgresql://akhra:akhra@localhost:5432/akhra"` and
`INVITE_SIGNING_SECRET` (`openssl rand -base64 48`). Then run:

```bash
pnpm db:migrate
pnpm db:seed      # districts, sample institutions, partners, reports and projects
pnpm dev          # http://localhost:3000
```

That's enough for the public site, anonymous reporting and the tracker. For the officer,
university and industry desks, add free Clerk development keys
(`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`) and run `pnpm clerk:demo-users` once.

Seed data is sample data, and the public pages say so while `ALLOW_SEED=true`.

### Demo accounts

Password for all of them: `akhra2026`. If Clerk asks for a code, use `424242`.

| Account                                  | Role                                              |
| ---------------------------------------- | ------------------------------------------------- |
| `citizen+clerk_test@example.com`         | Citizen                                           |
| `district.ranchi+clerk_test@example.com` | District officer, Ranchi                          |
| `gov+clerk_test@example.com`             | State desk (all districts)                        |
| `university+clerk_test@example.com`      | University admin, BAU Ranchi                      |
| `industry.agri+clerk_test@example.com`   | Industry partner, Krishi Setu Agritech            |
| `dept.water+clerk_test@example.com`      | Department officer, Drinking Water and Sanitation |

`pnpm db:seed` adds 52 accounts to the database, and `pnpm clerk:demo-users` creates the same 52 in
your Clerk development instance so they can sign in. All of them follow the pattern
`name+clerk_test@example.com` and are listed in `packages/db/src/seed/users.ts`.

| Role                 | Accounts | Who                                                                        |
| -------------------- | -------- | -------------------------------------------------------------------------- |
| State desk           | 1        | `gov`, all 24 districts                                                    |
| District officer     | 24       | `district.<code>`, one per district, for example `district.ran`, `.dha`    |
| Department officer   | 10       | `dept.water`, `.health`, `.education`, `.rural`, `.agriculture` and others |
| University admin     | 2        | `university` (BAU Ranchi), `university.med` (RIMS Ranchi)                  |
| Faculty              | 4        | `faculty`, `faculty.env`, `faculty.water`, `faculty.edu`                   |
| Student              | 2        | `student.priya`, `student.amit`                                            |
| Industry admin       | 5        | `industry`, `industry.csr`, `industry.energy`, `industry.agri`, and others |
| Industry team member | 1        | `industry.agri.member`                                                     |
| Citizen              | 3        | `citizen`, `citizen.sunita`, `panchayat` (a mukhiya)                       |

The Ranchi officer is `district.ranchi`, not `district.ran`. No super administrator is seeded;
make one yourself as described below.

### Becoming an administrator

A super administrator can onboard universities and industry partners, give government access and
change officers' postings, all from `/admin`. Nobody can grant this role from the website until one
exists, so the first one is made from the command line:

1. Create your account on the sign-in page (_Create account_, or _Continue with Google_), or skip
   this and pass `--name` in the next step to reserve the account first.
2. Run:

   ```bash
   pnpm admin:bootstrap --email you@example.com --name "Your Name"
   ```

   Against the hosted database, put its connection string in front:
   `DATABASE_URL="postgresql://…" pnpm admin:bootstrap --email you@example.com`.

3. Sign in with that email and open `/admin`.

The command refuses if a super administrator already exists; add `--force` only if you mean it.
After that, promote others from `/admin` with _Make super administrator_. Every grant is written to
the audit log.

## Environment variables

`packages/shared/src/env.ts` checks these at startup. A test keeps this table, `.env.example` and
that schema in sync. Everything optional has a local default: email is printed to the console,
uploads go to local disk, and classification falls back to the offline model.

| Variable                            | Needed        | Default                         | Purpose                                                                |
| ----------------------------------- | ------------- | ------------------------------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`                      | Required      | None                            | PostgreSQL connection string                                           |
| `DATABASE_POOL_MAX`                 | Optional      | `5`                             | Connections per server instance                                        |
| `INVITE_SIGNING_SECRET`             | Required      | None                            | Signs invitation links (`openssl rand -base64 48`, 32+ chars)          |
| `INVITE_TTL_HOURS`                  | Optional      | `72`                            | How long an invitation link stays valid                                |
| `NEXT_PUBLIC_APP_URL`               | Required      | None                            | Public URL of the app, for example `http://localhost:3000`             |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | For sign-in   | None                            | Clerk publishable key                                                  |
| `CLERK_SECRET_KEY`                  | For sign-in   | None                            | Clerk secret key                                                       |
| `CLERK_WEBHOOK_SIGNING_SECRET`      | Deployed      | None                            | Verifies Clerk webhooks at `/api/webhooks/clerk`                       |
| `CRON_SECRET`                       | Deployed      | None                            | Bearer token for `/api/cron/maintenance`                               |
| `AI_PROVIDER_CHAIN`                 | Optional      | `gemini,groq,tfidf`             | Classifier tiers, tried in order                                       |
| `AI_TIMEOUT_MS`                     | Optional      | `6000`                          | Per-call timeout for an AI provider                                    |
| `AI_BREAKER_THRESHOLD`              | Optional      | `3`                             | Failures before a provider is skipped                                  |
| `AI_BREAKER_COOLDOWN_MS`            | Optional      | `60000`                         | How long a failing provider is skipped                                 |
| `GEMINI_API_KEY`                    | Optional      | tier skipped                    | Google AI Studio key                                                   |
| `GEMINI_MODEL`                      | Optional      | `gemini-3.6-flash`              | Gemini model ID                                                        |
| `GROQ_API_KEY`                      | Optional      | tier skipped                    | Groq key                                                               |
| `GROQ_MODEL`                        | Optional      | `openai/gpt-oss-20b`            | Groq model ID                                                          |
| `MAIL_DRIVER`                       | Optional      | `console`                       | `console` logs email; `resend` sends it                                |
| `RESEND_API_KEY`                    | With `resend` | None                            | Resend API key                                                         |
| `MAIL_FROM`                         | Optional      | `Akhra <onboarding@resend.dev>` | Sender address                                                         |
| `FILE_STORAGE_DRIVER`               | Optional      | `local`                         | `local` disk or Vercel `blob`                                          |
| `LOCAL_UPLOAD_DIR`                  | Optional      | `.uploads`                      | Upload folder for the `local` driver                                   |
| `MAX_UPLOAD_BYTES`                  | Optional      | `10485760`                      | Largest accepted attachment                                            |
| `BLOB_READ_WRITE_TOKEN`             | With `blob`   | None                            | Vercel Blob token                                                      |
| `RATE_LIMIT_SUBMISSIONS_PER_HOUR`   | Optional      | `5`                             | Reports one visitor can file per hour                                  |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`    | Deployed      | check skipped                   | Cloudflare Turnstile site key for the human check on anonymous reports |
| `TURNSTILE_SECRET_KEY`              | Deployed      | check skipped                   | Cloudflare Turnstile secret key, checked on the server                 |
| `LOG_LEVEL`                         | Optional      | `info`                          | `silent`, `fatal`, `error`, `warn`, `info`, `debug`, `trace`           |
| `ALLOW_SEED`                        | Optional      | `false`                         | `true` allows `pnpm db:seed` (never in production)                     |
| `TEST_DATABASE_URL`                 | Tests         | `<db>_test`                     | Database the test suite uses                                           |
| `E2E_BASE_URL`                      | Tests         | None                            | Run browser tests against an already running app                       |

## Commands

| Command                                       | What it does                                                            |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| `pnpm dev` / `pnpm build`                     | Run the app locally / build it for production                           |
| `pnpm lint` / `pnpm typecheck`                | ESLint / TypeScript across all packages                                 |
| `pnpm test`                                   | Unit, integration and row-level-security tests on a separate database   |
| `pnpm test:browser`                           | Playwright check of every public page, both languages, phone and laptop |
| `pnpm ci:local`                               | Everything CI runs                                                      |
| `pnpm db:migrate` / `db:seed` / `db:generate` | Apply migrations / load sample data / generate a migration              |
| `pnpm clerk:demo-users`                       | Create the demo accounts in a Clerk development instance                |
| `pnpm admin:bootstrap`                        | Reserve the first super administrator                                   |
| `pnpm cron:local`                             | Run the nightly jobs against a local server                             |
| `pnpm email:preview`                          | Render every email to `.email-previews/`                                |

## Credits

IBM Plex Sans and IBM Plex Sans Devanagari (SIL Open Font License 1.1). District boundaries from
[geoBoundaries](https://www.geoboundaries.org/) (ODbL 1.0), sourced from the Local Government
Directory. Icons by [Lucide](https://lucide.dev) (ISC). The Akhra logo was made for this project.

Code under the [MIT License](LICENSE).
