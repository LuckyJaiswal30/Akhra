import type { Domain } from '@akhra/shared';

const CONFIDENT = 0.7;

export interface CategoryDoubt {
  domain: Domain;
  confidence: number;
}

/**
 * When the reporter picked the category and the AI confidently read the report as something else,
 * the officer is shown both before validating. The offline model is only a fallback, so it never
 * raises a doubt on its own.
 */
export function categoryDoubt(report: {
  domain: string | null;
  classifiedBy: string | null;
  classifierGuess: { domain: string; confidence: number; tier: string } | null;
}): CategoryDoubt | null {
  const guess = report.classifierGuess;
  if (report.classifiedBy !== 'manual' || !guess || !report.domain) return null;
  if (guess.tier === 'tfidf' || guess.confidence < CONFIDENT) return null;
  if (guess.domain === report.domain) return null;
  return { domain: guess.domain as Domain, confidence: guess.confidence };
}
