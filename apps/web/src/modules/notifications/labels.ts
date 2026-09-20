import { getTranslations } from 'next-intl/server';
import { ROLES, ROLE_LABELS } from '@akhra/shared';

const KEYS = [
  'thread',
  'threadHint',
  'noMessages',
  'messagePlaceholder',
  'visibilityPublic',
  'visibilityInternal',
  'internal',
  'send',
  'sending',
] as const;

export async function buildThreadLabels(locale: string): Promise<Record<string, string>> {
  const t = await getTranslations('thread');
  const labels: Record<string, string> = {};
  for (const key of KEYS) labels[key] = t(key);
  for (const role of ROLES)
    labels[`role_${role}`] = locale === 'hi' ? ROLE_LABELS[role].hi : ROLE_LABELS[role].en;
  return labels;
}
