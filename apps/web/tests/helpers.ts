import { createHmac, randomUUID } from 'node:crypto';
import { desc, eq, sql } from 'drizzle-orm';
import {
  emailOutbox,
  getDb,
  organizations,
  problemRoutings,
  problems,
  users,
  withoutRls,
} from '@akhra/db';
import type { Domain, ProblemStatus, Role } from '@akhra/shared';
import type { ClerkIdentity } from '@/server/clerk';

export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationId: string | null;
  clerkUserId: string | null;
}

export interface ClerkFake {
  identities: Map<string, ClerkIdentity>;
  identityLookups: number;
  invitations: { email: string; redirectUrl: string; expiresInDays: number }[];
  revoked: string[];
  invitationOutcome: 'clerk' | 'existing_account' | 'failed';
  revokedSessionsFor: string[];
}

export function clerkFake(): ClerkFake {
  const store = globalThis as { __clerkFake?: ClerkFake };
  store.__clerkFake ??= {
    identities: new Map(),
    identityLookups: 0,
    invitations: [],
    revoked: [],
    invitationOutcome: 'clerk',
    revokedSessionsFor: [],
  };
  return store.__clerkFake;
}

export function resetClerkFake(): void {
  (globalThis as { __clerkFake?: ClerkFake }).__clerkFake = undefined;
  clerkFake();
}

export function uniqueEmail(tag = 'user'): string {
  return `${tag}-${randomUUID().slice(0, 8)}@test.invalid`;
}

export function newClerkId(): string {
  return `user_test_${randomUUID().replace(/-/g, '')}`;
}

export function actAs(user: { clerkUserId: string | null } | null): void {
  (globalThis as { __clerkUserId?: string | null }).__clerkUserId = user?.clerkUserId ?? null;
}

export function actAsClerk(identity: ClerkIdentity): void {
  clerkFake().identities.set(identity.clerkUserId, identity);
  (globalThis as { __clerkUserId?: string | null }).__clerkUserId = identity.clerkUserId;
}

export function verifiedIdentity(
  email: string,
  overrides: Partial<ClerkIdentity> = {},
): ClerkIdentity {
  return {
    clerkUserId: newClerkId(),
    email: email.toLowerCase(),
    emailVerified: true,
    name: 'Test Person',
    imageUrl: null,
    signup: { phone: null, districtCode: null, acceptedPrivacyAt: null },
    ...overrides,
  };
}

clerkFake();

export async function createOrg(type: 'university' | 'industry' | 'government'): Promise<string> {
  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .insert(organizations)
      .values({
        type,
        name: `TEST ${type} ${randomUUID().slice(0, 6)}`,
        districtCode: 'RAN',
        partnerKind: type === 'industry' ? 'startup' : null,
      })
      .returning({ id: organizations.id }),
  );
  if (!row) throw new Error('could not create test organisation');
  return row.id;
}

export async function createUser(options: {
  role: Role;
  organizationId?: string | null;
  jurisdictionCode?: string | null;
  status?: 'active' | 'suspended';
  email?: string;
  linked?: boolean;
}): Promise<TestUser> {
  const email = options.email ?? uniqueEmail(options.role);
  const name = `Test ${options.role}`;
  const clerkUserId = options.linked === false ? null : newClerkId();
  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .insert(users)
      .values({
        email,
        name,
        role: options.role,
        organizationId: options.organizationId ?? null,
        jurisdictionCode: options.jurisdictionCode ?? null,
        status: options.status ?? 'active',
        clerkUserId,
      })
      .returning({ id: users.id }),
  );
  if (!row) throw new Error('could not create test user');
  return {
    id: row.id,
    email,
    name,
    role: options.role,
    organizationId: options.organizationId ?? null,
    clerkUserId,
  };
}

const referenceBase = Math.floor(Math.random() * 900) * 1000;
let reportSequence = 0;

export async function createReport(
  options: {
    districtCode?: string;
    status?: ProblemStatus;
    domain?: Domain | null;
    submitterId?: string | null;
    title?: string;
  } = {},
): Promise<string> {
  reportSequence += 1;
  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .insert(problems)
      .values({
        refCode: `AKH-9998-${String(referenceBase + reportSequence).padStart(6, '0')}`,
        title: options.title ?? 'Handpump in the ward has stopped drawing water',
        description:
          'The handpump beside the primary school has stopped drawing water and forty families now walk to the river.',
        districtCode: options.districtCode ?? 'RAN',
        domain: options.domain === undefined ? 'water_resources' : options.domain,
        status: options.status ?? 'submitted',
        submitterId: options.submitterId ?? null,
        submitterName: 'Test Reporter',
        submitterPhone: '9835012345',
      })
      .returning({ id: problems.id }),
  );
  if (!row) throw new Error('could not create test report');
  return row.id;
}

export async function referTo(
  problemId: string,
  organizationId: string,
  response: 'proposed' | 'accepted' = 'accepted',
): Promise<void> {
  await withoutRls(getDb(), (tx) =>
    tx.insert(problemRoutings).values({
      problemId,
      organizationId,
      matchScore: 0.8,
      matchRationale: 'test referral',
      response,
    }),
  );
}

export async function findUserByEmail(email: string) {
  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .select({
        id: users.id,
        role: users.role,
        status: users.status,
        organizationId: users.organizationId,
        clerkUserId: users.clerkUserId,
      })
      .from(users)
      .where(eq(sql`lower(${users.email})`, email.toLowerCase()))
      .limit(1),
  );
  return row ?? null;
}

export async function countUsersWithEmail(email: string): Promise<number> {
  const rows = await withoutRls(getDb(), (tx) =>
    tx
      .select({ id: users.id })
      .from(users)
      .where(eq(sql`lower(${users.email})`, email.toLowerCase())),
  );
  return rows.length;
}
export async function latestEmailTo(
  address: string,
): Promise<{ subject: string; body: string } | null> {
  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .select({ subject: emailOutbox.subject, body: emailOutbox.body })
      .from(emailOutbox)
      .where(eq(sql`lower(${emailOutbox.toAddress})`, address.toLowerCase()))
      .orderBy(desc(emailOutbox.createdAt))
      .limit(1),
  );
  return row ?? null;
}

export function tokenFromText(text: string, path: '/invite/'): string {
  const match = new RegExp(`${path}([A-Za-z0-9_\\-.]+)`).exec(text);
  if (!match?.[1]) throw new Error(`no ${path} link found`);
  return match[1];
}

export function signToken(id: string, secret: string): string {
  const key = process.env.INVITE_SIGNING_SECRET ?? '';
  const signature = createHmac('sha256', key).update(`${id}.${secret}`).digest('base64url');
  return `${id}.${secret}.${signature}`;
}

export function formData(fields: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
}

function randomIp(): string {
  const octet = () => Math.floor(Math.random() * 250) + 1;
  return `10.${octet()}.${octet()}.${octet()}`;
}

type RouteHandler = (request: Request, context: { params: Promise<any> }) => Promise<Response>;

export async function callRoute(
  handler: RouteHandler,
  options: {
    method?: string;
    body?: unknown;
    rawBody?: string;
    params?: Record<string, string>;
    ip?: string;
  } = {},
): Promise<{ status: number; body: Record<string, any> | null }> {
  const hasBody = options.rawBody !== undefined || options.body !== undefined;
  const request = new Request('http://localhost:3000/api/test', {
    method: options.method ?? 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': options.ip ?? randomIp() },
    body: hasBody ? (options.rawBody ?? JSON.stringify(options.body)) : undefined,
  });
  const response = await handler(request, { params: Promise.resolve(options.params ?? {}) });
  return {
    status: response.status,
    body: (await response.json().catch(() => null)) as Record<string, any> | null,
  };
}

export async function callMultipart(
  handler: RouteHandler,
  body: FormData,
  params: Record<string, string> = {},
): Promise<{ status: number; body: Record<string, any> | null }> {
  const request = new Request('http://localhost:3000/api/test', {
    method: 'POST',
    headers: { 'x-forwarded-for': randomIp() },
    body,
  });
  const response = await handler(request, { params: Promise.resolve(params) });
  return {
    status: response.status,
    body: (await response.json().catch(() => null)) as Record<string, any> | null,
  };
}

export async function runSql(query: ReturnType<typeof sql>): Promise<void> {
  await withoutRls(getDb(), (tx) => tx.execute(query));
}

export async function cleanupTestData(): Promise<void> {
  await withoutRls(getDb(), async (tx) => {
    await tx.execute(sql`delete from problems where ref_code like 'AKH-9998-%'`);
    await tx.execute(sql`delete from problems where id in (
      select problem_id from projects
        where organization_id in (select id from organizations where name like 'TEST %')
      union
      select problem_id from problem_routings
        where organization_id in (select id from organizations where name like 'TEST %')
    )`);
    await tx.execute(sql`delete from audit_events where target_email like '%@test.invalid'
      or organization_id in (select id from organizations where name like 'TEST %')`);
    await tx.execute(sql`delete from invites where email like '%@test.invalid'
      or organization_id in (select id from organizations where name like 'TEST %')`);
    await tx.execute(sql`delete from email_outbox where to_address like '%@test.invalid'`);
    await tx.execute(sql`delete from users where email like '%@test.invalid'`);
    await tx.execute(sql`delete from organizations where name like 'TEST %'`);
  });
}
