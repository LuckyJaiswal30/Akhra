import { relations, sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { organizations, users } from './core';
import { problems } from './problems';
import {
  interestStatusEnum,
  ipStatusEnum,
  testResultEnum,
  milestoneStatusEnum,
  offerTypeEnum,
  outcomeTypeEnum,
  problemStatusEnum,
  projectMemberRoleEnum,
  proposalStatusEnum,
} from './enums';

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    problemId: uuid('problem_id')
      .notNull()
      .references(() => problems.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    status: problemStatusEnum('status').notNull().default('in_progress'),
    facultyMentorId: uuid('faculty_mentor_id').references(() => users.id, { onDelete: 'set null' }),
    createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('projects_problem_idx').on(t.problemId),
    index('projects_organization_idx').on(t.organizationId),
    index('projects_status_idx').on(t.status),
  ],
);

export const projectMembers = pgTable(
  'project_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    memberRole: projectMemberRoleEnum('member_role').notNull(),
    discipline: text('discipline'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('project_members_unique').on(t.projectId, t.userId),
    index('project_members_user_idx').on(t.userId),
  ],
);

export const proposals = pgTable(
  'proposals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    version: integer('version').notNull().default(1),
    abstract: text('abstract').notNull(),
    methodology: text('methodology').notNull(),
    expectedOutcomes: text('expected_outcomes').notNull(),
    timelineMonths: integer('timeline_months').notNull(),
    budgetEstimate: numeric('budget_estimate', { precision: 14, scale: 2 }),
    status: proposalStatusEnum('status').notNull().default('submitted'),
    submittedById: uuid('submitted_by_id').references(() => users.id, { onDelete: 'set null' }),
    reviewedById: uuid('reviewed_by_id').references(() => users.id, { onDelete: 'set null' }),
    reviewNote: text('review_note'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('proposals_project_version_unique').on(t.projectId, t.version),
    index('proposals_status_idx').on(t.status),
  ],
);

export const milestones = pgTable(
  'milestones',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    orderIndex: integer('order_index').notNull().default(0),
    status: milestoneStatusEnum('status').notNull().default('pending'),
    dueDate: timestamp('due_date', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    approvedById: uuid('approved_by_id').references(() => users.id, { onDelete: 'set null' }),
    reminderSentAt: timestamp('reminder_sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('milestones_project_idx').on(t.projectId),
    index('milestones_status_idx').on(t.status),
  ],
);

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    milestoneId: uuid('milestone_id').references(() => milestones.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    storageKey: text('storage_key').notNull(),
    originalName: text('original_name').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    uploadedById: uuid('uploaded_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('documents_project_idx').on(t.projectId),
    index('documents_milestone_idx').on(t.milestoneId),
  ],
);

export const industryInterests = pgTable(
  'industry_interests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    offerTypes: offerTypeEnum('offer_types').array().notNull(),
    fundingAmount: numeric('funding_amount', { precision: 14, scale: 2 }),
    message: text('message').notNull(),
    status: interestStatusEnum('status').notNull().default('expressed'),
    responseNote: text('response_note'),
    createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    respondedById: uuid('responded_by_id').references(() => users.id, { onDelete: 'set null' }),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('industry_interests_unique').on(t.projectId, t.organizationId),
    index('industry_interests_org_idx').on(t.organizationId),
    index('industry_interests_status_idx').on(t.status),
  ],
);

export const outcomes = pgTable(
  'outcomes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    outcomeType: outcomeTypeEnum('outcome_type').notNull(),
    title: text('title').notNull(),
    detail: text('detail'),
    evidenceUrl: text('evidence_url'),
    impactMetricName: text('impact_metric_name'),
    impactMetricValue: numeric('impact_metric_value', { precision: 14, scale: 2 }),
    /** The office's number for a patent, a DOI for a publication, a registration for a startup. */
    reference: text('reference'),
    ipStatus: ipStatusEnum('ip_status'),
    recordedById: uuid('recorded_by_id').references(() => users.id, { onDelete: 'set null' }),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('outcomes_project_idx').on(t.projectId),
    index('outcomes_type_idx').on(t.outcomeType),
    check(
      'outcomes_ip_status_patent_only',
      sql`${t.ipStatus} is null or ${t.outcomeType} = 'patent'`,
    ),
  ],
);

/** What the team tested, how, and what it showed. Failed tests are kept: they are evidence too. */
export const projectTests = pgTable(
  'project_tests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    milestoneId: uuid('milestone_id').references(() => milestones.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    method: text('method').notNull(),
    result: testResultEnum('result').notNull(),
    findings: text('findings').notNull(),
    conductedOn: date('conducted_on', { mode: 'date' }).notNull(),
    recordedById: uuid('recorded_by_id').references(() => users.id, { onDelete: 'set null' }),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('project_tests_project_idx').on(t.projectId)],
);

export const projectsRelations = relations(projects, ({ one, many }) => ({
  problem: one(problems, { fields: [projects.problemId], references: [problems.id] }),
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  facultyMentor: one(users, { fields: [projects.facultyMentorId], references: [users.id] }),
  members: many(projectMembers),
  proposals: many(proposals),
  milestones: many(milestones),
  documents: many(documents),
  interests: many(industryInterests),
  outcomes: many(outcomes),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, { fields: [projectMembers.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectMembers.userId], references: [users.id] }),
}));

export const proposalsRelations = relations(proposals, ({ one }) => ({
  project: one(projects, { fields: [proposals.projectId], references: [projects.id] }),
}));

export const milestonesRelations = relations(milestones, ({ one, many }) => ({
  project: one(projects, { fields: [milestones.projectId], references: [projects.id] }),
  documents: many(documents),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  project: one(projects, { fields: [documents.projectId], references: [projects.id] }),
  milestone: one(milestones, { fields: [documents.milestoneId], references: [milestones.id] }),
}));

export const industryInterestsRelations = relations(industryInterests, ({ one }) => ({
  project: one(projects, { fields: [industryInterests.projectId], references: [projects.id] }),
  organization: one(organizations, {
    fields: [industryInterests.organizationId],
    references: [organizations.id],
  }),
}));

export const outcomesRelations = relations(outcomes, ({ one }) => ({
  project: one(projects, { fields: [outcomes.projectId], references: [projects.id] }),
}));
