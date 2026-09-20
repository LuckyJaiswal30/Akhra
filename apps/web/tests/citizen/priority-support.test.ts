import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { getDb, problems, withoutRls } from '@akhra/db';
import { submitProblem, supportProblem, withdrawSupport } from '@/modules/citizen';
import { listValidationQueue, markAsDuplicate } from '@/modules/classification';
import { getActor } from '@/server/session';
import { actAs, cleanupTestData, createReport, createUser, type TestUser } from '../helpers';

let officer: TestUser;
let reporter: TestUser;
let neighbour: TestUser;
const created: string[] = [];

async function as(user: TestUser | null) {
  actAs(user);
  return getActor();
}

async function priorityOf(problemId: string) {
  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .select({
        score: problems.priorityScore,
        level: problems.priority,
        reasons: problems.priorityReasons,
        supporters: problems.supportCount,
      })
      .from(problems)
      .where(eq(problems.id, problemId)),
  );
  return row!;
}

beforeAll(async () => {
  officer = await createUser({ role: 'gov_admin', jurisdictionCode: 'GUM' });
  reporter = await createUser({ role: 'citizen' });
  neighbour = await createUser({ role: 'citizen' });
});

afterAll(async () => {
  await withoutRls(getDb(), async (tx) => {
    for (const id of created) await tx.delete(problems).where(eq(problems.id, id));
  });
  await cleanupTestData();
});

describe('a report is prioritised from the moment it is submitted', () => {
  it('ranks a danger to many people above paperwork, and records why', async () => {
    const base = {
      districtCode: 'GUM',
      blockName: undefined,
      location: null,
      submitterType: 'individual' as const,
      submitterName: 'Priority Tester',
      submitterPhone: '9835066123',
      submitterEmail: '',
      attachmentIds: [],
      consentToPublish: true as const,
      domain: null,
    };
    const danger = await submitProblem(await as(null), {
      ...base,
      title: 'Live wire has fallen across the village handpump',
      description:
        'An electricity line snapped in the storm and a live wire now lies across the handpump that the whole village uses.',
      affectedScale: 'village',
      safetyRisk: true,
    });
    const paperwork = await submitProblem(await as(null), {
      ...base,
      title: 'Name misspelt on my ration card for months',
      description:
        'My ration card shows my name spelt wrongly and the block office has not corrected it despite two applications.',
      affectedScale: 'household',
      safetyRisk: false,
    });
    created.push(danger.id, paperwork.id);

    const urgent = await priorityOf(danger.id);
    expect(urgent.level).toBe('critical');
    expect(urgent.reasons).toEqual(expect.arrayContaining(['safety_risk', 'wide_reach']));
    expect((await priorityOf(paperwork.id)).level).toBe('low');

    const queue = (await listValidationQueue(await as(officer))).map((item) => item.id);
    expect(queue.indexOf(danger.id)).toBeLessThan(queue.indexOf(paperwork.id));
  });
});

describe('backing a report', () => {
  it('counts each person once and raises the report’s priority', async () => {
    const problemId = await createReport({ districtCode: 'GUM', submitterId: reporter.id });
    const before = await priorityOf(problemId);

    await supportProblem(await as(neighbour), problemId);
    const state = await supportProblem(await as(neighbour), problemId);

    expect(state).toEqual({ supportCount: 1, supported: true });
    expect((await priorityOf(problemId)).score).toBeGreaterThan(before.score);
  });

  it('can be withdrawn, and the count follows', async () => {
    const problemId = await createReport({ districtCode: 'GUM' });
    await supportProblem(await as(neighbour), problemId);

    const state = await withdrawSupport(await as(neighbour), problemId);

    expect(state).toEqual({ supportCount: 0, supported: false });
    expect((await priorityOf(problemId)).supporters).toBe(0);
  });

  it('does not let a reporter back their own report', async () => {
    const problemId = await createReport({ districtCode: 'GUM', submitterId: reporter.id });
    await expect(supportProblem(await as(reporter), problemId)).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('needs an account, so one person cannot back a report many times', async () => {
    const problemId = await createReport({ districtCode: 'GUM' });
    await expect(supportProblem(await as(null), problemId)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });

  it('takes no support once a report is closed', async () => {
    const problemId = await createReport({ districtCode: 'GUM', status: 'closed' });
    await expect(supportProblem(await as(neighbour), problemId)).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });
});

describe('a merged duplicate', () => {
  it('raises the priority of the report it was merged into', async () => {
    const original = await createReport({ districtCode: 'GUM' });
    const repeat = await createReport({ districtCode: 'GUM' });
    const before = await priorityOf(original);

    await markAsDuplicate(await as(officer), repeat, original);

    const after = await priorityOf(original);
    expect(after.score).toBeGreaterThan(before.score);
    expect(after.reasons).toContain('reported_repeatedly');
  });
});
