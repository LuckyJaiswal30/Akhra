import { pgEnum } from 'drizzle-orm/pg-core';
import {
  ACADEMIC_DISCIPLINES,
  AFFECTED_SCALES,
  PRIORITY_LEVELS,
  PRIORITY_REASONS,
  DOMAINS,
  INSTITUTION_FACILITIES,
  ROLES,
  ORGANIZATION_TYPES,
  PROBLEM_STATUSES,
  ROUTING_RESPONSES,
  INTEREST_STATUSES,
  MILESTONE_STATUSES,
  PROPOSAL_STATUSES,
  SUBMITTER_TYPES,
  OFFER_TYPES,
  OUTCOME_TYPES,
  PARTNER_KINDS,
  IP_STATUSES,
  TEST_RESULTS,
} from '@akhra/shared';

export const domainEnum = pgEnum('domain', DOMAINS);
export const roleEnum = pgEnum('user_role', ROLES);
export const organizationTypeEnum = pgEnum('organization_type', ORGANIZATION_TYPES);
export const problemStatusEnum = pgEnum('problem_status', PROBLEM_STATUSES);
export const routingResponseEnum = pgEnum('routing_response', ROUTING_RESPONSES);
export const interestStatusEnum = pgEnum('interest_status', INTEREST_STATUSES);
export const milestoneStatusEnum = pgEnum('milestone_status', MILESTONE_STATUSES);
export const proposalStatusEnum = pgEnum('proposal_status', PROPOSAL_STATUSES);
export const submitterTypeEnum = pgEnum('submitter_type', SUBMITTER_TYPES);
export const offerTypeEnum = pgEnum('offer_type', OFFER_TYPES);
export const outcomeTypeEnum = pgEnum('outcome_type', OUTCOME_TYPES);
export const academicDisciplineEnum = pgEnum('academic_discipline', ACADEMIC_DISCIPLINES);
export const institutionFacilityEnum = pgEnum('institution_facility', INSTITUTION_FACILITIES);
export const ipStatusEnum = pgEnum('ip_status', IP_STATUSES);
export const testResultEnum = pgEnum('test_result', TEST_RESULTS);
export const partnerKindEnum = pgEnum('partner_kind', PARTNER_KINDS);
export const affectedScaleEnum = pgEnum('affected_scale', AFFECTED_SCALES);
export const priorityLevelEnum = pgEnum('priority_level', PRIORITY_LEVELS);
export const priorityReasonEnum = pgEnum('priority_reason', PRIORITY_REASONS);

export const classifierTierEnum = pgEnum('classifier_tier', ['gemini', 'groq', 'tfidf', 'manual']);
export const projectMemberRoleEnum = pgEnum('project_member_role', [
  'faculty_mentor',
  'student',
  'industry_mentor',
  'co_investigator',
]);
export const attachmentKindEnum = pgEnum('attachment_kind', ['photo', 'video', 'document']);
export const messageVisibilityEnum = pgEnum('message_visibility', ['public', 'internal']);
export const emailStatusEnum = pgEnum('email_status', ['queued', 'sent', 'logged', 'failed']);
export const entityTypeEnum = pgEnum('entity_type', [
  'problem',
  'project',
  'routing',
  'milestone',
  'interest',
]);
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended']);
export const inviteStatusEnum = pgEnum('invite_status', ['pending', 'redeemed', 'revoked']);

export const resolutionTrackEnum = pgEnum('resolution_track', ['department', 'research']);
