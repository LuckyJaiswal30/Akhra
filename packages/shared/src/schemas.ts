import { z } from 'zod';
import { DOMAINS } from './domains';
import { ACADEMIC_DISCIPLINES, INSTITUTION_FACILITIES } from './expertise';
import { AFFECTED_SCALES } from './priority';
import { DISTRICT_CODES, JHARKHAND_BOUNDS } from './districts';
import { ROLES, ORGANIZATION_TYPES, PARTNER_KINDS } from './roles';
import {
  PROBLEM_STATUSES,
  ROUTING_RESPONSES,
  INTEREST_STATUSES,
  MILESTONE_STATUSES,
  PROPOSAL_DECISIONS,
  PROPOSAL_SUBMISSION_STATUSES,
} from './status-machine';

export const domainSchema = z.enum(DOMAINS);
export const roleSchema = z.enum(ROLES);
export const organizationTypeSchema = z.enum(ORGANIZATION_TYPES);
export const problemStatusSchema = z.enum(PROBLEM_STATUSES);
export const districtCodeSchema = z.enum(DISTRICT_CODES as [string, ...string[]], {
  error: 'Choose your district.',
});

export const indianPhoneSchema = z
  .string({ error: 'Enter your 10-digit mobile number.' })
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');

export const refCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^AKH-\d{4}-\d{6}$/, 'Reference code looks like AKH-2026-000123');

export const latLngSchema = z.object({
  lat: z.number().min(JHARKHAND_BOUNDS.south).max(JHARKHAND_BOUNDS.north),
  lng: z.number().min(JHARKHAND_BOUNDS.west).max(JHARKHAND_BOUNDS.east),
});

export const SUBMITTER_TYPES = [
  'individual',
  'community_group',
  'panchayati_raj',
  'urban_local_body',
  'government_department',
] as const;
export const submitterTypeSchema = z.enum(SUBMITTER_TYPES);
export type SubmitterType = (typeof SUBMITTER_TYPES)[number];

export const createProblemSchema = z
  .object({
    title: z
      .string({ error: 'Give the problem a short title.' })
      .trim()
      .min(10, 'Give the problem a clear title of at least 10 characters.')
      .max(180, 'Keep the title under 180 characters.'),
    description: z
      .string({ error: 'Describe the problem.' })
      .trim()
      .min(50, 'Describe the problem in at least 50 characters so it can be routed accurately.')
      .max(5000, 'Keep the description under 5,000 characters.'),
    domain: domainSchema.nullable().default(null),
    districtCode: districtCodeSchema,
    blockName: z.string().trim().max(120, 'Block name is too long').optional(),
    location: latLngSchema.nullable().default(null),
    submitterType: submitterTypeSchema.default('individual'),
    submitterName: z
      .string({ error: 'Enter your name.' })
      .trim()
      .min(2, 'Enter your name.')
      .max(120, 'Keep your name under 120 characters.'),
    submitterPhone: indianPhoneSchema,
    submitterEmail: z.email('Enter a valid email address').optional().or(z.literal('')),
    submitterOrganization: z.string().trim().max(160, 'Organisation name is too long').optional(),
    affectedScale: z.enum(AFFECTED_SCALES).nullable().default(null),
    safetyRisk: z.boolean().default(false),
    attachmentIds: z.array(z.uuid()).max(5, 'Attach at most 5 files').default([]),
    consentToPublish: z.literal(true, {
      message: 'Consent is required before a report can be published publicly',
    }),
  })
  .strict();

export type CreateProblemInput = z.input<typeof createProblemSchema>;
export type CreateProblemPayload = z.output<typeof createProblemSchema>;

export const trackProblemSchema = z.object({
  refCode: refCodeSchema,
});

const lenient = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional()).catch(undefined);

export const problemFilterSchema = z.object({
  domain: lenient(domainSchema),
  districtCode: lenient(districtCodeSchema),
  status: lenient(problemStatusSchema),
  q: lenient(
    z
      .string()
      .trim()
      .max(200)
      .transform((value) => value || undefined),
  ),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20),
});
export type ProblemFilter = z.output<typeof problemFilterSchema>;

const emailField = z.email('Enter a valid email address.').toLowerCase();

export const onboardOrganizationSchema = z
  .object({
    name: z.string().trim().min(3, 'Enter the organisation’s full name.').max(200),
    type: z.enum(['university', 'industry'], { message: 'Choose university or industry.' }),
    partnerKind: z
      .enum(PARTNER_KINDS, { error: 'Choose what kind of partner this is.' })
      .optional(),
    districtCode: districtCodeSchema.optional(),
    agreementReference: z
      .string()
      .trim()
      .min(3, 'Enter the MOU or empanelment reference this onboarding is based on.')
      .max(120),
    contactEmail: z.email('Enter the organisation’s official contact email.').toLowerCase(),
  })
  .strict()
  .refine((input) => input.type !== 'industry' || input.partnerKind !== undefined, {
    path: ['partnerKind'],
    message: 'Choose what kind of partner this is.',
  })
  .refine((input) => input.type === 'industry' || input.partnerKind === undefined, {
    path: ['partnerKind'],
    message: 'Only an industry partner has a partner kind.',
  });

export const OFFICER_SCOPES = ['district', 'state'] as const;
export type OfficerScope = (typeof OFFICER_SCOPES)[number];

export const issueInviteSchema = z
  .object({
    email: emailField,
    role: roleSchema,
    organizationId: z.uuid('Choose a valid organisation.').optional(),
    scope: z
      .enum(OFFICER_SCOPES, { error: 'Choose what this officer is responsible for.' })
      .optional(),
    jurisdictionCode: districtCodeSchema.optional(),
    designation: z
      .string()
      .trim()
      .min(3, 'Enter the post this officer holds, as it appears on the order.')
      .max(120, 'Keep the designation under 120 characters.')
      .optional(),
  })
  .strict();

export const reassignOfficerSchema = z
  .object({
    posting: z.enum(['district', 'state', 'department'], {
      error: 'Choose what this officer is responsible for.',
    }),
    jurisdictionCode: districtCodeSchema.optional(),
    organizationId: z.uuid('Choose a valid department.').optional(),
    designation: z
      .string()
      .trim()
      .max(120, 'Keep the designation under 120 characters.')
      .optional(),
    reason: z
      .string()
      .trim()
      .min(5, 'Record why this posting is changing, as an order would.')
      .max(300, 'Keep the reason under 300 characters.'),
  })
  .strict();

export const institutionProfileSchema = z
  .object({
    description: z.string().trim().max(2000, 'Keep the description under 2,000 characters.'),
    domains: z
      .array(
        z.object({
          domain: z.enum(DOMAINS),
          strength: z.coerce.number().int().min(1).max(5),
        }),
      )
      .min(1, 'Choose at least one area your institution can work on.')
      .refine((rows) => new Set(rows.map((row) => row.domain)).size === rows.length, {
        message: 'Each area can be listed once.',
      }),
    disciplines: z
      .array(z.enum(ACADEMIC_DISCIPLINES))
      .min(1, 'Choose the disciplines your institution teaches.'),
    facilities: z.array(z.enum(INSTITUTION_FACILITIES)),
  })
  .strict();
export type InstitutionProfileInput = z.output<typeof institutionProfileSchema>;

export const facultyExpertiseSchema = z
  .object({
    discipline: z.enum(ACADEMIC_DISCIPLINES, { error: 'Choose a discipline.' }),
    specialisation: z
      .string()
      .trim()
      .max(160, 'Keep the specialisation under 160 characters.')
      .optional(),
  })
  .strict();
export type FacultyExpertiseInput = z.output<typeof facultyExpertiseSchema>;

const inviteToken = z.string().min(1, 'This invitation link is incomplete.').max(400);

export const updateProfileSchema = z
  .object({
    name: z
      .string({ error: 'Enter your name.' })
      .trim()
      .min(2, 'Enter your name.')
      .max(120, 'Keep your name under 120 characters.'),
    phone: indianPhoneSchema.optional().or(z.literal('')),
    districtCode: districtCodeSchema.optional().or(z.literal('')),
    locality: z
      .string()
      .trim()
      .max(120, 'Keep this under 120 characters.')
      .optional()
      .or(z.literal('')),
  })
  .strict();
export type UpdateProfileInput = z.output<typeof updateProfileSchema>;

export const completeProfileSchema = z
  .object({
    name: z
      .string({ error: 'Enter your name.' })
      .trim()
      .min(2, 'Enter your name.')
      .max(120, 'Keep your name under 120 characters.'),
    phone: indianPhoneSchema,
    districtCode: districtCodeSchema.optional().or(z.literal('')),
    locality: z
      .string()
      .trim()
      .max(120, 'Keep this under 120 characters.')
      .optional()
      .or(z.literal('')),
    acceptTerms: z.boolean(),
  })
  .strict();
export type CompleteProfileInput = z.output<typeof completeProfileSchema>;

export const acceptInviteSchema = z.object({ token: inviteToken }).strict();

export const transitionStatusSchema = z.object({
  toStatus: problemStatusSchema,
  note: z.string().trim().max(1000).optional(),
});

export const validateProblemSchema = z.object({
  decision: z.enum(['validate', 'reject', 'mark_duplicate', 'resolve', 'transfer']),
  domain: domainSchema.optional(),
  duplicateOfId: z.uuid().optional(),
  districtCode: districtCodeSchema.optional(),
  note: z.string().trim().max(1000).optional(),
});

export const assignDepartmentSchema = z.object({
  organizationId: z.uuid('Choose the department that should fix this.'),
  note: z.string().trim().max(1000).optional(),
});

export const actionTakenSchema = z.object({
  note: z
    .string({ error: 'Say what was done; the person who reported it reads this.' })
    .trim()
    .min(10, 'Say what was done; the person who reported it reads this.')
    .max(1000),
});

export const progressUpdateSchema = z.object({
  note: z
    .string({ error: 'Say what has been done so far; the person who reported it reads this.' })
    .trim()
    .min(10, 'Say what has been done so far; the person who reported it reads this.')
    .max(1000),
});

export const reporterDecisionSchema = z.object({
  refCode: refCodeSchema,
  phoneLast4: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'Enter the last 4 digits of the mobile number on the report.')
    .optional(),
  decision: z.enum(['confirm', 'reopen']),
  note: z.string().trim().max(1000).optional(),
});

export const routeProblemSchema = z.object({
  organizationIds: z.array(z.uuid()).min(1, 'Select at least one institution').max(5),
  note: z.string().trim().max(1000).optional(),
});

export const routingResponseSchema = z.object({
  response: z.enum(ROUTING_RESPONSES).exclude(['proposed']),
  note: z.string().trim().max(1000).optional(),
});

export const createProjectSchema = z.object({
  title: z.string().trim().min(10).max(180),
  summary: z.string().trim().min(30).max(3000),
  facultyMentorId: z.uuid().optional(),
});

export const projectMemberSchema = z.object({
  userId: z.uuid(),
  memberRole: z.enum(['faculty_mentor', 'student', 'industry_mentor', 'co_investigator']),
  discipline: z.string().trim().max(120).optional(),
});

export const proposalSchema = z.object({
  abstract: z.string().trim().min(50).max(5000),
  methodology: z.string().trim().min(50).max(5000),
  expectedOutcomes: z.string().trim().min(20).max(3000),
  timelineMonths: z.coerce.number().int().min(1).max(60),
  budgetEstimate: z.coerce.number().nonnegative().max(100_000_000).optional(),
  status: z.enum(PROPOSAL_SUBMISSION_STATUSES).default('submitted'),
});

export const reviewProposalSchema = z
  .object({
    decision: z.enum(PROPOSAL_DECISIONS, { error: 'Choose a decision.' }),
    note: z.string().trim().max(2000, 'Keep the note under 2,000 characters.').optional(),
  })
  .refine((input) => input.decision === 'approved' || (input.note?.length ?? 0) >= 10, {
    path: ['note'],
    message: 'Tell the team what needs to change, in at least 10 characters.',
  });

export const OFFER_TYPES = [
  'mentorship',
  'funding',
  'co_development',
  'prototyping',
  'testing',
  'data_access',
  'deployment',
  'technology_transfer',
  'internship',
] as const;
export const offerTypeSchema = z.enum(OFFER_TYPES);
export type OfferType = (typeof OFFER_TYPES)[number];

export const industryInterestSchema = z.object({
  offerTypes: z.array(offerTypeSchema).min(1, 'Select at least one form of support'),
  fundingAmount: z.coerce.number().nonnegative().max(100_000_000).optional(),
  message: z.string().trim().min(20, 'Tell the team how you can help').max(2000),
});

export const interestDecisionSchema = z.object({
  status: z.enum(INTEREST_STATUSES).exclude(['expressed']),
  note: z.string().trim().max(1000).optional(),
});

export const milestoneSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().max(2000).optional(),
  dueDate: z.coerce.date().optional(),
  orderIndex: z.coerce.number().int().min(0).default(0),
});

export const milestoneUpdateSchema = z.object({
  status: z.enum(MILESTONE_STATUSES),
  note: z.string().trim().max(1000).optional(),
});

export const OUTCOME_TYPES = [
  'patent',
  'startup',
  'publication',
  'deployment',
  'policy_change',
  'product',
] as const;
export const outcomeTypeSchema = z.enum(OUTCOME_TYPES);
export type OutcomeType = (typeof OUTCOME_TYPES)[number];

export const IP_STATUSES = ['filed', 'published', 'granted'] as const;
export type IpStatus = (typeof IP_STATUSES)[number];

export const outcomeSchema = z
  .object({
    outcomeType: outcomeTypeSchema,
    title: z.string().trim().min(5, 'Give the outcome a short title.').max(200),
    detail: z.string().trim().max(3000).optional(),
    evidenceUrl: z
      .url('Enter a full web address, starting with https://')
      .optional()
      .or(z.literal('')),
    impactMetricName: z.string().trim().max(120).optional(),
    impactMetricValue: z.coerce.number().optional(),
    reference: z.string().trim().max(120).optional(),
    ipStatus: z.enum(IP_STATUSES).optional(),
  })
  .refine((input) => input.outcomeType !== 'patent' || input.ipStatus !== undefined, {
    path: ['ipStatus'],
    message: 'Say whether the patent is filed, published or granted.',
  })
  .refine((input) => input.outcomeType === 'patent' || input.ipStatus === undefined, {
    path: ['ipStatus'],
    message: 'Only a patent has a filing status.',
  });

export const TEST_RESULTS = ['passed', 'failed', 'inconclusive'] as const;
export type TestResult = (typeof TEST_RESULTS)[number];

export const projectTestSchema = z
  .object({
    title: z.string().trim().min(5, 'Say what was tested.').max(200),
    method: z
      .string()
      .trim()
      .min(10, 'Describe how it was tested, in at least 10 characters.')
      .max(2000),
    result: z.enum(TEST_RESULTS, { error: 'Choose the result.' }),
    findings: z
      .string()
      .trim()
      .min(10, 'Record what the test showed, in at least 10 characters.')
      .max(3000),
    conductedOn: z.coerce.date({ error: 'Enter the date of the test.' }),
    milestoneId: z.uuid().optional(),
  })
  .strict();

export const messageSchema = z.object({
  body: z.string().trim().min(1, 'Message cannot be empty').max(4000),
  visibility: z.enum(['public', 'internal']).default('public'),
});

export const analyticsRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  districtCode: districtCodeSchema.optional(),
  domain: domainSchema.optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
