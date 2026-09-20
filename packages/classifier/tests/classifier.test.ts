import { describe, expect, it, vi } from 'vitest';
import { ChainClassifier } from '../src/chain';
import { TextSimilarityDetector } from '../src/duplicates';
import { createClassifier } from '../src/factory';
import { TfIdfClassifier } from '../src/providers/tfidf';
import { extractJson } from '../src/prompt';
import {
  llmResponseSchema,
  type ClassificationResult,
  type IProblemClassifier,
} from '../src/types';
import { LABELLED_PROBLEMS, NEAR_DUPLICATE_PAIR } from './fixtures';

const tfidf = new TfIdfClassifier();

describe('TfIdfClassifier', () => {
  it.each(LABELLED_PROBLEMS)(
    'classifies "$title" as $expected',
    async ({ title, description, expected }) => {
      const result = await tfidf.classify({ title, description });
      expect(result.domain).toBe(expected);
      expect(result.tier).toBe('tfidf');
    },
  );

  it('is always available and needs no configuration', () => {
    expect(tfidf.isAvailable()).toBe(true);
  });

  it('is deterministic across repeated calls', async () => {
    const input = LABELLED_PROBLEMS[0]!;
    const a = await tfidf.classify(input);
    const b = await tfidf.classify(input);
    expect(a).toEqual(b);
  });

  it('returns a low confidence rather than throwing on unmatched text', async () => {
    const result = await tfidf.classify({ title: 'zzzz qqqq', description: 'xxxx '.repeat(20) });
    expect(result.confidenceScore).toBeLessThan(0.5);
  });

  it('reports confidence within a valid range', async () => {
    for (const problem of LABELLED_PROBLEMS) {
      const result = await tfidf.classify(problem);
      expect(result.confidenceScore).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1);
    }
  });
});

function stubProvider(
  name: IProblemClassifier['name'],
  behaviour: 'ok' | 'throw' | 'unavailable',
): IProblemClassifier {
  return {
    name,
    isAvailable: () => behaviour !== 'unavailable',
    classify: vi.fn(async (): Promise<ClassificationResult> => {
      if (behaviour === 'throw') throw new Error(`${name} exploded`);
      return { domain: 'education', confidenceScore: 0.9, alternatives: [], tier: name };
    }),
  };
}

describe('ChainClassifier fallback', () => {
  const input = LABELLED_PROBLEMS[1]!;

  it('uses the first tier when it succeeds', async () => {
    const chain = new ChainClassifier([stubProvider('gemini', 'ok'), stubProvider('groq', 'ok')]);
    const result = await chain.classify(input);
    expect(result.tier).toBe('gemini');
  });

  it('falls through to groq when gemini throws', async () => {
    const chain = new ChainClassifier([
      stubProvider('gemini', 'throw'),
      stubProvider('groq', 'ok'),
    ]);
    const result = await chain.classify(input);
    expect(result.tier).toBe('groq');
  });

  it('skips an unconfigured tier without calling it', async () => {
    const gemini = stubProvider('gemini', 'unavailable');
    const chain = new ChainClassifier([gemini, stubProvider('groq', 'ok')]);
    const result = await chain.classify(input);
    expect(result.tier).toBe('groq');
    expect(gemini.classify).not.toHaveBeenCalled();
  });

  it('reaches tfidf and still classifies correctly when both LLM tiers fail', async () => {
    const chain = new ChainClassifier([
      stubProvider('gemini', 'throw'),
      stubProvider('groq', 'throw'),
      new TfIdfClassifier(),
    ]);
    const result = await chain.classify(input);
    expect(result.tier).toBe('tfidf');
    expect(result.domain).toBe(input.expected);
  });

  it('appends a terminal tier when the caller omits one', async () => {
    const chain = new ChainClassifier([stubProvider('gemini', 'throw')]);
    const result = await chain.classify(input);
    expect(result.tier).toBe('tfidf');
  });

  it('reports each fallback so the outage is visible in logs', async () => {
    const onFallback = vi.fn();
    const chain = new ChainClassifier(
      [stubProvider('gemini', 'throw'), stubProvider('groq', 'unavailable')],
      { onFallback },
    );
    await chain.classify(input);
    expect(onFallback).toHaveBeenCalledTimes(2);
    expect(onFallback.mock.calls[0]?.[0]).toMatchObject({ tier: 'gemini' });
  });

  it('opens the breaker after repeated failures and stops calling the tier', async () => {
    const gemini = stubProvider('gemini', 'throw');
    const chain = new ChainClassifier([gemini, new TfIdfClassifier()], {
      breakerThreshold: 2,
      breakerCooldownMs: 60_000,
    });

    await chain.classify(input);
    await chain.classify(input);
    expect(gemini.classify).toHaveBeenCalledTimes(2);

    await chain.classify(input);
    expect(gemini.classify).toHaveBeenCalledTimes(2);
  });
});

describe('createClassifier', () => {
  it('builds a working chain with no API keys at all', async () => {
    const classifier = createClassifier({ chain: ['gemini', 'groq', 'tfidf'] });
    const problem = LABELLED_PROBLEMS[3]!;
    const result = await classifier.classify(problem);
    expect(result.tier).toBe('tfidf');
    expect(result.domain).toBe(problem.expected);
  });

  it('ignores unknown tier names in the configured chain', async () => {
    const classifier = createClassifier({ chain: ['nonsense', 'tfidf'] });
    await expect(classifier.classify(LABELLED_PROBLEMS[0]!)).resolves.toBeDefined();
  });
});

describe('LLM response validation', () => {
  it('rejects a hallucinated domain outside the enum', () => {
    const parsed = llmResponseSchema.safeParse({ domain: 'space_exploration', confidence: 0.99 });
    expect(parsed.success).toBe(false);
  });

  it('accepts a well-formed response', () => {
    const parsed = llmResponseSchema.safeParse({ domain: 'healthcare', confidence: 0.8 });
    expect(parsed.success).toBe(true);
  });

  it('extracts JSON wrapped in code fences', () => {
    expect(extractJson('```json\n{"domain":"energy","confidence":0.7}\n```')).toEqual({
      domain: 'energy',
      confidence: 0.7,
    });
  });

  it('extracts JSON surrounded by prose', () => {
    expect(extractJson('Sure! {"domain":"energy","confidence":0.7} Hope that helps.')).toEqual({
      domain: 'energy',
      confidence: 0.7,
    });
  });
});

describe('TextSimilarityDetector', () => {
  const detector = new TextSimilarityDetector();
  const { original, restatement, unrelated } = NEAR_DUPLICATE_PAIR;

  it('flags a reworded restatement of an existing report', () => {
    const matches = detector.findSimilar(restatement, [original, unrelated]);
    expect(matches[0]?.problemId).toBe(original.problemId);
  });

  it('does not flag an unrelated report', () => {
    const matches = detector.findSimilar(
      { title: unrelated.title, description: unrelated.description },
      [original],
    );
    expect(matches).toHaveLength(0);
  });

  it('scores an identical report near the maximum', () => {
    const matches = detector.findSimilar(original, [original], { threshold: 0.9 });
    expect(matches[0]?.similarity).toBeGreaterThan(0.9);
  });

  it('respects the requested limit', () => {
    const matches = detector.findSimilar(restatement, [original, unrelated], {
      threshold: 0,
      limit: 1,
    });
    expect(matches).toHaveLength(1);
  });
});
