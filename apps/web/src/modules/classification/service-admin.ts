import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import {
  districts,
  getDb,
  organizations,
  problemRoutings,
  problems,
  statusEvents,
  withoutRls,
  type Transaction,
} from '@akhra/db';
import {
  canTransition,
  DISTRICT_BY_CODE,
  type Domain,
  type PriorityLevel,
  type PriorityReason,
  type ProblemStatus,
  type Role,
  Errors,
  STATUS_DEFINITIONS,
  transitionExists,
} from '@akhra/shared';
import { logger } from '@/server/logger';
import {
  notifyDistrictOfficers,
  notifyOrganizations,
  notifyReporter,
} from '@/modules/notifications';
import {
  ForbiddenError,
  assertCanAct,
  assertJurisdiction,
  query,
  type Actor,
} from '@/server/session';
import { refreshPriority } from './priority';
import { suggestOrganizations } from './routing';
import type { DuplicateMatch } from './service';

export async function transitionWithin(
  tx: Transaction,
  actor: Actor,
  problemId: string,
  toStatus: ProblemStatus,
  options: { note?: string; isPublic?: boolean } = {},
): Promise<void> {
  const [problem] = await tx
    .select({
      status: problems.status,
      districtCode: problems.districtCode,
      assignedOrgId: problems.assignedOrgId,
    })
    .from(problems)
    .where(eq(problems.id, problemId))
    .limit(1);

  if (!problem) throw new ForbiddenError('That report is not available to you');
  assertCanAct(actor, problem);

  const check = canTransition(problem.status, toStatus, actor.role as Role);
  if (!check.allowed) {
    if (!transitionExists(problem.status, toStatus)) {
      throw Errors.invalidTransition(
        `A report that is "${STATUS_DEFINITIONS[problem.status].labelEn}" cannot move directly to "${STATUS_DEFINITIONS[toStatus].labelEn}".`,
      );
    }
    throw new ForbiddenError(check.reason ?? 'Transition not permitted');
  }

  await tx
    .update(problems)
    .set({ status: toStatus, updatedAt: new Date() })
    .where(eq(problems.id, problemId));

  await tx.insert(statusEvents).values({
    entityType: 'problem',
    entityId: problemId,
    problemId,
    fromStatus: problem.status,
    toStatus,
    actorId: actor.userId,
    actorLabel: actor.name,
    note: options.note ?? null,
    isPublic: options.isPublic ?? true,
  });

  logger.info(
    { problemId, from: problem.status, to: toStatus, actorId: actor.userId },
    'problem status changed',
  );
}

async function transitionProblem(
  actor: Actor,
  problemId: string,
  toStatus: ProblemStatus,
  options: { note?: string; isPublic?: boolean } = {},
): Promise<void> {
  await query(actor, (tx) => transitionWithin(tx, actor, problemId, toStatus, options));
  if (options.isPublic ?? true) await notifyReporter(problemId, toStatus, options.note);
}

export async function validateProblem(
  actor: Actor,
  problemId: string,
  input: { domain?: Domain; note?: string },
): Promise<void> {
  await query(actor, async (tx) => {
    const [current] = await tx
      .select({ domain: problems.domain, districtCode: problems.districtCode })
      .from(problems)
      .where(eq(problems.id, problemId))
      .limit(1);
    if (!current) throw new ForbiddenError('That report is not available to you');
    assertJurisdiction(actor, current.districtCode);

    const isOverride = input.domain != null && input.domain !== current?.domain;

    await tx
      .update(problems)
      .set({
        validatedById: actor.userId,
        validatedAt: new Date(),
        ...(isOverride
          ? { domain: input.domain, classifiedBy: 'manual' as const, domainConfidence: 1 }
          : {}),
      })
      .where(eq(problems.id, problemId));
  });

  await transitionProblem(actor, problemId, 'validated', {
    note: input.note ?? 'Verified as a genuine, actionable challenge.',
  });
}

export async function rejectProblem(actor: Actor, problemId: string, note: string): Promise<void> {
  await transitionProblem(actor, problemId, 'rejected', { note });
}

export async function markAsDuplicate(
  actor: Actor,
  problemId: string,
  duplicateOfId: string,
  note?: string,
): Promise<void> {
  const [original] = await withoutRls(getDb(), (tx) =>
    tx
      .select({ refCode: problems.refCode })
      .from(problems)
      .where(eq(problems.id, duplicateOfId))
      .limit(1),
  );
  const mergeNote =
    note ??
    `Merged into ${original?.refCode ?? 'an existing report'}, which covers the same problem. Its updates will reach you here.`;
  await query(actor, async (tx) => {
    await tx.update(problems).set({ duplicateOfId }).where(eq(problems.id, problemId));
    await transitionWithin(tx, actor, problemId, 'duplicate', { note: mergeNote });
  });
  await withoutRls(getDb(), (tx) =>
    tx.update(problems).set({ duplicateOfId }).where(eq(problems.duplicateOfId, problemId)),
  );
  await withoutRls(getDb(), (tx) => refreshPriority(tx, duplicateOfId));
  await notifyReporter(problemId, 'duplicate', mergeNote);
}

export async function resolveProblem(actor: Actor, problemId: string, note: string): Promise<void> {
  await transitionProblem(actor, problemId, 'closed', { note });
}

export interface RouteResult {
  routed: { organizationId: string; name: string; matchScore: number }[];
}

export async function routeProblem(
  actor: Actor,
  problemId: string,
  organizationIds: string[],
  note?: string,
): Promise<RouteResult> {
  const routed = await query(actor, async (tx) => {
    const [problem] = await tx
      .select({ domain: problems.domain, districtCode: problems.districtCode })
      .from(problems)
      .where(eq(problems.id, problemId))
      .limit(1);

    if (!problem) throw new ForbiddenError('That report is not available to you');
    assertJurisdiction(actor, problem.districtCode);
    if (!problem.domain) {
      throw new ForbiddenError('Classify the report before routing it');
    }

    const suggestions = await suggestOrganizations({
      domain: problem.domain,
      districtCode: problem.districtCode,
      limit: 50,
    });
    const scoreById = new Map(suggestions.map((s) => [s.organizationId, s]));

    const targets = await tx
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(inArray(organizations.id, organizationIds));

    for (const target of targets) {
      const suggestion = scoreById.get(target.id);
      await tx
        .insert(problemRoutings)
        .values({
          problemId,
          organizationId: target.id,
          matchScore: suggestion?.matchScore ?? 0,
          matchRationale: suggestion?.rationale ?? 'Routed manually by an administrator',
          brief: note ?? null,
          routedById: actor.userId,
        })
        .onConflictDoNothing();
    }

    return targets.map((t) => ({
      organizationId: t.id,
      name: t.name,
      matchScore: scoreById.get(t.id)?.matchScore ?? 0,
    }));
  });

  await transitionProblem(actor, problemId, 'routed', {
    note: note ?? `Sent to ${routed.map((r) => r.name).join(', ')} for review.`,
  });

  await notifyOrganizations(
    routed.map((r) => r.organizationId),
    ['university_admin', 'faculty'],
    {
      type: 'referral',
      title: 'A new challenge has been routed to your institution',
      body: note,
      linkUrl: '/university',
      email: true,
    },
  );

  return { routed };
}

const NO_DEPARTMENT = '00000000-0000-0000-0000-000000000000';
const MAX_TRANSFERS = 2;

export interface QueueItem {
  id: string;
  refCode: string;
  title: string;
  description: string;
  domain: Domain | null;
  domainConfidence: number | null;
  classifiedBy: string | null;
  status: ProblemStatus;
  districtCode: string;
  districtName: string;
  submitterName: string;
  createdAt: Date;
  routingCount: number;
  escalatedAt: Date | null;
  duplicateCandidates: DuplicateMatch[] | null;
  dueAt: Date | null;
  assignedOrgName: string | null;
  reopenCount: number;
  transferredFromCode: string | null;
  priority: PriorityLevel;
  priorityReasons: PriorityReason[];
  supportCount: number;
}

export async function listValidationQueue(
  actor: Actor,
  status: ProblemStatus = 'submitted',
): Promise<QueueItem[]> {
  return query(actor, async (tx) => {
    const rows = await tx
      .select({
        id: problems.id,
        refCode: problems.refCode,
        title: problems.title,
        description: problems.description,
        domain: problems.domain,
        domainConfidence: problems.domainConfidence,
        classifiedBy: problems.classifiedBy,
        status: problems.status,
        districtCode: problems.districtCode,
        districtName: districts.nameEn,
        submitterName: problems.submitterName,
        createdAt: problems.createdAt,
        escalatedAt: problems.escalatedAt,
        duplicateCandidates: problems.duplicateCandidates,
        dueAt: problems.dueAt,
        assignedOrgName: organizations.name,
        reopenCount: problems.reopenCount,
        transferredFromCode: problems.transferredFromCode,
        priority: problems.priority,
        priorityReasons: problems.priorityReasons,
        supportCount: problems.supportCount,
        routingCount: sql<number>`(select count(*) from ${problemRoutings} where ${problemRoutings.problemId} = ${problems.id})::int`,
      })
      .from(problems)
      .innerJoin(districts, eq(problems.districtCode, districts.code))
      .leftJoin(organizations, eq(problems.assignedOrgId, organizations.id))
      .where(
        and(
          eq(problems.status, status),
          actor.role === 'gov_admin' && actor.jurisdiction
            ? eq(problems.districtCode, actor.jurisdiction)
            : undefined,
          actor.role === 'dept_officer'
            ? eq(problems.assignedOrgId, actor.organizationId ?? NO_DEPARTMENT)
            : undefined,
        ),
      )
      .orderBy(desc(problems.priorityScore), asc(problems.createdAt))
      .limit(100);

    return rows;
  });
}

export async function transferDistrict(
  actor: Actor,
  problemId: string,
  toDistrictCode: string,
  reason: string,
): Promise<void> {
  if (actor.role === 'dept_officer') {
    throw new ForbiddenError('Only a district officer can move a report to another district.');
  }

  await query(actor, async (tx) => {
    const [problem] = await tx
      .select({
        status: problems.status,
        districtCode: problems.districtCode,
        assignedOrgId: problems.assignedOrgId,
        transferCount: problems.transferCount,
        refCode: problems.refCode,
      })
      .from(problems)
      .where(eq(problems.id, problemId))
      .limit(1);
    if (!problem) throw new ForbiddenError('That report is not available to you');
    assertJurisdiction(actor, problem.districtCode);

    if (problem.districtCode === toDistrictCode) {
      throw Errors.invalidTransition('That report is already in this district.');
    }
    if (!DISTRICT_BY_CODE[toDistrictCode]) {
      throw Errors.notFound('That district could not be found.');
    }
    if (problem.status !== 'submitted' && problem.status !== 'validated') {
      throw Errors.invalidTransition(
        'A report can only be moved before a department has been asked to act on it.',
      );
    }
    if (problem.transferCount >= MAX_TRANSFERS) {
      throw Errors.invalidTransition(
        'This report has already been moved twice. Resolve it or reject it with a reason.',
      );
    }

    const now = new Date();
    await tx
      .update(problems)
      .set({
        districtCode: toDistrictCode,
        blockName: null,
        lat: null,
        lng: null,
        transferredFromCode: problem.districtCode,
        transferredAt: now,
        transferredById: actor.userId,
        transferCount: problem.transferCount + 1,
        escalatedAt: null,
        updatedAt: now,
      })
      .where(eq(problems.id, problemId));

    await tx.insert(statusEvents).values({
      entityType: 'problem',
      entityId: problemId,
      problemId,
      fromStatus: problem.status,
      toStatus: problem.status,
      actorId: actor.userId,
      actorLabel: actor.name,
      note: `Moved from ${DISTRICT_BY_CODE[problem.districtCode]?.nameEn ?? problem.districtCode} to ${DISTRICT_BY_CODE[toDistrictCode]?.nameEn ?? toDistrictCode}: ${reason}`,
      isPublic: true,
    });

    logger.info(
      { problemId, from: problem.districtCode, to: toDistrictCode, actorId: actor.userId },
      'report moved to another district',
    );
  });

  await announceTransfer(toDistrictCode, problemId);
}

async function announceTransfer(districtCode: string, problemId: string): Promise<void> {
  const [problem] = await withoutRls(getDb(), (tx) =>
    tx
      .select({ refCode: problems.refCode, title: problems.title })
      .from(problems)
      .where(eq(problems.id, problemId))
      .limit(1),
  );
  if (!problem) return;

  await notifyDistrictOfficers(districtCode, {
    type: 'report_transferred',
    title: `A report has been moved to your district: ${problem.refCode}`,
    body: `"${problem.title}" was reported under another district and has been moved to yours for triage.`,
    linkUrl: '/government/queue',
    email: true,
  });
}
