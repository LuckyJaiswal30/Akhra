import type { Domain } from './domains';

/** How many people the citizen says the problem reaches. */
export const AFFECTED_SCALES = ['household', 'neighbourhood', 'village', 'block_or_town'] as const;
export type AffectedScale = (typeof AFFECTED_SCALES)[number];

export const PRIORITY_LEVELS = ['critical', 'high', 'medium', 'low'] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

/** Each reason is recorded with the report, so an officer can see why it sits where it does. */
export const PRIORITY_REASONS = [
  'safety_risk',
  'urgent_language',
  'wide_reach',
  'essential_service',
  'many_supporters',
  'reported_repeatedly',
  'long_wait',
] as const;
export type PriorityReason = (typeof PRIORITY_REASONS)[number];

export interface PriorityInput {
  domain: Domain | null;
  title: string;
  description: string;
  affectedScale: AffectedScale | null;
  safetyRisk: boolean;
  supportCount: number;
  duplicateReports: number;
  ageDays: number;
}

export interface PriorityAssessment {
  score: number;
  level: PriorityLevel;
  reasons: PriorityReason[];
}

/**
 * Words that, in a report, mean someone could be hurt or has been. Matched as whole words, in
 * English and Hindi, so "shock absorber" or "firewood" do not raise a report on their own.
 */
const URGENT_TERMS = [
  'death',
  'died',
  'dead',
  'dying',
  'injured',
  'injury',
  'accident',
  'outbreak',
  'epidemic',
  'cholera',
  'diarrhoea',
  'diarrhea',
  'poisoning',
  'electrocuted',
  'electric shock',
  'live wire',
  'collapse',
  'collapsed',
  'fire',
  'flood',
  'flooding',
  'drowned',
  'snakebite',
  'no drinking water',
  'unsafe water',
  'emergency',
  'मौत',
  'मृत्यु',
  'घायल',
  'दुर्घटना',
  'महामारी',
  'करंट',
  'आग',
  'बाढ़',
  'ढह गया',
  'ढह गई',
  'आपातकाल',
  'पीने का पानी नहीं',
];

/** Services whose failure harms people directly rather than inconveniencing them. */
const ESSENTIAL_DOMAINS: readonly Domain[] = ['healthcare', 'water_resources'];

const REACH_POINTS: Record<AffectedScale, number> = {
  household: 0,
  neighbourhood: 8,
  village: 16,
  block_or_town: 24,
};

function hasUrgentLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return URGENT_TERMS.some((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Devanagari vowel signs are marks, not letters: without \p{M}, "आग" would match inside "आगे".
    return new RegExp(`(^|[^\\p{L}\\p{M}])${escaped}([^\\p{L}\\p{M}]|$)`, 'u').test(lower);
  });
}

/**
 * Orders the validation queue. Deliberately simple and additive, so the score can be explained in a
 * sentence and nobody has to trust a model: a risk to safety counts most, then how many people are
 * affected, then how many others have backed or re-reported it, then how long it has waited.
 */
export function assessPriority(input: PriorityInput): PriorityAssessment {
  const reasons: PriorityReason[] = [];
  let score = 10;

  if (input.safetyRisk) {
    score += 35;
    reasons.push('safety_risk');
  }
  if (hasUrgentLanguage(`${input.title} ${input.description}`)) {
    score += 15;
    reasons.push('urgent_language');
  }
  if (input.affectedScale) {
    score += REACH_POINTS[input.affectedScale];
    if (REACH_POINTS[input.affectedScale] >= 16) reasons.push('wide_reach');
  }
  if (input.domain && ESSENTIAL_DOMAINS.includes(input.domain)) {
    score += 8;
    reasons.push('essential_service');
  }

  const supportPoints = Math.min(12, input.supportCount * 2);
  score += supportPoints;
  if (input.supportCount >= 3) reasons.push('many_supporters');

  const duplicatePoints = Math.min(10, input.duplicateReports * 5);
  score += duplicatePoints;
  if (input.duplicateReports >= 1) reasons.push('reported_repeatedly');

  if (input.ageDays > 7) {
    score += Math.min(8, Math.floor(input.ageDays / 7) * 2);
    reasons.push('long_wait');
  }

  const bounded = Math.min(100, score);
  return { score: bounded, level: levelFor(bounded), reasons };
}

export function levelFor(score: number): PriorityLevel {
  if (score >= 60) return 'critical';
  if (score >= 40) return 'high';
  if (score >= 22) return 'medium';
  return 'low';
}
