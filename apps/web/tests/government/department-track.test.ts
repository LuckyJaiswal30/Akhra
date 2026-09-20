import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { getDb, problems, withoutRls } from '@akhra/db';
import { FIX_DAYS, REOPEN_WINDOW_DAYS } from '@akhra/shared';
import {
  assignToDepartment,
  confirmResolved,
  recordActionTaken,
  reopenReport,
  reporterProblemFor,
  autoCloseSettledReports,
} from '@/modules/classification';
import { escalateOverdueReports, remindInterimUpdates } from '@/modules/automation';
import { getActor } from '@/server/session';
import {
  actAs,
  cleanupTestData,
  createOrg,
  createUser,
  resetClerkFake,
  type TestUser,
} from '../helpers';

let officer: TestUser;
let departmentStaff: TestUser;
let citizen: TestUser;
let departmentId: string;
const created: string[] = [];

async function reportFrom(options: { submitterId?: string | null; phone?: string } = {}) {
  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .insert(problems)
      .values({
        refCode: `AKH-9998-${String(created.length + 1).padStart(6, '0')}`,
        title: 'Handpump water has turned yellow in our ward',
        description: 'The handpump serving sixty households gives yellow water with an iron smell.',
        districtCode: 'RAN',
        submitterType: 'individual',
        submitterName: 'Test Reporter',
        submitterPhone: options.phone ?? '9835044444',
        submitterId: options.submitterId ?? null,
      })
      .returning({ id: problems.id, refCode: problems.refCode }),
  );
  created.push(row!.id);
  return row!;
}

const stored = async (id: string) => {
  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .select({
        status: problems.status,
        track: problems.resolutionTrack,
        assignedOrgId: problems.assignedOrgId,
        dueAt: problems.dueAt,
        interimUpdateAt: problems.interimUpdateAt,
        actionTakenNote: problems.actionTakenNote,
        confirmedAt: problems.confirmedAt,
        reopenCount: problems.reopenCount,
        reporterNote: problems.reporterNote,
      })
      .from(problems)
      .where(eq(problems.id, id)),
  );
  return row!;
};

const daysFromNow = (date: Date | null) =>
  date ? Math.round((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null;

const DAY = 24 * 60 * 60 * 1000;

async function backdate(
  id: string,
  columns: Partial<Record<'assignedAt' | 'dueAt' | 'interimUpdateAt' | 'actionTakenAt', Date>>,
) {
  await withoutRls(getDb(), (tx) => tx.update(problems).set(columns).where(eq(problems.id, id)));
}

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

describe('a report that needs a department to fix it', () => {
  beforeEach(async () => {
    departmentId = await createOrg('government');
    officer = await createUser({ role: 'gov_admin', jurisdictionCode: 'RAN' });
    departmentStaff = await createUser({ role: 'dept_officer', organizationId: departmentId });
    citizen = await createUser({ role: 'citizen' });
  });

  it('goes to the chosen department with a 21-day clock', async () => {
    const report = await reportFrom();
    actAs(officer);

    await assignToDepartment(await getActor(), report.id, departmentId, 'Ward 4, near the school');

    const row = await stored(report.id);
    expect(row).toMatchObject({
      status: 'assigned',
      track: 'department',
      assignedOrgId: departmentId,
    });
    expect(daysFromNow(row.dueAt)).toBe(FIX_DAYS);
    expect(daysFromNow(row.interimUpdateAt)).toBe(14);
  });

  it('records what the department did, and waits for the reporter', async () => {
    const report = await reportFrom();
    actAs(officer);
    await assignToDepartment(await getActor(), report.id, departmentId);
    actAs(departmentStaff);

    await recordActionTaken(
      await getActor(),
      report.id,
      'Handpump platform rebuilt and water tested on 20 September.',
    );

    expect(await stored(report.id)).toMatchObject({
      status: 'action_taken',
      actionTakenNote: 'Handpump platform rebuilt and water tested on 20 September.',
    });
  });

  it('refuses a department that was given a different report', async () => {
    const report = await reportFrom();
    actAs(officer);
    await assignToDepartment(await getActor(), report.id, departmentId);
    const otherDepartment = await createUser({
      role: 'dept_officer',
      organizationId: await createOrg('government'),
    });
    actAs(otherDepartment);

    await expect(
      recordActionTaken(await getActor(), report.id, 'We had a look at it today.'),
    ).rejects.toThrow();
  });
});

describe('the reporter has the last word', () => {
  beforeEach(async () => {
    departmentId = await createOrg('government');
    officer = await createUser({ role: 'gov_admin', jurisdictionCode: 'RAN' });
    departmentStaff = await createUser({ role: 'dept_officer', organizationId: departmentId });
    citizen = await createUser({ role: 'citizen' });
  });

  async function reportAwaitingReporter(submitterId: string | null) {
    const report = await reportFrom({ submitterId });
    actAs(officer);
    await assignToDepartment(await getActor(), report.id, departmentId);
    actAs(departmentStaff);
    await recordActionTaken(
      await getActor(),
      report.id,
      'Transformer replaced and supply restored.',
    );
    actAs(null);
    return report;
  }

  it('closes the report when the reporter confirms it', async () => {
    const report = await reportAwaitingReporter(citizen.id);
    const mine = await reporterProblemFor(report.refCode, { actorUserId: citizen.id });

    await confirmResolved(mine!, 'Water is clear now, thank you.');

    const row = await stored(report.id);
    expect(row.status).toBe('closed');
    expect(row.confirmedAt).toBeInstanceOf(Date);
  });

  it('sends it back to the department when the reporter says it is not fixed', async () => {
    const report = await reportAwaitingReporter(citizen.id);
    const mine = await reporterProblemFor(report.refCode, { actorUserId: citizen.id });

    await reopenReport(mine!, 'The water is still yellow and the platform is broken again.');

    const row = await stored(report.id);
    expect(row).toMatchObject({ status: 'assigned', reopenCount: 1 });
    expect(daysFromNow(row.dueAt)).toBe(FIX_DAYS);
  });

  it('allows only one reopen', async () => {
    const report = await reportAwaitingReporter(citizen.id);
    const mine = await reporterProblemFor(report.refCode, { actorUserId: citizen.id });
    await reopenReport(mine!, 'The water is still yellow and nothing changed.');
    const again = await reporterProblemFor(report.refCode, { actorUserId: citizen.id });

    await expect(reopenReport(again!, 'Still not fixed after the second visit.')).rejects.toThrow();
  });

  it('gives an anonymous reporter the report only with the right mobile digits', async () => {
    const report = await reportAwaitingReporter(null);

    expect(
      await reporterProblemFor(report.refCode, { actorUserId: null, phoneLast4: '4444' }),
    ).not.toBeNull();
    expect(
      await reporterProblemFor(report.refCode, { actorUserId: null, phoneLast4: '1111' }),
    ).toBeNull();
    expect(await reporterProblemFor(report.refCode, { actorUserId: null })).toBeNull();
  });

  it('never hands someone else’s report to a signed-in stranger', async () => {
    const report = await reportAwaitingReporter(citizen.id);
    const stranger = await createUser({ role: 'citizen' });

    expect(
      await reporterProblemFor(report.refCode, { actorUserId: stranger.id, phoneLast4: '4444' }),
    ).toBeNull();
  });
});

describe('the clock on a department', () => {
  beforeEach(async () => {
    departmentId = await createOrg('government');
    officer = await createUser({ role: 'gov_admin', jurisdictionCode: 'RAN' });
  });

  it('asks for an interim update once the halfway point passes', async () => {
    const report = await reportFrom();
    actAs(officer);
    await assignToDepartment(await getActor(), report.id, departmentId);

    await backdate(report.id, { interimUpdateAt: new Date(Date.now() - DAY) });

    const first = await remindInterimUpdates();
    const second = await remindInterimUpdates();

    expect(first).toBeGreaterThanOrEqual(1);
    expect(second).toBe(0);
  });

  it('marks a report overdue once, after the limit', async () => {
    const report = await reportFrom();
    actAs(officer);
    await assignToDepartment(await getActor(), report.id, departmentId);

    await backdate(report.id, { dueAt: new Date(Date.now() - DAY) });

    expect(await escalateOverdueReports()).toBeGreaterThanOrEqual(1);
    expect(await escalateOverdueReports()).toBe(0);
  });

  it('closes a report the reporter never answered, once the reopen window has passed', async () => {
    const report = await reportFrom();
    actAs(officer);
    await assignToDepartment(await getActor(), report.id, departmentId);
    await recordActionTaken(await getActor(), report.id, 'Pipeline leak repaired on the same day.');

    expect((await stored(report.id)).status).toBe('action_taken');
    await autoCloseSettledReports();
    expect((await stored(report.id)).status).toBe('action_taken');

    await backdate(report.id, {
      actionTakenAt: new Date(Date.now() - (REOPEN_WINDOW_DAYS + 1) * DAY),
    });
    await autoCloseSettledReports();

    expect((await stored(report.id)).status).toBe('closed');
  });
});
