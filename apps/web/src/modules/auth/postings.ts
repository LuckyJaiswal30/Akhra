import { and, eq, ne } from 'drizzle-orm';
import type { z } from 'zod';
import { getDb, organizations, users, withoutRls } from '@akhra/db';
import {
  AppError,
  DEPARTMENT_ORG_TYPES,
  Errors,
  type reassignOfficerSchema,
  type Role,
} from '@akhra/shared';
import { logger } from '@/server/logger';
import type { Actor } from '@/server/session';
import { recordAudit } from './audit';
import { isUuid } from './tokens';

export type ReassignOfficerInput = z.output<typeof reassignOfficerSchema>;

const POSTED_ROLES = [
  'dept_officer',
  'gov_admin',
  'super_admin',
] as const satisfies readonly Role[];

interface Posting {
  role: Role;
  jurisdictionCode: string | null;
  organizationId: string | null;
}

function fieldError(field: string, message: string): never {
  throw new AppError('VALIDATION_FAILED', message, { fields: { [field]: message } });
}

function shapeOf(input: ReassignOfficerInput): Posting {
  if (input.posting === 'district') {
    if (!input.jurisdictionCode)
      fieldError('jurisdictionCode', 'Choose the district this officer is posted to.');
    return {
      role: 'gov_admin',
      jurisdictionCode: input.jurisdictionCode,
      organizationId: null,
    };
  }
  if (input.posting === 'state') {
    return { role: 'gov_admin', jurisdictionCode: null, organizationId: null };
  }
  if (!input.organizationId)
    fieldError('organizationId', 'Choose the department this officer joins.');
  return { role: 'dept_officer', jurisdictionCode: null, organizationId: input.organizationId };
}

export async function reassignOfficer(
  actor: Actor,
  targetUserId: string,
  input: ReassignOfficerInput,
): Promise<void> {
  if (actor.role !== 'super_admin') {
    throw Errors.forbidden('Only a super administrator can change an officer’s posting.');
  }
  if (!isUuid(targetUserId)) throw Errors.notFound('That account could not be found.');
  if (targetUserId === actor.userId) {
    throw Errors.forbidden(
      'You cannot change your own posting. Ask another super administrator to issue it, the way an appointment order is always signed by someone else.',
    );
  }

  const posting = shapeOf(input);

  await withoutRls(getDb(), async (tx) => {
    const [target] = await tx
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        status: users.status,
        jurisdictionCode: users.jurisdictionCode,
        organizationId: users.organizationId,
      })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);
    if (!target) throw Errors.notFound('That account could not be found.');
    if (!(POSTED_ROLES as readonly string[]).includes(target.role)) {
      throw Errors.conflict(
        'Only someone who already holds government access can be reposted. Invite them instead.',
      );
    }
    if (target.status !== 'active') {
      throw Errors.conflict('That account is suspended, so it cannot be given a new posting.');
    }

    // Reposting a super administrator removes that access. Never leave the platform without one.
    if (target.role === 'super_admin') {
      const others = await tx
        .select({ id: users.id })
        .from(users)
        .where(
          and(eq(users.role, 'super_admin'), eq(users.status, 'active'), ne(users.id, target.id)),
        );
      if (others.length === 0) {
        throw Errors.conflict(
          'This is the only super administrator left. Promote someone else first, or the platform would be left with nobody who can appoint officers.',
        );
      }
    }

    if (posting.organizationId) {
      const [organization] = await tx
        .select({ type: organizations.type })
        .from(organizations)
        .where(eq(organizations.id, posting.organizationId))
        .limit(1);
      if (!organization || !(DEPARTMENT_ORG_TYPES as readonly string[]).includes(organization.type))
        fieldError(
          'organizationId',
          'Choose a government department, not another kind of organisation.',
        );
    }

    await tx
      .update(users)
      .set({
        role: posting.role,
        jurisdictionCode: posting.jurisdictionCode,
        organizationId: posting.organizationId,
        designation: input.designation?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, target.id));

    await recordAudit(
      {
        action: 'user.reposted',
        actorId: actor.userId,
        targetEmail: target.email,
        targetUserId: target.id,
        organizationId: posting.organizationId,
        role: posting.role,
        metadata: {
          reason: input.reason,
          from: {
            role: target.role,
            jurisdictionCode: target.jurisdictionCode,
            organizationId: target.organizationId,
          },
          to: posting,
        },
      },
      tx,
    );
  });

  logger.info(
    { repostedBy: actor.userId, userId: targetUserId, posting: input.posting },
    'officer reposted',
  );
}
