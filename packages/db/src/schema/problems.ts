import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { districts, organizations, users } from './core';
import {
  affectedScaleEnum,
  attachmentKindEnum,
  classifierTierEnum,
  domainEnum,
  entityTypeEnum,
  priorityLevelEnum,
  priorityReasonEnum,
  problemStatusEnum,
  resolutionTrackEnum,
  routingResponseEnum,
  submitterTypeEnum,
} from './enums';

export const problems = pgTable(
  'problems',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    refCode: text('ref_code').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),

    domain: domainEnum('domain'),
    domainConfidence: real('domain_confidence'),
    classifiedBy: classifierTierEnum('classified_by'),
    classifierAlternatives:
      jsonb('classifier_alternatives').$type<{ domain: string; score: number }[]>(),

    status: problemStatusEnum('status').notNull().default('submitted'),
    duplicateOfId: uuid('duplicate_of_id'),

    districtCode: text('district_code')
      .notNull()
      .references(() => districts.code, { onDelete: 'restrict' }),
    blockName: text('block_name'),
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),

    submitterId: uuid('submitter_id').references(() => users.id, { onDelete: 'set null' }),
    submitterType: submitterTypeEnum('submitter_type').notNull().default('individual'),
    submitterName: text('submitter_name').notNull(),
    submitterPhone: text('submitter_phone').notNull(),
    submitterEmail: text('submitter_email'),
    submitterOrganization: text('submitter_organization'),
    locale: text('locale').notNull().default('en'),
    affectedScale: affectedScaleEnum('affected_scale'),
    safetyRisk: boolean('safety_risk').notNull().default(false),
    supportCount: integer('support_count').notNull().default(0),
    priorityScore: integer('priority_score').notNull().default(10),
    priority: priorityLevelEnum('priority').notNull().default('low'),
    priorityRefreshedAt: timestamp('priority_refreshed_at', { withTimezone: true }),
    priorityReasons: priorityReasonEnum('priority_reasons')
      .array()
      .notNull()
      .default(sql`'{}'`),

    isPublic: boolean('is_public').notNull().default(true),

    validatedById: uuid('validated_by_id').references(() => users.id, { onDelete: 'set null' }),
    validatedAt: timestamp('validated_at', { withTimezone: true }),

    duplicateCandidates:
      jsonb('duplicate_candidates').$type<
        { refCode: string; title: string; similarity: number; problemId: string }[]
      >(),
    escalatedAt: timestamp('escalated_at', { withTimezone: true }),

    resolutionTrack: resolutionTrackEnum('resolution_track'),
    assignedOrgId: uuid('assigned_org_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
    assignedById: uuid('assigned_by_id').references(() => users.id, { onDelete: 'set null' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }),
    dueAt: timestamp('due_at', { withTimezone: true }),
    interimUpdateAt: timestamp('interim_update_at', { withTimezone: true }),
    interimReminderSentAt: timestamp('interim_reminder_sent_at', { withTimezone: true }),
    overdueReminderSentAt: timestamp('overdue_reminder_sent_at', { withTimezone: true }),

    actionTakenNote: text('action_taken_note'),
    actionTakenAt: timestamp('action_taken_at', { withTimezone: true }),
    actionTakenById: uuid('action_taken_by_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    reopenedAt: timestamp('reopened_at', { withTimezone: true }),
    reopenCount: integer('reopen_count').notNull().default(0),
    reporterNote: text('reporter_note'),
    contentFingerprint: text('content_fingerprint'),
    transferredFromCode: text('transferred_from_code'),
    transferredAt: timestamp('transferred_at', { withTimezone: true }),
    transferredById: uuid('transferred_by_id').references(() => users.id, { onDelete: 'set null' }),
    transferCount: integer('transfer_count').notNull().default(0),
    contactErasedAt: timestamp('contact_erased_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('problems_ref_code_unique').on(t.refCode),
    index('problems_status_idx').on(t.status),
    index('problems_domain_idx').on(t.domain),
    index('problems_district_idx').on(t.districtCode),
    index('problems_fingerprint_idx').on(t.contentFingerprint),
    index('problems_created_at_idx').on(t.createdAt),
    index('problems_submitter_idx').on(t.submitterId),
    index('problems_assigned_org_idx').on(t.assignedOrgId),
    index('problems_due_at_idx').on(t.dueAt),
    index('problems_priority_idx').on(t.priorityScore),
  ],
);

export const problemSupports = pgTable(
  'problem_supports',
  {
    problemId: uuid('problem_id')
      .notNull()
      .references(() => problems.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.problemId, t.userId] }),
    index('problem_supports_user_idx').on(t.userId),
  ],
);

export const refCodeCounters = pgTable('ref_code_counters', {
  year: integer('year').primaryKey(),
  lastSequence: bigint('last_sequence', { mode: 'number' }).notNull().default(0),
});

export const problemAttachments = pgTable(
  'problem_attachments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    problemId: uuid('problem_id').references(() => problems.id, { onDelete: 'cascade' }),
    kind: attachmentKindEnum('kind').notNull(),
    storageKey: text('storage_key').notNull(),
    originalName: text('original_name').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    uploadedById: uuid('uploaded_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('problem_attachments_problem_idx').on(t.problemId)],
);

export const problemRoutings = pgTable(
  'problem_routings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    problemId: uuid('problem_id')
      .notNull()
      .references(() => problems.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    matchScore: real('match_score').notNull().default(0),
    matchRationale: text('match_rationale'),
    brief: text('brief'),
    response: routingResponseEnum('response').notNull().default('proposed'),
    responseNote: text('response_note'),
    respondedById: uuid('responded_by_id').references(() => users.id, { onDelete: 'set null' }),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    routedById: uuid('routed_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('problem_routings_unique').on(t.problemId, t.organizationId),
    index('problem_routings_org_idx').on(t.organizationId),
    index('problem_routings_response_idx').on(t.response),
  ],
);

export const statusEvents = pgTable(
  'status_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    entityType: entityTypeEnum('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    problemId: uuid('problem_id').references(() => problems.id, { onDelete: 'cascade' }),
    fromStatus: text('from_status'),
    toStatus: text('to_status').notNull(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    actorLabel: text('actor_label'),
    note: text('note'),
    isPublic: boolean('is_public').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('status_events_entity_idx').on(t.entityType, t.entityId),
    index('status_events_problem_idx').on(t.problemId),
    index('status_events_created_at_idx').on(t.createdAt),
  ],
);

export const classificationCache = pgTable(
  'classification_cache',
  {
    inputHash: text('input_hash').primaryKey(),
    domain: domainEnum('domain').notNull(),
    confidence: real('confidence').notNull(),
    tier: classifierTierEnum('tier').notNull(),
    alternatives: jsonb('alternatives').$type<{ domain: string; score: number }[]>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('classification_cache_created_at_idx').on(t.createdAt)],
);

export const problemsRelations = relations(problems, ({ one, many }) => ({
  district: one(districts, { fields: [problems.districtCode], references: [districts.code] }),
  submitter: one(users, { fields: [problems.submitterId], references: [users.id] }),
  validatedBy: one(users, { fields: [problems.validatedById], references: [users.id] }),
  duplicateOf: one(problems, {
    fields: [problems.duplicateOfId],
    references: [problems.id],
    relationName: 'duplicate',
  }),
  attachments: many(problemAttachments),
  routings: many(problemRoutings),
  events: many(statusEvents),
}));

export const problemAttachmentsRelations = relations(problemAttachments, ({ one }) => ({
  problem: one(problems, { fields: [problemAttachments.problemId], references: [problems.id] }),
}));

export const problemRoutingsRelations = relations(problemRoutings, ({ one }) => ({
  problem: one(problems, { fields: [problemRoutings.problemId], references: [problems.id] }),
  organization: one(organizations, {
    fields: [problemRoutings.organizationId],
    references: [organizations.id],
  }),
}));

export const statusEventsRelations = relations(statusEvents, ({ one }) => ({
  problem: one(problems, { fields: [statusEvents.problemId], references: [problems.id] }),
  actor: one(users, { fields: [statusEvents.actorId], references: [users.id] }),
}));
