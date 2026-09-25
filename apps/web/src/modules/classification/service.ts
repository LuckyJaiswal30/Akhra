import { createHash } from 'node:crypto';
import { z } from 'zod';
import { and, desc, eq, ne, sql } from 'drizzle-orm';
import {
  contentFingerprint,
  createClassifier,
  createDuplicateJudge,
  TextSimilarityDetector,
} from '@akhra/classifier';
import type { ClassificationResult, ClassifyInput } from '@akhra/classifier';
import { classificationCache, getDb, problems, withoutRls } from '@akhra/db';
import { ACTIVE_STATUSES, type Domain, validationError } from '@akhra/shared';
import { serverEnv } from '@/server/env';
import { logger } from '@/server/logger';

const aiConfig = {
  chain: serverEnv.AI_PROVIDER_CHAIN,
  timeoutMs: serverEnv.AI_TIMEOUT_MS,
  geminiApiKey: serverEnv.GEMINI_API_KEY,
  geminiModel: serverEnv.GEMINI_MODEL,
  groqApiKey: serverEnv.GROQ_API_KEY,
  groqModel: serverEnv.GROQ_MODEL,
  breakerThreshold: serverEnv.AI_BREAKER_THRESHOLD,
  breakerCooldownMs: serverEnv.AI_BREAKER_COOLDOWN_MS,
};

const classifier = createClassifier({
  ...aiConfig,
  onFallback: ({ tier, reason }) =>
    logger.warn({ tier, reason }, 'classifier tier unavailable, falling through'),
});

const duplicateJudge = createDuplicateJudge({
  ...aiConfig,
  onFallback: ({ tier, reason }) =>
    logger.warn({ tier, reason }, 'duplicate judge unavailable, falling through'),
});

const duplicateDetector = new TextSimilarityDetector();

function cacheKey(input: ClassifyInput): string {
  return createHash('sha256')
    .update(`${input.title.trim().toLowerCase()}\u0000${input.description.trim().toLowerCase()}`)
    .digest('hex');
}

const classifyInputSchema = z.object({
  title: z
    .string({ error: 'A title is needed to classify a report.' })
    .trim()
    .min(3, 'The title is too short to classify.')
    .max(300, 'The title is too long to classify.'),
  description: z
    .string({ error: 'A description is needed to classify a report.' })
    .trim()
    .min(10, 'The description is too short to classify.')
    .max(10_000, 'The description is too long to classify.'),
  districtCode: z.string().max(10).optional(),
});

export async function classifyProblem(input: ClassifyInput): Promise<ClassificationResult> {
  const checked = classifyInputSchema.safeParse(input);
  if (!checked.success) throw validationError(checked.error.issues);
  input = checked.data;
  const key = cacheKey(input);
  const db = getDb();

  const cached = await withoutRls(db, (tx) =>
    tx.select().from(classificationCache).where(eq(classificationCache.inputHash, key)).limit(1),
  ).catch(() => []);

  const hit = cached[0];
  if (hit) {
    logger.info({ tier: hit.tier, domain: hit.domain, via: 'cache' }, 'report classified');
    return {
      domain: hit.domain,
      confidenceScore: hit.confidence,
      alternatives: (hit.alternatives ?? []) as { domain: Domain; score: number }[],
      tier: hit.tier === 'manual' ? 'tfidf' : hit.tier,
    };
  }

  const result = await classifier.classify(input);
  logger.info(
    { tier: result.tier, domain: result.domain, confidence: result.confidenceScore },
    'report classified',
  );

  await withoutRls(db, (tx) =>
    tx
      .insert(classificationCache)
      .values({
        inputHash: key,
        domain: result.domain,
        confidence: result.confidenceScore,
        tier: result.tier,
        alternatives: result.alternatives,
      })
      .onConflictDoNothing(),
  ).catch((error: unknown) => {
    logger.warn(
      { err: error instanceof Error ? error.message : String(error) },
      'could not memoise classification',
    );
  });

  return result;
}

export interface DuplicateMatch {
  problemId: string;
  refCode: string;
  title: string;
  similarity: number;
}

export type DuplicateCheckPath = 'fingerprint' | 'text' | 'gemini' | 'groq';

export interface DuplicateReport {
  matches: DuplicateMatch[];
  checkedBy: DuplicateCheckPath;
  degraded: boolean;
}

const CANDIDATE_LIMIT = 40;
const SHORTLIST_THRESHOLD = 0.15;
const SHORTLIST_SIZE = 8;
const MODEL_CONFIDENCE_FLOOR = 0.6;
const MAX_DUPLICATES = 5;

const activeStatusArray = sql.raw(
  `array[${ACTIVE_STATUSES.map((status) => `'${status}'`).join(',')}]::problem_status[]`,
);

interface Candidate {
  problemId: string;
  refCode: string;
  title: string;
  description: string;
}

const candidateColumns = {
  problemId: problems.id,
  refCode: problems.refCode,
  title: problems.title,
  description: problems.description,
};

async function fingerprintMatches(
  fingerprint: string | null,
  excludeId: string | undefined,
): Promise<DuplicateMatch[]> {
  if (!fingerprint) return [];
  const rows = await withoutRls(getDb(), (tx) =>
    tx
      .select({ problemId: problems.id, refCode: problems.refCode, title: problems.title })
      .from(problems)
      .where(
        and(
          eq(problems.contentFingerprint, fingerprint),
          sql`${problems.status} = any(${activeStatusArray})`,
          excludeId ? ne(problems.id, excludeId) : undefined,
        ),
      )
      .limit(MAX_DUPLICATES),
  );
  return rows.map((row) => ({ ...row, similarity: 1 }));
}

function trigramCandidates(
  districtCode: string,
  needle: string,
  excludeId: string | undefined,
): Promise<Candidate[]> {
  return withoutRls(getDb(), (tx) =>
    tx
      .select(candidateColumns)
      .from(problems)
      .where(
        and(
          eq(problems.districtCode, districtCode),
          sql`${problems.status} = any(${activeStatusArray})`,
          excludeId ? ne(problems.id, excludeId) : undefined,
          sql`similarity(${problems.title} || ' ' || ${problems.description}, ${needle}) > 0.1`,
        ),
      )
      .limit(CANDIDATE_LIMIT),
  );
}

function recentCandidates(
  districtCode: string,
  excludeId: string | undefined,
): Promise<Candidate[]> {
  return withoutRls(getDb(), (tx) =>
    tx
      .select(candidateColumns)
      .from(problems)
      .where(
        and(
          eq(problems.districtCode, districtCode),
          sql`${problems.status} = any(${activeStatusArray})`,
          excludeId ? ne(problems.id, excludeId) : undefined,
        ),
      )
      .orderBy(desc(problems.createdAt))
      .limit(CANDIDATE_LIMIT * 3),
  );
}

function merge(primary: DuplicateMatch[], secondary: DuplicateMatch[]): DuplicateMatch[] {
  const seen = new Set(primary.map((match) => match.problemId));
  return [...primary, ...secondary.filter((match) => !seen.has(match.problemId))].slice(
    0,
    MAX_DUPLICATES,
  );
}

function sameDomainCandidates(
  districtCode: string,
  domain: Domain,
  excludeId: string | undefined,
): Promise<Candidate[]> {
  return withoutRls(getDb(), (tx) =>
    tx
      .select(candidateColumns)
      .from(problems)
      .where(
        and(
          eq(problems.districtCode, districtCode),
          eq(problems.domain, domain),
          sql`${problems.status} = any(${activeStatusArray})`,
          excludeId ? ne(problems.id, excludeId) : undefined,
        ),
      )
      .orderBy(desc(problems.createdAt))
      .limit(SHORTLIST_SIZE),
  );
}

export async function findDuplicates(input: {
  title: string;
  description: string;
  districtCode: string;
  domain: Domain | null;
  excludeId?: string;
}): Promise<DuplicateReport> {
  const needle = `${input.title} ${input.description}`;
  const report = { title: input.title, description: input.description };

  const exact = await fingerprintMatches(
    contentFingerprint(input.title, input.description),
    input.excludeId,
  ).catch((error: unknown) => {
    logger.error(
      { err: error instanceof Error ? error.message : String(error) },
      'fingerprint duplicate check failed',
    );
    return null;
  });

  let degraded = exact === null;

  let candidates: Candidate[];
  try {
    candidates = await trigramCandidates(input.districtCode, needle, input.excludeId);
  } catch (error: unknown) {
    degraded = true;
    logger.warn(
      { err: error instanceof Error ? error.message : String(error) },
      'trigram duplicate search unavailable, falling back to recent reports',
    );
    candidates = await recentCandidates(input.districtCode, input.excludeId).catch(
      (fallbackError: unknown) => {
        logger.error(
          { err: fallbackError instanceof Error ? fallbackError.message : String(fallbackError) },
          'duplicate candidate lookup failed entirely',
        );
        return [];
      },
    );
  }

  const settled = (matches: DuplicateMatch[], checkedBy: DuplicateCheckPath): DuplicateReport => {
    const merged = merge(exact ?? [], matches);
    logger.info(
      { path: checkedBy, matches: merged.length, exact: exact?.length ?? 0, degraded },
      'duplicates checked',
    );
    return {
      matches: merged,
      checkedBy: (exact?.length ?? 0) > 0 ? 'fingerprint' : checkedBy,
      degraded,
    };
  };

  const related = input.domain
    ? await sameDomainCandidates(input.districtCode, input.domain, input.excludeId).catch(() => [])
    : [];
  const known = new Set(candidates.map((candidate) => candidate.problemId));
  candidates = [...candidates, ...related.filter((candidate) => !known.has(candidate.problemId))];

  if (candidates.length === 0) return settled([], 'text');

  const textMatches = duplicateDetector.findSimilar(report, candidates);
  if (!duplicateJudge.hasAvailableJudge()) return settled(textMatches, 'text');

  const shortlist = duplicateDetector.findSimilar(report, candidates, {
    threshold: SHORTLIST_THRESHOLD,
    limit: SHORTLIST_SIZE,
  });
  const byId = new Map(candidates.map((candidate) => [candidate.problemId, candidate]));
  const toJudge = [
    ...new Set([
      ...shortlist.map((match) => match.problemId),
      ...related.map((candidate) => candidate.problemId),
    ]),
  ].slice(0, SHORTLIST_SIZE);
  if (toJudge.length === 0) return settled(textMatches, 'text');

  const verdict = await duplicateJudge
    .judge(
      report,
      toJudge.map((id) => byId.get(id)!),
    )
    .catch(() => null);

  if (!verdict) {
    degraded = true;
    return settled(textMatches, 'text');
  }

  const judged = verdict.judgements
    .filter((judgement) => judgement.confidence >= MODEL_CONFIDENCE_FLOOR)
    .map((judgement) => ({
      problemId: judgement.problemId,
      refCode: byId.get(judgement.problemId)!.refCode,
      title: byId.get(judgement.problemId)!.title,
      similarity: judgement.confidence,
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, MAX_DUPLICATES);

  return settled(judged, verdict.tier as DuplicateCheckPath);
}
