import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createMilestone,
  getLifecycle,
  recordOutcome,
  reviewProposal,
  updateMilestoneStatus,
} from '@/modules/lifecycle';
import {
  addProjectMember,
  createProject,
  getProject,
  listOrganizationProjects,
  submitProposal,
} from '@/modules/university';
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

let officer: TestUser;
let admin: TestUser;
let student: TestUser;
let classmate: TestUser;
let university: string;

async function as(user: TestUser) {
  actAs(user);
  return getActor();
}

/** The one milestone these fixtures create, or a clear failure if the fixture changed. */
async function onlyMilestone(user: TestUser, projectId: string) {
  const [milestone] = (await getLifecycle(await as(user), projectId)).milestones;
  if (!milestone) throw new Error('the fixture project has no milestone');
  return milestone;
}

/** A project past its proposal review, so milestones and outcomes are open. */
async function underwayProject(title: string): Promise<string> {
  const problemId = await createReport({ districtCode: 'PAL', status: 'routed', title });
  await referTo(problemId, university);
  const { id: projectId } = await createProject(await as(admin), {
    problemId,
    title,
    summary: 'A village-scale trial run by the department with two student assistants.',
  });
  const proposal = await submitProposal(await as(admin), projectId, {
    abstract: 'A gravity-fed filter fitted to handpumps and maintained by a village volunteer.',
    methodology: 'Build two filters, run them for eight weeks, and test the water every week.',
    expectedOutcomes: 'Iron below the permissible limit at both handpumps.',
    timelineMonths: 4,
    status: 'submitted',
  });
  await reviewProposal(await as(officer), proposal.id, { decision: 'approved' });
  return projectId;
}

beforeAll(async () => {
  university = await createOrg('university');
  officer = await createUser({ role: 'gov_admin', jurisdictionCode: 'PAL' });
  admin = await createUser({ role: 'university_admin', organizationId: university });
  student = await createUser({ role: 'student', organizationId: university });
  classmate = await createUser({ role: 'student', organizationId: university });
});

afterAll(cleanupTestData);

describe('what a student may see', () => {
  it('lists only the projects they were put on', async () => {
    const mine = await underwayProject('Handpump iron filter trial');
    const theirs = await underwayProject('Soil moisture sensors for kharif sowing');
    await addProjectMember(await as(admin), mine, {
      userId: student.id,
      memberRole: 'student',
      discipline: 'Environmental Engineering',
    });

    const listed = await listOrganizationProjects(await as(student));
    expect(listed.map((project) => project.id)).toEqual([mine]);

    const everything = await listOrganizationProjects(await as(admin));
    expect(everything.map((project) => project.id)).toEqual(expect.arrayContaining([mine, theirs]));
  });

  it('cannot open a project in their own institution they are not on', async () => {
    const projectId = await underwayProject('Solar dryer for mahua flowers');
    expect(await getProject(await as(classmate), projectId)).toBeNull();
  });
});

describe('what a student may do', () => {
  it('moves their own milestone forward', async () => {
    const projectId = await underwayProject('Fluoride testing kit for schools');
    await addProjectMember(await as(admin), projectId, {
      userId: student.id,
      memberRole: 'student',
    });
    await createMilestone(await as(admin), projectId, {
      title: 'Collect water samples from six schools',
      description: 'One sample per school, twice in the month.',
      orderIndex: 1,
    });

    const milestone = await onlyMilestone(student, projectId);
    expect(milestone.nextStatuses).toEqual(['in_progress']);

    await updateMilestoneStatus(await as(student), milestone.id, 'in_progress');
    const after = await getLifecycle(await as(student), projectId);
    expect(after.milestones[0]?.status).toBe('in_progress');
  });

  it('cannot plan milestones, record outcomes, or speak for the institution', async () => {
    const projectId = await underwayProject('Millet drying yard at the block market');
    await addProjectMember(await as(admin), projectId, {
      userId: student.id,
      memberRole: 'student',
    });
    const team = await as(student);

    const lifecycle = await getLifecycle(team, projectId);
    expect(lifecycle.canManage).toBe(false);
    // They may still hand in the work itself.
    expect(lifecycle.canContribute).toBe(true);
    await expect(
      createMilestone(team, projectId, { title: 'Something of my own', orderIndex: 1 }),
    ).rejects.toThrow();
    await expect(
      recordOutcome(team, projectId, {
        outcomeType: 'publication',
        title: 'A paper nobody approved',
        detail: 'Written without the mentor.',
      }),
    ).rejects.toThrow();
    await expect(
      submitProposal(team, projectId, {
        abstract: 'A second plan of my own, written without the faculty mentor.',
        methodology: 'Change the whole approach and start again from the beginning.',
        expectedOutcomes: 'Something entirely different from what was approved.',
        timelineMonths: 3,
        status: 'submitted',
      }),
    ).rejects.toThrow();
  });

  it('cannot act on a project they are not on', async () => {
    const projectId = await underwayProject('Check dam repair survey');
    await createMilestone(await as(admin), projectId, {
      title: 'Walk the dam and photograph every breach',
      orderIndex: 1,
    });
    const milestone = await onlyMilestone(admin, projectId);

    await expect(
      updateMilestoneStatus(await as(classmate), milestone.id, 'in_progress'),
    ).rejects.toThrow();
  });
});
