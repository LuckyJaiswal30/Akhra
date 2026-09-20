import { eq } from 'drizzle-orm';
import { getDb, users, withoutRls } from '@akhra/db';
import { Errors } from '@akhra/shared';
import { logger } from '@/server/logger';
import type { Actor } from '@/server/session';
import { recordAudit } from './audit';
import { isUuid } from './tokens';

export async function promoteToSuperAdmin(actor: Actor, targetUserId: string): Promise<void> {
  if (actor.role !== 'super_admin') {
    throw Errors.forbidden(
      'Only a super administrator can promote someone to super administrator.',
    );
  }
  if (!isUuid(targetUserId)) throw Errors.notFound('That account could not be found.');

  await withoutRls(getDb(), async (tx) => {
    const [target] = await tx
      .select({ id: users.id, email: users.email, role: users.role, status: users.status })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);
    if (!target) throw Errors.notFound('That account could not be found.');
    if (target.role !== 'gov_admin' || target.status !== 'active') {
      throw Errors.conflict(
        'Only an active government administrator can be promoted to super administrator.',
      );
    }

    await tx
      .update(users)
      .set({ role: 'super_admin', updatedAt: new Date() })
      .where(eq(users.id, target.id));
    await recordAudit(
      {
        action: 'user.promoted',
        actorId: actor.userId,
        targetEmail: target.email,
        targetUserId: target.id,
        role: 'super_admin',
        metadata: { from: 'gov_admin' },
      },
      tx,
    );
  });
  logger.info({ promotedBy: actor.userId, userId: targetUserId }, 'user promoted to super_admin');
}
