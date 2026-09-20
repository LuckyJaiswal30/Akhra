import {
  DEFAULT_PASSWORD_POLICY,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  type PasswordPolicy,
} from '@akhra/shared';
import { logger } from '@/server/logger';

export interface AuthPolicy {
  password: PasswordPolicy;
  socialStrategies: string[];
}

const FALLBACK: AuthPolicy = { password: DEFAULT_PASSWORD_POLICY, socialStrategies: [] };

const CACHE_SECONDS = process.env.NODE_ENV === 'production' ? 300 : 0;

export interface EnvironmentResponse {
  user_settings?: {
    password_settings?: Partial<Record<string, number | boolean>>;
    social?: Record<string, { enabled?: boolean; authenticatable?: boolean }>;
  };
}

function frontendApiHost(publishableKey: string | undefined): string | null {
  if (!publishableKey) return null;
  const encoded = publishableKey.replace(/^pk_(test|live)_/, '');
  if (encoded === publishableKey) return null;
  try {
    const host = Buffer.from(encoded, 'base64').toString('utf8').replace(/\$+$/, '');
    return /^[a-z0-9.-]+$/i.test(host) ? host : null;
  } catch {
    return null;
  }
}

export function policyFromEnvironment(body: EnvironmentResponse): AuthPolicy {
  const settings = body.user_settings?.password_settings ?? {};
  const positive = (key: string) =>
    typeof settings[key] === 'number' && (settings[key] as number) > 0
      ? (settings[key] as number)
      : null;
  const flag = (key: string) => settings[key] === true;
  const social = body.user_settings?.social ?? {};

  return {
    password: {
      minLength: Math.max(PASSWORD_MIN_LENGTH, positive('min_length') ?? 0),
      maxLength: Math.min(PASSWORD_MAX_LENGTH, positive('max_length') ?? PASSWORD_MAX_LENGTH),
      requireLetter: true,
      requireNumber: true,
      requireLowercase: flag('require_lowercase'),
      requireUppercase: flag('require_uppercase'),
      requireSpecial: flag('require_special_char'),
    },
    socialStrategies: Object.entries(social)
      .filter(([, provider]) => provider?.enabled && provider?.authenticatable)
      .map(([strategy]) => strategy),
  };
}

export async function getAuthPolicy(): Promise<AuthPolicy> {
  const host = frontendApiHost(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  if (!host) return FALLBACK;

  try {
    const response = await fetch(
      `https://${host}/v1/environment?__clerk_api_version=2025-04-10&_clerk_js_version=5`,
      {
        next: { revalidate: CACHE_SECONDS },
      },
    );
    if (!response.ok) throw new Error(`environment responded ${response.status}`);
    return policyFromEnvironment((await response.json()) as EnvironmentResponse);
  } catch (error) {
    logger.warn(
      { err: error instanceof Error ? error.message : String(error) },
      'could not read sign-in settings',
    );
    return FALLBACK;
  }
}
