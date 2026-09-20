import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { getDb, problems, users, withUserContext, withoutRls } from '@akhra/db';
import { listValidationQueue, transferDistrict } from '@/modules/classification';
import { departmentReports, departmentStats } from '@/modules/classification/service-department';
import { assignToDepartment, recordActionTaken } from '@/modules/classification';
import { updateOwnProfile } from '@/modules/auth';
import { getActor } from '@/server/session';
import {
  actAs,
  cleanupTestData,
  createOrg,
  createUser,
  resetClerkFake,
  type TestUser,
} from '../helpers';

let deogharOfficer: TestUser;
let ranchiOfficer: TestUser;
let waterDepartment: string;
let roadsDepartment: string;
let waterOfficer: TestUser;
let roadsOfficer: TestUser;
const created: string[] = [];

async function report(districtCode: string, title = 'Handpump in the ward gives yellow water') {
  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .insert(problems)
      .values({
        refCode: `AKH-9997-${String(created.length + 1).padStart(6, '0')}`,
        title,
        description:
          'The only handpump serving sixty households gives yellow water with an iron smell.',
        districtCode,
        submitterType: 'individual',
        submitterName: 'Boundary Tester',
        submitterPhone: '9835055555',
      })
      .returning({ id: problems.id }),
  );
  created.push(row!.id);
  return row!.id;
}

const stored = async (id: string) => {
  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .select({
        districtCode: problems.districtCode,
        transferredFromCode: problems.transferredFromCode,
        transferCount: problems.transferCount,
        status: problems.status,
      })
      .from(problems)
      .where(eq(problems.id, id)),
  );
  return row!;
};

beforeAll(async () => {
  deogharOfficer = await createUser({ role: 'gov_admin', jurisdictionCode: 'DEO' });
  ranchiOfficer = await createUser({ role: 'gov_admin', jurisdictionCode: 'RAN' });
  waterDepartment = await createOrg('government');
  roadsDepartment = await createOrg('government');
  waterOfficer = await createUser({ role: 'dept_officer', organizationId: waterDepartment });
  roadsOfficer = await createUser({ role: 'dept_officer', organizationId: roadsDepartment });
});

beforeEach(() => {
  resetClerkFake();
  actAs(null);
});

afterAll(async () => {
  await withoutRls(getDb(), async (tx) => {
    for (const id of created) await tx.delete(problems).where(eq(problems.id, id));
  });
  await cleanupTestData();
});

describe('a district officer is confined to their own district', () => {
  it('never sees another district’s report in the queue', async () => {
    const inDeoghar = await report('DEO');
    const inRanchi = await report('RAN');

    actAs(deogharOfficer);
    const queue = (await listValidationQueue(await getActor())).map((item) => item.id);

    expect(queue).toContain(inDeoghar);
    expect(queue).not.toContain(inRanchi);
  });

  it('is refused by the database itself, not only by the application', async () => {
    const inRanchi = await report('RAN');

    const rows = await withUserContext(
      getDb(),
      { userId: deogharOfficer.id, role: 'gov_admin' },
      (tx) =>
        tx
          .select({ id: problems.id })
          .from(problems)
          .where(sql`${problems.id} = ${inRanchi} and ${problems.isPublic} = false`),
    );

    expect(rows).toHaveLength(0);
  });

  it('cannot give itself another district', async () => {
    actAs(deogharOfficer);

    await expect(
      withUserContext(getDb(), { userId: deogharOfficer.id, role: 'gov_admin' }, (tx) =>
        tx.update(users).set({ jurisdictionCode: 'RAN' }).where(eq(users.id, deogharOfficer.id)),
      ),
    ).rejects.toThrow();

    const [row] = await withoutRls(getDb(), (tx) =>
      tx
        .select({ jurisdictionCode: users.jurisdictionCode })
        .from(users)
        .where(eq(users.id, deogharOfficer.id)),
    );
    expect(row?.jurisdictionCode).toBe('DEO');
  });

  it('cannot promote itself to another role', async () => {
    await expect(
      withUserContext(getDb(), { userId: ranchiOfficer.id, role: 'gov_admin' }, (tx) =>
        tx.update(users).set({ role: 'super_admin' }).where(eq(users.id, ranchiOfficer.id)),
      ),
    ).rejects.toThrow();
  });
});

describe('a citizen reports where the problem is, and a wrong district is moved, never rejected', () => {
  it('lets a citizen change their own home district without changing anyone’s access', async () => {
    const citizen = await createUser({ role: 'citizen' });
    actAs(citizen);

    await updateOwnProfile(await getActor(), {
      name: 'Sita Devi',
      phone: '9835011111',
      districtCode: 'DEO',
      locality: '',
    });

    const [row] = await withoutRls(getDb(), (tx) =>
      tx
        .select({ districtCode: users.districtCode, role: users.role })
        .from(users)
        .where(eq(users.id, citizen.id)),
    );
    expect(row).toMatchObject({ districtCode: 'DEO', role: 'citizen' });
  });

  it('moves a misfiled report to the right district and tells that officer', async () => {
    const misfiled = await report('RAN', 'Broken culvert on the road to the block office');
    actAs(ranchiOfficer);

    await transferDistrict(
      await getActor(),
      misfiled,
      'DEO',
      'The village named in the report is in Deoghar, not Ranchi.',
    );

    expect(await stored(misfiled)).toMatchObject({
      districtCode: 'DEO',
      transferredFromCode: 'RAN',
      transferCount: 1,
      status: 'submitted',
    });

    actAs(deogharOfficer);
    const queue = (await listValidationQueue(await getActor())).map((item) => item.id);
    expect(queue).toContain(misfiled);
  });

  it('refuses an officer who tries to move a report out of a district that is not theirs', async () => {
    const inDeoghar = await report('DEO');
    actAs(ranchiOfficer);

    await expect(
      transferDistrict(await getActor(), inDeoghar, 'RAN', 'I would like to handle this one.'),
    ).rejects.toThrow();

    expect((await stored(inDeoghar)).districtCode).toBe('DEO');
  });

  it('stops a report being passed around for ever', async () => {
    const wandering = await report('RAN');
    actAs(ranchiOfficer);
    await transferDistrict(await getActor(), wandering, 'DEO', 'This belongs to Deoghar district.');
    actAs(deogharOfficer);
    await transferDistrict(await getActor(), wandering, 'RAN', 'On a second look it is Ranchi.');

    actAs(ranchiOfficer);
    await expect(
      transferDistrict(await getActor(), wandering, 'DEO', 'Sending it back once more.'),
    ).rejects.toThrow();
  });
});

describe('a department officer sees only their own department', () => {
  it('sees a report assigned to them and not one assigned to another department', async () => {
    const forWater = await report('RAN');
    const forRoads = await report('RAN', 'Street light has been dead for three weeks');
    actAs(ranchiOfficer);
    await assignToDepartment(await getActor(), forWater, waterDepartment);
    await assignToDepartment(await getActor(), forRoads, roadsDepartment);

    actAs(waterOfficer);
    const mine = (await departmentReports(await getActor(), 'open')).map((row) => row.id);

    expect(mine).toContain(forWater);
    expect(mine).not.toContain(forRoads);
  });

  it('cannot record action on another department’s report', async () => {
    const forWater = await report('RAN');
    actAs(ranchiOfficer);
    await assignToDepartment(await getActor(), forWater, waterDepartment);

    actAs(roadsOfficer);
    await expect(
      recordActionTaken(await getActor(), forWater, 'We sent a team to look at the handpump.'),
    ).rejects.toThrow();
  });

  it('cannot validate, route or assign anything at all', async () => {
    const waiting = await report('RAN');
    actAs(waterOfficer);

    await expect(assignToDepartment(await getActor(), waiting, waterDepartment)).rejects.toThrow();
    await expect(
      transferDistrict(await getActor(), waiting, 'DEO', 'This is not our district.'),
    ).rejects.toThrow();
  });

  it('counts only its own department on its dashboard', async () => {
    const forWater = await report('RAN');
    const forRoads = await report('RAN', 'Drain overflowing beside the primary school');
    actAs(ranchiOfficer);
    await assignToDepartment(await getActor(), forWater, waterDepartment);
    await assignToDepartment(await getActor(), forRoads, roadsDepartment);

    actAs(roadsOfficer);
    const stats = await departmentStats(await getActor());
    const reports = await departmentReports(await getActor(), 'open');

    expect(reports.every((row) => row.id !== forWater)).toBe(true);
    expect(stats.open).toBe(reports.length);
  });
});
