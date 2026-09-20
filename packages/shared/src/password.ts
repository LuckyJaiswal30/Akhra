export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_MAX_LENGTH = 72;

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireLetter: boolean;
  requireNumber: boolean;
  requireLowercase: boolean;
  requireUppercase: boolean;
  requireSpecial: boolean;
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: PASSWORD_MIN_LENGTH,
  maxLength: PASSWORD_MAX_LENGTH,
  requireLetter: true,
  requireNumber: true,
  requireLowercase: false,
  requireUppercase: false,
  requireSpecial: false,
};

export type PasswordRuleId =
  'length' | 'letter' | 'lowercase' | 'uppercase' | 'number' | 'special' | 'notCommon' | 'notEmail';

export interface PasswordRule {
  id: PasswordRuleId;
  met: boolean;
}

export interface PasswordOptions {
  policy?: PasswordPolicy;
  email?: string;
}

export type PasswordStrengthLevel = 'weak' | 'medium' | 'strong';

const COMMON_PASSWORDS = new Set([
  '12345678',
  '123456789',
  '11111111',
  '87654321',
  'abcd1234',
  'abc12345',
  'qwerty12',
  'qwerty123',
  'iloveyou',
  'sunshine',
  'princess',
  'football',
  'baseball',
  'welcome1',
  'admin123',
  'letmein1',
  'india123',
  'bharat123',
  'ranchi123',
  'jharkhand',
  'akhra123',
  'password',
  'password1',
  'password12',
  'password123',
  'password1234',
  'passw0rd123',
  '1234567890',
  '12345678910',
  'qwertyuiop',
  'qwerty12345',
  'iloveyou123',
  'welcome123',
  'welcome1234',
  'admin12345',
  'administrator',
  'letmein123',
  'abc1234567',
  'india12345',
  'india@1234',
  'jharkhand1',
  'jharkhand123',
  'ranchi1234',
  'bharat1234',
  'sunshine12',
  'princess12',
  'football12',
  'monkey12345',
  'dragon12345',
  'akhra12345',
]);

const EMAIL_LOCAL_MIN = 3;

export function passwordRules(password: string, options: PasswordOptions = {}): PasswordRule[] {
  const policy = options.policy ?? DEFAULT_PASSWORD_POLICY;
  const lowered = password.toLowerCase();
  const local = options.email?.split('@')[0]?.toLowerCase() ?? '';
  const present = password.length > 0;

  const rules: PasswordRule[] = [
    {
      id: 'length',
      met: password.length >= policy.minLength && password.length <= policy.maxLength,
    },
  ];
  if (policy.requireLetter) rules.push({ id: 'letter', met: /\p{L}/u.test(password) });
  if (policy.requireLowercase) rules.push({ id: 'lowercase', met: /\p{Ll}/u.test(password) });
  if (policy.requireUppercase) rules.push({ id: 'uppercase', met: /\p{Lu}/u.test(password) });
  if (policy.requireNumber) rules.push({ id: 'number', met: /\d/.test(password) });
  if (policy.requireSpecial) rules.push({ id: 'special', met: /[^\p{L}\d]/u.test(password) });
  rules.push({ id: 'notCommon', met: present && !COMMON_PASSWORDS.has(lowered) });
  if (local.length >= EMAIL_LOCAL_MIN)
    rules.push({ id: 'notEmail', met: present && !lowered.includes(local) });

  return rules;
}

export function passwordProblem(
  password: string,
  options: PasswordOptions = {},
): PasswordRuleId | null {
  return passwordRules(password, options).find((rule) => !rule.met)?.id ?? null;
}

export function passwordStrength(
  password: string,
  options: PasswordOptions = {},
): PasswordStrengthLevel {
  if (!password) return 'weak';
  if (passwordRules(password, options).some((rule) => !rule.met)) return 'weak';

  const policy = options.policy ?? DEFAULT_PASSWORD_POLICY;
  const extras = [
    password.length >= policy.minLength + 4,
    /[^\p{L}\d]/u.test(password),
    /\p{Lu}/u.test(password) && /\p{Ll}/u.test(password),
  ].filter(Boolean).length;

  return extras >= 2 ? 'strong' : 'medium';
}
