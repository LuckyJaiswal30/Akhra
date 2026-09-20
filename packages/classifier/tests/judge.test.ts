import { describe, expect, it, vi } from 'vitest';
import {
  DuplicateJudgeChain,
  GeminiClassifier,
  LlmDuplicateJudge,
  type DuplicateCandidate,
  type IDuplicateJudge,
} from '../src/index';

const candidates: DuplicateCandidate[] = [
  {
    problemId: 'p-1',
    refCode: 'AKH-2026-000001',
    title: 'Handpump water turned yellow',
    description: 'Yellow water with an iron smell from the ward handpump.',
  },
  {
    problemId: 'p-2',
    refCode: 'AKH-2026-000002',
    title: 'No ramp at the block office',
    description: 'The block office has steps and no ramp.',
  },
];
const input = {
  title: 'Yellow smelly water from our handpump',
  description: 'Our handpump water is yellow and smells of iron.',
};

function geminiReplying(text: string, status = 200) {
  return vi.fn(
    async (_url: string | URL | Request, _init?: RequestInit) =>
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), {
        status,
      }),
  );
}

const judgeWith = (fetchImpl: typeof fetch) =>
  new LlmDuplicateJudge('gemini', {
    apiKey: 'test-key',
    model: 'gemini-test',
    timeoutMs: 1000,
    fetchImpl,
  });

describe('LlmDuplicateJudge', () => {
  it('accepts a judgement that only names candidates it was shown', async () => {
    const judge = judgeWith(
      geminiReplying(
        '{"duplicates":[{"id":"p-1","confidence":0.92,"reason":"same handpump"}]}',
      ) as never,
    );

    expect(await judge.judge(input, candidates)).toEqual([
      { problemId: 'p-1', confidence: 0.92, reason: 'same handpump' },
    ]);
  });

  it('treats a hallucinated report id as a failed tier', async () => {
    const judge = judgeWith(
      geminiReplying('{"duplicates":[{"id":"p-999","confidence":0.9}]}') as never,
    );

    await expect(judge.judge(input, candidates)).rejects.toThrow(/not shown/);
  });

  it('treats malformed output as a failed tier', async () => {
    const judge = judgeWith(geminiReplying('I think the first one is a duplicate.') as never);

    await expect(judge.judge(input, candidates)).rejects.toThrow();
  });

  it('treats an HTTP error as a failed tier', async () => {
    const judge = judgeWith(geminiReplying('', 429) as never);

    await expect(judge.judge(input, candidates)).rejects.toThrow(/429/);
  });

  it('explains a retired model name instead of repeating a bare 404', async () => {
    const judge = judgeWith(geminiReplying('', 404) as never);

    await expect(judge.judge(input, candidates)).rejects.toThrow(/GEMINI_MODEL/);
  });

  it('never calls the model when there is nothing to compare against', async () => {
    const fetchImpl = geminiReplying('{"duplicates":[]}');
    await judgeWith(fetchImpl as never).judge(input, []);

    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

function stubJudge(
  name: 'gemini' | 'groq',
  behaviour: 'ok' | 'throw' | 'unavailable',
): IDuplicateJudge {
  return {
    name,
    isAvailable: () => behaviour !== 'unavailable',
    judge: vi.fn(async () => {
      if (behaviour === 'throw') throw new Error(`${name} failed`);
      return [{ problemId: 'p-1', confidence: 0.8 }];
    }),
  };
}

describe('DuplicateJudgeChain', () => {
  it('uses the first judge that answers', async () => {
    const chain = new DuplicateJudgeChain([stubJudge('gemini', 'ok'), stubJudge('groq', 'ok')]);

    expect((await chain.judge(input, candidates))?.tier).toBe('gemini');
  });

  it('falls through to the next judge and reports why', async () => {
    const onFallback = vi.fn();
    const chain = new DuplicateJudgeChain(
      [stubJudge('gemini', 'throw'), stubJudge('groq', 'ok')],
      onFallback,
    );

    expect((await chain.judge(input, candidates))?.tier).toBe('groq');
    expect(onFallback).toHaveBeenCalledWith({ tier: 'gemini', reason: 'gemini failed' });
  });

  it('returns null so the caller keeps text similarity when no judge can answer', async () => {
    const chain = new DuplicateJudgeChain([
      stubJudge('gemini', 'unavailable'),
      stubJudge('groq', 'throw'),
    ]);

    expect(await chain.judge(input, candidates)).toBeNull();
    expect(chain.hasAvailableJudge()).toBe(true);
  });

  it('knows when no judge is configured at all', () => {
    expect(new DuplicateJudgeChain([]).hasAvailableJudge()).toBe(false);
  });
});

describe('provider requests', () => {
  it('identify themselves with an explicit user agent', async () => {
    const fetchImpl = geminiReplying('{"domain":"water_resources","confidence":0.9}');
    await new GeminiClassifier({ apiKey: 'test-key', fetchImpl: fetchImpl as never }).classify(
      input,
    );

    const headers = fetchImpl.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers['user-agent']).toMatch(/^akhra-server\//);
  });
});
