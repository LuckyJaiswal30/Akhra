import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getLifecycle, recordOutcome, recordTest, reviewProposal } from '@/modules/lifecycle';
import { createProject, submitProposal } from '@/modules/university';
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
let otherOfficer: TestUser;
let admin: TestUser;
let university: string;

async function as(user: TestUser) {
  actAs(user);
  return getActor();
}

async function underwayProject(): Promise<string> {
  const problemId = await createReport({ districtCode: 'PAL', status: 'routed' });
  await referTo(problemId, university);
  const { id: projectId } = await createProject(await as(admin), {
    problemId,
    title: 'Iron removal filter trial',
    summary: 'Testing a gravity-fed filter on village handpumps.',
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
  otherOfficer = await createUser({ role: 'gov_admin', jurisdictionCode: 'RAN' });
  admin = await createUser({ role: 'university_admin', organizationId: university });
});

afterAll(cleanupTestData);

describe('recording tests of a solution', () => {
  it('keeps passed and failed tests alike, newest first', async () => {
    const projectId = await underwayProject();
    const team = await as(admin);

    await recordTest(team, projectId, {
      title: 'Iron level after four weeks',
      method: 'Weekly water samples tested at the district laboratory.',
      result: 'failed',
      findings: 'Iron fell but stayed above the limit; the filter bed was too shallow.',
      conductedOn: new Date('2026-08-01'),
    });
    await recordTest(team, projectId, {
      title: 'Iron level after deepening the bed',
      method: 'Same sampling, after doubling the depth of the filter bed.',
      result: 'passed',
      findings: 'Iron below the permissible limit for three weeks running.',
      conductedOn: new Date('2026-09-01'),
    });

    const { tests } = await getLifecycle(team, projectId);
    expect(tests.map((test) => test.result)).toEqual(['passed', 'failed']);
  });

  it('is closed to an officer from another district', async () => {
    const projectId = await underwayProject();
    await expect(
      recordTest(await as(otherOfficer), projectId, {
        title: 'Unauthorised test entry',
        method: 'Recorded by someone with no oversight of this district.',
        result: 'passed',
        findings: 'This should never be saved to the project.',
        conductedOn: new Date('2026-09-01'),
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('recording intellectual property', () => {
  it('stores a patent with its status and application number', async () => {
    const projectId = await underwayProject();

    await recordOutcome(await as(admin), projectId, {
      outcomeType: 'patent',
      title: 'Gravity-fed iron removal cartridge',
      ipStatus: 'filed',
      reference: '202631004417',
    });

    const { outcomes } = await getLifecycle(await as(admin), projectId);
    expect(outcomes[0]).toMatchObject({ ipStatus: 'filed', reference: '202631004417' });
  });
});
