import { relations, sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  academicDisciplineEnum,
  domainEnum,
  institutionFacilityEnum,
  organizationTypeEnum,
  partnerKindEnum,
  roleEnum,
  userStatusEnum,
} from './enums';

export const districts = pgTable('districts', {
  code: text('code').primaryKey(),
  nameEn: text('name_en').notNull(),
  nameHi: text('name_hi').notNull(),
  division: text('division').notNull(),
  headquarters: text('headquarters').notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
});

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    type: organizationTypeEnum('type').notNull(),
    name: text('name').notNull(),
    shortName: text('short_name'),
    description: text('description'),
    districtCode: text('district_code').references(() => districts.code, { onDelete: 'set null' }),
    address: text('address'),
    websiteUrl: text('website_url'),
    contactEmail: text('contact_email'),
    agreementReference: text('agreement_reference'),
    partnerKind: partnerKindEnum('partner_kind'),
    disciplines: academicDisciplineEnum('disciplines')
      .array()
      .notNull()
      .default(sql`'{}'`),
    facilities: institutionFacilityEnum('facilities')
      .array()
      .notNull()
      .default(sql`'{}'`),
    onboardedById: uuid('onboarded_by_id').references((): AnyPgColumn => users.id, {
      onDelete: 'set null',
    }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('organizations_type_idx').on(t.type),
    index('organizations_district_idx').on(t.districtCode),
    check(
      'organizations_partner_kind_industry_only',
      sql`(${t.type} = 'industry') = (${t.partnerKind} is not null)`,
    ),
  ],
);

export const organizationDomains = pgTable(
  'organization_domains',
  {
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    domain: domainEnum('domain').notNull(),
    strength: integer('strength').notNull().default(3),
  },
  (t) => [
    primaryKey({ columns: [t.organizationId, t.domain] }),
    index('organization_domains_domain_idx').on(t.domain),
  ],
);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name'),
    email: text('email').notNull(),
    image: text('image'),
    clerkUserId: text('clerk_user_id'),
    role: roleEnum('role').notNull().default('citizen'),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
    phone: text('phone'),
    districtCode: text('district_code'),
    jurisdictionCode: text('jurisdiction_code'),
    locality: text('locality'),
    designation: text('designation'),
    /** The faculty member's department, from a fixed list so routing can match it. */
    discipline: academicDisciplineEnum('discipline'),
    /** What they work on within it, in their own words: "groundwater hydrology". */
    specialisation: text('specialisation'),
    locale: text('locale').notNull().default('en'),
    privacyAcceptedAt: timestamp('privacy_accepted_at', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),
    status: userStatusEnum('status').notNull().default('active'),
    invitedById: uuid('invited_by_id').references((): AnyPgColumn => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('users_email_unique').on(sql`lower(${t.email})`),
    uniqueIndex('users_clerk_user_id_unique').on(t.clerkUserId),
    index('users_organization_idx').on(t.organizationId),
    index('users_role_idx').on(t.role),
    check(
      'users_jurisdiction_gov_only',
      sql`${t.jurisdictionCode} is null or ${t.role} = 'gov_admin'`,
    ),
    check(
      'users_org_role_needs_org',
      sql`${t.role} not in ('university_admin', 'faculty', 'student', 'industry_admin', 'industry_partner', 'dept_officer') or ${t.organizationId} is not null`,
    ),
    check(
      'users_district_officer_has_no_department',
      sql`${t.role} <> 'gov_admin' or ${t.organizationId} is null`,
    ),
  ],
);

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  district: one(districts, {
    fields: [organizations.districtCode],
    references: [districts.code],
  }),
  domains: many(organizationDomains),
  members: many(users),
}));

export const organizationDomainsRelations = relations(organizationDomains, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationDomains.organizationId],
    references: [organizations.id],
  }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
}));

export const districtsRelations = relations(districts, ({ many }) => ({
  organizations: many(organizations),
}));
