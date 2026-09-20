import { DOMAIN_LIST, type Domain } from '@akhra/shared';
import type {
  ClassificationResult,
  ClassifyInput,
  DomainScore,
  IProblemClassifier,
} from '../types';
import { buildIdf, cosineSimilarity, normalize, termFrequency, tfIdfVector } from '../text';

const KEYWORD_WEIGHT = 0.7;
const VECTOR_WEIGHT = 0.3;
const TITLE_REPEAT = 3;
const PHRASE_BONUS = 1.2;
const PREFIX_LENGTH = 6;

interface DomainModel {
  domain: Domain;
  vector: Map<string, number>;
  keywordStems: Set<string>;
  prefixes: Set<string>;
  keywordPhrases: string[];
}

interface Lexicon {
  models: DomainModel[];
  idf: Map<string, number>;
  specificity: Map<string, number>;
}

function buildLexicon(): Lexicon {
  const corpora = DOMAIN_LIST.map((def) =>
    normalize([def.labelEn, def.description, ...def.keywords, ...def.keywordsHi].join(' ')),
  );
  const idf = buildIdf(corpora);

  const models: DomainModel[] = DOMAIN_LIST.map((def, index) => {
    const stems = new Set([...def.keywords, ...def.keywordsHi].flatMap((k) => normalize(k)));
    return {
      domain: def.id,
      vector: tfIdfVector(corpora[index] ?? [], idf),
      keywordStems: stems,
      prefixes: new Set(
        [...stems].filter((s) => s.length >= PREFIX_LENGTH).map((s) => s.slice(0, PREFIX_LENGTH)),
      ),
      keywordPhrases: [...def.keywords, ...def.keywordsHi]
        .filter((k) => k.includes(' '))
        .map((k) => k.toLowerCase()),
    };
  });

  const domainsPerStem = new Map<string, number>();
  for (const model of models) {
    for (const stem of model.keywordStems) {
      domainsPerStem.set(stem, (domainsPerStem.get(stem) ?? 0) + 1);
    }
  }
  const specificity = new Map<string, number>();
  for (const [stem, count] of domainsPerStem) {
    specificity.set(stem, 1 / count);
  }

  return { models, idf, specificity };
}

const LEXICON = buildLexicon();

export class TfIdfClassifier implements IProblemClassifier {
  readonly name = 'tfidf' as const;

  isAvailable(): boolean {
    return true;
  }

  classify(input: ClassifyInput): Promise<ClassificationResult> {
    return Promise.resolve(this.classifySync(input));
  }

  classifySync(input: ClassifyInput): ClassificationResult {
    const scored = this.scoreDomains(input);
    const best = scored[0];

    if (!best || best.score === 0) {
      return {
        domain: 'public_administration',
        confidenceScore: 0.1,
        alternatives: [],
        tier: 'tfidf',
        rationale: 'No domain keywords matched; defaulted to general public administration.',
      };
    }

    const runnerUp = scored[1]?.score ?? 0;
    const margin = (best.score - runnerUp) / best.score;
    const confidence = Math.min(0.95, 0.35 + 0.4 * margin + 0.3 * Math.min(1, best.score * 2));

    return {
      domain: best.domain,
      confidenceScore: Number(confidence.toFixed(3)),
      alternatives: scored.slice(1, 4).map((s) => ({
        domain: s.domain,
        score: Number((s.score / best.score).toFixed(3)),
      })),
      tier: 'tfidf',
      rationale: `Keyword and TF-IDF match against the ${best.domain} domain profile.`,
    };
  }

  scoreDomains(input: ClassifyInput): DomainScore[] {
    const rawText = `${input.title} ${input.title} ${input.description}`.toLowerCase();
    const tokens = normalize(
      [...Array<string>(TITLE_REPEAT).fill(input.title), input.description].join(' '),
    );
    const frequencies = termFrequency(tokens);
    const queryVector = tfIdfVector(tokens, LEXICON.idf);

    return LEXICON.models
      .map((model) => {
        const vectorScore = cosineSimilarity(queryVector, model.vector);
        const keywordScore = this.scoreKeywords(model, frequencies, rawText);
        return {
          domain: model.domain,
          score: KEYWORD_WEIGHT * keywordScore + VECTOR_WEIGHT * vectorScore,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  private scoreKeywords(
    model: DomainModel,
    frequencies: Map<string, number>,
    rawText: string,
  ): number {
    let weighted = 0;

    for (const [token, count] of frequencies) {
      const stem = this.matchStem(model, token);
      if (!stem) continue;
      weighted += (LEXICON.specificity.get(stem) ?? 0.5) * (1 + Math.log2(count));
    }

    for (const phrase of model.keywordPhrases) {
      if (rawText.includes(phrase)) weighted += PHRASE_BONUS;
    }

    return weighted === 0 ? 0 : Math.min(1, Math.log2(weighted + 1) / 3);
  }

  private matchStem(model: DomainModel, token: string): string | null {
    if (model.keywordStems.has(token)) return token;
    if (token.length < PREFIX_LENGTH) return null;

    const prefix = token.slice(0, PREFIX_LENGTH);
    if (!model.prefixes.has(prefix)) return null;
    for (const stem of model.keywordStems) {
      if (stem.startsWith(prefix)) return stem;
    }
    return null;
  }
}
