import { and, asc, count, desc, eq, ilike, ne, or } from 'drizzle-orm';
import {
  districts,
  getDb,
  users,
  withoutRls,
  organizations,
  problemAttachments,
  problemRoutings,
  projects,
  type Transaction,
  problems,
  statusEvents,
} from '@akhra/db';
import type { ProblemFilter, ProblemStatus } from '@akhra/shared';
import { queryAsAnonymous, query, type Actor } from '@/server/session';

export interface ProblemSummary {
  id: string;
  refCode: string;
  title: string;
  domain: string | null;
  status: ProblemStatus;
  districtCode: string;
  districtName: string;
  supportCount: number;
  createdAt: Date;
}

export interface TrackedProblem extends ProblemSummary {
  description: string;
  blockName: string | null;
  timeline: {
    id: string;
    toStatus: string;
    note: string | null;
    actorLabel: string | null;
    createdAt: Date;
  }[];
  routedTo: { name: string; response: string }[];
  dueAt: Date | null;
  actionTakenAt: Date | null;
  actionTakenNote: string | null;
  assignedOrgName: string | null;
  reopenCount: number;
  resolutionTrack: 'department' | 'research' | null;
  submitterId: string | null;
  mergedInto: { refCode: string; title: string; status: string } | null;
}

const summaryColumns = {
  id: problems.id,
  refCode: problems.refCode,
  title: problems.title,
  domain: problems.domain,
  status: problems.status,
  districtCode: problems.districtCode,
  districtName: districts.nameEn,
  supportCount: problems.supportCount,
  createdAt: problems.createdAt,
};

/** An ILIKE pattern that matches the text literally: % and _ typed by a visitor are not wildcards. */
function containing(text: string): string {
  return `%${text.replace(/[\\%_]/g, '\\$&')}%`;
}

export async function listProblems(
  actor: Actor,
  filter: ProblemFilter,
): Promise<{ items: ProblemSummary[]; total: number }> {
  const conditions = [
    filter.domain ? eq(problems.domain, filter.domain) : undefined,
    filter.districtCode ? eq(problems.districtCode, filter.districtCode) : undefined,
    filter.status ? eq(problems.status, filter.status) : ne(problems.status, 'duplicate'),
    filter.q
      ? or(
          ilike(problems.title, containing(filter.q)),
          ilike(problems.description, containing(filter.q)),
        )
      : undefined,
  ].filter(Boolean);

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return query(actor, async (tx) => {
    const items = await tx
      .select(summaryColumns)
      .from(problems)
      .innerJoin(districts, eq(problems.districtCode, districts.code))
      .where(where)
      .orderBy(desc(problems.createdAt))
      .limit(filter.pageSize)
      .offset((filter.page - 1) * filter.pageSize);

    const [totals] = await tx.select({ value: count() }).from(problems).where(where);

    return { items: items as ProblemSummary[], total: totals?.value ?? 0 };
  });
}

export async function trackByRefCode(refCode: string): Promise<TrackedProblem | null> {
  return queryAsAnonymous(async (tx) => {
    const [problem] = await tx
      .select({
        ...summaryColumns,
        description: problems.description,
        blockName: problems.blockName,
        submitterName: problems.submitterName,
        dueAt: problems.dueAt,
        actionTakenAt: problems.actionTakenAt,
        actionTakenNote: problems.actionTakenNote,
        assignedOrgName: organizations.name,
        reopenCount: problems.reopenCount,
        resolutionTrack: problems.resolutionTrack,
        submitterId: problems.submitterId,
        duplicateOfId: problems.duplicateOfId,
      })
      .from(problems)
      .innerJoin(districts, eq(problems.districtCode, districts.code))
      .leftJoin(organizations, eq(problems.assignedOrgId, organizations.id))
      .where(eq(problems.refCode, refCode.trim().toUpperCase()))
      .limit(1);

    if (!problem) return null;

    const timeline = await tx
      .select({
        id: statusEvents.id,
        toStatus: statusEvents.toStatus,
        note: statusEvents.note,
        actorLabel: statusEvents.actorLabel,
        createdAt: statusEvents.createdAt,
      })
      .from(statusEvents)
      .where(and(eq(statusEvents.problemId, problem.id), eq(statusEvents.isPublic, true)))
      .orderBy(asc(statusEvents.createdAt));

    const routedTo = await tx
      .select({ name: organizations.name, response: problemRoutings.response })
      .from(problemRoutings)
      .innerJoin(organizations, eq(problemRoutings.organizationId, organizations.id))
      .where(eq(problemRoutings.problemId, problem.id));

    const { duplicateOfId, submitterName, ...tracked } = problem;
    // The public timeline names officers and teams, never the citizen who reported the problem.
    const publicTimeline = timeline.map((event) =>
      event.actorLabel === submitterName ? { ...event, actorLabel: null } : event,
    );
    const [mergedInto] =
      problem.status === 'duplicate' && duplicateOfId
        ? await tx
            .select({ refCode: problems.refCode, title: problems.title, status: problems.status })
            .from(problems)
            .where(eq(problems.id, duplicateOfId))
            .limit(1)
        : [];

    return {
      ...tracked,
      timeline: publicTimeline,
      routedTo,
      mergedInto: mergedInto ?? null,
    } as TrackedProblem;
  });
}

export async function listOwnReports(actor: Actor): Promise<ProblemSummary[]> {
  if (!actor.userId) return [];
  const userId = actor.userId;
  return query(actor, async (tx) => {
    const rows = await tx
      .select(summaryColumns)
      .from(problems)
      .innerJoin(districts, eq(problems.districtCode, districts.code))
      .where(eq(problems.submitterId, userId))
      .orderBy(desc(problems.createdAt));
    return rows as ProblemSummary[];
  });
}

export interface ReporterProfile {
  name: string | null;
  email: string;
  phone: string | null;
  districtCode: string | null;
  locality: string | null;
}

export async function getReporterProfile(actor: Actor): Promise<ReporterProfile | null> {
  const userId = actor.userId;
  if (!userId) return null;
  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .select({
        name: users.name,
        email: users.email,
        phone: users.phone,
        districtCode: users.districtCode,
        locality: users.locality,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
  );
  return row ?? null;
}

export interface ProblemFile {
  id: string;
  kind: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
}

async function mayReadProblemFiles(
  tx: Transaction,
  actor: Actor,
  problem: {
    id: string;
    districtCode: string;
    submitterId: string | null;
    assignedOrgId: string | null;
  },
): Promise<boolean> {
  if (!actor.userId) return false;
  if (actor.role === 'super_admin') return true;
  if (actor.role === 'gov_admin')
    return !actor.jurisdiction || actor.jurisdiction === problem.districtCode;
  if (actor.role === 'dept_officer')
    return actor.organizationId != null && problem.assignedOrgId === actor.organizationId;
  if (problem.submitterId === actor.userId) return true;
  if (!actor.organizationId) return false;
  const [routed] = await tx
    .select({ id: problemRoutings.id })
    .from(problemRoutings)
    .where(
      and(
        eq(problemRoutings.problemId, problem.id),
        eq(problemRoutings.organizationId, actor.organizationId),
      ),
    )
    .limit(1);
  if (routed) return true;
  const [project] = await tx
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(eq(projects.problemId, problem.id), eq(projects.organizationId, actor.organizationId)),
    )
    .limit(1);
  return Boolean(project);
}

const problemAccessColumns = {
  id: problems.id,
  districtCode: problems.districtCode,
  submitterId: problems.submitterId,
  assignedOrgId: problems.assignedOrgId,
};

export async function listProblemFiles(actor: Actor, problemId: string): Promise<ProblemFile[]> {
  return withoutRls(getDb(), async (tx) => {
    const [problem] = await tx
      .select(problemAccessColumns)
      .from(problems)
      .where(eq(problems.id, problemId))
      .limit(1);
    if (!problem || !(await mayReadProblemFiles(tx, actor, problem))) return [];
    return tx
      .select({
        id: problemAttachments.id,
        kind: problemAttachments.kind,
        storageKey: problemAttachments.storageKey,
        originalName: problemAttachments.originalName,
        mimeType: problemAttachments.mimeType,
      })
      .from(problemAttachments)
      .where(eq(problemAttachments.problemId, problemId));
  });
}

export async function canReadAttachment(actor: Actor, storageKey: string): Promise<boolean> {
  if (!actor.userId) return false;
  return withoutRls(getDb(), async (tx) => {
    const [file] = await tx
      .select({
        problemId: problemAttachments.problemId,
        uploadedById: problemAttachments.uploadedById,
      })
      .from(problemAttachments)
      .where(eq(problemAttachments.storageKey, storageKey))
      .limit(1);
    if (!file) return false;
    if (file.uploadedById === actor.userId) return true;
    if (!file.problemId) return false;
    const [problem] = await tx
      .select(problemAccessColumns)
      .from(problems)
      .where(eq(problems.id, file.problemId))
      .limit(1);
    return problem ? mayReadProblemFiles(tx, actor, problem) : false;
  });
}
