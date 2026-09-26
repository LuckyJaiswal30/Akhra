import { logger } from './logger';
import { serverEnv } from './env';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export type HumanCheck = 'passed' | 'failed' | 'skipped';

/**
 * Asks Cloudflare whether the Turnstile token came from a person. With no secret configured the
 * check is skipped, so local development works without keys. If Cloudflare cannot be reached the
 * report is let through: the hourly limits still apply, and citizens are not blocked by an outage.
 */
export async function checkHuman(
  token: string | null,
  remoteIp: string | null,
  secret = serverEnv.TURNSTILE_SECRET_KEY,
): Promise<HumanCheck> {
  if (!secret) return 'skipped';
  if (!token) return 'failed';

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp && remoteIp !== 'unknown') body.set('remoteip', remoteIp);

  try {
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(5000),
    });
    const result = (await response.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (result.success) return 'passed';
    logger.info({ codes: result['error-codes'] }, 'human check failed');
    return 'failed';
  } catch (error) {
    logger.warn(
      { err: error instanceof Error ? error.message : String(error) },
      'human check unavailable, allowing the report',
    );
    return 'skipped';
  }
}
