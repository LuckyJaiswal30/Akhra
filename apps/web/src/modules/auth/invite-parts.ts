import { eq, sql } from 'drizzle-orm';
import { users, type Transaction } from '@akhra/db';

export type InviteState = 'pending' | 'expired' | 'redeemed' | 'revoked';

export function stateOf(status: 'pending' | 'redeemed' | 'revoked', expiresAt: Date): InviteState {
  return status === 'pending' && expiresAt <= new Date() ? 'expired' : status;
}

export async function findAccount(tx: Transaction, email: string) {
  const [row] = await tx
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(sql`lower(${users.email})`, email))
    .limit(1);
  return row ?? null;
}
