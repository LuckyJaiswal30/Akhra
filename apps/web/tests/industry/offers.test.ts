import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { getDb, industryInterests, projects, withoutRls } from '@akhra/db';
import {
  expressInterest,
  listIncomingInterests,
  listOwnInterests,
  respondToInterest,
} from '@/modules/industry';
import { getActor } from '@/server/session';
import {
  actAs,
  cleanupTestData,
  createOrg,
  createReport,
  createUser,
  type TestUser,
} from '../helpers';

let university: string;
let partner: string;
let universityAdmin: TestUser;
let otherUniversityAdmin: TestUser;
let partnerAdmin: TestUser;

async function as(user: TestUser) {
  actAs(user);
  return getActor();
}

async function projectOwnedByUniversity(status: 'in_progress' | 'closed' = 'in_progress') {
  const problemId = await createReport({ districtCode: 'RAN', status: 'in_progress' });
  const [project] = await withoutRls(getDb(), (tx) =>
    tx
      .insert(projects)
      .values({
        problemId,
        organizationId: university,
        title: 'Solar pump controller for Ormanjhi farms',
        summary: 'A controller that runs irrigation pumps on the hours the panels produce most.',
        status,
      })
      .returning({ id: projects.id }),
  );
  return project!.id;
}

async function interestOn(projectId: string) {
  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .select({ id: industryInterests.id, status: industryInterests.status })
      .from(industryInterests)
      .where(eq(industryInterests.projectId, projectId)),
  );
  return row!;
}

beforeAll(async () => {
  university = await createOrg('university');
  partner = await createOrg('industry');
  universityAdmin = await createUser({ role: 'university_admin', organizationId: university });
  otherUniversityAdmin = await createUser({
    role: 'university_admin',
    organizationId: await createOrg('university'),
  });
  partnerAdmin = await createUser({ role: 'industry_admin', organizationId: partner });
});

afterAll(cleanupTestData);

describe('an industry partner offers support', () => {
  it('can offer co-development, testing and technology transfer, and the team sees who it is', async () => {
    const projectId = await projectOwnedByUniversity();

    await expressInterest(await as(partnerAdmin), projectId, {
      offerTypes: ['co_development', 'testing', 'technology_transfer'],
      fundingAmount: 250000,
      message: 'We can build the controller with you and license it for other districts.',
    });

    const incoming = await listIncomingInterests(await as(universityAdmin));
    const offer = incoming.find((row) => row.projectId === projectId);
    expect(offer).toMatchObject({
      offerTypes: ['co_development', 'testing', 'technology_transfer'],
      partnerKind: 'startup',
    });
  });

  it('is only open to industry partners', async () => {
    const projectId = await projectOwnedByUniversity();
    await expect(
      expressInterest(await as(otherUniversityAdmin), projectId, {
        offerTypes: ['mentorship'],
        message: 'A university trying to make an industry offer.',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('is refused once the project has finished', async () => {
    const projectId = await projectOwnedByUniversity('closed');
    await expect(
      expressInterest(await as(partnerAdmin), projectId, {
        offerTypes: ['funding'],
        fundingAmount: 100000,
        message: 'Late offer on a finished project.',
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});

describe('deciding an offer', () => {
  it('is for the project’s own team, not another university', async () => {
    const projectId = await projectOwnedByUniversity();
    await expressInterest(await as(partnerAdmin), projectId, {
      offerTypes: ['mentorship'],
      message: 'Mentoring for the controller design.',
    });
    const { id } = await interestOn(projectId);

    await expect(
      respondToInterest(await as(otherUniversityAdmin), id, 'accepted'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('happens once, though the partner can still step back after acceptance', async () => {
    const projectId = await projectOwnedByUniversity();
    await expressInterest(await as(partnerAdmin), projectId, {
      offerTypes: ['prototyping'],
      message: 'Workshop time for the prototype.',
    });
    const { id } = await interestOn(projectId);

    await respondToInterest(await as(universityAdmin), id, 'accepted', 'Welcome aboard.');
    await expect(
      respondToInterest(await as(universityAdmin), id, 'declined'),
    ).rejects.toMatchObject({ code: 'CONFLICT' });

    await respondToInterest(await as(partnerAdmin), id, 'withdrawn', 'Our budget was cut.');
    expect((await interestOn(projectId)).status).toBe('withdrawn');
    expect((await listOwnInterests(await as(partnerAdmin))).map((row) => row.projectId)).toContain(
      projectId,
    );
  });
});
