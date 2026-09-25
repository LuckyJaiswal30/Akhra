import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import {
  districts,
  problemRoutings,
  problems,
  projectMembers,
  projects,
  proposals,
  statusEvents,
  users,
  type Transaction,
} from '@akhra/db';
import {
  Errors,
  PROJECT_PLANNING_STATUS,
  UNIVERSITY_ROLES,
  type Domain,
  type ProblemStatus,
  type ProposalStatus,
  type RoutingResponse,
} from '@akhra/shared';
import { notifyDistrictOfficers, notifyReporterUpdate } from '@/modules/notifications';
import { logger } from '@/server/logger';
import { ForbiddenError, query, type Actor } from '@/server/session';

export interface RoutedProblem {
  routingId: string;
  problemId: string;
  refCode: string;
  title: string;
  description: string;
  domain: Domain | null;
  status: ProblemStatus;
  districtName: string;
  matchScore: number;
  matchRationale: string | null;
  brief: string | null;
  response: RoutingResponse;
  createdAt: Date;
  projectId: string | null;
}

function requireOrganization(actor: Actor): string {
  if (!actor.organizationId) {
    throw new ForbiddenError('Your account is not linked to an institution');
  }
  return actor.organizationId;
}

function requireInstitutionVoice(actor: Actor): string {
  const organizationId = requireOrganization(actor);
  if (!(UNIVERSITY_ROLES as readonly string[]).includes(actor.role)) {
    throw new ForbiddenError('Only faculty or the institution’s administrator can do this');
  }
  return organizationId;
}

export async function listRoutedProblems(
  actor: Actor,
  response?: RoutingResponse,
): Promise<RoutedProblem[]> {
  const organizationId = requireOrganization(actor);

  return query(actor, (tx) =>
    tx
      .select({
        routingId: problemRoutings.id,
        problemId: problems.id,
        refCode: problems.refCode,
        title: problems.title,
        description: problems.description,
        domain: problems.domain,
        status: problems.status,
        districtName: districts.nameEn,
        matchScore: problemRoutings.matchScore,
        matchRationale: problemRoutings.matchRationale,
        brief: problemRoutings.brief,
        response: problemRoutings.response,
        createdAt: problemRoutings.createdAt,
        projectId: sql<string | null>`(
          select p.id from projects p
          where p.problem_id = ${problems.id} and p.organization_id = ${organizationId}
          limit 1
        )`,
      })
      .from(problemRoutings)
      .innerJoin(problems, eq(problemRoutings.problemId, problems.id))
      .innerJoin(districts, eq(problems.districtCode, districts.code))
      .where(
        and(
          eq(problemRoutings.organizationId, organizationId),
          response ? eq(problemRoutings.response, response) : undefined,
        ),
      )
      // A referral nobody has answered is the only thing on this page that needs doing today.
      .orderBy(
        sql`case when ${problemRoutings.response} = 'proposed' then 0 else 1 end`,
        desc(problemRoutings.createdAt),
      ),
  );
}

export async function respondToRouting(
  actor: Actor,
  routingId: string,
  response: Exclude<RoutingResponse, 'proposed'>,
  note?: string,
): Promise<void> {
  const organizationId = requireInstitutionVoice(actor);

  const districtCode = await query(actor, async (tx) => {
    const [routing] = await tx
      .select({
        problemId: problemRoutings.problemId,
        organizationId: problemRoutings.organizationId,
        districtCode: problems.districtCode,
      })
      .from(problemRoutings)
      .innerJoin(problems, eq(problemRoutings.problemId, problems.id))
      .where(eq(problemRoutings.id, routingId))
      .limit(1);

    if (!routing || routing.organizationId !== organizationId) {
      throw new ForbiddenError('That referral does not belong to your institution');
    }

    await tx
      .update(problemRoutings)
      .set({
        response,
        responseNote: note ?? null,
        respondedById: actor.userId,
        respondedAt: new Date(),
      })
      .where(eq(problemRoutings.id, routingId));

    await tx.insert(statusEvents).values({
      entityType: 'routing',
      entityId: routingId,
      problemId: routing.problemId,
      fromStatus: 'proposed',
      toStatus: response,
      actorId: actor.userId,
      actorLabel: actor.name,
      note: note ?? null,
      isPublic: response === 'accepted',
    });

    logger.info({ routingId, response, organizationId }, 'routing response recorded');
    return routing.districtCode;
  });

  if (response !== 'accepted') {
    await notifyDistrictOfficers(districtCode, {
      type: `routing_${response}`,
      title:
        response === 'declined'
          ? `${actor.name ?? 'An institution'} declined a referral`
          : `${actor.name ?? 'An institution'} asked for a referral to be reassigned`,
      body: note,
      linkUrl: '/government/queue?stage=route',
      email: true,
    });
  }
}

export interface CreateProjectInput {
  problemId: string;
  title: string;
  summary: string;
  facultyMentorId?: string;
}

export async function createProject(
  actor: Actor,
  input: CreateProjectInput,
): Promise<{ id: string }> {
  const organizationId = requireInstitutionVoice(actor);

  const project = await query(actor, async (tx) => {
    const [routing] = await tx
      .select({ response: problemRoutings.response })
      .from(problemRoutings)
      .where(
        and(
          eq(problemRoutings.problemId, input.problemId),
          eq(problemRoutings.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (routing?.response !== 'accepted') {
      throw new ForbiddenError('Accept the referral before starting a project');
    }

    const [created] = await tx
      .insert(projects)
      .values({
        problemId: input.problemId,
        organizationId,
        title: input.title,
        summary: input.summary,
        facultyMentorId: input.facultyMentorId ?? null,
        createdById: actor.userId,
        status: PROJECT_PLANNING_STATUS,
      })
      .returning({ id: projects.id });

    if (!created) throw new Error('Could not create the project');

    if (input.facultyMentorId) {
      await tx
        .insert(projectMembers)
        .values({
          projectId: created.id,
          userId: input.facultyMentorId,
          memberRole: 'faculty_mentor',
        })
        .onConflictDoNothing();
    }

    return created;
  });

  await notifyReporterUpdate(
    input.problemId,
    {
      type: 'team_formed',
      title: 'A team has taken up your report',
      body: `${actor.name ?? 'An institution'} has formed a team and is preparing a proposal for the district officer to approve.`,
    },
    {
      title: 'एक टीम ने आपकी रिपोर्ट पर काम शुरू किया है',
      body: `${actor.name ?? 'एक संस्थान'} ने टीम बना ली है और ज़िला अधिकारी की मंज़ूरी के लिए प्रस्ताव तैयार कर रही है।`,
    },
  );

  logger.info({ projectId: project.id, problemId: input.problemId }, 'project created');
  return project;
}

export async function addProjectMember(
  actor: Actor,
  projectId: string,
  input: {
    userId: string;
    memberRole: 'faculty_mentor' | 'student' | 'industry_mentor' | 'co_investigator';
    discipline?: string;
  },
): Promise<void> {
  await query(actor, async (tx) => {
    await ownedProject(tx, actor, projectId);
    await tx
      .insert(projectMembers)
      .values({
        projectId,
        userId: input.userId,
        memberRole: input.memberRole,
        discipline: input.discipline ?? null,
      })
      .onConflictDoNothing();
  });
}

export async function removeProjectMember(
  actor: Actor,
  projectId: string,
  userId: string,
): Promise<void> {
  await query(actor, async (tx) => {
    await ownedProject(tx, actor, projectId);
    await tx
      .delete(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
  });
}

export interface ProposalInput {
  abstract: string;
  methodology: string;
  expectedOutcomes: string;
  timelineMonths: number;
  budgetEstimate?: number;
  status: ProposalStatus;
}

export async function submitProposal(
  actor: Actor,
  projectId: string,
  input: ProposalInput,
): Promise<{ id: string; version: number }> {
  const saved = await query(actor, async (tx) => {
    const project = await ownedProject(tx, actor, projectId);
    if (project.status !== PROJECT_PLANNING_STATUS) {
      throw Errors.conflict(
        'This project’s proposal has been approved and is now its plan. Record changes as milestones.',
      );
    }

    const [latest] = await tx
      .select({ version: proposals.version, status: proposals.status })
      .from(proposals)
      .where(eq(proposals.projectId, projectId))
      .orderBy(desc(proposals.version))
      .limit(1);
    if (latest?.status === 'submitted') {
      throw Errors.conflict(
        'The last version is still with the district officer. Wait for their decision.',
      );
    }

    const version = (latest?.version ?? 0) + 1;
    const [created] = await tx
      .insert(proposals)
      .values({
        projectId,
        version,
        abstract: input.abstract,
        methodology: input.methodology,
        expectedOutcomes: input.expectedOutcomes,
        timelineMonths: input.timelineMonths,
        budgetEstimate: input.budgetEstimate?.toString() ?? null,
        status: input.status,
        submittedById: actor.userId,
      })
      .returning({ id: proposals.id, version: proposals.version });

    if (!created) throw new Error('Could not save the proposal');
    return { ...created, project };
  });

  if (input.status === 'submitted') {
    await notifyDistrictOfficers(saved.project.districtCode, {
      type: 'proposal_submitted',
      title: `Proposal to review: ${saved.project.title}`,
      body: `${actor.name ?? 'A university team'} has submitted version ${saved.version} of its proposal for ${saved.project.refCode}.`,
      linkUrl: `/projects/${projectId}`,
      email: true,
    });
  }
  logger.info({ projectId, version: saved.version, status: input.status }, 'proposal saved');
  return { id: saved.id, version: saved.version };
}

type Tx = Parameters<Parameters<typeof query>[1]>[0];

async function ownedProject(tx: Tx, actor: Actor, projectId: string) {
  const organizationId = requireInstitutionVoice(actor);
  const [project] = await tx
    .select({
      organizationId: projects.organizationId,
      status: projects.status,
      title: projects.title,
      refCode: problems.refCode,
      districtCode: problems.districtCode,
    })
    .from(projects)
    .innerJoin(problems, eq(projects.problemId, problems.id))
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project || project.organizationId !== organizationId) {
    throw new ForbiddenError('That project does not belong to your institution');
  }
  return project;
}

export interface ProjectDetail {
  id: string;
  title: string;
  summary: string;
  status: ProblemStatus;
  problemId: string;
  refCode: string;
  problemTitle: string;
  districtName: string;
  domain: Domain | null;
  organizationName: string;
  facultyMentorName: string | null;
  startedAt: Date;
  members: { userId: string; name: string | null; memberRole: string; discipline: string | null }[];
  latestProposal: {
    id: string;
    version: number;
    abstract: string;
    methodology: string;
    expectedOutcomes: string;
    timelineMonths: number;
    budgetEstimate: string | null;
    status: ProposalStatus;
    reviewNote: string | null;
    reviewedAt: Date | null;
    reviewerName: string | null;
  } | null;
}

export async function getProject(actor: Actor, projectId: string): Promise<ProjectDetail | null> {
  return query(actor, async (tx) => {
    const [project] = await tx
      .select({
        id: projects.id,
        title: projects.title,
        summary: projects.summary,
        status: projects.status,
        problemId: projects.problemId,
        refCode: problems.refCode,
        problemTitle: problems.title,
        districtName: districts.nameEn,
        domain: problems.domain,
        organizationName: sql<string>`(select name from organizations o where o.id = ${projects.organizationId})`,
        facultyMentorName: sql<
          string | null
        >`(select name from users u where u.id = ${projects.facultyMentorId})`,
        startedAt: projects.startedAt,
      })
      .from(projects)
      .innerJoin(problems, eq(projects.problemId, problems.id))
      .innerJoin(districts, eq(problems.districtCode, districts.code))
      .where(and(eq(projects.id, projectId), onlyOwnWork(actor, tx)))
      .limit(1);

    if (!project) return null;

    const members = await tx
      .select({
        userId: projectMembers.userId,
        name: users.name,
        memberRole: projectMembers.memberRole,
        discipline: projectMembers.discipline,
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, projectId))
      .orderBy(asc(projectMembers.joinedAt));

    const [latestProposal] = await tx
      .select({
        id: proposals.id,
        version: proposals.version,
        abstract: proposals.abstract,
        methodology: proposals.methodology,
        expectedOutcomes: proposals.expectedOutcomes,
        timelineMonths: proposals.timelineMonths,
        budgetEstimate: proposals.budgetEstimate,
        status: proposals.status,
        reviewNote: proposals.reviewNote,
        reviewedAt: proposals.reviewedAt,
        reviewerName: users.name,
      })
      .from(proposals)
      .leftJoin(users, eq(proposals.reviewedById, users.id))
      .where(eq(proposals.projectId, projectId))
      .orderBy(desc(proposals.version))
      .limit(1);

    return { ...project, members, latestProposal: latestProposal ?? null };
  });
}

export async function listOrganizationMembers(
  actor: Actor,
): Promise<
  { id: string; name: string | null; designation: string | null; discipline: string | null }[]
> {
  const organizationId = requireOrganization(actor);
  return query(actor, (tx) =>
    tx
      .select({
        id: users.id,
        name: users.name,
        designation: users.designation,
        discipline: users.discipline,
      })
      .from(users)
      .where(and(eq(users.organizationId, organizationId), eq(users.status, 'active')))
      .orderBy(asc(users.name)),
  );
}

export async function listOrganizationProjects(
  actor: Actor,
): Promise<
  { id: string; title: string; status: ProblemStatus; refCode: string; memberCount: number }[]
> {
  const organizationId = requireOrganization(actor);
  return query(actor, (tx) =>
    tx
      .select({
        id: projects.id,
        title: projects.title,
        status: projects.status,
        refCode: problems.refCode,
        memberCount: sql<number>`(select count(*) from project_members m where m.project_id = ${projects.id})::int`,
      })
      .from(projects)
      .innerJoin(problems, eq(projects.problemId, problems.id))
      .where(and(eq(projects.organizationId, organizationId), onlyOwnWork(actor, tx)))
      .orderBy(desc(projects.createdAt))
      .limit(100),
  );
}

function onlyOwnWork(actor: Actor, tx: Transaction) {
  if (actor.role !== 'student' || !actor.userId) return undefined;
  return inArray(
    projects.id,
    tx
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, actor.userId)),
  );
}
