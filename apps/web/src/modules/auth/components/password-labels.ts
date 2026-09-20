import type { PasswordPolicy, PasswordRuleId } from '@akhra/shared';
import type { PasswordChecklistLabels } from '@/components/ui';
import type { Labels } from './auth-parts';

export function checklistLabels(labels: Labels): PasswordChecklistLabels {
  return {
    title: labels.checklistTitle!,
    length: labels.ruleLength!,
    letter: labels.ruleLetter!,
    lowercase: labels.ruleLowercase!,
    uppercase: labels.ruleUppercase!,
    number: labels.ruleNumber!,
    special: labels.ruleSpecial!,
    notCommon: labels.ruleNotCommon!,
    notEmail: labels.ruleNotEmail!,
  };
}

const MESSAGE_BY_RULE: Record<PasswordRuleId, string> = {
  length: 'errorRuleLength',
  letter: 'errorRuleLetter',
  lowercase: 'errorRuleLowercase',
  uppercase: 'errorRuleUppercase',
  number: 'errorRuleNumber',
  special: 'errorRuleSpecial',
  notCommon: 'errorRuleNotCommon',
  notEmail: 'errorRuleNotEmail',
};

export function passwordRuleMessage(
  rule: PasswordRuleId,
  labels: Labels,
  policy?: PasswordPolicy,
): string {
  const message = labels[MESSAGE_BY_RULE[rule]] ?? labels.errorPasswordWeak!;
  return message.replace(/\{min\}/g, String(policy?.minLength ?? ''));
}
