import type {
  ClassificationResult,
  ClassifyInput,
  ClassifierTier,
  IProblemClassifier,
} from './types';
import { TfIdfClassifier } from './providers/tfidf';

export interface ChainOptions {
  breakerThreshold?: number;
  breakerCooldownMs?: number;
  onFallback?: (info: { tier: ClassifierTier; reason: string }) => void;
  now?: () => number;
}

interface BreakerState {
  consecutiveFailures: number;
  openUntil: number;
}

export class ChainClassifier implements IProblemClassifier {
  readonly name = 'tfidf' as const;

  private readonly providers: IProblemClassifier[];
  private readonly breakers = new Map<string, BreakerState>();
  private readonly breakerThreshold: number;
  private readonly breakerCooldownMs: number;
  private readonly onFallback:
    ((info: { tier: ClassifierTier; reason: string }) => void) | undefined;
  private readonly now: () => number;

  constructor(providers: IProblemClassifier[], options: ChainOptions = {}) {
    const hasTerminalTier = providers.some((p) => p.name === 'tfidf');
    this.providers = hasTerminalTier ? providers : [...providers, new TfIdfClassifier()];
    this.breakerThreshold = options.breakerThreshold ?? 3;
    this.breakerCooldownMs = options.breakerCooldownMs ?? 60_000;
    this.onFallback = options.onFallback;
    this.now = options.now ?? Date.now;
  }

  isAvailable(): boolean {
    return true;
  }

  async classify(input: ClassifyInput): Promise<ClassificationResult> {
    const failures: string[] = [];

    for (const provider of this.providers) {
      if (!provider.isAvailable()) {
        this.report(provider.name, 'not configured', failures);
        continue;
      }
      if (this.isBreakerOpen(provider.name)) {
        this.report(provider.name, 'circuit breaker open', failures);
        continue;
      }

      try {
        const result = await provider.classify(input);
        this.recordSuccess(provider.name);
        return result;
      } catch (error) {
        this.recordFailure(provider.name);
        this.report(provider.name, describeError(error), failures);
      }
    }

    throw new Error(`Every classifier tier failed: ${failures.join('; ')}`);
  }

  private report(tier: string, reason: string, failures: string[]): void {
    failures.push(`${tier}: ${reason}`);
    this.onFallback?.({ tier: tier as ClassifierTier, reason });
  }

  private isBreakerOpen(tier: string): boolean {
    const state = this.breakers.get(tier);
    return state != null && state.openUntil > this.now();
  }

  private recordFailure(tier: string): void {
    const state = this.breakers.get(tier) ?? { consecutiveFailures: 0, openUntil: 0 };
    state.consecutiveFailures += 1;
    if (state.consecutiveFailures >= this.breakerThreshold) {
      state.openUntil = this.now() + this.breakerCooldownMs;
      state.consecutiveFailures = 0;
    }
    this.breakers.set(tier, state);
  }

  private recordSuccess(tier: string): void {
    this.breakers.delete(tier);
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.name === 'AbortError' ? 'timed out' : error.message;
  }
  return String(error);
}
