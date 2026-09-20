import { eq } from 'drizzle-orm';
import { getDb, users, withoutRls } from '@akhra/db';
import type { Role } from '@akhra/shared';
import { revokeAllClerkSessions } from '@/server/clerk';
import { recordAudit } from './audit';

export interface SecurityAccount {
  id: string;
  email: string;
  role: Role;
  clerkUserId: string | null;
}

export async function accountById(userId: string): Promise<SecurityAccount | null> {
  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        clerkUserId: users.clerkUserId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
  );
  return row ?? null;
}

export async function signOutEverywhere(account: SecurityAccount): Promise<{ revoked: number }> {
  const revoked = account.clerkUserId ? await revokeAllClerkSessions(account.clerkUserId) : 0;
  await recordAudit({
    action: 'user.signed_out_everywhere',
    actorId: account.id,
    targetUserId: account.id,
    targetEmail: account.email,
    role: account.role,
    metadata: { revoked },
  });
  return { revoked };
}
