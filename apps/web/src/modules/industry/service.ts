import { and, desc, eq, sql } from 'drizzle-orm';
import {
  districts,
  industryInterests,
  organizations,
  problems,
  projects,
  statusEvents,
} from '@akhra/db';
import {
  TERMINAL_STATUSES,
  INDUSTRY_ROLES,
  Errors,
  type Domain,
  type InterestStatus,
  type OfferType,
  type ProblemStatus,
  type PartnerKind,
} from '@akhra/shared';
import { notifyOrganizations } from '@/modules/notifications';
import { logger } from '@/server/logger';
import { ForbiddenError, query, type Actor } from '@/server/session';

export interface DiscoverableProject {
  id: string;
  title: string;
  summary: string;
  status: ProblemStatus;
  refCode: string;
  problemTitle: string;
  domain: Domain | null;
  districtName: string;
  organizationName: string;
  startedAt: Date;
  interestCount: number;
  ownInterestStatus: InterestStatus | null;
}

function requireOrganization(actor: Actor): string {
  if (!actor.organizationId) {
    throw new ForbiddenError('Your account is not linked to an organisation');
  }
  return actor.organizationId;
}

export async function listDiscoverableProjects(
  actor: Actor,
  filter: { domain?: Domain; districtCode?: string } = {},
): Promise<DiscoverableProject[]> {
  const organizationId = actor.organizationId;

  return query(actor, (tx) =>
    tx
      .select({
        id: projects.id,
        title: projects.title,
        summary: projects.summary,
        status: projects.status,
        refCode: problems.refCode,
        problemTitle: problems.title,
        domain: problems.domain,
        districtName: districts.nameEn,
        organizationName: organizations.name,
        startedAt: projects.startedAt,
        interestCount: sql<number>`(select count(*) from industry_interests i where i.project_id = ${projects.id})::int`,
        ownInterestStatus: organizationId
          ? sql<InterestStatus | null>`(
              select i.status from industry_interests i
              where i.project_id = ${projects.id} and i.organization_id = ${organizationId}
              limit 1
            )`
          : sql<InterestStatus | null>`null`,
      })
      .from(projects)
      .innerJoin(problems, eq(projects.problemId, problems.id))
      .innerJoin(districts, eq(problems.districtCode, districts.code))
      .innerJoin(organizations, eq(projects.organizationId, organizations.id))
      .where(
        and(
          filter.domain ? eq(problems.domain, filter.domain) : undefined,
          filter.districtCode ? eq(problems.districtCode, filter.districtCode) : undefined,
        ),
      )
      .orderBy(desc(projects.startedAt)),
  );
}

export interface ExpressInterestInput {
  offerTypes: OfferType[];
  fundingAmount?: number;
  message: string;
}

export async function expressInterest(
  actor: Actor,
  projectId: string,
  input: ExpressInterestInput,
): Promise<void> {
  const organizationId = requireOrganization(actor);
  if (!(INDUSTRY_ROLES as readonly string[]).includes(actor.role)) {
    throw new ForbiddenError('Only an industry partner can make an offer on a project.');
  }

  const project = await query(actor, async (tx) => {
    const [project] = await tx
      .select({
        problemId: projects.problemId,
        title: projects.title,
        ownerId: projects.organizationId,
        status: projects.status,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) throw new ForbiddenError('That project is not available');
    if (TERMINAL_STATUSES.includes(project.status)) {
      throw Errors.conflict('This project has finished and is no longer taking offers.');
    }

    await tx
      .insert(industryInterests)
      .values({
        projectId,
        organizationId,
        offerTypes: input.offerTypes,
        fundingAmount: input.fundingAmount?.toString() ?? null,
        message: input.message,
        createdById: actor.userId,
      })
      .onConflictDoUpdate({
        target: [industryInterests.projectId, industryInterests.organizationId],
        set: {
          offerTypes: input.offerTypes,
          fundingAmount: input.fundingAmount?.toString() ?? null,
          message: input.message,
          status: 'expressed',
        },
      });

    logger.info(
      { projectId, organizationId, offers: input.offerTypes },
      'industry interest expressed',
    );
    return project;
  });

  await notifyOrganizations([project.ownerId], ['university_admin', 'faculty'], {
    type: 'industry_offer',
    title: `New industry offer on "${project.title}"`,
    body: input.message,
    linkUrl: '/university/partnerships',
    email: true,
  });
}

export async function respondToInterest(
  actor: Actor,
  interestId: string,
  status: Exclude<InterestStatus, 'expressed'>,
  note?: string,
): Promise<void> {
  const interest = await query(actor, async (tx) => {
    const [interest] = await tx
      .select({
        projectId: industryInterests.projectId,
        organizationId: industryInterests.organizationId,
        projectOrganizationId: projects.organizationId,
        problemId: projects.problemId,
        partnerName: organizations.name,
        projectTitle: projects.title,
        status: industryInterests.status,
      })
      .from(industryInterests)
      .innerJoin(projects, eq(industryInterests.projectId, projects.id))
      .innerJoin(organizations, eq(industryInterests.organizationId, organizations.id))
      .where(eq(industryInterests.id, interestId))
      .limit(1);

    if (!interest) throw new ForbiddenError('That offer is not available to you');

    const isOfferingPartner = interest.organizationId === actor.organizationId;
    const ownsProject = interest.projectOrganizationId === actor.organizationId;

    if (status === 'withdrawn' ? !isOfferingPartner : !ownsProject) {
      throw new ForbiddenError('You cannot change that offer');
    }
    // A team decides an offer once. A partner may pull out before or after it is accepted.
    const open = status === 'withdrawn' ? ['expressed', 'accepted'] : ['expressed'];
    if (!open.includes(interest.status)) {
      throw Errors.conflict('That offer has already been decided.');
    }

    await tx
      .update(industryInterests)
      .set({
        status,
        responseNote: note ?? null,
        respondedById: actor.userId,
        respondedAt: new Date(),
      })
      .where(eq(industryInterests.id, interestId));

    if (status === 'accepted') {
      await tx.insert(statusEvents).values({
        entityType: 'interest',
        entityId: interestId,
        problemId: interest.problemId,
        fromStatus: 'expressed',
        toStatus: 'accepted',
        actorId: actor.userId,
        actorLabel: actor.name,
        note: `${interest.partnerName} has joined as an industry partner.`,
        isPublic: true,
      });
    }

    logger.info({ interestId, status }, 'industry interest resolved');
    return interest;
  });

  if (status === 'withdrawn') {
    await notifyOrganizations([interest.projectOrganizationId], ['university_admin', 'faculty'], {
      type: 'offer_withdrawn',
      title: `${interest.partnerName} withdrew its offer on "${interest.projectTitle}"`,
      body: note,
      linkUrl: '/university/partnerships',
    });
  } else {
    await notifyOrganizations([interest.organizationId], ['industry_admin', 'industry_partner'], {
      type: `offer_${status}`,
      title: `Your offer on "${interest.projectTitle}" was ${status}`,
      body: note,
      linkUrl: '/industry/offers',
      email: true,
    });
  }
}

export interface InterestRecord {
  id: string;
  projectId: string;
  projectTitle: string;
  organizationId: string;
  organizationName: string;
  partnerKind: PartnerKind | null;
  offerTypes: OfferType[];
  fundingAmount: string | null;
  message: string;
  status: InterestStatus;
  responseNote: string | null;
  createdAt: Date;
}

export async function listOwnInterests(actor: Actor): Promise<InterestRecord[]> {
  const organizationId = requireOrganization(actor);
  return query(actor, (tx) =>
    tx
      .select(interestColumns)
      .from(industryInterests)
      .innerJoin(projects, eq(industryInterests.projectId, projects.id))
      .innerJoin(organizations, eq(industryInterests.organizationId, organizations.id))
      .where(eq(industryInterests.organizationId, organizationId))
      .orderBy(desc(industryInterests.createdAt)),
  );
}

export async function listIncomingInterests(actor: Actor): Promise<InterestRecord[]> {
  const organizationId = requireOrganization(actor);
  return query(actor, (tx) =>
    tx
      .select(interestColumns)
      .from(industryInterests)
      .innerJoin(projects, eq(industryInterests.projectId, projects.id))
      .innerJoin(organizations, eq(industryInterests.organizationId, organizations.id))
      .where(eq(projects.organizationId, organizationId))
      .orderBy(desc(industryInterests.createdAt)),
  );
}

const interestColumns = {
  id: industryInterests.id,
  projectId: industryInterests.projectId,
  projectTitle: projects.title,
  organizationId: industryInterests.organizationId,
  organizationName: organizations.name,
  partnerKind: organizations.partnerKind,
  offerTypes: industryInterests.offerTypes,
  fundingAmount: industryInterests.fundingAmount,
  message: industryInterests.message,
  status: industryInterests.status,
  responseNote: industryInterests.responseNote,
  createdAt: industryInterests.createdAt,
};
