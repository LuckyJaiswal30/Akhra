import type { ClassificationResult, ClassifyInput, IProblemClassifier } from '../types';
import { ClassifierUnavailableError, llmResponseSchema } from '../types';
import { SYSTEM_PROMPT, buildUserPrompt, extractJson } from '../prompt';
import { callGemini } from '../llm';

export interface GeminiOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class GeminiClassifier implements IProblemClassifier {
  readonly name = 'gemini' as const;

  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GeminiOptions = {}) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? 'gemini-3.6-flash';
    this.timeoutMs = options.timeoutMs ?? 6000;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async classify(input: ClassifyInput): Promise<ClassificationResult> {
    if (!this.apiKey)
      throw new ClassifierUnavailableError(this.name, 'GEMINI_API_KEY is not configured');

    const text = await callGemini({
      apiKey: this.apiKey,
      model: this.model,
      timeoutMs: this.timeoutMs,
      fetchImpl: this.fetchImpl,
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(input),
    });
    const parsed = llmResponseSchema.parse(extractJson(text));
    return {
      domain: parsed.domain,
      confidenceScore: parsed.confidence,
      alternatives: parsed.alternatives,
      tier: this.name,
      rationale: parsed.rationale,
    };
  }
}
