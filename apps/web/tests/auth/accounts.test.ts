import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import {
  auditEvents,
  getDb,
  notifications,
  problems,
  statusEvents,
  users,
  withoutRls,
} from '@akhra/db';
import { listAccounts, reactivateAccount, suspendAccount } from '@/modules/auth';
import { getActor } from '@/server/session';
import {
  actAs,
  cleanupTestData,
  clerkFake,
  createUser,
  resetClerkFake,
  type TestUser,
} from '../helpers';

let admin: TestUser;
let citizen: TestUser;
let counter = 0;

async function reportBy(
  submitterId: string,
  options: { status?: 'submitted' | 'validated'; duplicateOfId?: string } = {},
) {
  counter += 1;
  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .insert(problems)
      .values({
        refCode: `AKH-9998-${String(700000 + Math.floor(Math.random() * 99999) + counter)}`,
        title: 'Fake report about a road that does not exist',
        description: 'This is a made-up report used to test what happens to a suspended account.',
        districtCode: 'RAN',
        submitterType: 'individual',
        submitterName: 'Test Reporter',
        submitterPhone: '9835077777',
        submitterId,
        status: options.status ?? 'submitted',
        duplicateOfId: options.duplicateOfId ?? null,
      })
      .returning({ id: problems.id }),
  );
  return row!.id;
}

const reportRow = async (id: string) => {
  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .select({ status: problems.status, isPublic: problems.isPublic })
      .from(problems)
      .where(eq(problems.id, id)),
  );
  return row!;
};

beforeEach(async () => {
  resetClerkFake();
  admin = await createUser({ role: 'super_admin' });
  citizen = await createUser({ role: 'citizen' });
  actAs(admin);
});

afterAll(cleanupTestData);

describe('the list of every account', () => {
  it('shows citizens, not only officers, and finds them by name or email', async () => {
    const list = await listAccounts(await getActor(), { q: citizen.email });
    expect(list.accounts.map((account) => account.id)).toEqual([citizen.id]);
    expect(list.accounts[0]).toMatchObject({ role: 'citizen', status: 'active' });

    const citizens = await listAccounts(await getActor(), { role: 'citizen' });
    expect(citizens.accounts.every((account) => account.role === 'citizen')).toBe(true);
    expect(citizens.summary.citizens).toBeGreaterThan(0);
  });

  it('is only for a super administrator', async () => {
    actAs(await createUser({ role: 'gov_admin', jurisdictionCode: 'RAN' }));
    await expect(listAccounts(await getActor(), {})).rejects.toThrow();
  });
});

describe('suspending an account', () => {
  it('signs the person out everywhere, refuses them from then on, and records why', async () => {
    await suspendAccount(await getActor(), citizen.id, {
      reason: 'Filed many fake reports',
      removeReports: false,
    });

    expect(clerkFake().revokedSessionsFor).toContain(citizen.clerkUserId);
    actAs(citizen);
    expect((await getActor()).userId).toBeNull();

    const [entry] = await withoutRls(getDb(), (tx) =>
      tx
        .select({ actorId: auditEvents.actorId, metadata: auditEvents.metadata })
        .from(auditEvents)
        .where(
          and(eq(auditEvents.action, 'user.suspended'), eq(auditEvents.targetUserId, citizen.id)),
        ),
    );
    expect(entry).toMatchObject({
      actorId: admin.id,
      metadata: { reason: 'Filed many fake reports' },
    });
  });

  it('removes only the reports no officer has reviewed and nobody else follows', async () => {
    const unreviewed = await reportBy(citizen.id);
    const accepted = await reportBy(citizen.id, { status: 'validated' });
    const followed = await reportBy(citizen.id);
    const other = await createUser({ role: 'citizen' });
    await reportBy(other.id, { duplicateOfId: followed });

    const { removedReports } = await suspendAccount(await getActor(), citizen.id, {
      removeReports: true,
    });

    expect(removedReports).toBe(1);
    expect(await reportRow(unreviewed)).toEqual({ status: 'rejected', isPublic: false });
    expect(await reportRow(accepted)).toEqual({ status: 'validated', isPublic: true });
    expect(await reportRow(followed)).toEqual({ status: 'submitted', isPublic: true });

    const events = await withoutRls(getDb(), (tx) =>
      tx
        .select({ isPublic: statusEvents.isPublic, toStatus: statusEvents.toStatus })
        .from(statusEvents)
        .where(eq(statusEvents.problemId, unreviewed)),
    );
    expect(events).toEqual([{ isPublic: false, toStatus: 'rejected' }]);
  });

  it('leaves every report alone when asked to', async () => {
    const report = await reportBy(citizen.id);
    await suspendAccount(await getActor(), citizen.id, { removeReports: false });
    expect(await reportRow(report)).toEqual({ status: 'submitted', isPublic: true });
  });

  it('refuses to suspend yourself', async () => {
    await expect(
      suspendAccount(await getActor(), admin.id, { removeReports: false }),
    ).rejects.toThrow('You cannot suspend your own account.');
  });

  it('is refused to anyone but a super administrator', async () => {
    actAs(await createUser({ role: 'gov_admin' }));
    await expect(
      suspendAccount(await getActor(), citizen.id, { removeReports: false }),
    ).rejects.toThrow();
    const [row] = await withoutRls(getDb(), (tx) =>
      tx.select({ status: users.status }).from(users).where(eq(users.id, citizen.id)),
    );
    expect(row?.status).toBe('active');
  });
});

describe('reactivating an account', () => {
  const notices = async (userId: string) =>
    withoutRls(getDb(), (tx) =>
      tx
        .select({ type: notifications.type, title: notifications.title, body: notifications.body })
        .from(notifications)
        .where(eq(notifications.userId, userId)),
    );

  it('lets the person back in, keeps removed reports removed, and tells them so', async () => {
    const first = await reportBy(citizen.id);
    const second = await reportBy(citizen.id);
    await suspendAccount(await getActor(), citizen.id, { removeReports: true });

    await reactivateAccount(await getActor(), citizen.id);

    actAs(citizen);
    expect((await getActor()).userId).toBe(citizen.id);
    expect(await reportRow(first)).toEqual({ status: 'rejected', isPublic: false });
    expect(await reportRow(second)).toEqual({ status: 'rejected', isPublic: false });
    const [notice] = await notices(citizen.id);
    expect(notice).toMatchObject({
      type: 'account_reactivated',
      title: 'Your Akhra account is active again',
    });
    expect(notice?.body).toContain('The 2 reports removed during the suspension stay removed');
    expect(notice?.body).toContain('you can report it again');
  });

  it('writes to the person in Hindi when that is their language', async () => {
    await withoutRls(getDb(), (tx) =>
      tx.update(users).set({ locale: 'hi' }).where(eq(users.id, citizen.id)),
    );
    await suspendAccount(await getActor(), citizen.id, { removeReports: false });
    await reactivateAccount(await getActor(), citizen.id);

    const [notice] = await notices(citizen.id);
    expect(notice?.title).toBe('आपका अखरा खाता फिर से सक्रिय है');
  });
});
