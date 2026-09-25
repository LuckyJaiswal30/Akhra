import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import {
  getDb,
  milestones,
  notifications,
  problems,
  projects,
  proposals,
  statusEvents,
  withUserContext,
  withoutRls,
} from '@akhra/db';
import {
  createMilestone,
  listProposalsForReview,
  recordOutcome,
  reviewProposal,
  updateMilestoneStatus,
} from '@/modules/lifecycle';
import { getThreadAccess } from '@/modules/notifications';
import { createProject, submitProposal, type ProposalInput } from '@/modules/university';
import { getActor } from '@/server/session';
import {
  actAs,
  cleanupTestData,
  createOrg,
  createReport,
  createUser,
  referTo,
  type TestUser,
} from '../helpers';

const PROPOSAL: ProposalInput = {
  abstract:
    'A gravity-fed filter fitted to the existing handpump, maintained by a trained village volunteer.',
  methodology:
    'Survey the water quality at six handpumps, build two prototype filters, and test them for eight weeks.',
  expectedOutcomes: 'Two working filters and a maintenance guide in Hindi.',
  timelineMonths: 6,
  budgetEstimate: 150000,
  status: 'submitted',
};

let ranchiOfficer: TestUser;
let dhanbadOfficer: TestUser;
let universityAdmin: TestUser;
let university: string;

async function as(user: TestUser) {
  actAs(user);
  return getActor();
}

async function plannedProject(): Promise<{ problemId: string; projectId: string }> {
  const problemId = await createReport({ districtCode: 'RAN', status: 'routed' });
  await referTo(problemId, university);
  const { id } = await createProject(await as(universityAdmin), {
    problemId,
    title: 'Handpump filter for the ward school',
    summary: 'A filter the village can maintain itself.',
  });
  return { problemId, projectId: id };
}

async function statusOf(problemId: string, projectId: string) {
  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .select({ problem: problems.status, project: projects.status })
      .from(projects)
      .innerJoin(problems, eq(projects.problemId, problems.id))
      .where(and(eq(projects.id, projectId), eq(problems.id, problemId))),
  );
  return row;
}

async function notificationTypesFor(userId: string): Promise<string[]> {
  const rows = await withoutRls(getDb(), (tx) =>
    tx
      .select({ type: notifications.type })
      .from(notifications)
      .where(eq(notifications.userId, userId)),
  );
  return rows.map((row) => row.type);
}

beforeAll(async () => {
  university = await createOrg('university');
  ranchiOfficer = await createUser({ role: 'gov_admin', jurisdictionCode: 'RAN' });
  dhanbadOfficer = await createUser({ role: 'gov_admin', jurisdictionCode: 'DHA' });
  universityAdmin = await createUser({ role: 'university_admin', organizationId: university });
});

afterAll(cleanupTestData);

describe('a project is planned before it is worked on', () => {
  it('starts in planning, leaving the citizen’s report with the institution', async () => {
    const { problemId, projectId } = await plannedProject();

    expect(await statusOf(problemId, projectId)).toEqual({ problem: 'routed', project: 'routed' });
  });

  it('refuses milestones and outcomes until the proposal is approved', async () => {
    const { projectId } = await plannedProject();
    const team = await as(universityAdmin);

    await expect(
      createMilestone(team, projectId, { title: 'Water survey', orderIndex: 0 }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(
      recordOutcome(team, projectId, { outcomeType: 'deployment', title: 'Filter installed' }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});

describe('submitting a proposal', () => {
  it('tells the officer for the report’s district, and nobody in another district', async () => {
    const { projectId } = await plannedProject();

    await submitProposal(await as(universityAdmin), projectId, PROPOSAL);

    expect(await notificationTypesFor(ranchiOfficer.id)).toContain('proposal_submitted');
    expect(await notificationTypesFor(dhanbadOfficer.id)).not.toContain('proposal_submitted');
  });

  it('will not take a new version while the last one is still being reviewed', async () => {
    const { projectId } = await plannedProject();
    const team = await as(universityAdmin);
    await submitProposal(team, projectId, PROPOSAL);

    await expect(submitProposal(team, projectId, PROPOSAL)).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('cannot approve itself, even written straight to the database', async () => {
    const { projectId } = await plannedProject();

    await expect(
      withUserContext(getDb(), { userId: universityAdmin.id, role: 'university_admin' }, (tx) =>
        tx.insert(proposals).values({
          projectId,
          version: 1,
          abstract: PROPOSAL.abstract,
          methodology: PROPOSAL.methodology,
          expectedOutcomes: PROPOSAL.expectedOutcomes,
          timelineMonths: 6,
          status: 'approved',
        }),
      ),
    ).rejects.toThrow();
  });
});

describe('the district officer decides', () => {
  it('lists the proposal for its own district officer only', async () => {
    const { projectId } = await plannedProject();
    await submitProposal(await as(universityAdmin), projectId, PROPOSAL);

    const ranchiQueue = await listProposalsForReview(await as(ranchiOfficer));
    const dhanbadQueue = await listProposalsForReview(await as(dhanbadOfficer));

    expect(ranchiQueue.map((p) => p.projectId)).toContain(projectId);
    expect(dhanbadQueue.map((p) => p.projectId)).not.toContain(projectId);
  });

  it('refuses an officer from another district', async () => {
    const { projectId } = await plannedProject();
    const { id } = await submitProposal(await as(universityAdmin), projectId, PROPOSAL);

    await expect(
      reviewProposal(await as(dhanbadOfficer), id, { decision: 'approved' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('sends a proposal back for changes, and takes the revised version', async () => {
    const { problemId, projectId } = await plannedProject();
    const team = await as(universityAdmin);
    const first = await submitProposal(team, projectId, PROPOSAL);

    await reviewProposal(await as(ranchiOfficer), first.id, {
      decision: 'revision_requested',
      note: 'Add how the volunteer will be trained and paid.',
    });
    const second = await submitProposal(team, projectId, PROPOSAL);

    expect(second.version).toBe(2);
    expect(await statusOf(problemId, projectId)).toEqual({ problem: 'routed', project: 'routed' });
    expect(await notificationTypesFor(universityAdmin.id)).toContain('proposal_revision_requested');
  });

  it('approves, starting the work and telling the citizen in one step', async () => {
    const { problemId, projectId } = await plannedProject();
    const { id } = await submitProposal(await as(universityAdmin), projectId, PROPOSAL);

    await reviewProposal(await as(ranchiOfficer), id, { decision: 'approved' });

    expect(await statusOf(problemId, projectId)).toEqual({
      problem: 'in_progress',
      project: 'in_progress',
    });
    const events = await withoutRls(getDb(), (tx) =>
      tx
        .select({ toStatus: statusEvents.toStatus, isPublic: statusEvents.isPublic })
        .from(statusEvents)
        .where(eq(statusEvents.problemId, problemId)),
    );
    expect(events).toContainEqual({ toStatus: 'in_progress', isPublic: true });
  });

  it('decides each version once', async () => {
    const { projectId } = await plannedProject();
    const { id } = await submitProposal(await as(universityAdmin), projectId, PROPOSAL);
    await reviewProposal(await as(ranchiOfficer), id, { decision: 'approved' });

    await expect(
      reviewProposal(await as(ranchiOfficer), id, {
        decision: 'rejected',
        note: 'Changed my mind.',
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('locks the approved proposal as the project’s plan', async () => {
    const { projectId } = await plannedProject();
    const team = await as(universityAdmin);
    const { id } = await submitProposal(team, projectId, PROPOSAL);
    await reviewProposal(await as(ranchiOfficer), id, { decision: 'approved' });

    await expect(submitProposal(team, projectId, PROPOSAL)).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });
});

describe('once work has started, oversight stays with the district', () => {
  async function approvedProjectWithSubmittedMilestone() {
    const { problemId, projectId } = await plannedProject();
    const team = await as(universityAdmin);
    const { id } = await submitProposal(team, projectId, PROPOSAL);
    await reviewProposal(await as(ranchiOfficer), id, { decision: 'approved' });
    await createMilestone(team, projectId, { title: 'Water survey', orderIndex: 0 });
    const [milestone] = await withoutRls(getDb(), (tx) =>
      tx.select({ id: milestones.id }).from(milestones).where(eq(milestones.projectId, projectId)),
    );
    await updateMilestoneStatus(team, milestone!.id, 'in_progress');
    await updateMilestoneStatus(team, milestone!.id, 'submitted');
    return { problemId, projectId, milestoneId: milestone!.id };
  }

  it('lets the team plan milestones after approval', async () => {
    const { milestoneId } = await approvedProjectWithSubmittedMilestone();
    expect(milestoneId).toBeTruthy();
  });

  it('does not let another district’s officer approve a milestone', async () => {
    const { milestoneId } = await approvedProjectWithSubmittedMilestone();

    await expect(
      updateMilestoneStatus(await as(dhanbadOfficer), milestoneId, 'approved'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await updateMilestoneStatus(await as(ranchiOfficer), milestoneId, 'approved');
  });

  it('keeps another district’s officer out of the project’s internal notes', async () => {
    const { problemId } = await approvedProjectWithSubmittedMilestone();

    expect(await getThreadAccess(await as(dhanbadOfficer), problemId)).toEqual({
      canPost: false,
      canPostInternal: false,
    });
    expect(await getThreadAccess(await as(ranchiOfficer), problemId)).toEqual({
      canPost: true,
      canPostInternal: true,
    });
  });
});
