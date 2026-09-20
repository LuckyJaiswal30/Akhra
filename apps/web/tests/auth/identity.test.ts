import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { auditEvents, getDb, users, withoutRls } from '@akhra/db';
import { POST as clerkWebhook } from '@/app/api/webhooks/clerk/route';
import { getActor } from '@/server/session';
import {
  actAs,
  actAsClerk,
  cleanupTestData,
  clerkFake,
  countUsersWithEmail,
  createOrg,
  createUser,
  findUserByEmail,
  newClerkId,
  resetClerkFake,
  uniqueEmail,
  verifiedIdentity,
} from '../helpers';

const WEBHOOK_SECRET = `whsec_${randomBytes(24).toString('base64')}`;

function signedWebhook(payload: unknown, secret = WEBHOOK_SECRET): Request {
  const body = JSON.stringify(payload);
  const id = `msg_${randomUUID()}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const signature = createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64');
  return new Request('http://localhost:3000/api/webhooks/clerk', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'svix-id': id,
      'svix-timestamp': timestamp,
      'svix-signature': `v1,${signature}`,
    },
    body,
  });
}

function clerkUserJson(clerkUserId: string, email: string, verified = true) {
  return {
    id: clerkUserId,
    primary_email_address_id: 'idn_primary',
    email_addresses: [
      {
        id: 'idn_primary',
        email_address: email,
        verification: { status: verified ? 'verified' : 'unverified' },
      },
    ],
    first_name: 'Webhook',
    last_name: 'Person',
    image_url: null,
    unsafe_metadata: {},
  };
}

async function auditActions(email: string) {
  const rows = await withoutRls(getDb(), (tx) =>
    tx
      .select({ action: auditEvents.action })
      .from(auditEvents)
      .where(eq(auditEvents.targetEmail, email)),
  );
  return rows.map((r) => r.action);
}

beforeEach(() => {
  resetClerkFake();
  actAs(null);
});
afterEach(() => {
  delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;
});
afterAll(cleanupTestData);

describe('who Clerk sessions become in Akhra', () => {
  it('turns a new verified Clerk identity into a citizen, and never anything more', async () => {
    const email = uniqueEmail('newcomer');
    actAsClerk(verifiedIdentity(email, { name: 'Anita Verma' }));

    const actor = await getActor();

    expect(actor).toMatchObject({
      role: 'citizen',
      organizationId: null,
      email,
      name: 'Anita Verma',
    });
    expect(await auditActions(email)).toContain('user.signed_up');
  });

  it('links a verified identity to the account already reserved for that email, keeping its role', async () => {
    const reserved = await createUser({
      role: 'university_admin',
      organizationId: await createOrg('university'),
      linked: false,
    });
    const identity = verifiedIdentity(reserved.email);
    actAsClerk(identity);

    const actor = await getActor();

    expect(actor).toMatchObject({ userId: reserved.id, role: 'university_admin' });
    expect((await findUserByEmail(reserved.email))?.clerkUserId).toBe(identity.clerkUserId);
    expect(await auditActions(reserved.email)).toContain('user.linked');
    expect(await countUsersWithEmail(reserved.email)).toBe(1);
  });

  it('matches the reserved email in any letter case', async () => {
    const reserved = await createUser({ role: 'gov_admin', linked: false });
    actAsClerk(verifiedIdentity(reserved.email.toUpperCase()));

    expect((await getActor()).role).toBe('gov_admin');
  });

  it('treats an identity without a verified email as signed out', async () => {
    const email = uniqueEmail('unverified');
    actAsClerk(verifiedIdentity(email, { emailVerified: false }));

    expect((await getActor()).role).toBe('anonymous');
    expect(await countUsersWithEmail(email)).toBe(0);
  });

  it('refuses to hand an account linked to one Clerk user to another with the same email', async () => {
    const owner = await createUser({ role: 'gov_admin' });
    actAsClerk(verifiedIdentity(owner.email));

    expect((await getActor()).role).toBe('anonymous');
    expect((await findUserByEmail(owner.email))?.clerkUserId).toBe(owner.clerkUserId);
  });

  it('refuses, at the database, an institution role with no organisation', async () => {
    await expect(createUser({ role: 'faculty' })).rejects.toThrow();
    await expect(createUser({ role: 'industry_partner' })).rejects.toThrow();
  });

  it('keeps a suspended account signed out', async () => {
    const suspended = await createUser({
      role: 'faculty',
      organizationId: await createOrg('university'),
      status: 'suspended',
    });
    actAs(suspended);

    expect((await getActor()).role).toBe('anonymous');
  });

  it('reads an already linked account from Akhra without asking Clerk again', async () => {
    const linked = await createUser({ role: 'citizen' });
    actAs(linked);

    expect((await getActor()).userId).toBe(linked.id);
    expect(clerkFake().identityLookups).toBe(0);
  });

  it('is signed out when Clerk has no session', async () => {
    actAs(null);
    expect((await getActor()).role).toBe('anonymous');
  });
});

describe('the Clerk webhook', () => {
  beforeEach(() => {
    vi.stubEnv('CLERK_WEBHOOK_SIGNING_SECRET', WEBHOOK_SECRET);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects a request that was not signed with the shared secret', async () => {
    const forged = signedWebhook(
      { type: 'user.deleted', data: { id: newClerkId() } },
      `whsec_${randomBytes(24).toString('base64')}`,
    );
    const res = await clerkWebhook(forged as never);

    expect(res.status).toBe(400);
  });

  it('suspends the Akhra account of a user deleted in Clerk, keeping its history', async () => {
    const user = await createUser({ role: 'citizen' });
    const res = await clerkWebhook(
      signedWebhook({
        type: 'user.deleted',
        data: { id: user.clerkUserId, deleted: true },
      }) as never,
    );

    expect(res.status).toBe(200);
    expect(await findUserByEmail(user.email)).toMatchObject({
      status: 'suspended',
      clerkUserId: null,
    });
  });

  it('follows a verified email change made in Clerk', async () => {
    const user = await createUser({ role: 'citizen' });
    const newEmail = uniqueEmail('changed');
    await clerkWebhook(
      signedWebhook({
        type: 'user.updated',
        data: clerkUserJson(user.clerkUserId!, newEmail),
      }) as never,
    );

    const [row] = await withoutRls(getDb(), (tx) =>
      tx.select({ email: users.email }).from(users).where(eq(users.id, user.id)),
    );
    expect(row?.email).toBe(newEmail);
  });

  it('keeps the old address when the new one already belongs to someone else', async () => {
    const user = await createUser({ role: 'citizen' });
    const other = await createUser({ role: 'citizen' });
    await clerkWebhook(
      signedWebhook({
        type: 'user.updated',
        data: clerkUserJson(user.clerkUserId!, other.email),
      }) as never,
    );

    const [row] = await withoutRls(getDb(), (tx) =>
      tx.select({ email: users.email }).from(users).where(eq(users.id, user.id)),
    );
    expect(row?.email).toBe(user.email);
  });

  it('creates the citizen account when Clerk reports a new user first', async () => {
    const email = uniqueEmail('webhook-new');
    await clerkWebhook(
      signedWebhook({ type: 'user.created', data: clerkUserJson(newClerkId(), email) }) as never,
    );

    expect(await findUserByEmail(email)).toMatchObject({ role: 'citizen', status: 'active' });
  });
});
