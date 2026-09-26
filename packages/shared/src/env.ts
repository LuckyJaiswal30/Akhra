import { z } from 'zod';

const csv = (fallback: string) =>
  z
    .string()
    .default(fallback)
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required (Neon or any Postgres connection string)'),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(5),

  INVITE_SIGNING_SECRET: z
    .string()
    .min(
      32,
      'INVITE_SIGNING_SECRET must be at least 32 characters. Generate one with: openssl rand -base64 48',
    ),
  INVITE_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(72),

  CLERK_SECRET_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().optional(),

  AI_PROVIDER_CHAIN: csv('gemini,groq,tfidf'),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(6000),
  AI_BREAKER_THRESHOLD: z.coerce.number().int().positive().default(3),
  AI_BREAKER_COOLDOWN_MS: z.coerce.number().int().positive().default(60_000),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-3.6-flash'),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('openai/gpt-oss-20b'),

  FILE_STORAGE_DRIVER: z.enum(['local', 'blob']).default('local'),
  LOCAL_UPLOAD_DIR: z.string().default('.uploads'),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  MAX_UPLOAD_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(10 * 1024 * 1024),

  MAIL_DRIVER: z.enum(['console', 'resend']).default('console'),
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().default('Akhra <onboarding@resend.dev>'),

  RATE_LIMIT_SUBMISSIONS_PER_HOUR: z.coerce.number().int().positive().default(5),
  TURNSTILE_SECRET_KEY: z.string().optional(),

  LOG_LEVEL: z.enum(['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  ALLOW_SEED: z.stringbool().default(false),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url('NEXT_PUBLIC_APP_URL must be a full URL, e.g. http://localhost:3000'),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;

export const ENV_KEYS = [...Object.keys(serverSchema.shape), ...Object.keys(clientSchema.shape)];
const KNOWN_KEYS = ENV_KEYS;

export function nearMissWarnings(source: Record<string, string | undefined>): string[] {
  const warnings: string[] = [];
  for (const name of Object.keys(source)) {
    if (KNOWN_KEYS.includes(name)) continue;
    const intended = KNOWN_KEYS.find((known) => known.toLowerCase() === name.toLowerCase());
    if (intended) {
      warnings.push(
        `Found "${name}", which will be ignored because environment names are case-sensitive. Rename it to ${intended}.`,
      );
    }
  }
  return warnings;
}

function formatIssues(error: z.ZodError): string {
  return error.issues.map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
}

let cachedServerEnv: ServerEnv | undefined;

export function getServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;

  const parsed = serverSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(
      `Invalid server environment configuration:\n${formatIssues(parsed.error)}\n\nEvery variable is listed in the README's "Environment variables" table.`,
    );
  }

  const env = parsed.data;
  const warnings = [...nearMissWarnings(source), ...collectConfigWarnings(env)];
  if (warnings.length > 0 && env.NODE_ENV !== 'test') {
    for (const w of warnings) console.warn(`[akhra:config] ${w}`);
  }

  cachedServerEnv = env;
  return env;
}

export function getClientEnv(source: Record<string, string | undefined>): ClientEnv {
  const parsed = clientSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid client environment configuration:\n${formatIssues(parsed.error)}`);
  }
  return parsed.data;
}

export function collectConfigWarnings(env: ServerEnv): string[] {
  const warnings: string[] = [];
  const isProd = env.NODE_ENV === 'production';

  const chain = env.AI_PROVIDER_CHAIN;
  if (chain.includes('gemini') && !env.GEMINI_API_KEY) {
    warnings.push('GEMINI_API_KEY is not set — the gemini tier will be skipped.');
  }
  if (chain.includes('groq') && !env.GROQ_API_KEY) {
    warnings.push('GROQ_API_KEY is not set — the groq tier will be skipped.');
  }
  if (!chain.includes('tfidf')) {
    warnings.push('AI_PROVIDER_CHAIN does not end with "tfidf" — classification can now fail.');
  }
  if (env.FILE_STORAGE_DRIVER === 'blob' && !env.BLOB_READ_WRITE_TOKEN) {
    warnings.push('FILE_STORAGE_DRIVER=blob but BLOB_READ_WRITE_TOKEN is missing.');
  }
  if (env.MAIL_DRIVER === 'resend' && !env.RESEND_API_KEY) {
    warnings.push('MAIL_DRIVER=resend but RESEND_API_KEY is missing.');
  }
  if (env.MAIL_DRIVER === 'resend' && /@resend\.dev>?$/i.test(env.MAIL_FROM)) {
    warnings.push(
      'MAIL_FROM is on resend.dev — Resend delivers only to your own account address until you verify a sending domain.',
    );
  }
  if (isProd && !env.CLERK_SECRET_KEY) {
    warnings.push(
      'CLERK_SECRET_KEY is missing in production. Sign-in and invitations need a Clerk production instance.',
    );
  }
  if (isProd && !env.CRON_SECRET) {
    warnings.push(
      'CRON_SECRET is missing: escalation, reminders and dashboard rollups will not run.',
    );
  }
  if (isProd && !env.CLERK_WEBHOOK_SIGNING_SECRET) {
    warnings.push(
      'CLERK_WEBHOOK_SIGNING_SECRET is missing: email changes and deleted Clerk users will not reach Akhra.',
    );
  }
  if (isProd && env.MAIL_DRIVER === 'console') {
    warnings.push('Running in production with MAIL_DRIVER=console — no email will be delivered.');
  }
  if (isProd && env.FILE_STORAGE_DRIVER === 'local') {
    warnings.push(
      'Running in production with FILE_STORAGE_DRIVER=local — uploads will not survive a serverless redeploy.',
    );
  }
  if (isProd && !env.TURNSTILE_SECRET_KEY) {
    warnings.push(
      'TURNSTILE_SECRET_KEY is missing: anonymous reports have no human check, only rate limits.',
    );
  }
  if (isProd && env.ALLOW_SEED) {
    warnings.push('ALLOW_SEED is enabled in production. This should be false.');
  }
  return warnings;
}

export function resetServerEnvCache(): void {
  cachedServerEnv = undefined;
}
