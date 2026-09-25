import { contentFingerprint } from '@akhra/classifier';
import {
  formatRefCode,
  JHARKHAND_DISTRICTS,
  type Domain,
  type ProblemStatus,
  type SubmitterType,
} from '@akhra/shared';
import { inArray, sql } from 'drizzle-orm';
import {
  outcomes,
  problemRoutings,
  problems,
  projects,
  proposals,
  refCodeCounters,
  statusEvents,
  type Transaction,
} from '../index';
import { SEED_ORGANIZATIONS } from './organizations';

interface Template {
  title: string;
  description: string;
}

const TEMPLATES: Record<Domain, Template[]> = {
  water_resources: [
    {
      title: 'Handpump out of order for two months in {place}',
      description:
        'The only handpump in our tola has been broken since the monsoon. Families now walk over a kilometre to a well that is itself running low, and requests to the block office have not produced a mechanic.',
    },
    {
      title: 'Drinking water turns muddy every monsoon in {place}',
      description:
        'Water from the village supply scheme turns brown for weeks after heavy rain. Several children fall ill each year and there is no testing or treatment at the source.',
    },
  ],
  agriculture: [
    {
      title: 'No cold storage for vegetable growers near {place}',
      description:
        'Farmers growing tomato and cauliflower have to sell the same day at whatever price traders offer, because there is no cold storage within reach. Much of the harvest spoils in peak season.',
    },
    {
      title: 'Soil testing not available to smallholders in {place}',
      description:
        'Farmers apply fertiliser by guesswork because no soil test has been done in years. Yields are falling and input costs keep rising, with no advice on what the land actually needs.',
    },
  ],
  healthcare: [
    {
      title: 'Anaemia widespread among adolescent girls in {place}',
      description:
        'An ASHA worker reports that most adolescent girls she screens are anaemic, but iron supplements run out for months at a time and there is no follow-up testing at the health centre.',
    },
    {
      title: 'Ambulance takes over two hours to reach villages near {place}',
      description:
        'The ambulance serving our block is stationed far away and often unavailable. Emergencies, including deliveries, are moved by motorcycle or hired vehicle at great risk.',
    },
  ],
  education: [
    {
      title: 'School has no functioning toilets for girls in {place}',
      description:
        'The girls toilet block at the middle school has been locked for a year because it has no water supply. Attendance among older girls has dropped noticeably as a result.',
    },
    {
      title: 'Students lack access to science labs in {place}',
      description:
        'The high school has lab equipment still in boxes because no teacher has been trained to use it. Students sit board exams without ever having done a practical experiment.',
    },
  ],
  rural_livelihoods: [
    {
      title: 'Mahua collectors sell far below market price in {place}',
      description:
        'Women collecting mahua flowers sell to local traders at a fraction of the market rate because there is no aggregation, drying facility or direct buyer link in the area.',
    },
    {
      title: 'MGNREGA wages delayed by several months in {place}',
      description:
        'Workers who completed pond and road work under MGNREGA have not been paid for three to five months. Many families have taken loans at high interest while they wait.',
    },
  ],
  environment: [
    {
      title: 'Stone crusher dust affecting homes near {place}',
      description:
        'A cluster of stone crushers operates without dust control next to a settlement. Residents report breathing problems and the nearby fields are coated in fine grey dust.',
    },
    {
      title: 'Garbage dumped into the river bank at {place}',
      description:
        'Solid waste from the town is dumped on the river bank and burned. The smoke drifts over homes and waste washes into the river during rain.',
    },
  ],
  urban_development: [
    {
      title: 'Waterlogging on the main road every monsoon in {place}',
      description:
        'The main market road floods knee-deep after every heavy rain because the drains are blocked or missing. Shops close and schoolchildren wade through dirty water.',
    },
    {
      title: 'Street lights missing along the bus stand road in {place}',
      description:
        'The stretch between the bus stand and the residential colony has no working lights. Women and students returning after dark report feeling unsafe.',
    },
  ],
  energy: [
    {
      title: 'Low voltage makes irrigation pumps useless in {place}',
      description:
        'Voltage in the evening is so low that electric irrigation pumps cannot start. Farmers switch to expensive diesel pumps or leave fields unwatered.',
    },
  ],
  public_administration: [
    {
      title: 'Pension payments stopped without explanation in {place}',
      description:
        'Several elderly and widowed residents have stopped receiving their pension for months. The bank and the block office each say the other is responsible.',
    },
  ],
  accessibility: [
    {
      title: 'No sign language support at the district hospital in {place}',
      description:
        'Deaf patients cannot communicate with doctors at the district hospital because there is no interpreter or visual aid. Family members have to guess at symptoms on their behalf.',
    },
  ],
};

const WEIGHTS: [Domain, number][] = [
  ['water_resources', 7],
  ['agriculture', 6],
  ['healthcare', 5],
  ['education', 4],
  ['rural_livelihoods', 4],
  ['environment', 3],
  ['urban_development', 3],
  ['energy', 2],
  ['public_administration', 2],
  ['accessibility', 1],
];

const DELIVERED: Record<
  Domain,
  { project: string; summary: string; outcome: string; metric: string }
> = {
  water_resources: {
    project: 'Safe drinking water for',
    summary:
      'Treatment and repair work on the village supply, handed over to a trained local caretaker.',
    outcome: 'Safe drinking water restored to the affected tolas',
    metric: 'people with safe drinking water',
  },
  agriculture: {
    project: 'Crop advisory and shared equipment for',
    summary:
      'A package of practices and shared equipment, delivered through the block extension office.',
    outcome: 'Advisory and shared equipment in use across the cluster',
    metric: 'farmers reached',
  },
  healthcare: {
    project: 'Screening and referral support for',
    summary:
      'A referral and screening routine run with the health sub-centre and its ASHA workers.',
    outcome: 'Screening and referral running at the sub-centre',
    metric: 'patients screened',
  },
  education: {
    project: 'Teaching support for schools in',
    summary:
      'Teaching material and support set up with the school and its cluster resource centre.',
    outcome: 'Teaching support in place at the school',
    metric: 'students reached',
  },
  rural_livelihoods: {
    project: 'Livelihood work with self-help groups in',
    summary: 'A work and marketing arrangement built with the local self-help group federation.',
    outcome: 'Earning work established through the federation',
    metric: 'households earning',
  },
  environment: {
    project: 'Monitoring and restoration in',
    summary:
      'Monitoring and restoration work carried out with the panchayat and the forest range office.',
    outcome: 'Monitoring and restoration handed to the panchayat',
    metric: 'residents living in the area',
  },
  urban_development: {
    project: 'Civic repair and maintenance in',
    summary:
      'Civic infrastructure repaired and handed to the municipal body with a maintenance plan.',
    outcome: 'Repaired infrastructure handed to the municipal body',
    metric: 'residents served',
  },
  energy: {
    project: 'Reliable power for',
    summary:
      'A supply and maintenance arrangement set up with the distribution company and the village.',
    outcome: 'Reliable supply restored to the connections',
    metric: 'households connected',
  },
  public_administration: {
    project: 'Faster service delivery in',
    summary: 'A revised service procedure adopted by the block office after a field review.',
    outcome: 'Revised procedure adopted at the block office',
    metric: 'people using the service',
  },
  accessibility: {
    project: 'Barrier-free access in',
    summary:
      'Access work completed at the public building, checked against the harmonised guidelines.',
    outcome: 'Access work completed and certified',
    metric: 'people with disabilities served',
  },
};

const SUBMITTERS: { name: string; type: SubmitterType }[] = [
  { name: 'Lalita Oraon', type: 'individual' },
  { name: 'Gram Sabha, Ward 4', type: 'panchayati_raj' },
  { name: 'Mahila Sakhi Mandal', type: 'community_group' },
  { name: 'Birendra Mahto', type: 'individual' },
  { name: 'Nagar Parishad Ward 11', type: 'urban_local_body' },
  { name: 'Salomi Tirkey', type: 'individual' },
  { name: 'Kisan Club', type: 'community_group' },
];

const JOURNEY: ProblemStatus[] = [
  'submitted',
  'validated',
  'routed',
  'in_progress',
  'prototyped',
  'piloted',
  'deployed',
  'closed',
];

const HISTORY_BLOCK_2026 = 101;
const DAY = 24 * 60 * 60 * 1000;

const problemId = (n: number) => `00000000-0000-4000-b000-${String(n).padStart(12, '0')}`;
const projectId = (n: number) => `00000000-0000-4000-c000-${String(n).padStart(12, '0')}`;

function districtName(code: string): string {
  return JHARKHAND_DISTRICTS.find((d) => d.code === code)?.nameEn ?? code;
}

function bestUniversityFor(domain: Domain): string {
  const ranked = SEED_ORGANIZATIONS.filter(
    (o) => o.type === 'university' && o.domains[domain],
  ).sort((a, b) => (b.domains[domain] ?? 0) - (a.domains[domain] ?? 0));
  const best = ranked[0] ?? SEED_ORGANIZATIONS.find((o) => o.type === 'university');
  if (!best) throw new Error('Seed organizations must include a university');
  return best.id;
}

function statusForAge(daysAgo: number, index: number): ProblemStatus {
  if (daysAgo > 230) return index % 6 === 0 ? 'rejected' : 'closed';
  if (daysAgo > 150) return index % 5 === 0 ? 'rejected' : 'deployed';
  if (daysAgo > 90) return 'routed';
  if (daysAgo > 30) return index % 7 === 0 ? 'duplicate' : 'validated';
  return 'submitted';
}

const TIER_CYCLE = [
  'gemini',
  'gemini',
  'gemini',
  'gemini',
  'gemini',
  'gemini',
  'groq',
  'groq',
  'tfidf',
  'manual',
] as const;

export async function seedHistory(tx: Transaction, now = new Date()): Promise<number> {
  const queue: Domain[] = WEIGHTS.flatMap(([domain, weight]) => Array<Domain>(weight).fill(domain));
  const domains = queue.map((_, i) => queue[(i * 11) % queue.length] as Domain);
  const total = domains.length;
  const sequenceByYear = new Map<number, number>();

  const rows = domains.map((domain, i) => {
    const t = (i + 0.5) / total;
    const daysAgo = Math.round(350 * (1 - t) ** 2) + 3;
    const createdAt = new Date(now.getTime() - daysAgo * DAY);
    const year = createdAt.getFullYear();
    const next = (sequenceByYear.get(year) ?? (year === 2026 ? HISTORY_BLOCK_2026 - 1 : 0)) + 1;
    sequenceByYear.set(year, next);

    const district = JHARKHAND_DISTRICTS[(i * 7) % JHARKHAND_DISTRICTS.length]!;
    const templates = TEMPLATES[domain];
    const template = templates[i % templates.length]!;
    const submitter = SUBMITTERS[i % SUBMITTERS.length]!;
    const tier = TIER_CYCLE[i % TIER_CYCLE.length]!;

    return {
      index: i,
      id: problemId(i + 1),
      refCode: formatRefCode(year, next),
      title: template.title.replace('{place}', district.nameEn),
      description: template.description,
      domain,
      districtCode: district.code,
      blockName: district.headquarters,
      status: statusForAge(daysAgo, i),
      daysAgo,
      createdAt,
      tier,
      submitter,
    };
  });

  await tx
    .insert(problems)
    .values(
      rows.map((r) => ({
        id: r.id,
        refCode: r.refCode,
        title: r.title,
        description: r.description,
        domain: r.domain,
        domainConfidence: r.tier === 'manual' ? 1 : r.tier === 'tfidf' ? 0.74 : 0.88,
        classifiedBy: r.tier,
        status: r.status,
        districtCode: r.districtCode,
        blockName: r.blockName,
        submitterType: r.submitter.type,
        submitterName: r.submitter.name,
        submitterPhone: `98351${String(20000 + r.index).padStart(5, '0')}`,
        contentFingerprint: contentFingerprint(r.title, r.description),
        isPublic: true,
        createdAt: r.createdAt,
        updatedAt: r.createdAt,
      })),
    )
    .onConflictDoNothing();

  for (const [year, lastSequence] of sequenceByYear) {
    await tx
      .insert(refCodeCounters)
      .values({ year, lastSequence })
      .onConflictDoUpdate({
        target: refCodeCounters.year,
        set: {
          lastSequence: sql`greatest(${refCodeCounters.lastSequence}, excluded.last_sequence)`,
        },
      });
  }

  const reachedResearch = (s: ProblemStatus) => ['deployed', 'closed'].includes(s);
  const reachedRouting = (s: ProblemStatus) => ['routed', 'deployed', 'closed'].includes(s);

  const routingRows = rows
    .filter((r) => reachedRouting(r.status))
    .map((r) => ({
      problemId: r.id,
      organizationId: bestUniversityFor(r.domain),
      matchScore: 0.82,
      matchRationale: 'Strongest domain match',
      response: (reachedResearch(r.status) ? 'accepted' : 'proposed') as 'accepted' | 'proposed',
      respondedAt: reachedResearch(r.status) ? new Date(r.createdAt.getTime() + 20 * DAY) : null,
      createdAt: new Date(r.createdAt.getTime() + 14 * DAY),
    }));
  if (routingRows.length > 0)
    await tx.insert(problemRoutings).values(routingRows).onConflictDoNothing();

  const completed = rows.filter((r) => reachedResearch(r.status));
  const projectRows = completed.map((r) => ({
    id: projectId(r.index + 1),
    problemId: r.id,
    organizationId: bestUniversityFor(r.domain),
    title: `${DELIVERED[r.domain].project} ${districtName(r.districtCode)}`,
    summary: DELIVERED[r.domain].summary,
    status: r.status,
    startedAt: new Date(r.createdAt.getTime() + 25 * DAY),
    completedAt: r.status === 'closed' ? new Date(now.getTime() - 20 * DAY) : null,
    createdAt: new Date(r.createdAt.getTime() + 25 * DAY),
  }));
  if (projectRows.length > 0) {
    await tx
      .insert(projects)
      .values(projectRows)
      .onConflictDoUpdate({
        target: projects.id,
        set: { title: sql`excluded.title`, summary: sql`excluded.summary` },
      });
    await tx
      .insert(proposals)
      .values(
        projectRows.map((project) => ({
          projectId: project.id,
          version: 1,
          abstract: project.title,
          methodology: 'Field survey, prototype, community pilot, then rollout.',
          expectedOutcomes: 'A solution the community can maintain, measured against a baseline.',
          timelineMonths: 12,
          status: 'approved' as const,
          reviewedAt: project.startedAt,
          createdAt: project.createdAt,
        })),
      )
      .onConflictDoNothing();

    await tx.delete(outcomes).where(
      inArray(
        outcomes.projectId,
        projectRows.map((project) => project.id),
      ),
    );
    await tx.insert(outcomes).values(
      completed.map((r) => ({
        projectId: projectId(r.index + 1),
        outcomeType: 'deployment' as const,
        title: DELIVERED[r.domain].outcome,
        impactMetricName: DELIVERED[r.domain].metric,
        impactMetricValue: String(320 + ((r.index * 137) % 24) * 55),
        recordedAt: new Date(r.createdAt.getTime() + 120 * DAY),
      })),
    );
  }

  await tx.delete(statusEvents).where(
    inArray(
      statusEvents.problemId,
      rows.map((r) => r.id),
    ),
  );

  const eventRows = rows.flatMap((r) => {
    const target = JOURNEY.indexOf(r.status);
    const stages: ProblemStatus[] =
      target >= 0
        ? JOURNEY.slice(0, target + 1)
        : r.status === 'rejected' || r.status === 'duplicate'
          ? ['submitted', r.status]
          : ['submitted'];
    const span = Math.max(1, Math.floor((r.daysAgo - 2) / Math.max(1, stages.length)));

    return stages.map((stage, index) => ({
      entityType: 'problem' as const,
      entityId: r.id,
      problemId: r.id,
      fromStatus: index === 0 ? null : (stages[index - 1] ?? null),
      toStatus: stage,
      actorLabel: index === 0 ? r.submitter.name : 'Akhra',
      note: null,
      isPublic: true,
      createdAt: new Date(now.getTime() - Math.max(1, r.daysAgo - index * span) * DAY),
    }));
  });
  await tx.insert(statusEvents).values(eventRows);

  return rows.length;
}
