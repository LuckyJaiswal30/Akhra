import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { auditEvents, getDb, invites, organizations, withoutRls } from '@akhra/db';
import type { Role } from '@akhra/shared';
import { POST as onboard } from '@/app/api/v1/admin/organizations/route';
import { GET as listInvites, POST as issueInvite } from '@/app/api/v1/invites/route';
import { POST as revokeInvite } from '@/app/api/v1/invites/[id]/revoke/route';
import {
  actAs,
  callRoute,
  cleanupTestData,
  createOrg,
  createUser,
  uniqueEmail,
  type TestUser,
} from '../helpers';

let superAdmin: TestUser;
let govAdmin: TestUser;
let uniAdmin: TestUser;
let faculty: TestUser;
let uniAdminB: TestUser;
let industryAdmin: TestUser;
let industryMember: TestUser;
let citizen: TestUser;
let uniA: string;
let uniB: string;
let industryA: string;

const actorsByRole = () => ({
  gov_admin: govAdmin,
  university_admin: uniAdmin,
  faculty,
  industry_admin: industryAdmin,
  industry_partner: industryMember,
  citizen,
});

const onboardBody = (overrides: Record<string, unknown> = {}) => ({
  name: `TEST Institute ${Math.random().toString(36).slice(2, 7)}`,
  type: 'university',
  districtCode: 'RAN',
  agreementReference: 'MOU/HTE/2026/017',
  contactEmail: uniqueEmail('dean'),
  ...overrides,
});

async function auditFor(email: string) {
  return withoutRls(getDb(), (tx) =>
    tx
      .select({ action: auditEvents.action })
      .from(auditEvents)
      .where(eq(auditEvents.targetEmail, email)),
  );
}

beforeAll(async () => {
  uniA = await createOrg('university');
  uniB = await createOrg('university');
  industryA = await createOrg('industry');
  superAdmin = await createUser({ role: 'super_admin' });
  govAdmin = await createUser({ role: 'gov_admin' });
  uniAdmin = await createUser({ role: 'university_admin', organizationId: uniA });
  faculty = await createUser({ role: 'faculty', organizationId: uniA });
  uniAdminB = await createUser({ role: 'university_admin', organizationId: uniB });
  industryAdmin = await createUser({ role: 'industry_admin', organizationId: industryA });
  industryMember = await createUser({ role: 'industry_partner', organizationId: industryA });
  citizen = await createUser({ role: 'citizen' });
});

afterAll(cleanupTestData);

describe('onboarding an organisation', () => {
  it('lets a super_admin onboard an institution and issues its first-admin invite', async () => {
    actAs(superAdmin);
    const body = onboardBody();
    const res = await callRoute(onboard, { body });

    expect(res.status).toBe(201);
    const [invite] = await withoutRls(getDb(), (tx) =>
      tx.select().from(invites).where(eq(invites.id, res.body?.data.inviteId)),
    );
    expect(invite).toMatchObject({
      role: 'university_admin',
      organizationId: res.body?.data.organizationId,
      email: body.contactEmail.toLowerCase(),
      status: 'pending',
      issuedById: superAdmin.id,
    });
    const hoursValid = (invite!.expiresAt.getTime() - Date.now()) / 3_600_000;
    expect(hoursValid).toBeGreaterThan(71);
    expect(hoursValid).toBeLessThanOrEqual(72);
    expect((await auditFor(body.contactEmail.toLowerCase())).map((e) => e.action)).toEqual(
      expect.arrayContaining(['org.onboarded', 'invite.issued']),
    );
  });

  it('gives an industry partner an industry_admin invite', async () => {
    actAs(superAdmin);
    const res = await callRoute(onboard, {
      body: onboardBody({ type: 'industry', partnerKind: 'msme' }),
    });

    expect(res.status).toBe(201);
    const [invite] = await withoutRls(getDb(), (tx) =>
      tx
        .select({ role: invites.role })
        .from(invites)
        .where(eq(invites.id, res.body?.data.inviteId)),
    );
    expect(invite?.role).toBe('industry_admin');
  });

  it('records what kind of partner an industry organisation is, and insists on it', async () => {
    actAs(superAdmin);
    const missing = await callRoute(onboard, { body: onboardBody({ type: 'industry' }) });
    expect(missing.status).toBe(400);
    expect(missing.body?.error.details.fields.partnerKind).toBeTruthy();

    const startup = await callRoute(onboard, {
      body: onboardBody({ type: 'industry', partnerKind: 'startup' }),
    });
    const [organization] = await withoutRls(getDb(), (tx) =>
      tx
        .select({ partnerKind: organizations.partnerKind })
        .from(organizations)
        .where(eq(organizations.id, startup.body?.data.organizationId)),
    );
    expect(organization?.partnerKind).toBe('startup');
  });

  it('does not give a university a partner kind', async () => {
    actAs(superAdmin);
    const res = await callRoute(onboard, { body: onboardBody({ partnerKind: 'startup' }) });
    expect(res.status).toBe(400);
  });

  it('requires the agreement reference that records the offline relationship', async () => {
    actAs(superAdmin);
    const res = await callRoute(onboard, { body: onboardBody({ agreementReference: '' }) });

    expect(res.status).toBe(400);
    expect(res.body?.error.details.fields.agreementReference).toBeTruthy();
  });

  it.each([
    'gov_admin',
    'university_admin',
    'faculty',
    'industry_admin',
    'industry_partner',
    'citizen',
  ] as const)('refuses %s', async (role) => {
    actAs(actorsByRole()[role]);
    const res = await callRoute(onboard, { body: onboardBody() });

    expect(res.status).toBe(403);
    expect(res.body?.error.code).toBe('FORBIDDEN');
  });

  it('refuses an anonymous caller', async () => {
    actAs(null);
    const res = await callRoute(onboard, { body: onboardBody() });

    expect(res.status).toBe(401);
    expect(res.body?.error.code).toBe('UNAUTHENTICATED');
  });
});

describe('government invites', () => {
  it('lets a super_admin invite a government administrator', async () => {
    actAs(superAdmin);
    const res = await callRoute(issueInvite, {
      body: { email: uniqueEmail('officer'), role: 'gov_admin', scope: 'state' },
    });

    expect(res.status).toBe(201);
    expect(res.body?.data.inviteId).toBeTruthy();
  });

  it.each([
    'gov_admin',
    'university_admin',
    'faculty',
    'industry_admin',
    'industry_partner',
    'citizen',
  ] as const)('refuses a government invite from %s', async (role) => {
    actAs(actorsByRole()[role]);
    const res = await callRoute(issueInvite, {
      body: { email: uniqueEmail('officer'), role: 'gov_admin', scope: 'state' },
    });

    expect(res.status).toBe(403);
  });

  it('refuses an officer with no stated scope, so nobody gets the state by accident', async () => {
    actAs(superAdmin);
    const res = await callRoute(issueInvite, {
      body: { email: uniqueEmail('officer'), role: 'gov_admin' },
    });

    expect(res.status).toBe(400);
    expect(res.body?.error.details.fields.scope).toBeTruthy();
  });

  it('refuses a district officer with no district named', async () => {
    actAs(superAdmin);
    const res = await callRoute(issueInvite, {
      body: { email: uniqueEmail('officer'), role: 'gov_admin', scope: 'district' },
    });

    expect(res.status).toBe(400);
    expect(res.body?.error.details.fields.jurisdictionCode).toBeTruthy();
  });

  it('refuses a state-wide officer that also names a district', async () => {
    actAs(superAdmin);
    const res = await callRoute(issueInvite, {
      body: {
        email: uniqueEmail('officer'),
        role: 'gov_admin',
        scope: 'state',
        jurisdictionCode: 'RAN',
      },
    });

    expect(res.status).toBe(400);
  });

  it('records the post the officer holds', async () => {
    actAs(superAdmin);
    const res = await callRoute(issueInvite, {
      body: {
        email: uniqueEmail('officer'),
        role: 'gov_admin',
        scope: 'district',
        jurisdictionCode: 'KHU',
        designation: 'District Grievance Redressal Officer, Khunti',
      },
    });

    expect(res.status).toBe(201);
  });

  it('tells someone who may not invite at all that they may not, before anything else', async () => {
    actAs(actorsByRole().citizen);
    const res = await callRoute(issueInvite, {
      body: { email: uniqueEmail('officer'), role: 'gov_admin' },
    });

    expect(res.status).toBe(403);
  });
});

describe('organisation admins inviting colleagues', () => {
  const invite = (actor: TestUser, role: Role, organizationId?: string) => {
    actAs(actor);
    return callRoute(issueInvite, {
      body: { email: uniqueEmail('colleague'), role, organizationId },
    });
  };

  it('lets a university admin invite faculty into their own institution', async () => {
    const res = await invite(uniAdmin, 'faculty');

    expect(res.status).toBe(201);
    const [row] = await withoutRls(getDb(), (tx) =>
      tx
        .select({ organizationId: invites.organizationId })
        .from(invites)
        .where(eq(invites.id, res.body?.data.inviteId)),
    );
    expect(row?.organizationId).toBe(uniA);
  });

  it('lets a university admin invite a fellow university admin', async () => {
    expect((await invite(uniAdmin, 'university_admin')).status).toBe(201);
  });

  it('never lets a university admin invite into another institution', async () => {
    expect((await invite(uniAdmin, 'faculty', uniB)).status).toBe(403);
  });

  it.each(['gov_admin', 'super_admin', 'industry_admin', 'industry_partner'] as Role[])(
    'never lets a university admin grant %s',
    async (role) => {
      expect((await invite(uniAdmin, role)).status).toBe(403);
    },
  );

  it('does not let faculty invite anyone', async () => {
    expect((await invite(faculty, 'faculty')).status).toBe(403);
  });

  it('lets an industry admin invite a colleague, but only into industry roles', async () => {
    expect((await invite(industryAdmin, 'industry_partner')).status).toBe(201);
    expect((await invite(industryAdmin, 'faculty')).status).toBe(403);
    expect((await invite(industryAdmin, 'industry_partner', uniA)).status).toBe(403);
  });

  it('does not let an industry partner or a citizen invite anyone', async () => {
    expect((await invite(industryMember, 'industry_partner')).status).toBe(403);
    expect((await invite(citizen, 'faculty')).status).toBe(403);
  });

  it('never issues an invite carrying super_admin, even from a super_admin', async () => {
    expect((await invite(superAdmin, 'super_admin')).status).toBe(403);
  });

  it('refuses to invite an email that already holds a non-citizen account', async () => {
    actAs(uniAdmin);
    const res = await callRoute(issueInvite, { body: { email: faculty.email, role: 'faculty' } });

    expect(res.status).toBe(409);
    expect(res.body?.error.code).toBe('CONFLICT');
  });

  it("shows an organisation admin only their own organisation's invites", async () => {
    await invite(uniAdmin, 'faculty');
    await invite(uniAdminB, 'faculty');
    actAs(uniAdmin);
    const res = await callRoute(listInvites, { method: 'GET' });

    expect(res.status).toBe(200);
    const orgs = new Set(
      (res.body?.data.invites as { organizationId: string }[]).map((i) => i.organizationId),
    );
    expect([...orgs]).toEqual([uniA]);
  });

  it("lets an admin revoke their own pending invite, and nobody else's", async () => {
    const created = await invite(uniAdmin, 'faculty');
    const inviteId = created.body?.data.inviteId as string;

    actAs(uniAdminB);
    expect((await callRoute(revokeInvite, { params: { id: inviteId } })).status).toBe(403);

    actAs(uniAdmin);
    expect((await callRoute(revokeInvite, { params: { id: inviteId } })).status).toBe(200);
    const [row] = await withoutRls(getDb(), (tx) =>
      tx
        .select({ status: invites.status, email: invites.email })
        .from(invites)
        .where(and(eq(invites.id, inviteId))),
    );
    expect(row?.status).toBe('revoked');
    expect((await auditFor(row!.email)).map((e) => e.action)).toContain('invite.revoked');
  });
});
