import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PASSWORD_POLICY,
  passwordProblem,
  passwordRules,
  passwordStrength,
  type PasswordPolicy,
} from '../src/password';

const policyWith = (over: Partial<PasswordPolicy>): PasswordPolicy => ({
  ...DEFAULT_PASSWORD_POLICY,
  ...over,
});

const SAMPLES = [
  '',
  'short',
  'Krishna@2006',
  'krishna2006',
  'password123',
  'alllettersonly',
  '1234567890123456',
  'Ranchi-Handpump-2026',
  'akhra12345',
  'a'.repeat(80),
];

const POLICIES = [
  DEFAULT_PASSWORD_POLICY,
  policyWith({ minLength: 15 }),
  policyWith({ requireUppercase: true, requireSpecial: true }),
  policyWith({ minLength: 8, requireNumber: false }),
];

describe('password rules', () => {
  it('never shows a met checklist for a password the form rejects', () => {
    const policy = policyWith({ minLength: 15 });
    const options = { policy, email: 'someone@example.com' };

    const rules = passwordRules('Krishna@2006', options);

    expect(passwordProblem('Krishna@2006', options)).toBe('length');
    expect(rules.find((rule) => rule.id === 'length')?.met).toBe(false);
    expect(passwordStrength('Krishna@2006', options)).toBe('weak');
  });

  it('accepts that same password where the rules actually allow it', () => {
    const options = { policy: policyWith({ minLength: 10 }), email: 'someone@example.com' };

    expect(passwordProblem('Krishna@2006', options)).toBeNull();
    expect(passwordRules('Krishna@2006', options).every((rule) => rule.met)).toBe(true);
    expect(passwordStrength('Krishna@2006', options)).not.toBe('weak');
  });

  it('keeps the gate, the checklist and the meter in agreement for every policy', () => {
    for (const policy of POLICIES) {
      for (const password of SAMPLES) {
        const options = { policy, email: 'krishna@example.com' };
        const rules = passwordRules(password, options);
        const problem = passwordProblem(password, options);

        if (problem === null) {
          expect(rules.every((rule) => rule.met)).toBe(true);
          expect(passwordStrength(password, options)).not.toBe('weak');
        } else {
          expect(rules.some((rule) => rule.id === problem && !rule.met)).toBe(true);
          expect(passwordStrength(password, options)).toBe('weak');
        }
      }
    }
  });

  it('states a minimum that rises to meet a stricter policy', () => {
    expect(passwordProblem('Handpump2026', { policy: policyWith({ minLength: 15 }) })).toBe(
      'length',
    );
    expect(passwordProblem('Handpump2026', {})).toBeNull();
  });

  it('shows the common-password and email rules rather than enforcing them invisibly', () => {
    const common = passwordRules('akhra12345', {});
    expect(common.some((rule) => rule.id === 'notCommon' && !rule.met)).toBe(true);
    expect(passwordProblem('akhra12345', {})).toBe('notCommon');

    const options = { email: 'krishna@example.com' };
    expect(
      passwordRules('krishna12345', options).some((rule) => rule.id === 'notEmail' && !rule.met),
    ).toBe(true);
    expect(passwordProblem('krishna12345', options)).toBe('notEmail');
  });

  it('leaves out the email rule when there is no email, or it is too short to mean anything', () => {
    expect(passwordRules('handpump2026', {}).some((rule) => rule.id === 'notEmail')).toBe(false);
    expect(
      passwordRules('handpump2026', { email: 'ab@example.com' }).some(
        (rule) => rule.id === 'notEmail',
      ),
    ).toBe(false);
  });

  it('refuses a password longer than bcrypt would keep', () => {
    expect(passwordProblem('a1'.repeat(50), {})).toBe('length');
  });

  it('adds the rules a stricter policy asks for', () => {
    const policy = policyWith({ requireUppercase: true, requireSpecial: true });
    const ids = passwordRules('handpump2026', { policy }).map((rule) => rule.id);

    expect(ids).toContain('uppercase');
    expect(ids).toContain('special');
    expect(passwordProblem('handpump2026', { policy })).toBe('uppercase');
  });
});
