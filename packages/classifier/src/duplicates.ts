import type { DuplicateCandidate, IDuplicateDetector, SimilarProblem } from './types';
import { concepts, cosineSimilarity, jaccardSimilarity, termFrequency, trigrams } from './text';

const DEFAULT_THRESHOLD = 0.3;
const DEFAULT_LIMIT = 5;
const TITLE_WEIGHT = 0.6;
const BODY_WEIGHT = 0.4;

export class TextSimilarityDetector implements IDuplicateDetector {
  findSimilar(
    input: { title: string; description: string },
    candidates: DuplicateCandidate[],
    options: { threshold?: number; limit?: number } = {},
  ): SimilarProblem[] {
    const threshold = options.threshold ?? DEFAULT_THRESHOLD;
    const limit = options.limit ?? DEFAULT_LIMIT;

    const inputTitleGrams = trigrams(input.title);
    const inputTitleConcepts = new Set(concepts(input.title));
    const inputBodyVector = countVector(input.description);

    return candidates
      .map((candidate) => {
        const titleScore = Math.max(
          jaccardSimilarity(inputTitleGrams, trigrams(candidate.title)),
          jaccardSimilarity(inputTitleConcepts, new Set(concepts(candidate.title))),
        );
        const bodyScore = cosineSimilarity(inputBodyVector, countVector(candidate.description));
        return {
          problemId: candidate.problemId,
          refCode: candidate.refCode,
          title: candidate.title,
          similarity: Number((TITLE_WEIGHT * titleScore + BODY_WEIGHT * bodyScore).toFixed(3)),
        };
      })
      .filter((match) => match.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }
}

function countVector(text: string): Map<string, number> {
  return termFrequency(concepts(text));
}
