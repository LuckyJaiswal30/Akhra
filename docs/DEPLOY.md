# Deploying Akhra

Everything below uses free tiers. It needs your own Neon and Vercel accounts, so it is written as
steps rather than automated. Budget about 15 minutes.

## 1. Database — Neon

1. Create a project at [neon.tech](https://neon.tech) (region: Singapore or Mumbai for latency).
2. Copy the **pooled** connection string (the host contains `-pooler`).
3. From your machine, apply the migrations:

   ```bash
   DATABASE_URL="<pooled neon url>" pnpm db:migrate
   ```

   Migration `0003` creates the restricted `akhra_app` role that row-level security depends on.
   Neon's default owner role can create roles; if your plan or role cannot, create `akhra_app`
   from the Neon console with the same grants and re-run the migration.

**Do not seed a production database.** For a public demo, create a Neon _branch_ named `demo`,
migrate it, and seed that branch instead:

```bash
DATABASE_URL="<demo branch url>" ALLOW_SEED=true pnpm db:seed
```

The seed refuses to run when `NODE_ENV=production`, so leave it unset locally.

## 2. App — Vercel

1. Push this repository to GitHub, then **Add New → Project** in Vercel and import it.
2. Set **Root Directory** to `apps/web`. Vercel detects the pnpm workspace and Next.js.
3. Add environment variables (Production, and Preview if you use it):

   | Variable                                                 | Value                                                 |
   | -------------------------------------------------------- | ----------------------------------------------------- |
   | `DATABASE_URL`                                           | the pooled Neon URL (or the `demo` branch)            |
   | `INVITE_SIGNING_SECRET`                                  | `openssl rand -base64 48`                             |
   | `NEXT_PUBLIC_APP_URL`                                    | your deployed origin, e.g. `https://akhra.vercel.app` |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Clerk dashboard → Configure → API keys                |
   | `CLERK_WEBHOOK_SIGNING_SECRET`                           | from step 3 below                                     |
   | `FILE_STORAGE_DRIVER`                                    | `blob`                                                |
   | `BLOB_READ_WRITE_TOKEN`                                  | from **Storage → Blob** in Vercel                     |
   | `MAIL_DRIVER`                                            | `resend` (or `console` to skip email)                 |
   | `RESEND_API_KEY`                                         | from [resend.com](https://resend.com), optional       |
   | `GEMINI_API_KEY` / `GROQ_API_KEY`                        | optional — classification works without them          |
   | `ALLOW_SEED`                                             | `false`                                               |

4. Deploy. The boot log prints `[akhra:config]` warnings for anything legal but likely wrong —
   for example `MAIL_DRIVER=console` in production, or missing Clerk keys. Read them once after the
   first deploy.

## 3. Sign-in — Clerk

1. At [dashboard.clerk.com](https://dashboard.clerk.com), use the application you develop with or
   create one. The free Hobby plan is enough.
2. **Configure → User & authentication:** email address with password on, email verification
   code on. Leave phone off: SMS codes are a paid add-on.
3. **Configure → SSO connections:** add Google. Development instances use Clerk's shared Google
   credentials; a production instance needs your own Google OAuth client, which Clerk's page walks
   you through.
4. **Configure → Webhooks → Add endpoint:** `https://<your origin>/api/webhooks/clerk`, events
   `user.created`, `user.updated`, `user.deleted`. Copy the signing secret into
   `CLERK_WEBHOOK_SIGNING_SECRET` and redeploy.
5. A public demo on a development instance can use the demo personas: run
   `CLERK_SECRET_KEY=<sk_test_ key> DATABASE_URL="<demo branch url>" pnpm clerk:demo-users` once.
   The script refuses live keys and production.

## 4. Check it

- Open the URL; the landing page shows live counts.
- Sign in with a demo account (if you seeded the `demo` branch) and walk `docs/DEMO.md`.
- `pnpm ci:local` against the same `DATABASE_URL` runs the RLS tests against the real database.

## Before a real government deployment

- Vercel Hobby **forbids commercial use** — move to Vercel Pro or self-host (`pnpm build` then
  `pnpm start` behind any reverse proxy; the app is a standard Next.js server).
- Switch Vercel Blob to private objects with signed URLs if project documents are sensitive.
- Moving off Neon is a `pg_dump` / `pg_restore` and a new `DATABASE_URL`: there is no
  Neon-specific code in the repository.
