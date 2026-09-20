import { and, eq } from 'drizzle-orm';
import { getDb, problemSupports, problems, withoutRls } from '@akhra/db';
import { Errors, TERMINAL_STATUSES } from '@akhra/shared';
import { refreshPriority } from '@/modules/classification';
import { query, type Actor } from '@/server/session';

export interface SupportState {
  supportCount: number;
  supported: boolean;
}

function signedIn(actor: Actor): string {
  if (!actor.userId) throw Errors.unauthenticated('Sign in to add your support to a report.');
  return actor.userId;
}

async function supportable(problemId: string, userId: string): Promise<void> {
  const [report] = await withoutRls(getDb(), (tx) =>
    tx
      .select({
        isPublic: problems.isPublic,
        status: problems.status,
        submitterId: problems.submitterId,
      })
      .from(problems)
      .where(eq(problems.id, problemId))
      .limit(1),
  );
  if (!report || !report.isPublic) throw Errors.notFound('That report could not be found.');
  if (report.submitterId === userId) {
    throw Errors.conflict('This is your own report; supporting it would count you twice.');
  }
  if (TERMINAL_STATUSES.includes(report.status)) {
    throw Errors.conflict('This report is closed, so it no longer takes support.');
  }
}

async function currentState(problemId: string, actor: Actor): Promise<SupportState> {
  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .select({ supportCount: problems.supportCount })
      .from(problems)
      .where(eq(problems.id, problemId))
      .limit(1),
  );
  return {
    supportCount: row?.supportCount ?? 0,
    supported: await hasSupported(actor, problemId),
  };
}

/**
 * "This affects me too." One per person, for public reports that are still open. Each change
 * recomputes the report's priority, which is how a problem many people share rises in the queue.
 */
export async function supportProblem(actor: Actor, problemId: string): Promise<SupportState> {
  const userId = signedIn(actor);
  await supportable(problemId, userId);
  await query(actor, (tx) =>
    tx.insert(problemSupports).values({ problemId, userId }).onConflictDoNothing(),
  );
  await withoutRls(getDb(), (tx) => refreshPriority(tx, problemId));
  return currentState(problemId, actor);
}

export async function withdrawSupport(actor: Actor, problemId: string): Promise<SupportState> {
  const userId = signedIn(actor);
  await query(actor, (tx) =>
    tx
      .delete(problemSupports)
      .where(and(eq(problemSupports.problemId, problemId), eq(problemSupports.userId, userId))),
  );
  await withoutRls(getDb(), (tx) => refreshPriority(tx, problemId));
  return currentState(problemId, actor);
}

export async function hasSupported(actor: Actor, problemId: string): Promise<boolean> {
  const userId = actor.userId;
  if (!userId) return false;
  const rows = await query(actor, (tx) =>
    tx
      .select({ userId: problemSupports.userId })
      .from(problemSupports)
      .where(and(eq(problemSupports.problemId, problemId), eq(problemSupports.userId, userId)))
      .limit(1),
  );
  return rows.length > 0;
}
