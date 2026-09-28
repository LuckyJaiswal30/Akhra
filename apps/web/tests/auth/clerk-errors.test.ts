import { describe, expect, it, vi } from 'vitest';
import {
  clerkFieldError,
  clerkMessage,
  continueIfSignedIn,
} from '@/modules/auth/components/clerk-errors';
import en from '../../messages/en.json';
import hi from '../../messages/hi.json';

const labels = en.auth as Record<string, string>;
const apiError = (code: string) => ({ errors: [{ code, message: 'Clerk wording' }] });

describe('what a Clerk refusal tells the person', () => {
  it('tells someone who signed up with Google to use Google, not that Google is unavailable', () => {
    expect(clerkMessage(apiError('strategy_for_user_invalid'), labels)).toBe(labels.errorUseGoogle);
  });

  it('explains a failed human check instead of a generic error', () => {
    for (const code of ['captcha_invalid', 'captcha_missing_token', 'captcha_not_enabled']) {
      expect(clerkMessage(apiError(code), labels)).toBe(labels.errorCaptcha);
    }
  });

  it('reads runtime errors that carry their code directly', () => {
    expect(clerkMessage({ code: 'user_locked' }, labels)).toBe(labels.errorTooMany);
  });

  it('takes someone who is already signed in onward, instead of asking them to refresh', () => {
    const assign = vi.fn();
    vi.stubGlobal('window', { location: { assign } });
    expect(continueIfSignedIn({ code: 'session_exists' }, '/dashboard')).toBe(true);
    expect(assign).toHaveBeenCalledWith('/dashboard');
    expect(continueIfSignedIn(apiError('form_password_incorrect'), '/dashboard')).toBe(false);
    expect(assign).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('keeps unknown accounts and wrong passwords indistinguishable', () => {
    expect(clerkMessage(apiError('form_identifier_not_found'), labels)).toBe(
      clerkMessage(apiError('form_password_incorrect'), labels),
    );
  });

  it('points a password refusal at the password field', () => {
    expect(clerkFieldError(apiError('form_password_pwned'), labels)).toEqual({
      field: 'password',
      message: labels.errorPasswordPwned,
    });
  });

  it('falls back to the generic message for anything unexpected', () => {
    expect(clerkMessage(apiError('something_new'), labels)).toBe(labels.errorGeneric);
    expect(clerkMessage(null, labels)).toBe(labels.errorGeneric);
  });

  it('has every message in Hindi too', () => {
    const hindi = hi.auth as Record<string, string>;
    for (const key of [
      'errorUseGoogle',
      'setPasswordTitle',
      'setPasswordSubtitle',
      'errorCaptcha',
      'stuckTitle',
      'stuckBody',
      'signOut',
    ]) {
      expect(hindi[key], key).toBeTruthy();
    }
    const hindiAccount = hi.account as Record<string, string>;
    for (const key of Object.keys(en.account))
      expect(hindiAccount[key], `account.${key}`).toBeTruthy();
  });
});
