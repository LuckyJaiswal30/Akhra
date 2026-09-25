import { and, eq } from 'drizzle-orm';
import { getDb, invites, organizations, users, withoutRls } from '@akhra/db';
import { AppError, Errors, type Role } from '@akhra/shared';
import { revokeClerkInvitation } from '@/server/clerk';
import { logger } from '@/server/logger';
import { consumeRateLimit, rateLimitedError } from '@/server/rate-limit';
import { type Actor } from '@/server/session';
import { recordAudit } from './audit';
import { findAccount, stateOf, type InviteState } from './invite-parts';
import { parseToken, secretMatches } from './tokens';

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ACCEPT_ATTEMPTS_PER_IP = 30;

export interface InvitePreview {
  state: InviteState | 'invalid';
  email?: string;
  role?: Role;
  organizationName?: string | null;
  jurisdictionCode?: string | null;
  designation?: string | null;
  expiresAt?: Date;
  hasAccount?: boolean;
}

export async function previewInvite(token: string): Promise<InvitePreview> {
  const parsed = parseToken(token);
  if (!parsed) return { state: 'invalid' };

  const preview = await withoutRls(getDb(), async (tx) => {
    const [invite] = await tx
      .select({
        email: invites.email,
        role: invites.role,
        status: invites.status,
        expiresAt: invites.expiresAt,
        tokenHash: invites.tokenHash,
        jurisdictionCode: invites.jurisdictionCode,
        designation: invites.designation,
        organizationName: organizations.name,
      })
      .from(invites)
      .leftJoin(organizations, eq(invites.organizationId, organizations.id))
      .where(eq(invites.id, parsed.id))
      .limit(1);
    if (!invite || !secretMatches(parsed.secret, invite.tokenHash)) return null;
    return { ...invite, hasAccount: Boolean(await findAccount(tx, invite.email)) };
  });
  if (!preview) return { state: 'invalid' };

  return {
    state: stateOf(preview.status, preview.expiresAt),
    email: preview.email,
    role: preview.role,
    organizationName: preview.organizationName,
    jurisdictionCode: preview.jurisdictionCode,
    designation: preview.designation,
    expiresAt: preview.expiresAt,
    hasAccount: preview.hasAccount,
  };
}

const INVALID_INVITE =
  'This invitation link is not valid. Ask whoever invited you to send a new one.';

export async function acceptInvite(
  actor: Actor,
  token: string,
  meta: { ip: string },
): Promise<{ role: Role; organizationId: string | null }> {
  const userId = actor.userId;
  if (!userId || !actor.email) {
    throw Errors.unauthenticated(
      'Sign in with the invited email address to accept this invitation.',
    );
  }

  const limit = await consumeRateLimit(
    `accept-invite-ip:${meta.ip}`,
    ACCEPT_ATTEMPTS_PER_IP,
    FIFTEEN_MINUTES,
  );
  if (!limit.allowed) throw rateLimitedError(limit.resetAt, 'invitation attempts');

  const parsed = parseToken(token);
  if (!parsed) throw new AppError('INVITE_INVALID', INVALID_INVITE);

  const db = getDb();
  const [invite] = await withoutRls(db, (tx) =>
    tx.select().from(invites).where(eq(invites.id, parsed.id)).limit(1),
  );
  if (!invite || !secretMatches(parsed.secret, invite.tokenHash)) {
    throw new AppError('INVITE_INVALID', INVALID_INVITE);
  }

  const reject = async (
    code: AppError['code'],
    message: string,
    reason: string,
  ): Promise<never> => {
    await recordAudit({
      action: 'invite.redeem_rejected',
      actorId: actor.userId,
      targetEmail: invite.email,
      organizationId: invite.organizationId,
      role: invite.role,
      metadata: { inviteId: invite.id, reason },
    });
    throw new AppError(code, message);
  };

  if (invite.status === 'revoked') {
    await reject(
      'INVITE_REVOKED',
      'This invitation was withdrawn. Ask for a new one if you still need access.',
      'revoked',
    );
  }
  if (invite.status === 'redeemed') {
    await reject('INVITE_ALREADY_USED', 'This invitation has already been used.', 'already_used');
  }
  if (invite.expiresAt <= new Date()) {
    const when = invite.expiresAt.toLocaleString('en-IN', {
      dateStyle: 'long',
      timeZone: 'Asia/Kolkata',
    });
    await reject(
      'INVITE_EXPIRED',
      `This invitation expired on ${when}. Ask whoever invited you to send a new one.`,
      'expired',
    );
  }
  if (actor.email.toLowerCase() !== invite.email) {
    await reject(
      'INVITE_EMAIL_MISMATCH',
      'This invitation was sent to a different email address. Sign out and sign in with the address it was sent to.',
      'email_mismatch',
    );
  }
  if (actor.role !== 'citizen') {
    await reject(
      'CONFLICT',
      'Your account already has its own Akhra access, so this invitation cannot be added to it.',
      'has_access',
    );
  }

  await withoutRls(db, async (tx) => {
    const claimed = await tx
      .update(invites)
      .set({ status: 'redeemed', redeemedAt: new Date(), redeemedUserId: actor.userId })
      .where(and(eq(invites.id, invite.id), eq(invites.status, 'pending')))
      .returning({ id: invites.id });
    if (claimed.length === 0)
      throw new AppError('INVITE_ALREADY_USED', 'This invitation has already been used.');

    await tx
      .update(users)
      .set({
        role: invite.role,
        organizationId: invite.role === 'gov_admin' ? null : invite.organizationId,
        jurisdictionCode: invite.role === 'gov_admin' ? invite.jurisdictionCode : null,
        designation: invite.designation ?? undefined,
        invitedById: invite.issuedById,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await recordAudit(
      {
        action: 'invite.redeemed',
        actorId: actor.userId,
        targetEmail: invite.email,
        targetUserId: actor.userId,
        organizationId: invite.organizationId,
        role: invite.role,
        metadata: { inviteId: invite.id, jurisdictionCode: invite.jurisdictionCode },
      },
      tx,
    );
  });

  if (invite.clerkInvitationId) await revokeClerkInvitation(invite.clerkInvitationId);
  logger.info(
    { userId: actor.userId, role: invite.role, organizationId: invite.organizationId },
    'invite accepted',
  );
  return { role: invite.role, organizationId: invite.organizationId };
}
