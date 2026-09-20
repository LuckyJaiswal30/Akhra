import { z } from 'zod';
import { DOMAINS, type Domain } from '@akhra/shared';

export const CLASSIFIER_TIERS = ['gemini', 'groq', 'tfidf'] as const;
export type ClassifierTier = (typeof CLASSIFIER_TIERS)[number];

export interface ClassifyInput {
  title: string;
  description: string;
  districtCode?: string;
}

export interface DomainScore {
  domain: Domain;
  score: number;
}

export interface ClassificationResult {
  domain: Domain;
  confidenceScore: number;
  alternatives: DomainScore[];
  tier: ClassifierTier;
  rationale?: string;
}

export interface IProblemClassifier {
  readonly name: ClassifierTier;
  isAvailable(): boolean;
  classify(input: ClassifyInput): Promise<ClassificationResult>;
}

export interface SimilarProblem {
  problemId: string;
  refCode: string;
  title: string;
  similarity: number;
}

export interface DuplicateCandidate {
  problemId: string;
  refCode: string;
  title: string;
  description: string;
}

export interface IDuplicateDetector {
  findSimilar(
    input: { title: string; description: string },
    candidates: DuplicateCandidate[],
    options?: { threshold?: number; limit?: number },
  ): SimilarProblem[];
}

export const llmResponseSchema = z.object({
  domain: z.enum(DOMAINS),
  confidence: z.number().min(0).max(1),
  rationale: z.string().max(500).optional(),
  alternatives: z
    .array(z.object({ domain: z.enum(DOMAINS), score: z.number().min(0).max(1) }))
    .max(3)
    .optional()
    .default([]),
});

export type LlmResponse = z.infer<typeof llmResponseSchema>;

export class ClassifierUnavailableError extends Error {
  constructor(
    public readonly tier: string,
    message: string,
  ) {
    super(`[${tier}] ${message}`);
    this.name = 'ClassifierUnavailableError';
  }
}
