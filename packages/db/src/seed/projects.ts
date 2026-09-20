import { and, eq } from 'drizzle-orm';
import {
  PROJECT_PLANNING_STATUS,
  type IpStatus,
  type MilestoneStatus,
  type OfferType,
  type OutcomeType,
  type ProblemStatus,
} from '@akhra/shared';
import {
  industryInterests,
  milestones,
  outcomes,
  problems,
  projectMembers,
  projects,
  proposals,
  users,
  type Transaction,
} from '../index';

interface SeedProject {
  seq: number;
  problemSeq: number;
  org: number;
  status: ProblemStatus;
  title: string;
  summary: string;
  mentor?: number;
  members?: {
    user: number;
    role: 'student' | 'co_investigator' | 'faculty_mentor';
    discipline?: string;
  }[];
  milestones: { title: string; status: MilestoneStatus }[];
  interests?: {
    org: number;
    status: 'expressed' | 'accepted';
    offers: OfferType[];
    funding?: number;
    message: string;
  }[];
  outcomes?: {
    type: OutcomeType;
    title: string;
    metric?: [string, number];
    ipStatus?: IpStatus;
    reference?: string;
  }[];
}

const pid = (n: number) => `00000000-0000-4000-d000-${String(n).padStart(12, '0')}`;
const problemId = (n: number) => `00000000-0000-4000-a000-${String(n).padStart(12, '0')}`;
const orgId = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const userId = (n: number) => `00000000-0000-4000-9000-${String(n).padStart(12, '0')}`;

const SEED_PROJECTS: SeedProject[] = [
  {
    seq: 1,
    problemSeq: 1,
    org: 105,
    status: 'deployed',
    title: 'Low-cost iron removal for community handpumps in Gumla',
    summary:
      'Gravity-fed oxidation and sand filtration units fitted to community handpumps, designed to be maintained by a trained village volunteer.',
    mentor: 14,
    milestones: [
      { title: 'Water quality survey of 40 handpumps', status: 'approved' },
      { title: 'Filter prototype bench-tested', status: 'approved' },
      { title: 'Pilot on 3 handpumps in Bharno', status: 'approved' },
      { title: 'Rollout to 12 handpumps', status: 'approved' },
    ],
    interests: [
      {
        org: 203,
        status: 'accepted',
        offers: ['prototyping', 'deployment'],
        funding: 350000,
        message: 'We manufacture iron-removal media and can supply and install units at cost.',
      },
      {
        org: 201,
        status: 'accepted',
        offers: ['funding', 'mentorship'],
        funding: 500000,
        message: 'The Foundation will fund the rollout as part of its tribal water programme.',
      },
    ],
    outcomes: [
      {
        type: 'deployment',
        title: 'Iron removal units running on 12 handpumps',
        metric: ['Households served', 640],
      },
      {
        type: 'patent',
        title: 'Gravity-fed iron removal cartridge',
        ipStatus: 'filed',
        reference: '202631004417',
      },
    ],
  },
  {
    seq: 2,
    problemSeq: 2,
    org: 101,
    status: 'piloted',
    title: 'Covered-transport compliance monitoring on the Baliapur coal route',
    summary:
      'Roadside camera and dust-sensor units that flag uncovered coal trucks, with a weekly report shared with the district administration.',
    mentor: 12,
    members: [{ user: 16, role: 'student', discipline: 'Environmental Engineering' }],
    milestones: [
      { title: 'Baseline dust measurement at 6 roadside points', status: 'approved' },
      { title: 'Sensor and camera unit prototype', status: 'approved' },
      { title: 'Two-month roadside pilot', status: 'in_progress' },
    ],
    interests: [
      {
        org: 206,
        status: 'accepted',
        offers: ['prototyping', 'mentorship'],
        funding: 150000,
        message: 'Our lab can fabricate the sensor enclosures and mentor the student team.',
      },
    ],
    outcomes: [
      {
        type: 'policy_change',
        title: 'District order mandating covered coal transport on the Baliapur route',
        metric: ['Trucks observed covered (%)', 92],
      },
      {
        type: 'deployment',
        title: 'Roadside monitoring units live at six points on the Baliapur route',
        metric: ['Residents along the route', 18500],
      },
    ],
  },
  {
    seq: 3,
    problemSeq: 3,
    org: 102,
    status: 'prototyped',
    title: 'Pest identification and advisory for smallholder paddy in Hazaribagh',
    summary:
      'An image-based pest identification guide paired with a block-level SMS alert channel to extension officers.',
    mentor: 11,
    members: [{ user: 15, role: 'student', discipline: 'Agronomy' }],
    milestones: [
      { title: 'Pest incidence survey across four panchayats', status: 'approved' },
      { title: 'Regional pest image reference set', status: 'submitted' },
      { title: 'SMS alert channel pilot', status: 'pending' },
    ],
    interests: [
      {
        org: 204,
        status: 'expressed',
        offers: ['mentorship', 'funding', 'deployment'],
        funding: 500000,
        message:
          'We run mandi price alerts in four districts and can carry this advisory on the same channel.',
      },
    ],
    outcomes: [
      {
        type: 'publication',
        title: 'Regional paddy pest reference guide issued to extension officers',
        metric: ['Farmers reached', 2140],
      },
    ],
  },
  {
    seq: 4,
    problemSeq: 4,
    org: 103,
    status: 'in_progress',
    title: 'Night-time obstetric referral support for Littipara PHC',
    summary:
      'A tele-consultation link between the PHC and the district hospital labour room, with a referral transport roster.',
    milestones: [
      { title: 'Referral pathway mapping', status: 'submitted' },
      { title: 'Tele-consultation setup', status: 'pending' },
    ],
    interests: [
      {
        org: 205,
        status: 'expressed',
        offers: ['deployment', 'mentorship'],
        message: 'Our telemedicine kiosks could be placed at the PHC for night-time consultations.',
      },
    ],
  },
  {
    seq: 5,
    problemSeq: 5,
    org: 107,
    status: 'in_progress',
    title: 'Solar micro-grid for Balumath irrigation pumps',
    summary:
      'A community solar micro-grid sized for evening irrigation load, reducing dependence on the failing transformer.',
    milestones: [
      { title: 'Load survey of 60 households and 18 pumps', status: 'approved' },
      { title: 'Micro-grid design', status: 'in_progress' },
    ],
    interests: [
      {
        org: 202,
        status: 'accepted',
        offers: ['funding', 'deployment'],
        funding: 800000,
        message: 'JREDA can fund and commission the micro-grid under its off-grid programme.',
      },
    ],
  },
  {
    seq: 6,
    problemSeq: 6,
    org: 106,
    // Left in planning, with a proposal waiting for the Dumka district officer.
    status: PROJECT_PLANNING_STATUS,
    title: 'Remote science teaching support for Jarmundi upper primary',
    summary:
      'University science students deliver weekly remote lessons and a lab-in-a-box kit while the teaching post is filled.',
    mentor: 17,
    milestones: [],
    interests: [
      {
        org: 206,
        status: 'expressed',
        offers: ['mentorship', 'internship'],
        message: 'We can place interns and help turn the kit into a product for other schools.',
      },
    ],
  },
];

const DAY = 24 * 60 * 60 * 1000;

export async function seedProjects(tx: Transaction, now = new Date()): Promise<number> {
  let created = 0;

  for (const p of SEED_PROJECTS) {
    const existing = await tx
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.problemId, problemId(p.problemSeq)),
          eq(projects.organizationId, orgId(p.org)),
        ),
      )
      .limit(1);
    if (existing.length > 0 && existing[0]!.id !== pid(p.seq)) continue;

    const id = pid(p.seq);
    const startedAt = new Date(now.getTime() - (60 + p.seq * 10) * DAY);

    await tx
      .insert(projects)
      .values({
        id,
        problemId: problemId(p.problemSeq),
        organizationId: orgId(p.org),
        title: p.title,
        summary: p.summary,
        status: p.status,
        facultyMentorId: p.mentor ? userId(p.mentor) : null,
        startedAt,
        createdAt: startedAt,
      })
      .onConflictDoUpdate({ target: projects.id, set: { status: p.status, title: p.title } });

    const memberRows = [
      ...(p.mentor
        ? [{ user: p.mentor, role: 'faculty_mentor' as const, discipline: undefined }]
        : []),
      ...(p.members ?? []),
    ];
    if (memberRows.length > 0) {
      await tx
        .insert(projectMembers)
        .values(
          memberRows.map((m) => ({
            projectId: id,
            userId: userId(m.user),
            memberRole: m.role,
            discipline: m.discipline ?? null,
          })),
        )
        .onConflictDoNothing();
    }

    const planning = p.status === PROJECT_PLANNING_STATUS;
    const [reviewer] = planning
      ? []
      : await tx
          .select({ id: users.id })
          .from(users)
          .innerJoin(problems, eq(problems.districtCode, users.jurisdictionCode))
          .where(and(eq(problems.id, problemId(p.problemSeq)), eq(users.role, 'gov_admin')))
          .limit(1);
    const proposal = {
      abstract: p.summary,
      methodology:
        'Field survey with the district office, a bench-tested prototype, then a staged community pilot before any wider rollout.',
      expectedOutcomes:
        'A working, community-maintainable solution and a measured change against the baseline survey.',
      timelineMonths: 12,
      budgetEstimate: '400000',
      status: planning ? ('submitted' as const) : ('approved' as const),
      reviewedById: reviewer?.id ?? null,
      reviewedAt: planning ? null : startedAt,
    };
    await tx
      .insert(proposals)
      .values({ projectId: id, version: 1, ...proposal })
      .onConflictDoUpdate({ target: [proposals.projectId, proposals.version], set: proposal });

    await tx.delete(milestones).where(eq(milestones.projectId, id));
    if (p.milestones.length > 0) {
      await tx.insert(milestones).values(
        p.milestones.map((m, index) => ({
          projectId: id,
          title: m.title,
          orderIndex: index,
          status: m.status,
          dueDate: new Date(startedAt.getTime() + (index + 1) * 45 * DAY),
          completedAt:
            m.status === 'approved' ? new Date(startedAt.getTime() + (index + 1) * 40 * DAY) : null,
        })),
      );
    }

    for (const interest of p.interests ?? []) {
      await tx
        .insert(industryInterests)
        .values({
          projectId: id,
          organizationId: orgId(interest.org),
          offerTypes: interest.offers,
          fundingAmount: interest.funding?.toString() ?? null,
          message: interest.message,
          status: interest.status,
          respondedAt:
            interest.status === 'accepted' ? new Date(startedAt.getTime() + 20 * DAY) : null,
        })
        .onConflictDoNothing();
    }

    await tx.delete(outcomes).where(eq(outcomes.projectId, id));
    if (p.outcomes?.length) {
      await tx.insert(outcomes).values(
        p.outcomes.map((o) => ({
          projectId: id,
          outcomeType: o.type,
          title: o.title,
          impactMetricName: o.metric?.[0] ?? null,
          impactMetricValue: o.metric ? String(o.metric[1]) : null,
          ipStatus: o.ipStatus ?? null,
          reference: o.reference ?? null,
          recordedAt: new Date(now.getTime() - 15 * DAY),
        })),
      );
    }

    created += 1;
  }

  return created;
}
