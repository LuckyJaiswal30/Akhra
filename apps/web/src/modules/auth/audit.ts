import { auditEvents, getDb, withoutRls, type Transaction } from '@akhra/db';
import type { Role } from '@akhra/shared';

export type AuditAction =
  | 'org.onboarded'
  | 'invite.issued'
  | 'invite.redeemed'
  | 'invite.revoked'
  | 'invite.redeem_rejected'
  | 'user.promoted'
  | 'user.reposted'
  | 'user.signed_up'
  | 'user.signed_out_everywhere';

export interface AuditEntry {
  action: AuditAction;
  actorId?: string | null;
  targetEmail?: string | null;
  targetUserId?: string | null;
  organizationId?: string | null;
  role?: Role | null;
  metadata?: Record<string, unknown>;
}

export async function recordAudit(entry: AuditEntry, tx?: Transaction): Promise<void> {
  const values = {
    action: entry.action,
    actorId: entry.actorId ?? null,
    targetEmail: entry.targetEmail ?? null,
    targetUserId: entry.targetUserId ?? null,
    organizationId: entry.organizationId ?? null,
    role: entry.role ?? null,
    metadata: entry.metadata ?? null,
  };
  if (tx) {
    await tx.insert(auditEvents).values(values);
    return;
  }
  await withoutRls(getDb(), (t) => t.insert(auditEvents).values(values));
}
