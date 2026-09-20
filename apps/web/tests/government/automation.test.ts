import { afterAll, describe, expect, it } from 'vitest';
import { and, eq, inArray } from 'drizzle-orm';
import {
  analyticsSnapshots,
  getDb,
  invites,
  milestones,
  notifications,
  problems,
  projects,
  rateLimits,
  withoutRls,
} from '@akhra/db';
import { getDashboard, snapshotKey } from '@/modules/analytics';
import {
  ESCALATE_AFTER_HOURS,
  countEscalated,
  escalateStaleReports,
  pruneRateLimits,
  refreshDashboardSnapshots,
  remindDueMilestones,
  remindExpiringInvites,
  runMaintenance,
} from '@/modules/automation';
import { getActor } from '@/server/session';
import {
  actAs,
  cleanupTestData,
  createOrg,
  createUser,
  latestEmailTo,
  signToken,
  type TestUser,
} from '../helpers';

const HOUR = 60 * 60 * 1000;
const ref = () => `AKH-9998-${String(Math.floor(Math.random() * 999_999)).padStart(6, '0')}`;
const createdProblems: string[] = [];

async function staleReport(
  districtCode: string,
  ageHours: number,
  status: 'submitted' | 'validated' = 'submitted',
) {
  const createdAt = new Date(Date.now() - ageHours * HOUR);
  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .insert(problems)
      .values({
        refCode: ref(),
        title: `Automation test report in ${districtCode}`,
        description:
          'A description long enough to look like a real report for the automation tests.',
        districtCode,
        submitterName: 'Automation Tester',
        submitterPhone: '9800000000',
        status,
        createdAt,
      })
      .returning({ id: problems.id }),
  );
  createdProblems.push(row!.id);
  return row!.id;
}

async function notificationsFor(userId: string, type: string) {
  return withoutRls(getDb(), (tx) =>
    tx
      .select({ title: notifications.title })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.type, type))),
  );
}

afterAll(async () => {
  if (createdProblems.length > 0) {
    await withoutRls(getDb(), (tx) =>
      tx.delete(problems).where(inArray(problems.id, createdProblems)),
    );
  }
  await withoutRls(getDb(), (tx) =>
    tx
      .delete(analyticsSnapshots)
      .where(
        eq(
          analyticsSnapshots.key,
          snapshotKey({ districtCode: 'SIM' }, { role: 'gov_admin', jurisdiction: 'SIM' }),
        ),
      ),
  );
  await cleanupTestData();
});

describe('reports that wait too long are raised, once', () => {
  let officer: TestUser;
  let stateOfficer: TestUser;

  it('escalates a stale report and tells the district officer and the state', async () => {
    officer = await createUser({ role: 'gov_admin', jurisdictionCode: 'SIM' });
    stateOfficer = await createUser({ role: 'gov_admin' });
    const waiting = await staleReport('SIM', ESCALATE_AFTER_HOURS + 5);

    const escalated = await escalateStaleReports();

    expect(escalated).toBeGreaterThanOrEqual(1);
    const [row] = await withoutRls(getDb(), (tx) =>
      tx
        .select({ escalatedAt: problems.escalatedAt })
        .from(problems)
        .where(eq(problems.id, waiting)),
    );
    expect(row?.escalatedAt).not.toBeNull();
    expect(await notificationsFor(officer.id, 'report_escalated')).not.toHaveLength(0);
    expect(await notificationsFor(stateOfficer.id, 'report_escalated')).not.toHaveLength(0);
  });

  it('does not raise the same report twice', async () => {
    const before = (await notificationsFor(officer.id, 'report_escalated')).length;

    await escalateStaleReports();

    expect(await notificationsFor(officer.id, 'report_escalated')).toHaveLength(before);
  });

  it('leaves a fresh report alone, and counts what is waiting in one district', async () => {
    const fresh = await staleReport('SIM', 1);
    await escalateStaleReports();

    const [row] = await withoutRls(getDb(), (tx) =>
      tx.select({ escalatedAt: problems.escalatedAt }).from(problems).where(eq(problems.id, fresh)),
    );
    expect(row?.escalatedAt).toBeNull();
    expect(await countEscalated('SIM')).toBeGreaterThanOrEqual(1);
  });
});

describe('reminders go out before something lapses', () => {
  it('reminds an invited person once while their invitation still works', async () => {
    const email = `expiring-${Date.now()}@test.invalid`;
    const id = crypto.randomUUID();
    await withoutRls(getDb(), (tx) =>
      tx.insert(invites).values({
        id,
        email,
        role: 'gov_admin',
        tokenHash: signToken(id, 'unused-secret'),
        expiresAt: new Date(Date.now() + 6 * HOUR),
      }),
    );

    expect(await remindExpiringInvites()).toBeGreaterThanOrEqual(1);
    expect((await latestEmailTo(email))?.subject).toMatch(/expires soon/i);

    const again = await remindExpiringInvites();
    const [row] = await withoutRls(getDb(), (tx) =>
      tx.select({ reminderSentAt: invites.reminderSentAt }).from(invites).where(eq(invites.id, id)),
    );
    expect(row?.reminderSentAt).not.toBeNull();
    expect(again).toBe(0);
  });

  it('reminds the team about a milestone that is nearly due', async () => {
    const organizationId = await createOrg('university');
    const member = await createUser({ role: 'faculty', organizationId });
    const problemId = await staleReport('SIM', 1);
    const [project] = await withoutRls(getDb(), (tx) =>
      tx
        .insert(projects)
        .values({
          problemId,
          organizationId,
          title: 'Automation test project',
          summary: 'Used by the reminder test.',
          status: 'in_progress',
        })
        .returning({ id: projects.id }),
    );
    await withoutRls(getDb(), (tx) =>
      tx.insert(milestones).values({
        projectId: project!.id,
        title: 'Field survey',
        status: 'pending',
        dueDate: new Date(Date.now() + 12 * HOUR),
      }),
    );

    expect(await remindDueMilestones()).toBeGreaterThanOrEqual(1);
    expect(await notificationsFor(member.id, 'milestone_due')).not.toHaveLength(0);
  });
});

describe('dashboard figures are computed on a schedule', () => {
  it('stores a rollup the dashboard then reads instead of recomputing', async () => {
    const officer = await createUser({ role: 'gov_admin', jurisdictionCode: 'SIM' });
    await staleReport('SIM', 2);

    expect(await refreshDashboardSnapshots()).toBeGreaterThanOrEqual(1);
    const [snapshot] = await withoutRls(getDb(), (tx) =>
      tx
        .select({ payload: analyticsSnapshots.payload })
        .from(analyticsSnapshots)
        .where(
          eq(
            analyticsSnapshots.key,
            snapshotKey({ districtCode: 'SIM' }, { role: 'gov_admin', jurisdiction: 'SIM' }),
          ),
        ),
    );
    expect(snapshot?.payload).toBeTruthy();

    actAs(officer);
    const dashboard = await getDashboard(await getActor());
    expect(dashboard.kpis.totalReports).toBeGreaterThanOrEqual(1);
  });

  it('runs every job in one pass and reports what it did', async () => {
    const report = await runMaintenance();

    expect(report).toMatchObject({
      escalated: expect.any(Number),
      inviteReminders: expect.any(Number),
      milestoneReminders: expect.any(Number),
      snapshots: expect.any(Number),
    });
    expect(report.snapshots).toBeGreaterThanOrEqual(1);
    expect(report.pending).toEqual([]);
  });
});

describe('keeping the rate-limit table from growing forever', () => {
  const bucket = (suffix: string) => `test:${suffix}:${Math.random().toString(36).slice(2, 8)}`;

  it('deletes buckets whose window is long gone and leaves today’s alone', async () => {
    const now = new Date();
    const old = bucket('old');
    const recent = bucket('recent');

    await withoutRls(getDb(), (tx) =>
      tx.insert(rateLimits).values([
        { bucketKey: old, windowStart: new Date(now.getTime() - 72 * HOUR), hits: 9 },
        { bucketKey: recent, windowStart: new Date(now.getTime() - HOUR), hits: 2 },
      ]),
    );

    await pruneRateLimits(now);

    const left = await withoutRls(getDb(), (tx) =>
      tx
        .select({ key: rateLimits.bucketKey })
        .from(rateLimits)
        .where(inArray(rateLimits.bucketKey, [old, recent])),
    );
    expect(left.map((row) => row.key)).toEqual([recent]);

    await withoutRls(getDb(), (tx) =>
      tx.delete(rateLimits).where(inArray(rateLimits.bucketKey, [old, recent])),
    );
  });
});

describe('who a dashboard snapshot belongs to', () => {
  it('keys a snapshot by the viewer, so one role never reads another role’s figures', () => {
    const filter = { districtCode: 'SIM' };
    const stateOfficer = snapshotKey(filter, { role: 'gov_admin', jurisdiction: null });
    const districtOfficer = snapshotKey(filter, { role: 'gov_admin', jurisdiction: 'SIM' });
    const superAdmin = snapshotKey(filter, { role: 'super_admin', jurisdiction: null });

    expect(new Set([stateOfficer, districtOfficer, superAdmin]).size).toBe(3);
  });

  it('gives the same viewer the same key, so the scheduled run is reused', () => {
    const scope = { role: 'gov_admin' as const, jurisdiction: 'SIM' };
    expect(snapshotKey({ districtCode: 'SIM' }, scope)).toBe(
      snapshotKey({ districtCode: 'SIM' }, scope),
    );
    expect(snapshotKey({ districtCode: 'SIM' }, scope)).not.toBe(
      snapshotKey({ districtCode: 'RAN' }, scope),
    );
  });
});
