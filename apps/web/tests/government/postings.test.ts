import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { and, eq, ne } from 'drizzle-orm';
import { auditEvents, getDb, users, withoutRls } from '@akhra/db';
import { POST as repost } from '@/app/api/v1/admin/users/[id]/posting/route';
import { getActor } from '@/server/session';
import { listValidationQueue } from '@/modules/classification';
import {
  actAs,
  callRoute,
  cleanupTestData,
  createOrg,
  createUser,
  type TestUser,
} from '../helpers';

const REASON = 'Transferred by order HTE/2026/44 dated 16 September.';

async function postingOf(id: string) {
  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .select({
        role: users.role,
        jurisdictionCode: users.jurisdictionCode,
        organizationId: users.organizationId,
        designation: users.designation,
      })
      .from(users)
      .where(eq(users.id, id)),
  );
  return row;
}

let superAdmin: TestUser;

beforeEach(async () => {
  superAdmin = await createUser({ role: 'super_admin' });
  actAs(superAdmin);
});

afterAll(cleanupTestData);

describe('an officer is transferred, not re-invited', () => {
  it('moves a district officer to another district and records why', async () => {
    const officer = await createUser({ role: 'gov_admin', jurisdictionCode: 'RAN' });

    const res = await callRoute(repost, {
      params: { id: officer.id },
      body: { posting: 'district', jurisdictionCode: 'DHA', reason: REASON },
    });

    expect(res.status).toBe(200);
    expect(await postingOf(officer.id)).toMatchObject({
      role: 'gov_admin',
      jurisdictionCode: 'DHA',
      organizationId: null,
    });
    const [audit] = await withoutRls(getDb(), (tx) =>
      tx
        .select({ action: auditEvents.action, metadata: auditEvents.metadata })
        .from(auditEvents)
        .where(
          and(eq(auditEvents.targetUserId, officer.id), eq(auditEvents.action, 'user.reposted')),
        ),
    );
    expect(audit?.metadata).toMatchObject({ reason: REASON, from: { jurisdictionCode: 'RAN' } });
  });

  it('narrows a state-wide officer down to one district', async () => {
    const officer = await createUser({ role: 'gov_admin' });

    const res = await callRoute(repost, {
      params: { id: officer.id },
      body: {
        posting: 'district',
        jurisdictionCode: 'GUM',
        designation: 'District Grievance Redressal Officer, Gumla',
        reason: REASON,
      },
    });

    expect(res.status).toBe(200);
    expect(await postingOf(officer.id)).toMatchObject({
      jurisdictionCode: 'GUM',
      designation: 'District Grievance Redressal Officer, Gumla',
    });
  });

  it('takes the old district away the moment the new one is issued', async () => {
    const officer = await createUser({ role: 'gov_admin', jurisdictionCode: 'RAN' });
    await callRoute(repost, {
      params: { id: officer.id },
      body: { posting: 'district', jurisdictionCode: 'DHA', reason: REASON },
    });

    actAs(officer);
    const queue = await listValidationQueue(await getActor());

    expect(queue.every((item) => item.districtCode === 'DHA')).toBe(true);
  });

  it('moves an officer into a department, clearing their district', async () => {
    const officer = await createUser({ role: 'gov_admin', jurisdictionCode: 'RAN' });
    const department = await createOrg('government');

    const res = await callRoute(repost, {
      params: { id: officer.id },
      body: { posting: 'department', organizationId: department, reason: REASON },
    });

    expect(res.status).toBe(200);
    expect(await postingOf(officer.id)).toMatchObject({
      role: 'dept_officer',
      jurisdictionCode: null,
      organizationId: department,
    });
  });

  it('refuses a department that is not part of government', async () => {
    const officer = await createUser({ role: 'gov_admin', jurisdictionCode: 'RAN' });
    const university = await createOrg('university');

    const res = await callRoute(repost, {
      params: { id: officer.id },
      body: { posting: 'department', organizationId: university, reason: REASON },
    });

    expect(res.status).toBe(400);
    expect(res.body?.error.details.fields.organizationId).toBeTruthy();
  });

  it('insists on a district when one is the whole point of the posting', async () => {
    const officer = await createUser({ role: 'gov_admin' });

    const res = await callRoute(repost, {
      params: { id: officer.id },
      body: { posting: 'district', reason: REASON },
    });

    expect(res.status).toBe(400);
    expect(res.body?.error.details.fields.jurisdictionCode).toBeTruthy();
  });

  it('will not issue a posting without a stated reason', async () => {
    const officer = await createUser({ role: 'gov_admin', jurisdictionCode: 'RAN' });

    const res = await callRoute(repost, {
      params: { id: officer.id },
      body: { posting: 'state' },
    });

    expect(res.status).toBe(400);
  });
});

describe('nobody signs their own posting order', () => {
  it('refuses a super administrator changing their own access', async () => {
    const res = await callRoute(repost, {
      params: { id: superAdmin.id },
      body: { posting: 'district', jurisdictionCode: 'RAN', reason: REASON },
    });

    expect(res.status).toBe(403);
    expect(await postingOf(superAdmin.id)).toMatchObject({ role: 'super_admin' });
  });

  it.each(['gov_admin', 'dept_officer', 'citizen'] as const)(
    'refuses %s issuing one',
    async (role) => {
      const target = await createUser({ role: 'gov_admin', jurisdictionCode: 'RAN' });
      const caller =
        role === 'dept_officer'
          ? await createUser({ role, organizationId: await createOrg('government') })
          : await createUser({ role });
      actAs(caller);

      const res = await callRoute(repost, {
        params: { id: target.id },
        body: { posting: 'district', jurisdictionCode: 'DHA', reason: REASON },
      });

      expect(res.status).toBe(403);
      expect(await postingOf(target.id)).toMatchObject({ jurisdictionCode: 'RAN' });
    },
  );

  it('refuses to repost a citizen, who has no posting to change', async () => {
    const citizen = await createUser({ role: 'citizen' });

    const res = await callRoute(repost, {
      params: { id: citizen.id },
      body: { posting: 'district', jurisdictionCode: 'RAN', reason: REASON },
    });

    expect(res.status).toBe(409);
  });

  it('never leaves the platform without a super administrator', async () => {
    const onlyOne = await createUser({ role: 'super_admin' });
    const others = await withoutRls(getDb(), (tx) =>
      tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, 'super_admin'), ne(users.id, onlyOne.id))),
    );
    // There is at least the acting super admin besides the target, so the repost must succeed.
    expect(others.length).toBeGreaterThan(0);

    const res = await callRoute(repost, {
      params: { id: onlyOne.id },
      body: { posting: 'district', jurisdictionCode: 'RAN', reason: REASON },
    });

    expect(res.status).toBe(200);
    expect(await postingOf(onlyOne.id)).toMatchObject({
      role: 'gov_admin',
      jurisdictionCode: 'RAN',
    });
  });
});

describe('an existing officer is pointed at the transfer, not refused blankly', () => {
  it('tells a super admin to change the posting instead of re-inviting', async () => {
    const { POST: issueInvite } = await import('@/app/api/v1/invites/route');
    const officer = await createUser({ role: 'gov_admin', jurisdictionCode: 'RAN' });
    actAs(superAdmin);

    const res = await callRoute(issueInvite, {
      body: { email: officer.email, role: 'gov_admin', scope: 'district', jurisdictionCode: 'DHA' },
    });

    expect(res.status).toBe(409);
    expect(res.body?.error.message).toMatch(/change their district or department/i);
  });
});
