import { and, eq, sql } from 'drizzle-orm';
import { districts, organizations, problems, projects, proposals } from '@akhra/db';
import { Errors, PROJECT_PLANNING_STATUS, type Domain, type ProposalDecision } from '@akhra/shared';
import { transitionWithin } from '@/modules/classification';
import { notifyOrganizations, notifyReporter } from '@/modules/notifications';
import { logger } from '@/server/logger';
import { canOverseeDistrict, ForbiddenError, isAdmin, query, type Actor } from '@/server/session';

export interface ProposalForReview {
  proposalId: string;
  version: number;
  abstract: string;
  methodology: string;
  expectedOutcomes: string;
  timelineMonths: number;
  budgetEstimate: string | null;
  submittedAt: Date;
  projectId: string;
  projectTitle: string;
  organizationName: string;
  refCode: string;
  problemTitle: string;
  domain: Domain | null;
  districtCode: string;
  districtName: string;
  districtNameHi: string;
}

const DECISION_MESSAGE: Record<ProposalDecision, (project: string) => string> = {
  approved: (project) => `Proposal approved: ${project}`,
  revision_requested: (project) => `Changes requested on your proposal: ${project}`,
  rejected: (project) => `Proposal not approved: ${project}`,
};

/** The latest submitted version of each proposal in the officer's district, oldest first. */
export async function listProposalsForReview(actor: Actor): Promise<ProposalForReview[]> {
  if (!isAdmin(actor)) throw new ForbiddenError('Only a government officer can review proposals.');

  const latestVersion = sql`${proposals.version} = (
    select max(p2.version) from proposals p2 where p2.project_id = ${proposals.projectId}
  )`;

  return query(actor, (tx) =>
    tx
      .select({
        proposalId: proposals.id,
        version: proposals.version,
        abstract: proposals.abstract,
        methodology: proposals.methodology,
        expectedOutcomes: proposals.expectedOutcomes,
        timelineMonths: proposals.timelineMonths,
        budgetEstimate: proposals.budgetEstimate,
        submittedAt: proposals.createdAt,
        projectId: projects.id,
        projectTitle: projects.title,
        organizationName: organizations.name,
        refCode: problems.refCode,
        problemTitle: problems.title,
        domain: problems.domain,
        districtCode: problems.districtCode,
        districtName: districts.nameEn,
        districtNameHi: districts.nameHi,
      })
      .from(proposals)
      .innerJoin(projects, eq(proposals.projectId, projects.id))
      .innerJoin(organizations, eq(projects.organizationId, organizations.id))
      .innerJoin(problems, eq(projects.problemId, problems.id))
      .innerJoin(districts, eq(problems.districtCode, districts.code))
      .where(
        and(
          eq(proposals.status, 'submitted'),
          eq(projects.status, PROJECT_PLANNING_STATUS),
          latestVersion,
          actor.jurisdiction ? eq(problems.districtCode, actor.jurisdiction) : undefined,
        ),
      )
      .orderBy(proposals.createdAt)
      .limit(100),
  );
}

/**
 * Records the district officer's decision on the latest submitted version of a proposal.
 *
 * Approval is what lets work begin: the project leaves planning and the report moves to "research in
 * progress", which the citizen sees on their tracker. A request for changes or a refusal keeps the
 * project in planning and tells the team why, so they can submit a new version.
 */
export async function reviewProposal(
  actor: Actor,
  proposalId: string,
  input: { decision: ProposalDecision; note?: string },
): Promise<void> {
  if (!isAdmin(actor)) throw new ForbiddenError('Only a government officer can review proposals.');

  const target = await query(actor, async (tx) => {
    const [row] = await tx
      .select({
        projectId: proposals.projectId,
        version: proposals.version,
        status: proposals.status,
        projectStatus: projects.status,
        projectTitle: projects.title,
        organizationId: projects.organizationId,
        problemId: projects.problemId,
        districtCode: problems.districtCode,
        latestVersion: sql<number>`(
          select max(p2.version) from proposals p2 where p2.project_id = ${proposals.projectId}
        )`,
      })
      .from(proposals)
      .innerJoin(projects, eq(proposals.projectId, projects.id))
      .innerJoin(problems, eq(projects.problemId, problems.id))
      .where(eq(proposals.id, proposalId))
      .limit(1);
    return row ?? null;
  });

  if (!target) throw Errors.notFound('That proposal could not be found.');
  if (!canOverseeDistrict(actor, target.districtCode)) {
    throw new ForbiddenError(
      'This proposal is for a report in another district. Only that district’s officer can review it.',
    );
  }
  if (
    target.status !== 'submitted' ||
    target.version !== target.latestVersion ||
    target.projectStatus !== PROJECT_PLANNING_STATUS
  ) {
    throw Errors.conflict('Only the latest submitted version of a proposal can be reviewed.');
  }

  const approvalNote =
    'The district officer approved the university team’s proposal. Work has begun.';

  await query(actor, async (tx) => {
    const reviewed = await tx
      .update(proposals)
      .set({
        status: input.decision,
        reviewNote: input.note ?? null,
        reviewedById: actor.userId,
        reviewedAt: new Date(),
      })
      .where(and(eq(proposals.id, proposalId), eq(proposals.status, 'submitted')))
      .returning({ id: proposals.id });
    if (reviewed.length === 0) {
      throw Errors.conflict('Someone else has already reviewed this proposal.');
    }

    if (input.decision === 'approved') {
      await tx
        .update(projects)
        .set({ status: 'in_progress', startedAt: new Date(), updatedAt: new Date() })
        .where(eq(projects.id, target.projectId));
      await transitionWithin(tx, actor, target.problemId, 'in_progress', { note: approvalNote });
    }
  });

  if (input.decision === 'approved') {
    await notifyReporter(target.problemId, 'in_progress', approvalNote);
  }
  await notifyOrganizations([target.organizationId], ['university_admin', 'faculty'], {
    type: `proposal_${input.decision}`,
    title: DECISION_MESSAGE[input.decision](target.projectTitle),
    body: input.note,
    linkUrl: `/projects/${target.projectId}`,
    email: true,
  });

  logger.info(
    { proposalId, projectId: target.projectId, decision: input.decision, reviewerId: actor.userId },
    'proposal reviewed',
  );
}
