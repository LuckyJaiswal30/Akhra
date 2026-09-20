import { count, eq, inArray, sql } from 'drizzle-orm';
import { getDb, problemSupports, problems, withoutRls, type Transaction } from '@akhra/db';
import { assessPriority } from '@akhra/shared';
import { logger } from '@/server/logger';

const DAY = 24 * 60 * 60 * 1000;

/** Reports still waiting on someone. Priority stops mattering once a report is closed. */
const OPEN_STATUSES = ['submitted', 'validated', 'assigned'] as const;

/**
 * Recomputes a report's supporters and priority from what is recorded about it. Both are derived,
 * never incremented, so a count can be refreshed any number of times and still be right.
 */
export async function refreshPriority(
  tx: Transaction,
  problemId: string,
  now = new Date(),
): Promise<void> {
  const [report] = await tx
    .select({
      domain: problems.domain,
      title: problems.title,
      description: problems.description,
      affectedScale: problems.affectedScale,
      safetyRisk: problems.safetyRisk,
      createdAt: problems.createdAt,
    })
    .from(problems)
    .where(eq(problems.id, problemId))
    .limit(1);
  if (!report) return;

  const [supporters] = await tx
    .select({ value: count() })
    .from(problemSupports)
    .where(eq(problemSupports.problemId, problemId));
  const [duplicates] = await tx
    .select({ value: count() })
    .from(problems)
    .where(eq(problems.duplicateOfId, problemId));
  const supportCount = supporters?.value ?? 0;

  const assessment = assessPriority({
    domain: report.domain,
    title: report.title,
    description: report.description,
    affectedScale: report.affectedScale,
    safetyRisk: report.safetyRisk,
    supportCount,
    duplicateReports: duplicates?.value ?? 0,
    ageDays: Math.floor((now.getTime() - report.createdAt.getTime()) / DAY),
  });

  await tx
    .update(problems)
    .set({
      supportCount,
      priorityScore: assessment.score,
      priority: assessment.level,
      priorityReasons: assessment.reasons,
      priorityRefreshedAt: now,
    })
    .where(eq(problems.id, problemId));
}

/**
 * Waiting time raises priority on its own, so open reports are reassessed by the daily job.
 *
 * Reassessing costs three queries per report, so a run takes the batch that has gone longest
 * without one — reports never assessed first. A backlog drains over the following runs instead of
 * holding one long transaction open.
 */
export const PRIORITY_BATCH = 200;

export async function refreshOpenPriorities(now = new Date()): Promise<number> {
  const stale = await withoutRls(getDb(), (tx) =>
    tx
      .select({ id: problems.id })
      .from(problems)
      .where(inArray(problems.status, [...OPEN_STATUSES]))
      .orderBy(sql`${problems.priorityRefreshedAt} asc nulls first`)
      .limit(PRIORITY_BATCH),
  );

  for (const report of stale) {
    await withoutRls(getDb(), (tx) => refreshPriority(tx, report.id, now));
  }

  logger.info({ count: stale.length }, 'priorities refreshed');
  return stale.length;
}
