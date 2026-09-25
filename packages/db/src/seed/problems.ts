import { inArray, sql } from 'drizzle-orm';
import { contentFingerprint } from '@akhra/classifier';
import {
  assessPriority,
  formatRefCode,
  type AffectedScale,
  type Domain,
  type ProblemStatus,
  type SubmitterType,
} from '@akhra/shared';
import {
  problemRoutings,
  problems,
  refCodeCounters,
  statusEvents,
  type Transaction,
} from '../index';

interface SeedProblem {
  seq: number;
  title: string;
  description: string;
  domain: Domain;
  districtCode: string;
  blockName: string;
  status: ProblemStatus;
  submitterName: string;
  submitterPhone: string;
  submitterType: SubmitterType;
  submitterId?: string | null;
  routedTo?: number[];
  classifiedBy?: 'gemini' | 'groq' | 'tfidf' | 'manual';
  confidence?: number;
  daysAgo: number;
}

const problemId = (n: number) => `00000000-0000-4000-a000-${String(n).padStart(12, '0')}`;
const orgId = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const userId = (n: number) => `00000000-0000-4000-9000-${String(n).padStart(12, '0')}`;

const SEED_YEAR = 2026;

const SEED_PROBLEMS: SeedProblem[] = [
  {
    seq: 1,
    title: 'Handpump water has turned yellow and smells of iron',
    description:
      'The handpump serving about sixty households in our tola has started giving yellow water with a strong iron smell. Several children have had stomach illness over the last month. The nearest alternative source is a well two kilometres away, and women are making that walk twice a day.',
    domain: 'water_resources',
    districtCode: 'GUM',
    blockName: 'Bharno',
    status: 'deployed',
    submitterName: 'Sunita Devi',
    submitterPhone: '9835100031',
    submitterId: userId(31),
    submitterType: 'individual',
    routedTo: [105, 102],
    classifiedBy: 'gemini',
    confidence: 0.94,
    daysAgo: 240,
  },
  {
    seq: 2,
    title: 'Coal dust from uncovered trucks is covering homes and crops',
    description:
      'Trucks carrying coal from the nearby colliery pass through our settlement uncovered throughout the day. A thick layer of black dust settles on roofs, drinking water containers and vegetable plots. Children have developed persistent coughs and the winter vegetable crop has visibly suffered.',
    domain: 'environment',
    districtCode: 'DHA',
    blockName: 'Baliapur',
    status: 'piloted',
    submitterName: 'Ramesh Mahto',
    submitterPhone: '9835100030',
    submitterId: userId(30),
    submitterType: 'individual',
    routedTo: [101, 104],
    classifiedBy: 'gemini',
    confidence: 0.91,
    daysAgo: 190,
  },
  {
    seq: 3,
    title: 'Pest attack destroyed paddy across forty acres with no advisory available',
    description:
      'A pest attack has damaged the paddy crop across nearly forty acres in our panchayat this kharif season. Farmers do not know which treatment is appropriate and the agriculture extension officer has not visited since sowing. Most families here depend entirely on this harvest.',
    domain: 'agriculture',
    districtCode: 'HAZ',
    blockName: 'Barhi',
    status: 'prototyped',
    submitterName: 'Mukhiya Birsa Munda',
    submitterPhone: '9835100032',
    submitterId: userId(32),
    submitterType: 'panchayati_raj',
    routedTo: [102],
    classifiedBy: 'groq',
    confidence: 0.88,
    daysAgo: 160,
  },
  {
    seq: 4,
    title: 'Primary health centre has no doctor on night duty',
    description:
      'Our primary health centre closes after six in the evening because no doctor is posted for night duty. Women in labour have to be taken forty kilometres to the district hospital by hired vehicle. Two emergencies last month were handled with no medical supervision at all.',
    domain: 'healthcare',
    districtCode: 'PAK',
    blockName: 'Littipara',
    status: 'in_progress',
    submitterName: 'Fatima Khatun',
    submitterPhone: '9835100041',
    submitterType: 'community_group',
    routedTo: [103],
    classifiedBy: 'gemini',
    confidence: 0.93,
    daysAgo: 120,
  },
  {
    seq: 5,
    title: 'Village transformer burnt out six weeks ago and has not been replaced',
    description:
      'The transformer serving our village burnt out six weeks ago. There has been no electricity since, for lighting or for irrigation pumps. Students cannot study after dark and the two shops in the village close at sunset. Complaints at the sub-division office have not produced a date for replacement.',
    domain: 'energy',
    districtCode: 'LAT',
    blockName: 'Balumath',
    status: 'in_progress',
    submitterName: 'Jitendra Ram',
    submitterPhone: '9835100042',
    submitterType: 'individual',
    routedTo: [107, 101],
    classifiedBy: 'groq',
    confidence: 0.9,
    daysAgo: 95,
  },
  {
    seq: 6,
    title: 'No science teacher in the upper primary school for three months',
    description:
      'The upper primary school in our village has had no science teacher since June. Around a hundred and twenty students are sitting in class without instruction and attendance has dropped sharply. Parents have raised this at the block office twice with no result.',
    domain: 'education',
    districtCode: 'DUM',
    blockName: 'Jarmundi',
    status: 'routed',
    submitterName: 'Sushila Marandi',
    submitterPhone: '9835100043',
    submitterType: 'community_group',
    routedTo: [106, 105],
    classifiedBy: 'gemini',
    confidence: 0.92,
    daysAgo: 88,
  },
  {
    seq: 7,
    title: 'Approach road collapsed and bus service has stopped entirely',
    description:
      'The approach road connecting our village to the block headquarters has deep potholes and a collapsed culvert. Bus operators have withdrawn the service. People now walk six kilometres to the nearest stop, and during the monsoon patients cannot be moved out at all.',
    domain: 'urban_development',
    districtCode: 'SIM',
    blockName: 'Kolebira',
    status: 'routed',
    submitterName: 'Anand Kachhap',
    submitterPhone: '9835100044',
    submitterType: 'panchayati_raj',
    routedTo: [107],
    classifiedBy: 'tfidf',
    confidence: 0.79,
    daysAgo: 55,
  },
  {
    seq: 8,
    title: 'Block office has no ramp or accessible toilet',
    description:
      'The block development office has a flight of steps at the entrance and no ramp. Persons with disabilities and elderly pensioners have to be carried up by relatives to submit forms. There is no accessible toilet anywhere in the building.',
    domain: 'accessibility',
    districtCode: 'RAN',
    blockName: 'Kanke',
    status: 'routed',
    submitterName: 'Rajesh Lohra',
    submitterPhone: '9835100045',
    submitterType: 'individual',
    routedTo: [105, 107],
    classifiedBy: 'gemini',
    confidence: 0.89,
    daysAgo: 48,
  },
  {
    seq: 9,
    title: 'Self help group cannot find buyers for bamboo craft beyond the village market',
    description:
      'Our self help group of twenty two women makes bamboo baskets and mats but can only sell at the weekly village market, where middlemen offer very low prices. Several members have started migrating for wage work because the craft income is no longer enough to live on.',
    domain: 'rural_livelihoods',
    districtCode: 'KHU',
    blockName: 'Torpa',
    status: 'routed',
    submitterName: 'Mary Dungdung',
    submitterPhone: '9835100046',
    submitterType: 'community_group',
    routedTo: [106, 102],
    classifiedBy: 'groq',
    confidence: 0.86,
    daysAgo: 42,
  },
  {
    seq: 10,
    title: 'Ration card applications pending for over a year on the portal',
    description:
      'More than thirty families in our panchayat applied for ration cards last year and the applications still show as pending on the portal. Without the card they cannot draw their monthly food grain entitlement. Repeated visits to the circle office have not resolved anything.',
    domain: 'public_administration',
    districtCode: 'GOD',
    blockName: 'Poraiyahat',
    status: 'validated',
    submitterName: 'Mukhiya Birsa Munda',
    submitterPhone: '9835100032',
    submitterId: userId(32),
    submitterType: 'panchayati_raj',
    classifiedBy: 'gemini',
    confidence: 0.9,
    daysAgo: 30,
  },
  {
    seq: 11,
    title: 'Fluoride in borewell water is causing joint pain among older residents',
    description:
      'Several older residents in our ward have developed severe joint pain and mottled teeth are common among children. A visiting health worker suggested it may be related to fluoride in the borewell water, but no testing has been carried out and there is no alternative supply.',
    domain: 'water_resources',
    districtCode: 'PAL',
    blockName: 'Chainpur',
    status: 'validated',
    submitterName: 'Devendra Pandey',
    submitterPhone: '9835100047',
    submitterType: 'individual',
    classifiedBy: 'gemini',
    confidence: 0.91,
    daysAgo: 26,
  },
  {
    seq: 12,
    title: 'Elephant movement through farmland is destroying standing crops each season',
    description:
      'A herd moves through our farmland every year between October and December, destroying standing paddy and damaging houses on the edge of the village. Compensation claims take months. Villagers stay awake in shifts through the season, which is exhausting and unsafe.',
    domain: 'environment',
    districtCode: 'WSB',
    blockName: 'Manoharpur',
    status: 'validated',
    submitterName: 'Sukhram Purty',
    submitterPhone: '9835100048',
    submitterType: 'community_group',
    classifiedBy: 'groq',
    confidence: 0.84,
    daysAgo: 21,
  },
  {
    seq: 13,
    title: 'Anganwadi centre operating without a building since the roof collapsed',
    description:
      'The anganwadi centre roof collapsed during the monsoon and has not been rebuilt. Children now gather under a tree, and supplementary nutrition is being distributed in the open. During rain the centre simply does not run, and attendance has fallen by half.',
    domain: 'education',
    districtCode: 'GAR',
    blockName: 'Bhawanathpur',
    status: 'validated',
    submitterName: 'Kamla Devi',
    submitterPhone: '9835100049',
    submitterType: 'community_group',
    classifiedBy: 'gemini',
    confidence: 0.85,
    daysAgo: 18,
  },
  {
    seq: 14,
    title: 'Open drain running through the market is flooding shops in the monsoon',
    description:
      'The drain running along the main market has not been cleaned in over a year and is choked with silt and plastic. Every monsoon it overflows into the shops, damaging stock. Traders have raised it with the municipality repeatedly without result.',
    domain: 'urban_development',
    districtCode: 'DEO',
    blockName: 'Deoghar Municipal',
    status: 'submitted',
    submitterName: 'Vinod Kumar Sah',
    submitterPhone: '9835100050',
    submitterType: 'urban_local_body',
    classifiedBy: 'tfidf',
    confidence: 0.72,
    daysAgo: 12,
  },
  {
    seq: 15,
    title: 'Solar street lights installed two years ago have all stopped working',
    description:
      'Twelve solar street lights were installed in our panchayat two years ago. All of them stopped working within eighteen months and nobody knows who is responsible for maintenance. The main road is completely dark after sunset, which is unsafe for women returning from the market.',
    domain: 'energy',
    districtCode: 'BOK',
    blockName: 'Chas',
    status: 'submitted',
    submitterName: 'Nirmala Kumari',
    submitterPhone: '9835100051',
    submitterType: 'panchayati_raj',
    classifiedBy: 'gemini',
    confidence: 0.88,
    daysAgo: 9,
  },
  {
    seq: 16,
    title: 'Sickle cell screening has never been conducted in our block',
    description:
      'Several families in our block have children with repeated pain crises and severe anaemia. A doctor at the district hospital mentioned sickle cell disease, but no screening camp has ever been held here and families cannot afford repeated trips for testing.',
    domain: 'healthcare',
    districtCode: 'SER',
    blockName: 'Kharsawan',
    status: 'submitted',
    submitterName: 'Ranjit Mahato',
    submitterPhone: '9835100052',
    submitterType: 'community_group',
    classifiedBy: 'gemini',
    confidence: 0.92,
    daysAgo: 7,
  },
  {
    seq: 17,
    title: 'Mandi prices are unknown to farmers until they reach the market',
    description:
      'Farmers here load vegetables and travel thirty kilometres to the mandi without knowing the day rate. Traders quote whatever they choose on arrival, and going back is not an option with a perishable load. A reliable way to know prices before setting out would change what we earn.',
    domain: 'agriculture',
    districtCode: 'RAM',
    blockName: 'Gola',
    status: 'submitted',
    submitterName: 'Shankar Bediya',
    submitterPhone: '9835100053',
    submitterType: 'individual',
    classifiedBy: 'groq',
    confidence: 0.87,
    daysAgo: 5,
  },
  {
    seq: 18,
    title: 'Migrant workers have no record of employment when they return',
    description:
      'Most young men from our village migrate to work in brick kilns and construction outside the state. They return without any record of employment, which means no provident fund, no accident cover and no way to prove experience. Several came back injured last year with no recourse at all.',
    domain: 'rural_livelihoods',
    districtCode: 'JAM',
    blockName: 'Nala',
    status: 'submitted',
    submitterName: 'Sikandar Ansari',
    submitterPhone: '9835100054',
    submitterType: 'community_group',
    classifiedBy: 'gemini',
    confidence: 0.83,
    daysAgo: 4,
  },
  {
    seq: 19,
    title: 'Santali speaking students cannot follow lessons taught only in Hindi',
    description:
      'Children in the early primary classes at our school speak Santali at home and follow very little of what is taught in Hindi. There is no bilingual material and no teacher who speaks Santali. Dropout after class three is high and this seems to be the main reason.',
    domain: 'accessibility',
    districtCode: 'SAH',
    blockName: 'Borio',
    status: 'submitted',
    submitterName: 'Mangal Soren',
    submitterPhone: '9835100055',
    submitterType: 'community_group',
    classifiedBy: 'gemini',
    confidence: 0.86,
    daysAgo: 3,
  },
  {
    seq: 20,
    title: 'Land mutation records still show my grandfather as the owner',
    description:
      'The land record for our family plot still names my grandfather, who died eleven years ago. Without mutation we cannot access crop loans or the PM Kisan payment. The circle office asks for documents we have submitted three times already and no application number is ever given.',
    domain: 'public_administration',
    districtCode: 'KOD',
    blockName: 'Markacho',
    status: 'submitted',
    submitterName: 'Bhola Yadav',
    submitterPhone: '9835100056',
    submitterType: 'individual',
    classifiedBy: 'tfidf',
    confidence: 0.76,
    daysAgo: 2,
  },
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

const STAGE_NOTES: Partial<Record<ProblemStatus, string>> = {
  validated: 'Verified as a genuine, actionable challenge.',
  routed: 'Sent to matched institutions for review.',
  in_progress: 'A university team has taken this on and begun work.',
  prototyped: 'A working prototype has been built and bench-tested.',
  piloted: 'Field pilot underway with the community.',
  deployed: 'Solution deployed and handed over.',
  closed: 'Work complete and outcomes recorded.',
};

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function reachOf(type: SubmitterType): AffectedScale {
  return type === 'individual' ? 'neighbourhood' : 'village';
}

export async function seedProblems(tx: Transaction): Promise<number> {
  await tx
    .insert(problems)
    .values(
      SEED_PROBLEMS.map((p) => {
        const affectedScale = reachOf(p.submitterType);
        const priority = assessPriority({
          domain: p.domain,
          title: p.title,
          description: p.description,
          affectedScale,
          safetyRisk: false,
          supportCount: 0,
          duplicateReports: 0,
          ageDays: p.daysAgo,
        });
        return {
          id: problemId(p.seq),
          refCode: formatRefCode(SEED_YEAR, p.seq),
          title: p.title,
          description: p.description,
          domain: p.domain,
          domainConfidence: p.confidence ?? 0.8,
          classifiedBy: p.classifiedBy ?? 'tfidf',
          status: p.status,
          districtCode: p.districtCode,
          blockName: p.blockName,
          submitterId: p.submitterId ?? null,
          submitterType: p.submitterType,
          submitterName: p.submitterName,
          submitterPhone: p.submitterPhone,
          contentFingerprint: contentFingerprint(p.title, p.description),
          affectedScale,
          priorityScore: priority.score,
          priority: priority.level,
          priorityReasons: priority.reasons,
          isPublic: true,
          createdAt: daysAgo(p.daysAgo),
          updatedAt: daysAgo(Math.max(0, p.daysAgo - 5)),
        };
      }),
    )
    .onConflictDoUpdate({
      target: problems.id,
      set: {
        title: sql`excluded.title`,
        status: sql`excluded.status`,
        contentFingerprint: sql`excluded.content_fingerprint`,
        affectedScale: sql`excluded.affected_scale`,
        priorityScore: sql`excluded.priority_score`,
        priority: sql`excluded.priority`,
        priorityReasons: sql`excluded.priority_reasons`,
      },
    });

  await tx
    .insert(refCodeCounters)
    .values({ year: SEED_YEAR, lastSequence: SEED_PROBLEMS.length })
    .onConflictDoUpdate({
      target: refCodeCounters.year,
      set: { lastSequence: sql`greatest(${refCodeCounters.lastSequence}, excluded.last_sequence)` },
    });

  const routingRows = SEED_PROBLEMS.flatMap((p) =>
    (p.routedTo ?? []).map((org, index) => ({
      problemId: problemId(p.seq),
      organizationId: orgId(org),
      matchScore: 0.9 - index * 0.12,
      matchRationale: index === 0 ? 'Strongest domain match in the division' : 'Secondary match',
      response: (index === 0 ? 'accepted' : 'proposed') as 'accepted' | 'proposed',
      respondedAt: index === 0 ? daysAgo(p.daysAgo - 6) : null,
      createdAt: daysAgo(p.daysAgo - 4),
    })),
  );

  if (routingRows.length > 0) {
    await tx.insert(problemRoutings).values(routingRows).onConflictDoNothing();
  }

  const eventRows = SEED_PROBLEMS.flatMap((p) => {
    const target = JOURNEY.indexOf(p.status);
    const stages = target >= 0 ? JOURNEY.slice(0, target + 1) : ['submitted' as ProblemStatus];
    const span = Math.max(1, Math.floor(p.daysAgo / Math.max(1, stages.length)));

    return stages.map((stage, index) => ({
      entityType: 'problem' as const,
      entityId: problemId(p.seq),
      problemId: problemId(p.seq),
      fromStatus: index === 0 ? null : (stages[index - 1] ?? null),
      toStatus: stage,
      actorLabel: index === 0 ? p.submitterName : 'Akhra',
      note: STAGE_NOTES[stage] ?? null,
      isPublic: true,
      createdAt: daysAgo(Math.max(0, p.daysAgo - index * span)),
    }));
  });

  await tx.delete(statusEvents).where(
    inArray(
      statusEvents.problemId,
      SEED_PROBLEMS.map((p) => problemId(p.seq)),
    ),
  );
  await tx.insert(statusEvents).values(eventRows);

  return SEED_PROBLEMS.length;
}
