import { and, eq, isNull, sql } from 'drizzle-orm';
import { auditEvents, getDb, users, withoutRls, type Transaction } from '@akhra/db';
import type { Role } from '@akhra/shared';
import { fetchClerkIdentity, type ClerkIdentity } from './clerk';
import { logger } from './logger';

export interface Account {
  id: string;
  role: Role;
  organizationId: string | null;
  jurisdictionCode: string | null;
  name: string | null;
  image: string | null;
  email: string;
  status: 'active' | 'suspended';
}

const columns = {
  id: users.id,
  role: users.role,
  organizationId: users.organizationId,
  jurisdictionCode: users.jurisdictionCode,
  name: users.name,
  image: users.image,
  email: users.email,
  status: users.status,
  clerkUserId: users.clerkUserId,
};

function toAccount({
  clerkUserId: _clerkUserId,
  ...account
}: Account & { clerkUserId: string | null }): Account {
  return account;
}

async function findLinked(clerkUserId: string): Promise<Account | null> {
  const [row] = await withoutRls(getDb(), (tx) =>
    tx.select(columns).from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1),
  );
  return row ? toAccount(row) : null;
}

async function audit(
  tx: Transaction,
  action: string,
  account: { id: string; role: Role; email: string },
  metadata: Record<string, unknown>,
) {
  await tx.insert(auditEvents).values({
    action,
    actorId: account.id,
    targetEmail: account.email,
    targetUserId: account.id,
    role: account.role,
    metadata,
  });
}

export async function linkOrCreate(identity: ClerkIdentity): Promise<Account | null> {
  if (!identity.email || !identity.emailVerified) {
    logger.warn(
      { clerkUserId: identity.clerkUserId },
      'Clerk user has no verified primary email; treated as signed out',
    );
    return null;
  }
  const email = identity.email;

  return withoutRls(getDb(), async (tx) => {
    const [existing] = await tx
      .select(columns)
      .from(users)
      .where(eq(sql`lower(${users.email})`, email))
      .limit(1);

    if (existing) {
      if (existing.clerkUserId && existing.clerkUserId !== identity.clerkUserId) {
        logger.warn(
          { userId: existing.id },
          'email already linked to a different Clerk user; refusing to relink',
        );
        return null;
      }
      if (!existing.clerkUserId) {
        const linked = await tx
          .update(users)
          .set({
            clerkUserId: identity.clerkUserId,
            name: existing.name ?? identity.name,
            image: identity.imageUrl,
            phone: sql`coalesce(${users.phone}, ${identity.signup.phone})`,
            districtCode: sql`coalesce(${users.districtCode}, ${identity.signup.districtCode})`,
            privacyAcceptedAt: sql`coalesce(${users.privacyAcceptedAt}, ${identity.signup.acceptedPrivacyAt?.toISOString() ?? null}::timestamptz)`,
            updatedAt: new Date(),
          })
          .where(and(eq(users.id, existing.id), isNull(users.clerkUserId)))
          .returning({ id: users.id });
        if (linked.length > 0)
          await audit(tx, 'user.linked', existing, { clerkUserId: identity.clerkUserId });
      }
      return toAccount(existing);
    }

    const [created] = await tx
      .insert(users)
      .values({
        email,
        name: identity.name,
        image: identity.imageUrl,
        clerkUserId: identity.clerkUserId,
        role: 'citizen',
        status: 'active',
        phone: identity.signup.phone,
        districtCode: identity.signup.districtCode,
        privacyAcceptedAt: identity.signup.acceptedPrivacyAt,
      })
      .onConflictDoNothing()
      .returning(columns);
    if (!created) {
      const [raced] = await tx
        .select(columns)
        .from(users)
        .where(eq(users.clerkUserId, identity.clerkUserId))
        .limit(1);
      return raced ? toAccount(raced) : null;
    }
    await audit(tx, 'user.signed_up', created, { via: 'clerk' });
    return toAccount(created);
  });
}

export async function accountForClerkUser(
  clerkUserId: string,
  loadIdentity: (id: string) => Promise<ClerkIdentity | null> = fetchClerkIdentity,
): Promise<Account | null> {
  const linked = await findLinked(clerkUserId);
  if (linked) return linked;
  const identity = await loadIdentity(clerkUserId);
  return identity ? linkOrCreate(identity) : null;
}

export async function applyClerkUpdate(identity: ClerkIdentity): Promise<void> {
  const account = await findLinked(identity.clerkUserId);
  if (!account) {
    await linkOrCreate(identity);
    return;
  }
  if ((identity.name && identity.name !== account.name) || identity.imageUrl !== account.image) {
    await withoutRls(getDb(), (tx) =>
      tx
        .update(users)
        .set({
          name: identity.name ?? account.name,
          image: identity.imageUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, account.id)),
    );
  }
  if (!identity.email || !identity.emailVerified || identity.email === account.email.toLowerCase())
    return;

  await withoutRls(getDb(), async (tx) => {
    const [taken] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(sql`lower(${users.email})`, identity.email!))
      .limit(1);
    if (taken) {
      logger.warn(
        { userId: account.id },
        'Clerk email change collides with another account; kept the old address',
      );
      return;
    }
    await tx
      .update(users)
      .set({ email: identity.email!, updatedAt: new Date() })
      .where(eq(users.id, account.id));
    await audit(tx, 'user.email_changed', account, { from: account.email, to: identity.email });
  });
}

export async function detachClerkUser(clerkUserId: string): Promise<void> {
  const account = await findLinked(clerkUserId);
  if (!account) return;
  await withoutRls(getDb(), async (tx) => {
    await tx
      .update(users)
      .set({ clerkUserId: null, status: 'suspended', updatedAt: new Date() })
      .where(eq(users.id, account.id));
    await audit(tx, 'user.deleted_in_clerk', account, { clerkUserId });
  });
}
