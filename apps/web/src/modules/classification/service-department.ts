import { and, asc, eq, inArray, isNull, lt, ne, or, sql } from 'drizzle-orm';
import {
  districts,
  getDb,
  organizations,
  problems,
  statusEvents,
  users,
  withoutRls,
} from '@akhra/db';
import {
  Errors,
  fixDueAt,
  interimUpdateDueAt,
  reopenClosesAt,
  REOPEN_WINDOW_DAYS,
  type ProblemStatus,
} from '@akhra/shared';
import { notifyUsers } from '@/modules/notifications';
import { logger } from '@/server/logger';
import { ForbiddenError, assertCanAct, query, type Actor } from '@/server/session';
import { transitionWithin } from './service-admin';

export interface DepartmentOption {
  id: string;
  name: string;
}

export async function listDepartments(): Promise<DepartmentOption[]> {
  return withoutRls(getDb(), (tx) =>
    tx
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(
        and(
          eq(organizations.isActive, true),
          or(
            eq(organizations.type, 'government'),
            eq(organizations.type, 'urban_local_body'),
            eq(organizations.type, 'panchayati_raj'),
          ),
        ),
      )
      .orderBy(organizations.name),
  );
}

function departmentOfficers(organizationId: string): Promise<{ id: string }[]> {
  return withoutRls(getDb(), (tx) =>
    tx
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.organizationId, organizationId),
          eq(users.role, 'dept_officer'),
          eq(users.status, 'active'),
        ),
      ),
  );
}

export async function assignToDepartment(
  actor: Actor,
  problemId: string,
  organizationId: string,
  note?: string,
): Promise<void> {
  const [department] = await withoutRls(getDb(), (tx) =>
    tx
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1),
  );
  if (!department) throw Errors.notFound('That department could not be found.');

  const assignedAt = new Date();
  // The status change and the department it went to are one fact. Written in two transactions, a
  // failure between them would leave a report "assigned" to nobody, with no clock and no inbox.
  await withoutRls(getDb(), async (tx) => {
    await transitionWithin(tx, actor, problemId, 'assigned', {
      note: note ? `${department.name}: ${note}` : `Sent to ${department.name}.`,
    });
    await tx
      .update(problems)
      .set({
        resolutionTrack: 'department',
        assignedOrgId: organizationId,
        assignedById: actor.userId,
        assignedAt,
        dueAt: fixDueAt(assignedAt),
        interimUpdateAt: interimUpdateDueAt(assignedAt),
        interimReminderSentAt: null,
        overdueReminderSentAt: null,
        updatedAt: assignedAt,
      })
      .where(eq(problems.id, problemId));
  });

  const staff = await departmentOfficers(organizationId);
  const [problem] = await withoutRls(getDb(), (tx) =>
    tx
      .select({ refCode: problems.refCode, title: problems.title })
      .from(problems)
      .where(eq(problems.id, problemId))
      .limit(1),
  );
  if (problem && staff.length > 0) {
    await notifyUsers(
      staff.map((person) => person.id),
      {
        type: 'report_assigned',
        title: `New report for your department: ${problem.refCode}`,
        body: `"${problem.title}" has been assigned to you. The action taken is due within 21 days.`,
        linkUrl: '/government/queue',
        email: true,
      },
    );
  }
  logger.info(
    { problemId, organizationId, actorId: actor.userId },
    'report assigned to a department',
  );
}

export async function recordActionTaken(
  actor: Actor,
  problemId: string,
  note: string,
): Promise<void> {
  const [problem] = await query(actor, (tx) =>
    tx
      .select({
        status: problems.status,
        districtCode: problems.districtCode,
        assignedOrgId: problems.assignedOrgId,
      })
      .from(problems)
      .where(eq(problems.id, problemId))
      .limit(1),
  );
  if (!problem) throw new ForbiddenError('That report is not available to you');
  assertCanAct(actor, problem);

  const actionTakenAt = new Date();
  // What was done and the status that says it was done are recorded together or not at all.
  await withoutRls(getDb(), async (tx) => {
    await transitionWithin(tx, actor, problemId, 'action_taken', { note });
    await tx
      .update(problems)
      .set({
        actionTakenNote: note,
        actionTakenAt,
        actionTakenById: actor.userId,
        updatedAt: actionTakenAt,
      })
      .where(eq(problems.id, problemId));
  });
  logger.info({ problemId, actorId: actor.userId }, 'action taken recorded');
}

export interface ReporterProblem {
  id: string;
  refCode: string;
  title: string;
  status: string;
  actionTakenAt: Date | null;
  actionTakenNote: string | null;
  reopenCount: number;
  submitterId: string | null;
  submitterPhone: string;
  assignedOrgId: string | null;
}

export async function reporterProblemFor(
  refCode: string,
  proof: { actorUserId: string | null; phoneLast4?: string },
): Promise<ReporterProblem | null> {
  const [problem] = await withoutRls(getDb(), (tx) =>
    tx
      .select({
        id: problems.id,
        refCode: problems.refCode,
        title: problems.title,
        status: problems.status,
        actionTakenAt: problems.actionTakenAt,
        actionTakenNote: problems.actionTakenNote,
        reopenCount: problems.reopenCount,
        submitterId: problems.submitterId,
        submitterPhone: problems.submitterPhone,
        assignedOrgId: problems.assignedOrgId,
      })
      .from(problems)
      .where(eq(problems.refCode, refCode))
      .limit(1),
  );
  if (!problem) return null;
  if (problem.submitterId) return problem.submitterId === proof.actorUserId ? problem : null;
  return proof.phoneLast4 && problem.submitterPhone.endsWith(proof.phoneLast4) ? problem : null;
}

function withinReopenWindow(actionTakenAt: Date | null): boolean {
  return actionTakenAt !== null && reopenClosesAt(actionTakenAt).getTime() > Date.now();
}

export async function confirmResolved(problem: ReporterProblem, note?: string): Promise<void> {
  if (problem.status !== 'action_taken')
    throw Errors.invalidTransition('This report is not waiting for your confirmation.');

  const now = new Date();
  await withoutRls(getDb(), async (tx) => {
    await tx
      .update(problems)
      .set({ status: 'closed', confirmedAt: now, reporterNote: note ?? null, updatedAt: now })
      .where(and(eq(problems.id, problem.id), eq(problems.status, 'action_taken')));
    await tx.insert(statusEvents).values({
      entityType: 'problem',
      entityId: problem.id,
      problemId: problem.id,
      fromStatus: 'action_taken',
      toStatus: 'closed',
      actorId: problem.submitterId,
      actorLabel: 'The person who reported it',
      note: note ?? 'Confirmed as resolved by the reporter.',
      isPublic: true,
    });
  });
  logger.info({ problemId: problem.id }, 'reporter confirmed the resolution');
}

export async function reopenReport(problem: ReporterProblem, reason: string): Promise<void> {
  if (problem.status !== 'action_taken' && problem.status !== 'closed') {
    throw Errors.invalidTransition('Only a report marked as done can be reopened.');
  }
  if (problem.reopenCount >= 1)
    throw Errors.invalidTransition('This report has already been reopened once.');
  if (!withinReopenWindow(problem.actionTakenAt)) {
    throw Errors.invalidTransition(
      `A report can be reopened within ${REOPEN_WINDOW_DAYS} days of the action taken.`,
    );
  }

  const now = new Date();
  const reopened = await withoutRls(getDb(), async (tx) => {
    const rows = await tx
      .update(problems)
      .set({
        status: 'assigned',
        reopenedAt: now,
        reopenCount: problem.reopenCount + 1,
        reporterNote: reason,
        dueAt: fixDueAt(now),
        interimUpdateAt: interimUpdateDueAt(now),
        interimReminderSentAt: null,
        overdueReminderSentAt: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(problems.id, problem.id),
          ne(problems.status, 'assigned'),
          isNull(problems.reopenedAt),
        ),
      )
      .returning({
        id: problems.id,
        assignedOrgId: problems.assignedOrgId,
        refCode: problems.refCode,
        title: problems.title,
      });
    if (rows.length === 0) return null;
    await tx.insert(statusEvents).values({
      entityType: 'problem',
      entityId: problem.id,
      problemId: problem.id,
      fromStatus: problem.status as never,
      toStatus: 'assigned',
      actorId: problem.submitterId,
      actorLabel: 'The person who reported it',
      note: reason,
      isPublic: true,
    });
    return rows[0];
  });
  if (!reopened) throw Errors.invalidTransition('This report has already been reopened once.');

  const staff = reopened.assignedOrgId ? await departmentOfficers(reopened.assignedOrgId) : [];
  if (staff.length > 0) {
    await notifyUsers(
      staff.map((person) => person.id),
      {
        type: 'report_reopened',
        title: `Reopened by the reporter: ${reopened.refCode}`,
        body: `"${reopened.title}" was reopened: ${reason}`,
        linkUrl: '/government/queue',
        email: true,
      },
    );
  }
  logger.info({ problemId: problem.id }, 'report reopened by the reporter');
}

/** Bounded like every scheduled job, so one run can always finish what it started. */
const AUTO_CLOSE_BATCH = 200;

export async function autoCloseSettledReports(now = new Date()): Promise<number> {
  const windowClosed = new Date(now.getTime() - REOPEN_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const unanswered = and(
    eq(problems.status, 'action_taken'),
    lt(problems.actionTakenAt, windowClosed),
  );

  const settled = await withoutRls(getDb(), async (tx) => {
    const rows = await tx
      .update(problems)
      .set({ status: 'closed', updatedAt: now })
      .where(
        and(
          unanswered,
          inArray(
            problems.id,
            tx.select({ id: problems.id }).from(problems).where(unanswered).limit(AUTO_CLOSE_BATCH),
          ),
        ),
      )
      .returning({ id: problems.id });

    if (rows.length > 0) {
      await tx.insert(statusEvents).values(
        rows.map((row) => ({
          entityType: 'problem' as const,
          entityId: row.id,
          problemId: row.id,
          fromStatus: 'action_taken',
          toStatus: 'closed',
          actorId: null,
          actorLabel: 'Akhra',
          note: `Closed automatically: the person who reported it did not answer within ${REOPEN_WINDOW_DAYS} days of the action taken.`,
          isPublic: true,
        })),
      );
    }
    return rows;
  });
  if (settled.length > 0)
    logger.info({ count: settled.length }, 'reports closed after the reopen window');
  return settled.length;
}

export type DepartmentBucket = 'open' | 'awaiting' | 'closed';

export interface DepartmentReport {
  id: string;
  refCode: string;
  title: string;
  description: string;
  districtName: string;
  status: ProblemStatus;
  createdAt: Date;
  dueAt: Date | null;
  actionTakenAt: Date | null;
  actionTakenNote: string | null;
  reopenCount: number;
  reporterNote: string | null;
}

const BUCKET_STATUS: Record<DepartmentBucket, ProblemStatus[]> = {
  open: ['assigned'],
  awaiting: ['action_taken'],
  closed: ['closed'],
};

function departmentScope(actor: Actor): string {
  if (actor.role !== 'dept_officer' || !actor.organizationId) {
    throw new ForbiddenError('Only a department officer can see a department queue.');
  }
  return actor.organizationId;
}

export async function departmentReports(
  actor: Actor,
  bucket: DepartmentBucket,
): Promise<DepartmentReport[]> {
  const organizationId = departmentScope(actor);
  return query(actor, (tx) =>
    tx
      .select({
        id: problems.id,
        refCode: problems.refCode,
        title: problems.title,
        description: problems.description,
        districtName: districts.nameEn,
        status: problems.status,
        createdAt: problems.createdAt,
        dueAt: problems.dueAt,
        actionTakenAt: problems.actionTakenAt,
        actionTakenNote: problems.actionTakenNote,
        reopenCount: problems.reopenCount,
        reporterNote: problems.reporterNote,
      })
      .from(problems)
      .innerJoin(districts, eq(problems.districtCode, districts.code))
      .where(
        and(
          eq(problems.assignedOrgId, organizationId),
          inArray(problems.status, BUCKET_STATUS[bucket]),
        ),
      )
      .orderBy(asc(problems.dueAt), asc(problems.createdAt))
      .limit(100),
  );
}

export interface DepartmentStats {
  open: number;
  overdue: number;
  awaiting: number;
  closed: number;
}

export async function departmentStats(actor: Actor): Promise<DepartmentStats> {
  const organizationId = departmentScope(actor);
  const [row] = await query(actor, (tx) =>
    tx
      .select({
        open: sql<number>`count(*) filter (where ${problems.status} = 'assigned')::int`,
        overdue: sql<number>`count(*) filter (where ${problems.status} = 'assigned' and ${problems.dueAt} < now())::int`,
        awaiting: sql<number>`count(*) filter (where ${problems.status} = 'action_taken')::int`,
        closed: sql<number>`count(*) filter (where ${problems.status} = 'closed')::int`,
      })
      .from(problems)
      .where(eq(problems.assignedOrgId, organizationId)),
  );
  return row ?? { open: 0, overdue: 0, awaiting: 0, closed: 0 };
}

export async function departmentName(organizationId: string): Promise<string | null> {
  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1),
  );
  return row?.name ?? null;
}
