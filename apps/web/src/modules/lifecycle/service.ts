import { and, asc, desc, eq } from 'drizzle-orm';
import type { z } from 'zod';
import {
  documents,
  milestones,
  outcomes,
  problems,
  projectMembers,
  projects,
  projectTests,
  users,
} from '@akhra/db';
import {
  allowedTransitions,
  Errors,
  PROJECT_PLANNING_STATUS,
  type IpStatus,
  type MilestoneStatus,
  type outcomeSchema,
  type OutcomeType,
  type projectTestSchema,
  type TestResult,
  type ProblemStatus,
  type Role,
} from '@akhra/shared';
import { transitionWithin } from '@/modules/classification';
import {
  notifyDistrictOfficers,
  notifyOrganizations,
  notifyReporter,
  notifyReporterUpdate,
} from '@/modules/notifications';
import { logger } from '@/server/logger';
import { canOverseeDistrict, ForbiddenError, query, type Actor } from '@/server/session';

const PROJECT_STAGES: readonly ProblemStatus[] = [
  'in_progress',
  'prototyped',
  'piloted',
  'deployed',
  'closed',
  'on_hold',
];

const MILESTONE_TRANSITIONS: Record<
  'owner' | 'admin',
  Partial<Record<MilestoneStatus, readonly MilestoneStatus[]>>
> = {
  owner: {
    pending: ['in_progress'],
    in_progress: ['submitted'],
    rejected: ['in_progress'],
  },
  admin: {
    submitted: ['approved', 'rejected'],
  },
};

export interface ProjectAccess {
  organizationId: string;
  problemId: string;
  districtCode: string;
  status: ProblemStatus;
  problemStatus: ProblemStatus;
  isOwner: boolean;
  onTeam: boolean;
  isOverseer: boolean;
}

type Tx = Parameters<Parameters<typeof query>[1]>[0];

async function loadAccess(tx: Tx, actor: Actor, projectId: string): Promise<ProjectAccess> {
  const [row] = await tx
    .select({
      organizationId: projects.organizationId,
      problemId: projects.problemId,
      districtCode: problems.districtCode,
      status: projects.status,
      problemStatus: problems.status,
    })
    .from(projects)
    .innerJoin(problems, eq(projects.problemId, problems.id))
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!row) throw new ForbiddenError('That project is not available to you');

  const inOwningOrganization =
    actor.organizationId != null && actor.organizationId === row.organizationId;

  return {
    ...row,
    isOwner: inOwningOrganization && actor.role !== 'student',
    onTeam: inOwningOrganization && (await isOnTeam(tx, actor, projectId)),
    isOverseer: canOverseeDistrict(actor, row.districtCode),
  };
}

async function isOnTeam(tx: Tx, actor: Actor, projectId: string): Promise<boolean> {
  if (!actor.userId) return false;
  const [row] = await tx
    .select({ id: projectMembers.id })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, actor.userId)))
    .limit(1);
  return row !== undefined;
}

function requireContributorOrOverseer(access: ProjectAccess): void {
  if (!access.isOwner && !access.onTeam && !access.isOverseer) {
    throw new ForbiddenError('Only the project team or the district’s officer can do this');
  }
}

function requireTeamOrOverseer(access: ProjectAccess): void {
  if (!access.isOwner && !access.isOverseer) {
    throw new ForbiddenError('Only the project team or the district’s officer can do this');
  }
}

function requireUnderway(access: ProjectAccess): void {
  if (access.status === PROJECT_PLANNING_STATUS) {
    throw Errors.conflict(
      'Work starts once the district officer approves the proposal. Until then only the proposal can change.',
    );
  }
}

export interface MilestoneRecord {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  status: MilestoneStatus;
  dueDate: Date | null;
  completedAt: Date | null;
  nextStatuses: MilestoneStatus[];
}

export interface DocumentRecord {
  id: string;
  title: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  milestoneId: string | null;
  uploadedBy: string | null;
  createdAt: Date;
}

export interface OutcomeRecord {
  id: string;
  outcomeType: OutcomeType;
  title: string;
  detail: string | null;
  evidenceUrl: string | null;
  impactMetricName: string | null;
  impactMetricValue: string | null;
  reference: string | null;
  ipStatus: IpStatus | null;
  recordedAt: Date;
}

export interface TestRecord {
  id: string;
  title: string;
  method: string;
  result: TestResult;
  findings: string;
  conductedOn: Date;
  milestoneTitle: string | null;
  recordedBy: string | null;
}

export interface Lifecycle {
  organizationId: string;
  status: ProblemStatus;
  underway: boolean;
  nextStatuses: ProblemStatus[];
  canManage: boolean;
  canContribute: boolean;
  canAddDocument: boolean;
  canApprove: boolean;
  milestones: MilestoneRecord[];
  documents: DocumentRecord[];
  tests: TestRecord[];
  outcomes: OutcomeRecord[];
}

export async function getLifecycle(actor: Actor, projectId: string): Promise<Lifecycle> {
  return query(actor, async (tx) => {
    const access = await loadAccess(tx, actor, projectId);
    const viewerKind = access.isOverseer
      ? 'admin'
      : access.isOwner || access.onTeam
        ? 'owner'
        : null;

    const milestoneRows = await tx
      .select({
        id: milestones.id,
        title: milestones.title,
        description: milestones.description,
        orderIndex: milestones.orderIndex,
        status: milestones.status,
        dueDate: milestones.dueDate,
        completedAt: milestones.completedAt,
      })
      .from(milestones)
      .where(eq(milestones.projectId, projectId))
      .orderBy(asc(milestones.orderIndex), asc(milestones.createdAt));

    const documentRows = await tx
      .select({
        id: documents.id,
        title: documents.title,
        originalName: documents.originalName,
        mimeType: documents.mimeType,
        sizeBytes: documents.sizeBytes,
        storageKey: documents.storageKey,
        milestoneId: documents.milestoneId,
        uploadedBy: users.name,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .leftJoin(users, eq(documents.uploadedById, users.id))
      .where(eq(documents.projectId, projectId))
      .orderBy(desc(documents.createdAt));

    const outcomeRows = await tx
      .select({
        id: outcomes.id,
        outcomeType: outcomes.outcomeType,
        title: outcomes.title,
        detail: outcomes.detail,
        evidenceUrl: outcomes.evidenceUrl,
        impactMetricName: outcomes.impactMetricName,
        impactMetricValue: outcomes.impactMetricValue,
        reference: outcomes.reference,
        ipStatus: outcomes.ipStatus,
        recordedAt: outcomes.recordedAt,
      })
      .from(outcomes)
      .where(eq(outcomes.projectId, projectId))
      .orderBy(desc(outcomes.recordedAt));

    const testRows = await tx
      .select({
        id: projectTests.id,
        title: projectTests.title,
        method: projectTests.method,
        result: projectTests.result,
        findings: projectTests.findings,
        conductedOn: projectTests.conductedOn,
        milestoneTitle: milestones.title,
        recordedBy: users.name,
      })
      .from(projectTests)
      .leftJoin(milestones, eq(projectTests.milestoneId, milestones.id))
      .leftJoin(users, eq(projectTests.recordedById, users.id))
      .where(eq(projectTests.projectId, projectId))
      .orderBy(desc(projectTests.conductedOn));

    const underway = access.status !== PROJECT_PLANNING_STATUS;
    const canManage = underway && (access.isOwner || access.isOverseer);
    const canContribute = underway && (canManage || access.onTeam);
    const canAddDocument = access.isOwner || access.onTeam || access.isOverseer;
    const nextStatuses = canManage
      ? allowedTransitions(access.problemStatus, actor.role as Role).filter((s) =>
          PROJECT_STAGES.includes(s),
        )
      : [];

    return {
      organizationId: access.organizationId,
      status: access.problemStatus,
      nextStatuses,
      underway,
      canManage,
      canContribute,
      canAddDocument,
      canApprove: access.isOverseer,
      milestones: milestoneRows.map((m) => ({
        ...m,
        nextStatuses:
          underway && viewerKind ? [...(MILESTONE_TRANSITIONS[viewerKind][m.status] ?? [])] : [],
      })),
      documents: documentRows,
      tests: testRows,
      outcomes: outcomeRows,
    };
  });
}

export async function createMilestone(
  actor: Actor,
  projectId: string,
  input: { title: string; description?: string; dueDate?: Date; orderIndex: number },
): Promise<void> {
  await query(actor, async (tx) => {
    const access = await loadAccess(tx, actor, projectId);
    if (!access.isOwner) throw new ForbiddenError('Only the project team can plan milestones');
    requireUnderway(access);

    await tx.insert(milestones).values({
      projectId,
      title: input.title,
      description: input.description ?? null,
      dueDate: input.dueDate ?? null,
      orderIndex: input.orderIndex,
    });
  });
}

export async function updateMilestoneStatus(
  actor: Actor,
  milestoneId: string,
  toStatus: MilestoneStatus,
): Promise<void> {
  const changed = await query(actor, async (tx) => {
    const [milestone] = await tx
      .select({
        projectId: milestones.projectId,
        status: milestones.status,
        title: milestones.title,
      })
      .from(milestones)
      .where(eq(milestones.id, milestoneId))
      .limit(1);
    if (!milestone) throw new ForbiddenError('That milestone is not available to you');

    const access = await loadAccess(tx, actor, milestone.projectId);
    requireUnderway(access);
    const kind = access.isOverseer ? 'admin' : access.isOwner || access.onTeam ? 'owner' : null;
    const permitted = kind ? (MILESTONE_TRANSITIONS[kind][milestone.status] ?? []) : [];

    if (!permitted.includes(toStatus)) {
      throw new ForbiddenError(
        `A milestone cannot move from ${milestone.status} to ${toStatus} here`,
      );
    }

    await tx
      .update(milestones)
      .set({
        status: toStatus,
        completedAt: toStatus === 'approved' ? new Date() : null,
        approvedById: toStatus === 'approved' ? actor.userId : null,
      })
      .where(eq(milestones.id, milestoneId));

    logger.info({ milestoneId, from: milestone.status, to: toStatus }, 'milestone status changed');
    const [project] = await tx
      .select({ problemId: projects.problemId })
      .from(projects)
      .where(eq(projects.id, milestone.projectId))
      .limit(1);
    return {
      projectId: milestone.projectId,
      title: milestone.title,
      organizationId: access.organizationId,
      districtCode: access.districtCode,
      problemId: project?.problemId ?? null,
    };
  });

  const linkUrl = `/projects/${changed.projectId}`;
  if (toStatus === 'submitted') {
    await notifyDistrictOfficers(changed.districtCode, {
      type: 'milestone_submitted',
      title: `Milestone ready for approval: ${changed.title}`,
      linkUrl,
    });
  } else if (toStatus === 'approved' || toStatus === 'rejected') {
    if (toStatus === 'approved' && changed.problemId) {
      await notifyReporterUpdate(
        changed.problemId,
        {
          type: 'milestone_reached',
          title: 'A step on your report is complete',
          body: `The team has completed: ${changed.title}.`,
        },
        {
          title: 'आपकी रिपोर्ट पर एक चरण पूरा हुआ',
          body: `टीम ने यह काम पूरा कर लिया है: ${changed.title}।`,
        },
      );
    }
    await notifyOrganizations([changed.organizationId], ['university_admin', 'faculty'], {
      type: `milestone_${toStatus}`,
      title:
        toStatus === 'approved'
          ? `Milestone approved: ${changed.title}`
          : `Milestone sent back: ${changed.title}`,
      linkUrl,
      email: true,
    });
  }
}

export async function advanceProject(
  actor: Actor,
  projectId: string,
  toStatus: ProblemStatus,
  note?: string,
): Promise<void> {
  const access = await query(actor, (tx) => loadAccess(tx, actor, projectId));
  requireTeamOrOverseer(access);
  requireUnderway(access);

  if (!PROJECT_STAGES.includes(toStatus)) {
    throw new ForbiddenError('That stage is not part of a project lifecycle');
  }

  await query(actor, async (tx) => {
    await transitionWithin(tx, actor, access.problemId, toStatus, { note });
    await tx
      .update(projects)
      .set({
        status: toStatus,
        updatedAt: new Date(),
        completedAt: toStatus === 'closed' ? new Date() : null,
      })
      .where(eq(projects.id, projectId));
  });
  await notifyReporter(access.problemId, toStatus, note);

  logger.info({ projectId, to: toStatus }, 'project advanced');
}

export async function recordDocument(
  actor: Actor,
  projectId: string,
  file: {
    title: string;
    storageKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    milestoneId?: string;
  },
): Promise<{ id: string }> {
  return query(actor, async (tx) => {
    const access = await loadAccess(tx, actor, projectId);
    requireContributorOrOverseer(access);

    if (file.milestoneId) {
      const [owned] = await tx
        .select({ id: milestones.id })
        .from(milestones)
        .where(and(eq(milestones.id, file.milestoneId), eq(milestones.projectId, projectId)))
        .limit(1);
      if (!owned) throw new ForbiddenError('That milestone belongs to a different project');
    }

    const [row] = await tx
      .insert(documents)
      .values({
        projectId,
        milestoneId: file.milestoneId ?? null,
        title: file.title,
        storageKey: file.storageKey,
        originalName: file.originalName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        uploadedById: actor.userId,
      })
      .returning({ id: documents.id });

    if (!row) throw new Error('Could not record the document');
    return row;
  });
}

export async function canAccessDocument(actor: Actor, storageKey: string): Promise<boolean> {
  const rows = await query(actor, (tx) =>
    tx
      .select({ id: documents.id })
      .from(documents)
      .where(eq(documents.storageKey, storageKey))
      .limit(1),
  );
  return rows.length > 0;
}

export async function recordOutcome(
  actor: Actor,
  projectId: string,
  input: OutcomeInput,
): Promise<void> {
  await query(actor, async (tx) => {
    const access = await loadAccess(tx, actor, projectId);
    requireTeamOrOverseer(access);
    requireUnderway(access);

    await tx.insert(outcomes).values({
      projectId,
      outcomeType: input.outcomeType,
      title: input.title,
      detail: input.detail ?? null,
      evidenceUrl: input.evidenceUrl || null,
      impactMetricName: input.impactMetricName ?? null,
      impactMetricValue: input.impactMetricValue?.toString() ?? null,
      reference: input.reference || null,
      ipStatus: input.ipStatus ?? null,
      recordedById: actor.userId,
    });

    logger.info({ projectId, outcomeType: input.outcomeType }, 'outcome recorded');
  });
}

export type OutcomeInput = z.output<typeof outcomeSchema>;
export type ProjectTestInput = z.output<typeof projectTestSchema>;

export async function recordTest(
  actor: Actor,
  projectId: string,
  input: ProjectTestInput,
): Promise<void> {
  await query(actor, async (tx) => {
    const access = await loadAccess(tx, actor, projectId);
    requireTeamOrOverseer(access);
    requireUnderway(access);

    if (input.milestoneId) {
      const [owned] = await tx
        .select({ id: milestones.id })
        .from(milestones)
        .where(and(eq(milestones.id, input.milestoneId), eq(milestones.projectId, projectId)))
        .limit(1);
      if (!owned) throw new ForbiddenError('That milestone belongs to a different project');
    }

    await tx.insert(projectTests).values({
      projectId,
      milestoneId: input.milestoneId ?? null,
      title: input.title,
      method: input.method,
      result: input.result,
      findings: input.findings,
      conductedOn: input.conductedOn,
      recordedById: actor.userId,
    });
  });
  logger.info({ projectId, result: input.result }, 'project test recorded');
}

export async function assertCanAddDocument(actor: Actor, projectId: string): Promise<void> {
  await query(actor, async (tx) =>
    requireContributorOrOverseer(await loadAccess(tx, actor, projectId)),
  );
}
