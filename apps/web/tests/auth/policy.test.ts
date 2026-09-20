import { describe, expect, it, vi } from 'vitest';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, passwordProblem } from '@akhra/shared';

vi.mock('@/server/logger', () => ({ logger: { warn: vi.fn() } }));

const { policyFromEnvironment } = await import('@/modules/auth/policy');

const clerkDefaults = {
  user_settings: {
    password_settings: {
      min_length: 8,
      max_length: 0,
      require_special_char: false,
      require_numbers: false,
      require_uppercase: false,
      require_lowercase: false,
    },
    social: {
      oauth_google: { enabled: true, authenticatable: true },
      oauth_github: { enabled: false, authenticatable: false },
    },
  },
};

describe('sign-in rules read from Clerk', () => {
  it('treats a maximum of 0 as "no maximum", so a valid password can pass', () => {
    const { password } = policyFromEnvironment(clerkDefaults);
    expect(password.maxLength).toBe(PASSWORD_MAX_LENGTH);
    expect(passwordProblem('Kite-river-2026', { policy: password })).toBeNull();
  });

  it('asks for 8 characters, not more, when Clerk asks for 8', () => {
    const { password } = policyFromEnvironment(clerkDefaults);
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    expect(password.minLength).toBe(8);
    expect(passwordProblem('river26a', { policy: password })).toBeNull();
    expect(passwordProblem('river26', { policy: password })).toBe('length');
  });

  it('follows a stricter minimum set in Clerk, and never goes below Akhra’s own', () => {
    const at = (min_length: number) =>
      policyFromEnvironment({
        user_settings: {
          password_settings: { ...clerkDefaults.user_settings.password_settings, min_length },
        },
      }).password.minLength;
    expect(at(15)).toBe(15);
    expect(at(6)).toBe(PASSWORD_MIN_LENGTH);
  });

  it('keeps a real maximum lower than Akhra’s', () => {
    const { password } = policyFromEnvironment({
      user_settings: { password_settings: { max_length: 40 } },
    });
    expect(password.maxLength).toBe(40);
  });

  it('turns Clerk requirements into checklist rules', () => {
    const { password } = policyFromEnvironment({
      user_settings: { password_settings: { require_uppercase: true, require_special_char: true } },
    });
    expect(password.requireUppercase).toBe(true);
    expect(password.requireSpecial).toBe(true);
    expect(password.requireLowercase).toBe(false);
  });

  it('offers only providers that are switched on and usable for sign-in', () => {
    expect(policyFromEnvironment(clerkDefaults).socialStrategies).toEqual(['oauth_google']);
    expect(policyFromEnvironment({}).socialStrategies).toEqual([]);
  });
});
