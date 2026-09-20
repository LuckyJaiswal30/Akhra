import { ChainClassifier, type ChainOptions } from './chain';
import { DuplicateJudgeChain, LlmDuplicateJudge } from './judge';
import { GeminiClassifier } from './providers/gemini';
import { GroqClassifier } from './providers/groq';
import { TfIdfClassifier } from './providers/tfidf';
import type { IProblemClassifier } from './types';

export interface ClassifierConfig {
  chain: string[];
  timeoutMs?: number;
  geminiApiKey?: string;
  geminiModel?: string;
  groqApiKey?: string;
  groqModel?: string;
  breakerThreshold?: number;
  breakerCooldownMs?: number;
  onFallback?: ChainOptions['onFallback'];
}

function createProvider(tier: string, config: ClassifierConfig): IProblemClassifier | null {
  switch (tier) {
    case 'gemini':
      return new GeminiClassifier({
        apiKey: config.geminiApiKey,
        model: config.geminiModel,
        timeoutMs: config.timeoutMs,
      });
    case 'groq':
      return new GroqClassifier({
        apiKey: config.groqApiKey,
        model: config.groqModel,
        timeoutMs: config.timeoutMs,
      });
    case 'tfidf':
      return new TfIdfClassifier();
    default:
      return null;
  }
}

export function createClassifier(config: ClassifierConfig): IProblemClassifier {
  const providers = config.chain
    .map((tier) => createProvider(tier.trim(), config))
    .filter((p): p is IProblemClassifier => p !== null);

  return new ChainClassifier(providers, {
    breakerThreshold: config.breakerThreshold,
    breakerCooldownMs: config.breakerCooldownMs,
    onFallback: config.onFallback,
  });
}

export function createDuplicateJudge(config: ClassifierConfig): DuplicateJudgeChain {
  const judges = config.chain.flatMap((tier) => {
    const name = tier.trim();
    if (name === 'gemini') {
      return [
        new LlmDuplicateJudge('gemini', {
          apiKey: config.geminiApiKey,
          model: config.geminiModel ?? 'gemini-3.6-flash',
          timeoutMs: config.timeoutMs,
        }),
      ];
    }
    if (name === 'groq') {
      return [
        new LlmDuplicateJudge('groq', {
          apiKey: config.groqApiKey,
          model: config.groqModel ?? 'openai/gpt-oss-20b',
          timeoutMs: config.timeoutMs,
        }),
      ];
    }
    return [];
  });
  return new DuplicateJudgeChain(judges, config.onFallback as never);
}
