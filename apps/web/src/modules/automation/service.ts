import { and, eq, gt, inArray, isNull, lt, lte, sql } from 'drizzle-orm';
import {
  getDb,
  invites,
  milestones,
  problems,
  projects,
  rateLimits,
  users,
  withoutRls,
} from '@akhra/db';
import { DISTRICT_BY_CODE, FIX_DAYS } from '@akhra/shared';
import { computeDashboard, snapshotKey, writeSnapshot } from '@/modules/analytics';
import { eraseExpiredContacts } from '@/modules/citizen';
import {
  autoCloseSettledReports,
  PRIORITY_BATCH,
  refreshOpenPriorities,
} from '@/modules/classification';
import {
  notifyEscalation,
  notifyOrganizations,
  notifyUsers,
  queueEmail,
} from '@/modules/notifications';
import { logger } from '@/server/logger';
import { ANONYMOUS_ACTOR, type Actor } from '@/server/session';

const SYSTEM_ACTOR: Actor = { ...ANONYMOUS_ACTOR, role: 'gov_admin' };

const HOUR = 60 * 60 * 1000;
export const ESCALATE_AFTER_HOURS = 72;
const INVITE_REMINDER_HOURS = 24;
const MILESTONE_REMINDER_HOURS = 72;

/**
 * How many rows a job may claim in one run.
 *
 * Every job here marks rows as done *before* it sends anything, so a run that dies half way —
 * a function timeout, a deploy, a database blip — would leave those people never told. Claiming a
 * bounded batch keeps one run short enough to finish, and a job that fills its batch simply says so
 * and is picked up by the next run.
 */
const BATCH = 200;

export interface MaintenanceReport {
  escalated: number;
  interimReminders: number;
  overdueReports: number;
  autoClosed: number;
  inviteReminders: number;
  milestoneReminders: number;
  priorities: number;
  rateLimitsPruned: number;
  contactsErased: number;
  snapshots: number;
  /** Jobs that filled their batch and still have work waiting for the next run. */
  pending: string[];
}

/** Rate-limit buckets are only meaningful inside their window; after a day they are dead weight. */
const RATE_LIMIT_KEEP_HOURS = 48;

export async function pruneRateLimits(now = new Date()): Promise<number> {
  const rows = await withoutRls(getDb(), (tx) =>
    tx
      .delete(rateLimits)
      .where(lt(rateLimits.windowStart, new Date(now.getTime() - RATE_LIMIT_KEEP_HOURS * HOUR)))
      .returning({ key: rateLimits.bucketKey }),
  );
  return rows.length;
}

const days = (from: Date, to: Date) =>
  Math.max(1, Math.round((to.getTime() - from.getTime()) / (24 * HOUR)));

export async function escalateStaleReports(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - ESCALATE_AFTER_HOURS * HOUR);

  const waiting = and(
    inArray(problems.status, ['submitted', 'validated']),
    isNull(problems.escalatedAt),
    lt(problems.createdAt, cutoff),
  );

  const stale = await withoutRls(getDb(), (tx) =>
    tx
      .update(problems)
      .set({ escalatedAt: now })
      .where(
        and(
          waiting,
          inArray(
            problems.id,
            tx.select({ id: problems.id }).from(problems).where(waiting).limit(BATCH),
          ),
        ),
      )
      .returning({
        id: problems.id,
        refCode: problems.refCode,
        title: problems.title,
        districtCode: problems.districtCode,
        status: problems.status,
        createdAt: problems.createdAt,
      }),
  );
  if (stale.length === 0) return 0;

  for (const report of stale) {
    const district = DISTRICT_BY_CODE[report.districtCode]?.nameEn ?? report.districtCode;
    await notifyEscalation(report.districtCode, {
      type: 'report_escalated',
      title: `Waiting ${days(report.createdAt, now)} days in ${district}: ${report.refCode}`,
      body: `"${report.title}" is still ${report.status} after ${ESCALATE_AFTER_HOURS} hours. It now shows as escalated in the validation queue.`,
      linkUrl: '/government/queue',
      email: true,
    });
  }

  logger.info({ count: stale.length }, 'reports escalated');
  return stale.length;
}

export async function remindExpiringInvites(now = new Date()): Promise<number> {
  const deadline = new Date(now.getTime() + INVITE_REMINDER_HOURS * HOUR);

  const lapsing = and(
    eq(invites.status, 'pending'),
    isNull(invites.reminderSentAt),
    lte(invites.expiresAt, deadline),
    gt(invites.expiresAt, now),
  );

  const expiring = await withoutRls(getDb(), (tx) =>
    tx
      .update(invites)
      .set({ reminderSentAt: now })
      .where(
        and(
          lapsing,
          inArray(
            invites.id,
            tx.select({ id: invites.id }).from(invites).where(lapsing).limit(BATCH),
          ),
        ),
      )
      .returning({ email: invites.email, expiresAt: invites.expiresAt }),
  );

  for (const invite of expiring) {
    const when = invite.expiresAt.toLocaleString('en-IN', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    });
    await queueEmail(invite.email, {
      type: 'invite_reminder',
      title: 'Your Akhra invitation expires soon',
      body:
        `Your invitation to Akhra expires on ${when} IST.\n\n` +
        'Open the invitation link you were sent to accept it. If you no longer have it, ask whoever invited you for a new one.',
    });
  }

  if (expiring.length > 0) logger.info({ count: expiring.length }, 'invite reminders sent');
  return expiring.length;
}

export async function remindDueMilestones(now = new Date()): Promise<number> {
  const deadline = new Date(now.getTime() + MILESTONE_REMINDER_HOURS * HOUR);

  const due = await withoutRls(getDb(), async (tx) => {
    const rows = await tx
      .select({
        id: milestones.id,
        title: milestones.title,
        dueDate: milestones.dueDate,
        projectId: milestones.projectId,
        organizationId: projects.organizationId,
      })
      .from(milestones)
      .innerJoin(projects, eq(projects.id, milestones.projectId))
      .where(
        and(
          inArray(milestones.status, ['pending', 'in_progress']),
          isNull(milestones.reminderSentAt),
          lte(milestones.dueDate, deadline),
        ),
      )
      .limit(BATCH);
    if (rows.length > 0) {
      await tx
        .update(milestones)
        .set({ reminderSentAt: now })
        .where(
          inArray(
            milestones.id,
            rows.map((r) => r.id),
          ),
        );
    }
    return rows;
  });

  for (const milestone of due) {
    const overdue = milestone.dueDate ? milestone.dueDate < now : false;
    await notifyOrganizations([milestone.organizationId], ['university_admin', 'faculty'], {
      type: overdue ? 'milestone_overdue' : 'milestone_due',
      title: overdue
        ? `Milestone overdue: ${milestone.title}`
        : `Milestone due soon: ${milestone.title}`,
      body: milestone.dueDate
        ? `Due ${milestone.dueDate.toLocaleDateString('en-IN', { dateStyle: 'long', timeZone: 'Asia/Kolkata' })}.`
        : undefined,
      linkUrl: `/projects/${milestone.projectId}`,
      email: true,
    });
  }

  if (due.length > 0) logger.info({ count: due.length }, 'milestone reminders sent');
  return due.length;
}

export async function refreshDashboardSnapshots(): Promise<number> {
  const districts = await withoutRls(getDb(), (tx) =>
    tx
      .selectDistinct({ code: users.jurisdictionCode })
      .from(users)
      .where(and(eq(users.role, 'gov_admin'), eq(users.status, 'active'))),
  );

  const scopes = [
    undefined,
    ...districts.map((d) => d.code).filter((code): code is string => Boolean(code)),
  ];
  let written = 0;

  for (const districtCode of scopes) {
    const filter = districtCode ? { districtCode } : {};
    try {
      const officer: Actor = { ...SYSTEM_ACTOR, jurisdiction: districtCode ?? null };
      const payload = await computeDashboard(officer, filter);
      await writeSnapshot(
        snapshotKey(filter, { role: officer.role, jurisdiction: officer.jurisdiction }),
        payload,
      );
      written += 1;
    } catch (error) {
      logger.error(
        { err: error instanceof Error ? error.message : String(error), districtCode },
        'dashboard snapshot failed',
      );
    }
  }

  logger.info({ count: written }, 'dashboard snapshots refreshed');
  return written;
}

async function notifyDepartment(
  problem: { id: string; refCode: string; title: string; assignedOrgId: string | null },
  input: { type: string; title: string; body: string },
): Promise<void> {
  if (!problem.assignedOrgId) return;
  const staff = await withoutRls(getDb(), (tx) =>
    tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.organizationId, problem.assignedOrgId!), eq(users.status, 'active'))),
  );
  if (staff.length === 0) return;
  await notifyUsers(
    staff.map((person) => person.id),
    { ...input, linkUrl: '/government/queue', email: true },
  );
}

export async function remindInterimUpdates(now = new Date()): Promise<number> {
  const owing = and(
    eq(problems.status, 'assigned'),
    isNull(problems.interimReminderSentAt),
    lte(problems.interimUpdateAt, now),
  );

  const due = await withoutRls(getDb(), (tx) =>
    tx
      .update(problems)
      .set({ interimReminderSentAt: now })
      .where(
        and(
          owing,
          inArray(
            problems.id,
            tx.select({ id: problems.id }).from(problems).where(owing).limit(BATCH),
          ),
        ),
      )
      .returning({
        id: problems.id,
        refCode: problems.refCode,
        title: problems.title,
        assignedOrgId: problems.assignedOrgId,
        dueAt: problems.dueAt,
      }),
  );

  for (const problem of due) {
    const left = problem.dueAt ? Math.max(0, days(now, problem.dueAt)) : 0;
    await notifyDepartment(problem, {
      type: 'report_interim_due',
      title: `Update needed on ${problem.refCode}`,
      body: `"${problem.title}" is still open with ${left} day${left === 1 ? '' : 's'} left of the ${FIX_DAYS}-day limit. Record what has been done so far.`,
    });
  }
  return due.length;
}

export async function escalateOverdueReports(now = new Date()): Promise<number> {
  const late = and(
    eq(problems.status, 'assigned'),
    isNull(problems.overdueReminderSentAt),
    lte(problems.dueAt, now),
  );

  const overdue = await withoutRls(getDb(), (tx) =>
    tx
      .update(problems)
      .set({ overdueReminderSentAt: now })
      .where(
        and(
          late,
          inArray(
            problems.id,
            tx.select({ id: problems.id }).from(problems).where(late).limit(BATCH),
          ),
        ),
      )
      .returning({
        id: problems.id,
        refCode: problems.refCode,
        title: problems.title,
        assignedOrgId: problems.assignedOrgId,
        districtCode: problems.districtCode,
      }),
  );

  for (const problem of overdue) {
    await notifyDepartment(problem, {
      type: 'report_overdue',
      title: `Overdue: ${problem.refCode}`,
      body: `"${problem.title}" has passed the ${FIX_DAYS}-day limit and is now shown as overdue to the district officer.`,
    });
    await notifyEscalation(problem.districtCode, {
      type: 'report_overdue',
      title: `Overdue with the department: ${problem.refCode}`,
      body: `"${problem.title}" has passed the ${FIX_DAYS}-day limit with its department.`,
      linkUrl: '/government/queue',
      email: true,
    });
  }
  return overdue.length;
}

export async function runMaintenance(now = new Date()): Promise<MaintenanceReport> {
  const pending: string[] = [];

  /**
   * One failing job never stops the others, and a job that filled its batch is named in `pending`
   * so whoever reads the response knows the next run still has work to do.
   */
  const settle = async (name: string, task: Promise<number>, batch = BATCH): Promise<number> => {
    try {
      const handled = await task;
      if (handled >= batch) pending.push(name);
      return handled;
    } catch (error) {
      logger.error(
        { err: error instanceof Error ? error.message : String(error), job: name },
        'maintenance job failed',
      );
      return 0;
    }
  };

  const report = {
    escalated: await settle('escalation', escalateStaleReports(now)),
    interimReminders: await settle('interim reminders', remindInterimUpdates(now)),
    overdueReports: await settle('overdue reports', escalateOverdueReports(now)),
    autoClosed: await settle('auto close', autoCloseSettledReports(now)),
    inviteReminders: await settle('invite reminders', remindExpiringInvites(now)),
    milestoneReminders: await settle('milestone reminders', remindDueMilestones(now)),
    priorities: await settle('priorities', refreshOpenPriorities(now), PRIORITY_BATCH),
    rateLimitsPruned: await settle(
      'rate limit pruning',
      pruneRateLimits(now),
      Number.MAX_SAFE_INTEGER,
    ),
    contactsErased: await settle('contact erasure', eraseExpiredContacts(now)),
    snapshots: await settle(
      'dashboard snapshots',
      refreshDashboardSnapshots(),
      Number.MAX_SAFE_INTEGER,
    ),
  };

  if (pending.length > 0) logger.warn({ pending }, 'maintenance jobs have more work waiting');
  return { ...report, pending };
}

export async function countEscalated(districtCode: string | null): Promise<number> {
  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .select({ value: sql<number>`count(*)::int` })
      .from(problems)
      .where(
        and(
          inArray(problems.status, ['submitted', 'validated']),
          sql`${problems.escalatedAt} is not null`,
          districtCode ? eq(problems.districtCode, districtCode) : undefined,
        ),
      ),
  );
  return Number(row?.value ?? 0);
}
