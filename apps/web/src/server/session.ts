import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { cache } from 'react';
import { ANONYMOUS, getDb, withUserContext, type Transaction } from '@akhra/db';
import { AppError, type Role } from '@akhra/shared';
import { accountForClerkUser } from './identity';
import { signInEnabled } from './sign-in-mode';

export interface Actor {
  userId: string | null;
  role: Role | 'anonymous';
  organizationId: string | null;
  jurisdiction: string | null;
  name: string | null;
  email: string | null;
}

export const ANONYMOUS_ACTOR: Actor = {
  userId: null,
  role: 'anonymous',
  organizationId: null,
  jurisdiction: null,
  name: null,
  email: null,
};

class UnauthorizedError extends AppError {
  constructor(message = 'Please sign in to continue.') {
    super('UNAUTHENTICATED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to do this.') {
    super('FORBIDDEN', message);
  }
}

export const getActor = cache(async (): Promise<Actor> => {
  if (!signInEnabled) {
    // Who is asking is a per-request question even when the answer is always "nobody".
    await connection();
    return ANONYMOUS_ACTOR;
  }
  const { userId } = await auth();
  if (!userId) return ANONYMOUS_ACTOR;

  const account = await accountForClerkUser(userId);
  if (!account || account.status !== 'active') return ANONYMOUS_ACTOR;

  return {
    userId: account.id,
    role: account.role,
    organizationId: account.organizationId,
    jurisdiction: account.role === 'gov_admin' ? account.jurisdictionCode : null,
    name: account.name,
    email: account.email,
  };
});

export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor.userId) throw new UnauthorizedError();
  return actor;
}

export async function requireRole(...allowed: Role[]): Promise<Actor> {
  const actor = await requireActor();
  if (!allowed.includes(actor.role as Role)) {
    throw new ForbiddenError('Your account does not have access to this.');
  }
  return actor;
}

export async function requirePageRole(...allowed: Role[]): Promise<Actor> {
  const actor = await getActor();
  if (!actor.userId) redirect('/sign-in');
  if (!allowed.includes(actor.role as Role)) redirect('/dashboard');
  return actor;
}

function inJurisdiction(actor: Actor, districtCode: string): boolean {
  return !(actor.role === 'gov_admin' && actor.jurisdiction && actor.jurisdiction !== districtCode);
}

export function assertJurisdiction(actor: Actor, districtCode: string): void {
  if (!inJurisdiction(actor, districtCode)) {
    throw new ForbiddenError(
      'This report is in another district. Only that district’s officer can act on it.',
    );
  }
}

function assertDepartment(actor: Actor, assignedOrgId: string | null): void {
  if (actor.role !== 'dept_officer') return;
  if (!actor.organizationId || assignedOrgId !== actor.organizationId) {
    throw new ForbiddenError('This report is assigned to another department.');
  }
}

export function assertCanAct(
  actor: Actor,
  problem: { districtCode: string; assignedOrgId: string | null },
): void {
  assertDepartment(actor, problem.assignedOrgId);
  if (actor.role !== 'dept_officer') assertJurisdiction(actor, problem.districtCode);
}

export function isAdmin(actor: Actor): boolean {
  return actor.role === 'gov_admin' || actor.role === 'super_admin';
}

export function canOverseeDistrict(actor: Actor, districtCode: string): boolean {
  return isAdmin(actor) && inJurisdiction(actor, districtCode);
}

export async function query<T>(actor: Actor, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  const ctx = actor.userId ? { userId: actor.userId, role: actor.role } : ANONYMOUS;
  return withUserContext(getDb(), ctx, fn);
}

export function queryAsAnonymous<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return withUserContext(getDb(), ANONYMOUS, fn);
}
