import { sql } from 'drizzle-orm';
import { getDb, rateLimits, withoutRls } from '@akhra/db';
import { AppError } from '@akhra/shared';
import { logger } from './logger';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

function windowStartFor(windowMs: number): Date {
  return new Date(Math.floor(Date.now() / windowMs) * windowMs);
}

async function incrementBucket(bucketKey: string, windowStart: Date): Promise<number> {
  return withoutRls(getDb(), async (tx) => {
    const rows = await tx
      .insert(rateLimits)
      .values({ bucketKey, windowStart, hits: 1 })
      .onConflictDoUpdate({
        target: [rateLimits.bucketKey, rateLimits.windowStart],
        set: { hits: sql`${rateLimits.hits} + 1` },
      })
      .returning({ hits: rateLimits.hits });
    return rows[0]?.hits ?? 1;
  });
}

export async function consumeRateLimit(
  bucketKey: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const windowStart = windowStartFor(windowMs);
  const resetAt = new Date(windowStart.getTime() + windowMs);

  try {
    const hits = await incrementBucket(bucketKey, windowStart);
    return { allowed: hits <= limit, remaining: Math.max(0, limit - hits), resetAt };
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error), bucketKey },
      'rate limiter unavailable, allowing request',
    );
    return { allowed: true, remaining: limit, resetAt };
  }
}
export function rateLimitedError(resetAt: Date, what = 'attempts'): AppError {
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000));
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return new AppError(
    'RATE_LIMITED',
    `Too many ${what}. Please wait ${minutes} minute${minutes === 1 ? '' : 's'} and try again.`,
    { retryAfterSeconds },
  );
}

/**
 * The platform's own proxy sets x-real-ip. The first x-forwarded-for entry is whatever the client
 * sent, so it is the last resort; the last entry was appended by the nearest proxy.
 */
export function clientIdentifier(headers: Headers): string {
  const forwarded = headers
    .get('x-forwarded-for')
    ?.split(',')
    .map((part) => part.trim());
  return headers.get('x-real-ip') || forwarded?.at(-1) || 'unknown';
}
