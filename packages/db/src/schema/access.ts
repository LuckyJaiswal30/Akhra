import { sql } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { organizations, users } from './core';
import { inviteStatusEnum, roleEnum } from './enums';

export const invites = pgTable(
  'invites',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    role: roleEnum('role').notNull(),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    jurisdictionCode: text('jurisdiction_code'),
    designation: text('designation'),
    tokenHash: text('token_hash').notNull(),
    clerkInvitationId: text('clerk_invitation_id'),
    issuedById: uuid('issued_by_id').references(() => users.id, { onDelete: 'set null' }),
    status: inviteStatusEnum('status').notNull().default('pending'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    redeemedAt: timestamp('redeemed_at', { withTimezone: true }),
    redeemedUserId: uuid('redeemed_user_id').references(() => users.id, { onDelete: 'set null' }),
    reminderSentAt: timestamp('reminder_sent_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedById: uuid('revoked_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('invites_email_idx').on(t.email),
    index('invites_organization_idx').on(t.organizationId),
    uniqueIndex('invites_one_pending_per_email_org')
      .on(t.email, sql`coalesce(${t.organizationId}, '00000000-0000-0000-0000-000000000000'::uuid)`)
      .where(sql`status = 'pending'`),
  ],
);

export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    action: text('action').notNull(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    targetEmail: text('target_email'),
    targetUserId: uuid('target_user_id').references(() => users.id, { onDelete: 'set null' }),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
    role: roleEnum('role'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audit_events_target_email_idx').on(t.targetEmail),
    index('audit_events_action_idx').on(t.action),
    index('audit_events_created_at_idx').on(t.createdAt),
  ],
);
