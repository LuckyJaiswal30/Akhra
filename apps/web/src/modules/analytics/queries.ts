import { and, desc, eq, exists, inArray, sql } from 'drizzle-orm';
import {
  getDb,
  industryInterests,
  organizations,
  outcomes,
  problems,
  projects,
  withoutRls,
} from '@akhra/db';
import { logger } from '@/server/logger';
import { cachedSnapshot, forgetSnapshots } from './snapshot';

/**
 * The public figures change as reports and outcomes are recorded — minutes matter to nobody reading
 * them, and every visitor recomputing them would be a dozen aggregates per page view.
 */
const PUBLIC_TTL_MS = 5 * 60 * 1000;

export interface PlatformStats {
  totalProblems: number;
  districtsCovered: number;
  participatingInstitutions: number;
  solutionsDeployed: number;
  activeProjects: number;
  peopleImpacted: number;
}

const EMPTY_STATS: PlatformStats = {
  totalProblems: 0,
  districtsCovered: 0,
  participatingInstitutions: 0,
  solutionsDeployed: 0,
  activeProjects: 0,
  peopleImpacted: 0,
};

/** Outcome measures that count people rather than things, matched on the measure's name. */
export const PEOPLE_METRIC =
  '(household|people|person|farmer|student|resident|villager|patient|famil|beneficiar|women|children|learner|worker|citizen|enrol)';

async function computePlatformStats(): Promise<PlatformStats> {
  const db = getDb();
  const result = await db.execute<{
    total_problems: number;
    districts_covered: number;
    participating_institutions: number;
    solutions_deployed: number;
    active_projects: number;
    people_impacted: string;
  }>(sql`
      select
        (select count(*) from problems where is_public = true)::int as total_problems,
        (select count(distinct district_code) from problems)::int as districts_covered,
        (select count(*) from organizations where is_active = true and type in ('university', 'industry'))::int as participating_institutions,
        (select count(*) from problems where status in ('deployed', 'closed'))::int as solutions_deployed,
        (select count(*) from projects where status in ('in_progress', 'prototyped', 'piloted'))::int as active_projects,
        (select coalesce(sum(impact_metric_value), 0) from outcomes where impact_metric_name ~* ${PEOPLE_METRIC})::bigint as people_impacted
    `);

  const row = result.rows[0];
  if (!row) return EMPTY_STATS;

  return {
    totalProblems: Number(row.total_problems),
    districtsCovered: Number(row.districts_covered),
    participatingInstitutions: Number(row.participating_institutions),
    solutionsDeployed: Number(row.solutions_deployed),
    activeProjects: Number(row.active_projects),
    peopleImpacted: Number(row.people_impacted),
  };
}

export interface PublicImpact {
  byDomain: { domain: string; count: number }[];
  byDistrict: { code: string; count: number }[];
  reached: Record<string, number>;
  outcomesByType: { type: string; count: number }[];
}

const EMPTY_IMPACT: PublicImpact = {
  byDomain: [],
  byDistrict: [],
  reached: {},
  outcomesByType: [],
};

async function computePublicImpact(): Promise<PublicImpact> {
  return withoutRls(getDb(), async (tx) => {
    const domains = await tx.execute<{ domain: string; count: number }>(sql`
        select domain::text as domain, count(*)::int as count
        from problems where is_public = true and domain is not null
        group by domain order by count desc
      `);
    const districts = await tx.execute<{ code: string; count: number }>(sql`
        select district_code as code, count(*)::int as count
        from problems where is_public = true
        group by district_code order by count desc
      `);
    const stages = await tx.execute<{ stage: string; count: number }>(sql`
        select 'submitted' as stage, count(*)::int as count from problems where is_public = true
        union all
        select e.to_status::text as stage, count(distinct e.problem_id)::int as count
        from status_events e join problems p on p.id = e.problem_id
        where p.is_public = true
        group by e.to_status
      `);
    const outcomeTypes = await tx.execute<{ type: string; count: number }>(sql`
        select o.outcome_type::text as type, count(*)::int as count
        from outcomes o
        join projects pr on pr.id = o.project_id
        join problems p on p.id = pr.problem_id
        where p.is_public = true
        group by o.outcome_type order by count desc
      `);

    return {
      byDomain: domains.rows.map((r) => ({ domain: r.domain, count: Number(r.count) })),
      byDistrict: districts.rows.map((r) => ({ code: r.code, count: Number(r.count) })),
      reached: Object.fromEntries(stages.rows.map((r) => [r.stage, Number(r.count)])),
      outcomesByType: outcomeTypes.rows.map((r) => ({ type: r.type, count: Number(r.count) })),
    };
  });
}

export interface SuccessStory {
  id: string;
  title: string;
  summary: string;
  status: string;
  organizationName: string;
  refCode: string;
  districtCode: string;
  domain: string | null;
  partners: string[];
  outcomes: {
    id: string;
    type: string;
    title: string;
    metricName: string | null;
    metricValue: number | null;
  }[];
}

/**
 * A success story is a project that reached the field **and recorded what changed**. Reaching the
 * field is a status; a story is an outcome — a deployment, a patent, a policy change, a number of
 * people served. Without one there is nothing to tell, and a page of cards that each say only "this
 * finished" is worse than a shorter page of cards that each say something.
 */
async function computeSuccessStories(): Promise<SuccessStory[]> {
  return withoutRls(getDb(), async (tx) => {
    const rows = await tx
      .select({
        id: projects.id,
        title: projects.title,
        summary: projects.summary,
        status: projects.status,
        organizationName: organizations.name,
        refCode: problems.refCode,
        districtCode: problems.districtCode,
        domain: problems.domain,
      })
      .from(projects)
      .innerJoin(problems, and(eq(problems.id, projects.problemId), eq(problems.isPublic, true)))
      .innerJoin(organizations, eq(organizations.id, projects.organizationId))
      .where(
        and(
          inArray(projects.status, ['piloted', 'deployed', 'closed']),
          exists(
            tx
              .select({ one: sql`1` })
              .from(outcomes)
              .where(eq(outcomes.projectId, projects.id)),
          ),
        ),
      )
      .orderBy(desc(projects.updatedAt))
      .limit(24);
    if (rows.length === 0) return [];

    const ids = rows.map((row) => row.id);
    const outcomeRows = await tx
      .select({
        id: outcomes.id,
        projectId: outcomes.projectId,
        type: outcomes.outcomeType,
        title: outcomes.title,
        metricName: outcomes.impactMetricName,
        metricValue: outcomes.impactMetricValue,
      })
      .from(outcomes)
      .where(inArray(outcomes.projectId, ids))
      .orderBy(desc(outcomes.recordedAt));
    const partnerRows = await tx
      .select({ projectId: industryInterests.projectId, name: organizations.name })
      .from(industryInterests)
      .innerJoin(organizations, eq(organizations.id, industryInterests.organizationId))
      .where(
        and(inArray(industryInterests.projectId, ids), eq(industryInterests.status, 'accepted')),
      );

    return rows.map((row) => ({
      ...row,
      domain: row.domain ?? null,
      partners: partnerRows.filter((p) => p.projectId === row.id).map((p) => p.name),
      outcomes: outcomeRows
        .filter((o) => o.projectId === row.id)
        .map((o) => ({
          id: o.id,
          type: o.type,
          title: o.title,
          metricName: o.metricName,
          metricValue: o.metricValue === null ? null : Number(o.metricValue),
        })),
    }));
  });
}

/**
 * What the public pages read. Each is a stored snapshot, refreshed after the response once it is
 * older than {@link PUBLIC_TTL_MS}, so a busy home page costs one row read rather than a dozen
 * aggregates. Dates are not part of these shapes: a snapshot is JSON, and a Date would come back
 * as a string.
 */
const PUBLIC_KEYS = ['public:stats:v1', 'public:impact:v1', 'public:stories:v1'];

/**
 * Called when something happened that a visitor would expect to see immediately — a new report
 * should raise the counter on the home page, not five minutes later.
 */
export function expirePublicFigures(): Promise<void> {
  return forgetSnapshots(PUBLIC_KEYS);
}

async function published<T>(key: string, compute: () => Promise<T>, whenDown: T): Promise<T> {
  try {
    return await cachedSnapshot(key, PUBLIC_TTL_MS, compute);
  } catch (error) {
    // A database blip empties the figures for one render, never for the five minutes a stored
    // snapshot would last: nothing is written unless the query came back.
    logger.warn(
      { err: error instanceof Error ? error.message : String(error), key },
      'public figures unavailable for this render',
    );
    return whenDown;
  }
}

export function fetchPlatformStats(): Promise<PlatformStats> {
  return published('public:stats:v1', computePlatformStats, EMPTY_STATS);
}

export function fetchPublicImpact(): Promise<PublicImpact> {
  return published('public:impact:v1', computePublicImpact, EMPTY_IMPACT);
}

export function listSuccessStories(): Promise<SuccessStory[]> {
  return published('public:stories:v1', computeSuccessStories, []);
}
