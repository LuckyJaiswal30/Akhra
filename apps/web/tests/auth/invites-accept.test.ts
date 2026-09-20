import { randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { auditEvents, getDb, invites, withoutRls } from '@akhra/db';
import { POST as onboard } from '@/app/api/v1/admin/organizations/route';
import { POST as issueInvite } from '@/app/api/v1/invites/route';
import { POST as revokeInvite } from '@/app/api/v1/invites/[id]/revoke/route';
import { POST as accept } from '@/app/api/v1/invites/redeem/route';
import {
  actAs,
  actAsClerk,
  callRoute,
  cleanupTestData,
  clerkFake,
  createUser,
  findUserByEmail,
  latestEmailTo,
  resetClerkFake,
  runSql,
  signToken,
  tokenFromText,
  uniqueEmail,
  verifiedIdentity,
  type TestUser,
} from '../helpers';

let superAdmin: TestUser;

interface Issued {
  email: string;
  token: string;
  inviteId: string;
  organizationId: string;
}

async function onboardInstitution(email = uniqueEmail('dean')): Promise<Issued> {
  actAs(superAdmin);
  const res = await callRoute(onboard, {
    body: {
      name: `TEST University ${randomUUID().slice(0, 6)}`,
      type: 'university',
      districtCode: 'RAN',
      agreementReference: 'MOU/HTE/2026/021',
      contactEmail: email,
    },
  });
  if (res.status !== 201) throw new Error(`onboarding failed: ${JSON.stringify(res.body)}`);
  actAs(null);
  const sent = clerkFake().invitations.at(-1)!;
  return {
    email,
    token: tokenFromText(sent.redirectUrl, '/invite/'),
    inviteId: res.body?.data.inviteId as string,
    organizationId: res.body?.data.organizationId as string,
  };
}

function signInAsInvitee(email: string): void {
  actAsClerk(verifiedIdentity(email));
}

beforeAll(async () => {
  superAdmin = await createUser({ role: 'super_admin' });
});
beforeEach(() => resetClerkFake());
afterAll(cleanupTestData);

describe('sending an invitation', () => {
  it('has Clerk email the invitation, pointing back to the Akhra invitation page', async () => {
    const issued = await onboardInstitution();
    const sent = clerkFake().invitations.at(-1)!;

    expect(sent.email).toBe(issued.email);
    expect(sent.redirectUrl).toMatch(/^http:\/\/localhost:3000\/invite\//);
    const [row] = await withoutRls(getDb(), (tx) =>
      tx.select().from(invites).where(eq(invites.id, issued.inviteId)),
    );
    expect(row?.clerkInvitationId).toMatch(/^inv_test_/);
  });

  it('falls back to Akhra’s own email for someone who already has a Clerk account', async () => {
    clerkFake().invitationOutcome = 'existing_account';
    actAs(superAdmin);
    const email = uniqueEmail('existing');
    const res = await callRoute(issueInvite, {
      body: { email, role: 'gov_admin', scope: 'state' },
    });

    expect(res.status).toBe(201);
    expect(res.body?.data).toMatchObject({ delivery: 'email' });
    expect(res.body?.data.inviteLink).toMatch(/\/invite\//);
    expect((await latestEmailTo(email))?.subject).toMatch(/invited to Akhra/i);
  });
});

describe('accepting an invitation', () => {
  it('gives the invited address exactly the invited role and organisation', async () => {
    const issued = await onboardInstitution();
    signInAsInvitee(issued.email);
    const res = await callRoute(accept, { body: { token: issued.token } });

    expect(res.status).toBe(200);
    expect(await findUserByEmail(issued.email)).toMatchObject({
      role: 'university_admin',
      organizationId: issued.organizationId,
      status: 'active',
    });
    const [row] = await withoutRls(getDb(), (tx) =>
      tx.select().from(invites).where(eq(invites.id, issued.inviteId)),
    );
    expect(row?.status).toBe('redeemed');
    expect(row?.redeemedAt).toBeInstanceOf(Date);
    expect(clerkFake().revoked).toContain(row?.clerkInvitationId);
  });

  it('asks a signed-out visitor to sign in first', async () => {
    const issued = await onboardInstitution();
    actAs(null);
    const res = await callRoute(accept, { body: { token: issued.token } });

    expect(res.status).toBe(401);
    expect(res.body?.error.code).toBe('UNAUTHENTICATED');
  });

  it('refuses someone signed in with a different address, and records the attempt', async () => {
    const issued = await onboardInstitution();
    signInAsInvitee(uniqueEmail('intruder'));
    const res = await callRoute(accept, { body: { token: issued.token } });

    expect(res.status).toBe(403);
    expect(res.body?.error.code).toBe('INVITE_EMAIL_MISMATCH');
    const rows = await withoutRls(getDb(), (tx) =>
      tx
        .select({ action: auditEvents.action })
        .from(auditEvents)
        .where(eq(auditEvents.targetEmail, issued.email)),
    );
    expect(rows.map((r) => r.action)).toContain('invite.redeem_rejected');
  });

  it('refuses an expired invitation', async () => {
    const issued = await onboardInstitution();
    await runSql(
      sql`update invites set expires_at = now() - interval '1 minute' where id = ${issued.inviteId}`,
    );
    signInAsInvitee(issued.email);
    const res = await callRoute(accept, { body: { token: issued.token } });

    expect(res.status).toBe(410);
    expect(res.body?.error.code).toBe('INVITE_EXPIRED');
  });

  it('refuses an invitation that was already used', async () => {
    const issued = await onboardInstitution();
    signInAsInvitee(issued.email);
    await callRoute(accept, { body: { token: issued.token } });
    const again = await callRoute(accept, { body: { token: issued.token } });

    expect(again.body?.error.code).toBe('INVITE_ALREADY_USED');
  });

  it('refuses a withdrawn invitation, and withdrawing also cancels the Clerk invitation', async () => {
    const issued = await onboardInstitution();
    actAs(superAdmin);
    await callRoute(revokeInvite, { params: { id: issued.inviteId } });
    expect(clerkFake().revoked.length).toBe(1);

    signInAsInvitee(issued.email);
    const res = await callRoute(accept, { body: { token: issued.token } });
    expect(res.body?.error.code).toBe('INVITE_REVOKED');
  });

  it.each([
    ['a tampered signature', (t: string) => `${t.slice(0, -3)}abc`],
    ['an unknown invitation', () => signToken(randomUUID(), randomBytes(32).toString('base64url'))],
    ['a malformed token', () => 'not-a-token'],
  ])('refuses %s', async (_label, mangle) => {
    const issued = await onboardInstitution();
    signInAsInvitee(issued.email);
    const res = await callRoute(accept, { body: { token: mangle(issued.token) } });

    expect(res.status).toBe(400);
    expect(res.body?.error.code).toBe('INVITE_INVALID');
  });

  it('adds the access to an existing citizen account with the invited address', async () => {
    const citizen = await createUser({ role: 'citizen' });
    actAs(superAdmin);
    await callRoute(issueInvite, {
      body: { email: citizen.email, role: 'gov_admin', scope: 'state' },
    });
    const token = tokenFromText(clerkFake().invitations.at(-1)!.redirectUrl, '/invite/');

    actAs(citizen);
    const res = await callRoute(accept, { body: { token } });

    expect(res.status).toBe(200);
    expect(await findUserByEmail(citizen.email)).toMatchObject({ role: 'gov_admin' });
  });
});
