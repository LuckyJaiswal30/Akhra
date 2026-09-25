import { sql, type SQL } from 'drizzle-orm';
import type { Domain, PartnerKind } from '@akhra/shared';
import { PEOPLE_METRIC } from './queries';
import { cachedSnapshot } from './snapshot';
import { query, type Actor } from '@/server/session';

export interface DashboardFilter {
  domain?: Domain;
  districtCode?: string;
}

export interface Kpis {
  totalReports: number;
  activeProjects: number;
  deployed: number;
  completionRate: number;
  medianDaysToRoute: number | null;
  fundingCommitted: number;
  outcomes: number;
  districtsReached: number;
  patents: number;
  startups: number;
  communityReach: number;
  criticalOpen: number;
}

export interface MonthlyPoint {
  month: string;
  submitted: number;
  deployed: number;
}

export interface DomainCount {
  domain: Domain;
  total: number;
  deployed: number;
}

export interface DistrictCount {
  code: string;
  nameEn: string;
  nameHi: string;
  lat: number;
  lng: number;
  total: number;
  active: number;
  deployed: number;
}

export interface FunnelStage {
  status: string;
  reached: number;
}

export interface InstitutionRow {
  name: string;
  referrals: number;
  accepted: number;
  projects: number;
  outcomes: number;
}

export interface PartnerRow {
  name: string;
  kind: PartnerKind | null;
  offers: number;
  accepted: number;
  funding: number;
}

export interface NamedCount {
  key: string;
  total: number;
}

export interface SectorDistrictCell {
  districtCode: string;
  domain: Domain;
  total: number;
}

export interface Dashboard {
  computedAt: string;
  kpis: Kpis;
  monthly: MonthlyPoint[];
  domains: DomainCount[];
  districts: DistrictCount[];
  funnel: FunnelStage[];
  institutions: InstitutionRow[];
  partners: PartnerRow[];
  partnerKinds: NamedCount[];
  sectorDistricts: SectorDistrictCell[];
  outcomesByType: NamedCount[];
  classifierTiers: NamedCount[];
}

const FUNNEL_ORDER = [
  'submitted',
  'validated',
  'routed',
  'in_progress',
  'prototyped',
  'piloted',
  'deployed',
  'closed',
] as const;

function problemScope(filter: DashboardFilter, alias = 'p'): SQL {
  const parts: SQL[] = [sql`true`];
  if (filter.domain) parts.push(sql`${sql.raw(alias)}.domain = ${filter.domain}`);
  if (filter.districtCode)
    parts.push(sql`${sql.raw(alias)}.district_code = ${filter.districtCode}`);
  return sql.join(parts, sql` and `);
}

const num = (value: unknown): number => Number(value ?? 0);

const statusList = (statuses: readonly string[]): SQL =>
  sql`(${sql.join(
    statuses.map((status) => sql`${status}`),
    sql`, `,
  )})`;

const OPEN_STATUS_LIST = statusList(['submitted', 'validated', 'assigned']);

const IN_HAND_STATUS_LIST = statusList([
  'validated',
  'assigned',
  'action_taken',
  'routed',
  'in_progress',
  'prototyped',
  'piloted',
]);

export interface SnapshotScope {
  role: Actor['role'];
  jurisdiction: string | null;
}

/** Bump when the Dashboard shape changes, so a snapshot in the old shape is never read back. */
const SNAPSHOT_VERSION = 2;

export function snapshotKey(filter: DashboardFilter, scope: SnapshotScope): string {
  return `dashboard:v${SNAPSHOT_VERSION}:${scope.role}:${scope.jurisdiction ?? 'all'}:${filter.domain ?? 'all'}:${filter.districtCode ?? 'all'}`;
}

const SNAPSHOT_TTL_MS = 5 * 60 * 1000;

export async function getDashboard(actor: Actor, filter: DashboardFilter = {}): Promise<Dashboard> {
  const scoped = actor.jurisdiction ? { ...filter, districtCode: actor.jurisdiction } : filter;
  const key = snapshotKey(scoped, { role: actor.role, jurisdiction: actor.jurisdiction });
  return cachedSnapshot(key, SNAPSHOT_TTL_MS, () => computeDashboard(actor, scoped));
}

export async function computeDashboard(
  actor: Actor,
  filter: DashboardFilter = {},
): Promise<Dashboard> {
  const scope = problemScope(filter);

  return query(actor, async (tx) => {
    const kpiRow =
      (
        await tx.execute(sql`
        with scoped as (select * from problems p where ${scope}),
        route_times as (
          select extract(epoch from (min(e.created_at) - s.created_at)) / 86400 as days
          from scoped s
          join status_events e on e.problem_id = s.id and e.to_status = 'routed'
          group by s.id, s.created_at
        )
        select
          (select count(*) from scoped) as total_reports,
          (select count(*) from projects pr join scoped s on s.id = pr.problem_id
             where pr.status in ('in_progress', 'prototyped', 'piloted')) as active_projects,
          (select count(*) from scoped where status in ('deployed', 'closed')) as deployed,
          (select count(*) from scoped where status not in ('submitted', 'rejected', 'duplicate')) as validated_or_beyond,
          (select percentile_cont(0.5) within group (order by days) from route_times) as median_days_to_route,
          (select coalesce(sum(i.funding_amount), 0) from industry_interests i
             join projects pr on pr.id = i.project_id join scoped s on s.id = pr.problem_id
             where i.status = 'accepted') as funding_committed,
          (select count(*) from outcomes o join projects pr on pr.id = o.project_id
             join scoped s on s.id = pr.problem_id) as outcomes,
          (select count(distinct district_code) from scoped) as districts_reached,
          (select count(*) from outcomes o join projects pr on pr.id = o.project_id
             join scoped s on s.id = pr.problem_id where o.outcome_type = 'patent') as patents,
          (select count(*) from outcomes o join projects pr on pr.id = o.project_id
             join scoped s on s.id = pr.problem_id where o.outcome_type = 'startup') as startups,
          (select coalesce(sum(o.impact_metric_value), 0) from outcomes o
             join projects pr on pr.id = o.project_id join scoped s on s.id = pr.problem_id
             where o.impact_metric_name ~* ${PEOPLE_METRIC}) as community_reach,
          (select count(*) from scoped
             where priority = 'critical' and status in ${OPEN_STATUS_LIST}) as critical_open
      `)
      ).rows[0] ?? {};

    const validatedOrBeyond = num(kpiRow.validated_or_beyond);
    const deployed = num(kpiRow.deployed);

    const monthly = (
      await tx.execute(sql`
        with months as (
          select generate_series(
            date_trunc('month', now()) - interval '11 months',
            date_trunc('month', now()),
            interval '1 month'
          ) as month
        )
        select
          to_char(m.month, 'YYYY-MM') as month,
          (select count(*) from problems p
             where ${scope} and date_trunc('month', p.created_at) = m.month) as submitted,
          (select count(distinct e.problem_id) from status_events e
             join problems p on p.id = e.problem_id
             where ${scope} and e.to_status = 'deployed'
               and date_trunc('month', e.created_at) = m.month) as deployed
        from months m
        order by m.month
      `)
    ).rows.map((r) => ({
      month: String(r.month),
      submitted: num(r.submitted),
      deployed: num(r.deployed),
    }));

    const domains = (
      await tx.execute(sql`
        select p.domain, count(*) as total,
          count(*) filter (where p.status in ('deployed', 'closed')) as deployed
        from problems p
        where ${scope} and p.domain is not null
        group by p.domain
        order by total desc
      `)
    ).rows.map((r) => ({
      domain: String(r.domain) as Domain,
      total: num(r.total),
      deployed: num(r.deployed),
    }));

    const districts = (
      await tx.execute(sql`
        select d.code, d.name_en, d.name_hi, d.lat, d.lng,
          count(p.id) as total,
          count(p.id) filter (where p.status in ${IN_HAND_STATUS_LIST}) as active,
          count(p.id) filter (where p.status in ('deployed', 'closed')) as deployed
        from districts d
        left join problems p on p.district_code = d.code and ${scope}
        group by d.code, d.name_en, d.name_hi, d.lat, d.lng
        order by d.name_en
      `)
    ).rows.map((r) => ({
      code: String(r.code),
      nameEn: String(r.name_en),
      nameHi: String(r.name_hi),
      lat: num(r.lat),
      lng: num(r.lng),
      total: num(r.total),
      active: num(r.active),
      deployed: num(r.deployed),
    }));

    const reachedRows = (
      await tx.execute(sql`
        select e.to_status as status, count(distinct e.problem_id) as reached
        from status_events e
        join problems p on p.id = e.problem_id
        where e.entity_type = 'problem' and ${scope}
        group by e.to_status
      `)
    ).rows;
    const reachedByStatus = new Map(reachedRows.map((r) => [String(r.status), num(r.reached)]));
    const funnel = FUNNEL_ORDER.map((status) => ({
      status,
      reached: reachedByStatus.get(status) ?? 0,
    }));

    const institutions = (
      await tx.execute(sql`
        select o.name,
          (select count(*) from problem_routings r join problems p on p.id = r.problem_id
             where r.organization_id = o.id and ${scope}) as referrals,
          (select count(*) from problem_routings r join problems p on p.id = r.problem_id
             where r.organization_id = o.id and r.response = 'accepted' and ${scope}) as accepted,
          (select count(*) from projects pr join problems p on p.id = pr.problem_id
             where pr.organization_id = o.id and ${scope}) as projects,
          (select count(*) from outcomes oc join projects pr on pr.id = oc.project_id
             join problems p on p.id = pr.problem_id
             where pr.organization_id = o.id and ${scope}) as outcomes
        from organizations o
        where o.type = 'university' and o.is_active
        order by referrals desc, o.name
      `)
    ).rows.map((r) => ({
      name: String(r.name),
      referrals: num(r.referrals),
      accepted: num(r.accepted),
      projects: num(r.projects),
      outcomes: num(r.outcomes),
    }));

    const partners = (
      await tx.execute(sql`
        select o.name, o.partner_kind,
          count(i.id) as offers,
          count(i.id) filter (where i.status = 'accepted') as accepted,
          coalesce(sum(i.funding_amount) filter (where i.status = 'accepted'), 0) as funding
        from organizations o
        left join industry_interests i on i.organization_id = o.id
          and exists (select 1 from projects pr join problems p on p.id = pr.problem_id
                      where pr.id = i.project_id and ${scope})
        where o.type = 'industry' and o.is_active
        group by o.id, o.name, o.partner_kind
        order by offers desc, o.name
      `)
    ).rows.map((r) => ({
      name: String(r.name),
      kind: r.partner_kind == null ? null : (String(r.partner_kind) as PartnerKind),
      offers: num(r.offers),
      accepted: num(r.accepted),
      funding: num(r.funding),
    }));

    const partnerKinds = (
      await tx.execute(sql`
        select o.partner_kind as key, count(i.id) as total
        from industry_interests i
        join organizations o on o.id = i.organization_id
        join projects pr on pr.id = i.project_id
        join problems p on p.id = pr.problem_id
        where i.status = 'accepted' and ${scope}
        group by o.partner_kind
        order by total desc
      `)
    ).rows.map((r) => ({ key: String(r.key), total: num(r.total) }));

    const sectorDistricts = (
      await tx.execute(sql`
        select p.district_code, p.domain, count(*) as total
        from problems p
        where ${scope} and p.domain is not null
        group by p.district_code, p.domain
      `)
    ).rows.map((r) => ({
      districtCode: String(r.district_code),
      domain: String(r.domain) as Domain,
      total: num(r.total),
    }));

    const outcomesByType = (
      await tx.execute(sql`
        select oc.outcome_type as key, count(*) as total
        from outcomes oc
        join projects pr on pr.id = oc.project_id
        join problems p on p.id = pr.problem_id
        where ${scope}
        group by oc.outcome_type
        order by total desc
      `)
    ).rows.map((r) => ({ key: String(r.key), total: num(r.total) }));

    const classifierTiers = (
      await tx.execute(sql`
        select coalesce(p.classified_by::text, 'unclassified') as key, count(*) as total
        from problems p
        where ${scope}
        group by 1
        order by total desc
      `)
    ).rows.map((r) => ({ key: String(r.key), total: num(r.total) }));

    return {
      computedAt: new Date().toISOString(),
      kpis: {
        totalReports: num(kpiRow.total_reports),
        activeProjects: num(kpiRow.active_projects),
        deployed,
        completionRate: validatedOrBeyond === 0 ? 0 : deployed / validatedOrBeyond,
        medianDaysToRoute:
          kpiRow.median_days_to_route == null
            ? null
            : Number(num(kpiRow.median_days_to_route).toFixed(1)),
        fundingCommitted: num(kpiRow.funding_committed),
        outcomes: num(kpiRow.outcomes),
        districtsReached: num(kpiRow.districts_reached),
        patents: num(kpiRow.patents),
        startups: num(kpiRow.startups),
        communityReach: num(kpiRow.community_reach),
        criticalOpen: num(kpiRow.critical_open),
      },
      monthly,
      domains,
      districts,
      funnel,
      institutions,
      partners,
      partnerKinds,
      sectorDistricts,
      outcomesByType,
      classifierTiers,
    };
  });
}
