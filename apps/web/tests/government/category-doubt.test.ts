import { describe, expect, it } from 'vitest';
import { categoryDoubt } from '@/modules/classification/category-doubt';

const chosen = { domain: 'water_resources', classifiedBy: 'manual' };
const guess = (domain: string, confidence: number, tier = 'gemini') => ({
  domain,
  confidence,
  tier,
});

describe('category doubt in the validation queue', () => {
  it('warns when the AI confidently reads a different category', () => {
    expect(categoryDoubt({ ...chosen, classifierGuess: guess('urban_development', 0.86) })).toEqual(
      { domain: 'urban_development', confidence: 0.86 },
    );
  });

  it('stays quiet when the AI agrees, is unsure, or was the offline fallback', () => {
    expect(
      categoryDoubt({ ...chosen, classifierGuess: guess('water_resources', 0.95) }),
    ).toBeNull();
    expect(
      categoryDoubt({ ...chosen, classifierGuess: guess('urban_development', 0.6) }),
    ).toBeNull();
    expect(
      categoryDoubt({ ...chosen, classifierGuess: guess('urban_development', 0.9, 'tfidf') }),
    ).toBeNull();
  });

  it('stays quiet when the AI chose the category or no guess was kept', () => {
    expect(
      categoryDoubt({
        domain: 'water_resources',
        classifiedBy: 'gemini',
        classifierGuess: guess('urban_development', 0.9),
      }),
    ).toBeNull();
    expect(categoryDoubt({ ...chosen, classifierGuess: null })).toBeNull();
  });
});
