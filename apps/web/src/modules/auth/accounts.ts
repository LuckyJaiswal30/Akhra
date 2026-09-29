import { and, count, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import {
  auditEvents,
  getDb,
  organizations,
  problems,
  statusEvents,
  users,
  withoutRls,
} from '@akhra/db';
import { Errors, ROLES, type Role } from '@akhra/shared';
import { notifyUsers } from '@/modules/notifications';
import { revokeAllClerkSessions } from '@/server/clerk';
import { logger } from '@/server/logger';
import type { Actor } from '@/server/session';
import { recordAudit } from './audit';
import { isUuid } from './tokens';

export const ACCOUNTS_PER_PAGE = 50;
const REMOVED_NOTE = 'Removed: the account that filed it was suspended.';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface AccountFilter {
  q?: string;
  role?: string;
  status?: string;
  page?: number;
}

export interface Account {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  status: 'active' | 'suspended';
  districtCode: string | null;
  jurisdictionCode: string | null;
  organizationName: string | null;
  createdAt: Date;
  profileComplete: boolean;
  reports: number;
  unreviewedReports: number;
  keptReports: number;
  removedReports: number;
  suspension: { reason: string | null; at: Date } | null;
}

export interface AccountList {
  accounts: Account[];
  total: number;
  page: number;
  pages: number;
  summary: { all: number; citizens: number; joinedThisWeek: number; suspended: number };
}

function requireSuperAdmin(actor: Actor): void {
  if (actor.role !== 'super_admin') {
    throw Errors.forbidden('Only a super administrator can manage accounts.');
  }
}

// Reports nobody has reviewed yet and nobody else follows: removing one takes nothing from anyone.
const removable = (submitterId: SQL | string) => sql`
  ${problems.submitterId} = ${submitterId}
  and ${problems.status} = 'submitted'
  and ${problems.isPublic} = true
  and not exists (select 1 from problems d where d.duplicate_of_id = ${problems.id})`;

// Reports taken down together with the account, not ones an officer turned down on their merits.
const removedWith = (submitterId: SQL | string) => sql`
  ${problems.submitterId} = ${submitterId}
  and ${problems.status} = 'rejected'
  and ${problems.isPublic} = false
  and exists (
    select 1 from status_events e
    where e.problem_id = ${problems.id} and e.to_status = 'rejected' and e.note = ${REMOVED_NOTE}
  )`;

export async function listAccounts(actor: Actor, filter: AccountFilter): Promise<AccountList> {
  requireSuperAdmin(actor);
  const db = getDb();
  const conditions: SQL[] = [];
  const q = filter.q?.trim();
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    conditions.push(or(ilike(users.name, pattern), ilike(users.email, pattern))!);
  }
  if (filter.role && (ROLES as readonly string[]).includes(filter.role)) {
    conditions.push(eq(users.role, filter.role as Role));
  }
  if (filter.status === 'active' || filter.status === 'suspended') {
    conditions.push(eq(users.status, filter.status));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(users).where(where);
  const pages = Math.max(1, Math.ceil(total / ACCOUNTS_PER_PAGE));
  const page = Math.min(Math.max(1, Math.floor(filter.page ?? 1)), pages);

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      phone: users.phone,
      districtCode: users.districtCode,
      jurisdictionCode: users.jurisdictionCode,
      privacyAcceptedAt: users.privacyAcceptedAt,
      organizationName: organizations.name,
      createdAt: users.createdAt,
      reports: sql<number>`(select count(*) from problems r where r.submitter_id = ${users.id})::int`,
      unreviewedReports: sql<number>`(select count(*) from problems where ${removable(sql`${users.id}`)})::int`,
      removedReports: sql<number>`(select count(*) from problems where ${removedWith(sql`${users.id}`)})::int`,
    })
    .from(users)
    .leftJoin(organizations, eq(users.organizationId, organizations.id))
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(ACCOUNTS_PER_PAGE)
    .offset((page - 1) * ACCOUNTS_PER_PAGE);

  const suspendedIds = rows.filter((row) => row.status === 'suspended').map((row) => row.id);
  const suspensions = suspendedIds.length
    ? await db
        .select({
          userId: auditEvents.targetUserId,
          metadata: auditEvents.metadata,
          at: auditEvents.createdAt,
        })
        .from(auditEvents)
        .where(
          and(
            eq(auditEvents.action, 'user.suspended'),
            inArray(auditEvents.targetUserId, suspendedIds),
          ),
        )
        .orderBy(desc(auditEvents.createdAt))
    : [];

  const [summary] = await db
    .select({
      all: count(),
      citizens: sql<number>`count(*) filter (where ${users.role} = 'citizen')::int`,
      joinedThisWeek: sql<number>`count(*) filter (where ${users.createdAt} >= ${new Date(Date.now() - WEEK_MS)})::int`,
      suspended: sql<number>`count(*) filter (where ${users.status} = 'suspended')::int`,
    })
    .from(users);

  return {
    accounts: rows.map(({ phone, privacyAcceptedAt, ...row }) => {
      const last = suspensions.find((entry) => entry.userId === row.id);
      const reason = last?.metadata?.reason;
      return {
        ...row,
        profileComplete:
          row.role !== 'citizen' || Boolean(phone && row.districtCode && privacyAcceptedAt),
        keptReports: row.reports - row.unreviewedReports - row.removedReports,
        suspension: last
          ? { reason: typeof reason === 'string' ? reason : null, at: last.at }
          : null,
      };
    }),
    total,
    page,
    pages,
    summary: {
      all: Number(summary?.all ?? 0),
      citizens: Number(summary?.citizens ?? 0),
      joinedThisWeek: Number(summary?.joinedThisWeek ?? 0),
      suspended: Number(summary?.suspended ?? 0),
    },
  };
}

export async function suspendAccount(
  actor: Actor,
  targetUserId: string,
  options: { reason?: string; removeReports: boolean },
): Promise<{ removedReports: number }> {
  requireSuperAdmin(actor);
  if (!isUuid(targetUserId)) throw Errors.notFound('That account could not be found.');
  if (targetUserId === actor.userId) throw Errors.conflict('You cannot suspend your own account.');

  const reason = options.reason?.trim() || null;
  const result = await withoutRls(getDb(), async (tx) => {
    const [target] = await tx
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        status: users.status,
        clerkUserId: users.clerkUserId,
      })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);
    if (!target) throw Errors.notFound('That account could not be found.');
    if (target.status === 'suspended') throw Errors.conflict('That account is already suspended.');
    if (target.role === 'super_admin') {
      const [others] = await tx
        .select({ value: count() })
        .from(users)
        .where(
          and(
            eq(users.role, 'super_admin'),
            eq(users.status, 'active'),
            sql`${users.id} <> ${target.id}`,
          ),
        );
      if (Number(others?.value ?? 0) === 0) {
        throw Errors.conflict('Akhra always needs one active super administrator.');
      }
    }

    await tx
      .update(users)
      .set({ status: 'suspended', updatedAt: new Date() })
      .where(eq(users.id, target.id));

    const removed = options.removeReports
      ? await tx
          .update(problems)
          .set({ status: 'rejected', isPublic: false, updatedAt: new Date() })
          .where(removable(target.id))
          .returning({ id: problems.id })
      : [];
    if (removed.length > 0) {
      await tx.insert(statusEvents).values(
        removed.map((report) => ({
          entityType: 'problem' as const,
          entityId: report.id,
          problemId: report.id,
          fromStatus: 'submitted',
          toStatus: 'rejected',
          actorId: actor.userId,
          actorLabel: actor.name,
          note: REMOVED_NOTE,
          isPublic: false,
        })),
      );
    }

    await recordAudit(
      {
        action: 'user.suspended',
        actorId: actor.userId,
        targetEmail: target.email,
        targetUserId: target.id,
        role: target.role,
        metadata: { reason, removedReports: removed.length },
      },
      tx,
    );
    return { clerkUserId: target.clerkUserId, removedReports: removed.length };
  });

  if (result.clerkUserId) {
    try {
      await revokeAllClerkSessions(result.clerkUserId);
    } catch (error) {
      // Akhra already refuses a suspended account on every request, so this only tidies Clerk.
      logger.warn(
        { err: error instanceof Error ? error.message : String(error), targetUserId },
        'Clerk sessions not revoked after suspension',
      );
    }
  }
  logger.info(
    { suspendedBy: actor.userId, userId: targetUserId, removed: result.removedReports },
    'account suspended',
  );
  return { removedReports: result.removedReports };
}

export async function reactivateAccount(actor: Actor, targetUserId: string): Promise<void> {
  requireSuperAdmin(actor);
  if (!isUuid(targetUserId)) throw Errors.notFound('That account could not be found.');

  const target = await withoutRls(getDb(), async (tx) => {
    const [row] = await tx
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        status: users.status,
        locale: users.locale,
      })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);
    if (!row) throw Errors.notFound('That account could not be found.');
    if (row.status === 'active') throw Errors.conflict('That account is already active.');

    await tx
      .update(users)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(users.id, row.id));
    const [removed] = await tx.select({ value: count() }).from(problems).where(removedWith(row.id));

    await recordAudit(
      {
        action: 'user.reactivated',
        actorId: actor.userId,
        targetEmail: row.email,
        targetUserId: row.id,
        role: row.role,
      },
      tx,
    );
    return { ...row, removedReports: Number(removed?.value ?? 0) };
  });

  // Removed reports stay removed: someone judged them fake. The person is told so, and how to
  // report a genuine problem again.
  await notifyUsers([target.id], reactivationNotice(target.locale, target.removedReports));
  logger.info({ reactivatedBy: actor.userId, userId: targetUserId }, 'account reactivated');
}

function reactivationNotice(locale: string, removedReports: number) {
  const hindi = locale === 'hi';
  const reports =
    removedReports === 0
      ? ''
      : hindi
        ? ` निलंबन के समय हटाई गई आपकी ${removedReports} रिपोर्ट हटी ही रहेंगी। अगर कोई समस्या सच में है, तो उसे फिर से दर्ज करें।`
        : ` The ${removedReports === 1 ? 'report' : `${removedReports} reports`} removed during the suspension stay removed. If a problem is real, you can report it again.`;
  return {
    type: 'account_reactivated',
    title: hindi ? 'आपका अखरा खाता फिर से सक्रिय है' : 'Your Akhra account is active again',
    body: hindi
      ? `आप फिर से साइन इन करके रिपोर्ट दर्ज कर सकते हैं।${reports}`
      : `You can sign in and report problems again.${reports}`,
    linkUrl: '/submit',
    linkLabel: hindi ? 'समस्या दर्ज करें' : 'Report a problem',
    email: true,
    locale: hindi ? 'hi' : 'en',
  };
}
