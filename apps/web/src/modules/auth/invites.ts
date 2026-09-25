import { randomUUID } from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { z } from 'zod';
import { getDb, invites, organizations, users, withoutRls, type Transaction } from '@akhra/db';
import {
  AppError,
  canIssueInvite,
  DEPARTMENT_ORG_TYPES,
  Errors,
  FIRST_ADMIN_ROLE,
  GOVERNMENT_ROLES,
  ORG_ADMIN_ROLES,
  ROLE_ORGANIZATION_TYPE,
  type issueInviteSchema,
  type onboardOrganizationSchema,
  type Role,
} from '@akhra/shared';
import { queueEmail } from '@/modules/notifications';
import { revokeClerkInvitation, sendClerkInvitation } from '@/server/clerk';
import { isProductionRuntime } from '@/server/dev-only';
import { appUrl, serverEnv } from '@/server/env';
import { logger } from '@/server/logger';
import { query, type Actor } from '@/server/session';
import { recordAudit } from './audit';
import { findAccount, stateOf, type InviteState } from './invite-parts';
import { inviteEmail } from './emails';
import { isUuid, issueToken } from './tokens';

const HOUR = 60 * 60 * 1000;

export type OnboardOrganizationInput = z.output<typeof onboardOrganizationSchema>;
export type IssueInviteInput = z.output<typeof issueInviteSchema>;

export interface IssuedInvite {
  inviteId: string;
  expiresAt: Date;
  delivery: 'clerk' | 'email';
  inviteLink?: string;
}

export interface InviteRecord {
  id: string;
  email: string;
  role: Role;
  organizationId: string | null;
  organizationName: string | null;
  jurisdictionCode: string | null;
  state: InviteState;
  expiresAt: Date;
  createdAt: Date;
  redeemedAt: Date | null;
  issuedByName: string | null;
}

const isOrgAdmin = (role: Actor['role']) => (ORG_ADMIN_ROLES as readonly string[]).includes(role);

function officerScope(input: IssueInviteInput): string | null {
  if (input.role !== 'gov_admin') return null;
  if (!input.scope) {
    throw new AppError(
      'VALIDATION_FAILED',
      'Choose whether this officer covers one district or the whole state.',
      { fields: { scope: 'Choose whether this officer covers one district or the whole state.' } },
    );
  }
  if (input.scope === 'state') {
    if (input.jurisdictionCode) {
      throw new AppError('VALIDATION_FAILED', 'A state-wide officer is not tied to a district.', {
        fields: { jurisdictionCode: 'A state-wide officer is not tied to a district.' },
      });
    }
    return null;
  }
  if (!input.jurisdictionCode) {
    throw new AppError('VALIDATION_FAILED', 'Choose the district this officer is posted to.', {
      fields: { jurisdictionCode: 'Choose the district this officer is posted to.' },
    });
  }
  return input.jurisdictionCode;
}

function assertEmailFree(account: { role: Role } | null): void {
  if (!account || account.role === 'citizen') return;
  if ((GOVERNMENT_ROLES as readonly string[]).includes(account.role)) {
    throw Errors.conflict(
      'That address already holds government access. Change their district or department under “Who holds access”, rather than sending a second invitation.',
    );
  }
  throw Errors.conflict(
    'That email already belongs to an Akhra account with its own access. Use a different address.',
  );
}

async function createInviteRow(
  tx: Transaction,
  input: {
    email: string;
    role: Role;
    organizationId: string | null;
    issuedById: string | null;
    jurisdictionCode?: string | null;
    designation?: string | null;
  },
): Promise<{ id: string; token: string; expiresAt: Date; replacedClerkInvitations: string[] }> {
  const replaced = await tx
    .update(invites)
    .set({ status: 'revoked', revokedAt: new Date(), revokedById: input.issuedById })
    .where(
      and(
        eq(invites.email, input.email),
        eq(invites.status, 'pending'),
        input.organizationId
          ? eq(invites.organizationId, input.organizationId)
          : sql`${invites.organizationId} is null`,
      ),
    )
    .returning({ id: invites.id, clerkInvitationId: invites.clerkInvitationId });

  for (const previous of replaced) {
    await recordAudit(
      {
        action: 'invite.revoked',
        actorId: input.issuedById,
        targetEmail: input.email,
        organizationId: input.organizationId,
        role: input.role,
        metadata: { inviteId: previous.id, reason: 'reissued' },
      },
      tx,
    );
  }

  const id = randomUUID();
  const { token, secretHash } = issueToken(id);
  const expiresAt = new Date(Date.now() + serverEnv.INVITE_TTL_HOURS * HOUR);

  await tx.insert(invites).values({
    id,
    email: input.email,
    role: input.role,
    organizationId: input.organizationId,
    jurisdictionCode: input.jurisdictionCode ?? null,
    designation: input.designation ?? null,
    tokenHash: secretHash,
    issuedById: input.issuedById,
    expiresAt,
  });
  await recordAudit(
    {
      action: 'invite.issued',
      actorId: input.issuedById,
      targetEmail: input.email,
      organizationId: input.organizationId,
      role: input.role,
      metadata: { inviteId: id, expiresAt: expiresAt.toISOString() },
    },
    tx,
  );
  return {
    id,
    token,
    expiresAt,
    replacedClerkInvitations: replaced
      .map((r) => r.clerkInvitationId)
      .filter((v): v is string => Boolean(v)),
  };
}

async function deliverInvite(
  invite: { id: string; token: string; expiresAt: Date; replacedClerkInvitations: string[] },
  details: {
    email: string;
    role: Role;
    organizationName: string | null;
    inviterName: string | null;
  },
): Promise<Pick<IssuedInvite, 'delivery' | 'inviteLink'>> {
  await Promise.all(invite.replacedClerkInvitations.map(revokeClerkInvitation));

  const sent = await sendClerkInvitation({
    email: details.email,
    redirectUrl: `${appUrl}/invite/${invite.token}`,
    expiresInDays: Math.max(1, Math.ceil(serverEnv.INVITE_TTL_HOURS / 24)),
  });
  if (sent.channel === 'clerk') {
    await withoutRls(getDb(), (tx) =>
      tx
        .update(invites)
        .set({ clerkInvitationId: sent.invitationId })
        .where(eq(invites.id, invite.id)),
    );
    return { delivery: 'clerk' };
  }

  await queueEmail(
    details.email,
    inviteEmail({ token: invite.token, expiresAt: invite.expiresAt, ...details }),
  );
  const showLink = serverEnv.MAIL_DRIVER === 'console' && !isProductionRuntime();
  return {
    delivery: 'email',
    ...(showLink ? { inviteLink: `${appUrl}/invite/${invite.token}` } : {}),
  };
}

export async function onboardOrganization(
  actor: Actor,
  input: OnboardOrganizationInput,
): Promise<IssuedInvite & { organizationId: string }> {
  if (actor.role !== 'super_admin') {
    throw Errors.forbidden('Only a super administrator can onboard an organisation.');
  }
  const role = FIRST_ADMIN_ROLE[input.type];

  const result = await withoutRls(getDb(), async (tx) => {
    assertEmailFree(await findAccount(tx, input.contactEmail));

    const [organization] = await tx
      .insert(organizations)
      .values({
        type: input.type,
        name: input.name,
        districtCode: input.districtCode ?? null,
        agreementReference: input.agreementReference,
        contactEmail: input.contactEmail,
        partnerKind: input.partnerKind ?? null,
        onboardedById: actor.userId,
      })
      .returning({ id: organizations.id });
    if (!organization) throw new Error('The organisation could not be created.');

    await recordAudit(
      {
        action: 'org.onboarded',
        actorId: actor.userId,
        targetEmail: input.contactEmail,
        organizationId: organization.id,
        role,
        metadata: {
          name: input.name,
          type: input.type,
          agreementReference: input.agreementReference,
        },
      },
      tx,
    );

    const invite = await createInviteRow(tx, {
      email: input.contactEmail,
      role,
      organizationId: organization.id,
      issuedById: actor.userId,
    });
    return { organizationId: organization.id, ...invite };
  });

  const delivery = await deliverInvite(result, {
    email: input.contactEmail,
    role,
    organizationName: input.name,
    inviterName: actor.name,
  });
  logger.info(
    { organizationId: result.organizationId, inviteId: result.id, delivery: delivery.delivery },
    'organisation onboarded',
  );

  return {
    organizationId: result.organizationId,
    inviteId: result.id,
    expiresAt: result.expiresAt,
    ...delivery,
  };
}

export async function issueInvite(actor: Actor, input: IssueInviteInput): Promise<IssuedInvite> {
  if (!actor.userId || actor.role === 'anonymous') throw Errors.unauthenticated();

  const organizationId =
    input.organizationId ?? (isOrgAdmin(actor.role) ? actor.organizationId : null);
  const decision = canIssueInvite(
    { role: actor.role, organizationId: actor.organizationId },
    { role: input.role, organizationId },
  );
  if (!decision.allowed) throw Errors.forbidden(decision.reason);
  if (input.jurisdictionCode && input.role !== 'gov_admin') {
    throw new AppError(
      'VALIDATION_FAILED',
      'Only a government officer can be scoped to a district.',
      {
        fields: { jurisdictionCode: 'Only a government officer can be scoped to a district.' },
      },
    );
  }
  const jurisdictionCode = officerScope(input);

  const result = await withoutRls(getDb(), async (tx) => {
    let organizationName: string | null = null;
    const requiredType = ROLE_ORGANIZATION_TYPE[input.role];

    if (organizationId) {
      const [organization] = await tx
        .select({ name: organizations.name, type: organizations.type })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);
      const typeAllowed =
        input.role === 'dept_officer'
          ? (DEPARTMENT_ORG_TYPES as readonly string[]).includes(organization?.type ?? '')
          : !requiredType || organization?.type === requiredType;
      if (!organization || !typeAllowed) {
        throw new AppError('VALIDATION_FAILED', 'Choose an organisation that matches this role.', {
          fields: { organizationId: 'Choose an organisation that matches this role.' },
        });
      }
      organizationName = organization.name;
    } else if (input.role !== 'gov_admin') {
      throw new AppError('VALIDATION_FAILED', 'Choose the organisation this person will join.', {
        fields: { organizationId: 'Choose the organisation this person will join.' },
      });
    }

    assertEmailFree(await findAccount(tx, input.email));
    const invite = await createInviteRow(tx, {
      email: input.email,
      role: input.role,
      organizationId,
      issuedById: actor.userId,
      jurisdictionCode,
      designation: input.designation ?? null,
    });
    return { ...invite, organizationName };
  });

  const delivery = await deliverInvite(result, {
    email: input.email,
    role: input.role,
    organizationName: result.organizationName,
    inviterName: actor.name,
  });
  return { inviteId: result.id, expiresAt: result.expiresAt, ...delivery };
}

export async function listInvites(actor: Actor): Promise<InviteRecord[]> {
  if (actor.role !== 'super_admin' && !isOrgAdmin(actor.role)) {
    throw Errors.forbidden('Only administrators can see invitations.');
  }
  const ownOrganizationOnly = actor.role !== 'super_admin';

  const rows = await query(actor, (tx) =>
    tx
      .select({
        id: invites.id,
        email: invites.email,
        role: invites.role,
        organizationId: invites.organizationId,
        organizationName: organizations.name,
        jurisdictionCode: invites.jurisdictionCode,
        status: invites.status,
        expiresAt: invites.expiresAt,
        createdAt: invites.createdAt,
        redeemedAt: invites.redeemedAt,
        issuedByName: users.name,
      })
      .from(invites)
      .leftJoin(organizations, eq(invites.organizationId, organizations.id))
      .leftJoin(users, eq(invites.issuedById, users.id))
      .where(
        ownOrganizationOnly
          ? eq(invites.organizationId, actor.organizationId ?? randomUUID())
          : undefined,
      )
      .orderBy(desc(invites.createdAt))
      .limit(300),
  );

  return rows.map(({ status, ...row }) => ({ ...row, state: stateOf(status, row.expiresAt) }));
}

export async function revokeInvite(actor: Actor, inviteId: string): Promise<void> {
  if (!actor.userId) throw Errors.unauthenticated();
  if (actor.role !== 'super_admin' && !isOrgAdmin(actor.role)) {
    throw Errors.forbidden('Only administrators can withdraw invitations.');
  }
  if (!isUuid(inviteId)) throw Errors.notFound('That invitation could not be found.');

  const clerkInvitationId = await withoutRls(getDb(), async (tx) => {
    const [invite] = await tx.select().from(invites).where(eq(invites.id, inviteId)).limit(1);
    if (!invite) throw Errors.notFound('That invitation could not be found.');
    if (actor.role !== 'super_admin' && invite.organizationId !== actor.organizationId) {
      throw Errors.forbidden('You can only withdraw invitations from your own organisation.');
    }
    if (invite.status !== 'pending')
      throw Errors.conflict('Only a pending invitation can be withdrawn.');

    await tx
      .update(invites)
      .set({ status: 'revoked', revokedAt: new Date(), revokedById: actor.userId })
      .where(eq(invites.id, invite.id));
    await recordAudit(
      {
        action: 'invite.revoked',
        actorId: actor.userId,
        targetEmail: invite.email,
        organizationId: invite.organizationId,
        role: invite.role,
        metadata: { inviteId: invite.id, reason: 'withdrawn' },
      },
      tx,
    );
    return invite.clerkInvitationId;
  });

  if (clerkInvitationId) await revokeClerkInvitation(clerkInvitationId);
}
