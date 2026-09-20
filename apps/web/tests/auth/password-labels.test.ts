import { describe, expect, it } from 'vitest';
import { passwordRules, type PasswordPolicy, type PasswordRuleId } from '@akhra/shared';
import { checklistLabels, passwordRuleMessage } from '@/modules/auth/components/password-labels';
import en from '../../messages/en.json';
import hi from '../../messages/hi.json';

const LOCALES = { en: en.auth as Record<string, string>, hi: hi.auth as Record<string, string> };

const EVERY_RULE: PasswordRuleId[] = passwordRules('x', {
  policy: {
    minLength: 10,
    maxLength: 72,
    requireLetter: true,
    requireNumber: true,
    requireLowercase: true,
    requireUppercase: true,
    requireSpecial: true,
  } satisfies PasswordPolicy,
  email: 'someone@example.com',
}).map((rule) => rule.id);

describe('password rule wording', () => {
  it('covers every rule the policy can produce', () => {
    expect(EVERY_RULE).toEqual([
      'length',
      'letter',
      'lowercase',
      'uppercase',
      'number',
      'special',
      'notCommon',
      'notEmail',
    ]);
  });

  for (const [locale, labels] of Object.entries(LOCALES)) {
    it(`names and explains every rule in ${locale}`, () => {
      for (const rule of EVERY_RULE) {
        const checklistLine = checklistLabels(labels)[rule];
        expect(checklistLine, `checklist wording for ${rule}`).toBeTruthy();

        const message = passwordRuleMessage(rule, labels, { minLength: 12 } as PasswordPolicy);
        expect(message, `error message for ${rule}`).toBeTruthy();
        expect(message).not.toBe(labels.errorPasswordWeak);
      }
    });

    it(`states the real minimum rather than a fixed number in ${locale}`, () => {
      expect(labels.ruleLength).toContain('{min}');
      expect(labels.errorRuleLength).toContain('{min}');
      expect(passwordRuleMessage('length', labels, { minLength: 15 } as PasswordPolicy)).toContain(
        '15',
      );
      expect(
        passwordRuleMessage('length', labels, { minLength: 15 } as PasswordPolicy),
      ).not.toContain('{min}');
    });
  }

  it('keeps both languages carrying the same keys', () => {
    expect(Object.keys(LOCALES.hi).sort()).toEqual(Object.keys(LOCALES.en).sort());
  });
});
