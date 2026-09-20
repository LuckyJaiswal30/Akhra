import type {
  AcademicDiscipline,
  Domain,
  InstitutionFacility,
  OrganizationType,
  PartnerKind,
} from '@akhra/shared';
import { sql } from 'drizzle-orm';
import { organizationDomains, organizations, type Transaction } from '../index';

export interface SeedOrganization {
  id: string;
  type: OrganizationType;
  name: string;
  shortName: string;
  description: string;
  districtCode: string;
  websiteUrl?: string;
  contactEmail: string;
  domains: Partial<Record<Domain, number>>;
  partnerKind?: PartnerKind;
  disciplines?: AcademicDiscipline[];
  facilities?: InstitutionFacility[];
}

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export const SEED_ORGANIZATIONS: SeedOrganization[] = [
  {
    id: id(101),
    type: 'university',
    name: 'Birsa Institute of Technology, Sindri',
    shortName: 'BIT Sindri',
    description:
      'Engineering institution with long-standing strength in mining, metallurgy, civil and environmental engineering, serving the Damodar valley coal belt.',
    districtCode: 'DHA',
    contactEmail: 'research@bitsindri.example.in',
    domains: { environment: 5, energy: 5, urban_development: 4, water_resources: 3 },
    disciplines: [
      'civil_engineering',
      'environmental_science',
      'mining_geology',
      'electrical_engineering',
      'mechanical_engineering',
    ],
    facilities: ['research_centre', 'testing_lab'],
  },
  {
    id: id(102),
    type: 'university',
    name: 'Birsa Agricultural University, Ranchi',
    shortName: 'BAU Ranchi',
    description:
      'The state agricultural university, covering crop science, soil health, horticulture, animal husbandry, forestry and rural extension services.',
    districtCode: 'RAN',
    contactEmail: 'extension@bau.example.in',
    domains: { agriculture: 5, rural_livelihoods: 4, water_resources: 4, environment: 3 },
    disciplines: [
      'agricultural_sciences',
      'veterinary_animal_sciences',
      'water_engineering',
      'environmental_science',
      'economics_management',
    ],
    facilities: ['research_centre', 'field_station', 'incubation_centre'],
  },
  {
    id: id(103),
    type: 'university',
    name: 'Rajendra Institute of Medical Sciences, Ranchi',
    shortName: 'RIMS Ranchi',
    description:
      'Tertiary medical college and hospital with departments in community medicine, public health, maternal and child health, and sickle cell research.',
    districtCode: 'RAN',
    contactEmail: 'community@rims.example.in',
    domains: { healthcare: 5, accessibility: 3, water_resources: 2 },
    disciplines: ['medicine_public_health', 'nursing_paramedical', 'pharmacy_biotechnology'],
    facilities: ['research_centre', 'testing_lab'],
  },
  {
    id: id(104),
    type: 'university',
    name: 'Indian Institute of Technology (ISM), Dhanbad',
    shortName: 'IIT ISM',
    description:
      'Research institute with programmes in mining engineering, environmental science, computer science, energy systems and applied geophysics.',
    districtCode: 'DHA',
    contactEmail: 'outreach@iitism.example.in',
    domains: { environment: 5, energy: 5, urban_development: 3, public_administration: 3 },
    disciplines: [
      'mining_geology',
      'environmental_science',
      'computer_science',
      'electrical_engineering',
      'civil_engineering',
    ],
    facilities: ['research_centre', 'innovation_centre', 'incubation_centre', 'testing_lab'],
  },
  {
    id: id(105),
    type: 'university',
    name: 'Central University of Jharkhand, Ranchi',
    shortName: 'CUJ',
    description:
      'Multidisciplinary central university with departments in education, tribal studies, water engineering, life sciences and public policy.',
    districtCode: 'RAN',
    contactEmail: 'research@cuj.example.in',
    domains: { education: 5, accessibility: 4, public_administration: 4, water_resources: 3 },
    disciplines: [
      'water_engineering',
      'environmental_science',
      'social_work_sociology',
      'economics_management',
      'public_policy_law',
      'education',
    ],
    facilities: ['research_centre', 'field_station'],
  },
  {
    id: id(106),
    type: 'university',
    name: 'Sido Kanhu Murmu University, Dumka',
    shortName: 'SKMU Dumka',
    description:
      'Regional university serving Santhal Pargana, with strengths in tribal language studies, rural sociology, education and livelihood research.',
    districtCode: 'DUM',
    contactEmail: 'research@skmu.example.in',
    domains: { education: 4, rural_livelihoods: 5, accessibility: 4, agriculture: 3 },
    disciplines: [
      'education',
      'social_work_sociology',
      'economics_management',
      'agricultural_sciences',
    ],
    facilities: ['field_station'],
  },
  {
    id: id(107),
    type: 'university',
    name: 'National Institute of Technology, Jamshedpur',
    shortName: 'NIT Jamshedpur',
    description:
      'Technical institute with departments in civil, electrical, mechanical, computer science and production engineering.',
    districtCode: 'ESB',
    contactEmail: 'rnd@nitjsr.example.in',
    domains: { urban_development: 5, energy: 4, environment: 3, accessibility: 3 },
    disciplines: [
      'civil_engineering',
      'electrical_engineering',
      'mechanical_engineering',
      'electronics_communication',
      'computer_science',
      'architecture_planning',
    ],
    facilities: ['innovation_centre', 'incubation_centre', 'testing_lab'],
  },
  {
    id: id(108),
    type: 'university',
    name: 'Nilamber Pitamber University, Medininagar',
    shortName: 'NPU Palamu',
    description:
      'Regional university for the Palamu division, with work in water resources, drought-resilient agriculture and rural public administration.',
    districtCode: 'PAL',
    contactEmail: 'research@npu.example.in',
    domains: { water_resources: 5, agriculture: 4, public_administration: 3, rural_livelihoods: 3 },
    disciplines: [
      'education',
      'agricultural_sciences',
      'social_work_sociology',
      'economics_management',
    ],
    facilities: ['field_station'],
  },

  {
    id: id(201),
    type: 'industry',
    partnerKind: 'csr_foundation',
    name: 'Tata Steel Foundation',
    shortName: 'TSF',
    description:
      'Corporate social responsibility arm working on tribal development, education, health and sustainable livelihoods across Jharkhand and Odisha.',
    districtCode: 'ESB',
    contactEmail: 'partnerships@tatasteelfoundation.example.in',
    domains: { rural_livelihoods: 5, education: 4, healthcare: 4, environment: 3 },
  },
  {
    id: id(202),
    type: 'industry',
    partnerKind: 'corporate',
    name: 'Jharkhand Renewable Energy Development Agency',
    shortName: 'JREDA',
    description:
      'State agency deploying solar micro-grids, solar pumps and rural electrification across off-grid districts.',
    districtCode: 'RAN',
    contactEmail: 'projects@jreda.example.in',
    domains: { energy: 5, water_resources: 3, rural_livelihoods: 3 },
  },
  {
    id: id(203),
    type: 'industry',
    partnerKind: 'msme',
    name: 'Sahaj Water Technologies',
    shortName: 'Sahaj Water',
    description:
      'MSME manufacturing low-cost iron and fluoride removal filters for community handpumps and small piped schemes.',
    districtCode: 'RAN',
    contactEmail: 'hello@sahajwater.example.in',
    domains: { water_resources: 5, environment: 3, healthcare: 2 },
  },
  {
    id: id(204),
    type: 'industry',
    partnerKind: 'startup',
    name: 'Krishi Setu Agritech',
    shortName: 'Krishi Setu',
    description:
      'Agritech startup building mandi price discovery, crop advisory and market linkage tools for smallholder farmers.',
    districtCode: 'RAN',
    contactEmail: 'founders@krishisetu.example.in',
    domains: { agriculture: 5, rural_livelihoods: 4, public_administration: 2 },
  },
  {
    id: id(205),
    type: 'industry',
    partnerKind: 'startup',
    name: 'Arogya Rural Health Systems',
    shortName: 'Arogya',
    description:
      'Health-tech company operating telemedicine kiosks and diagnostic vans for underserved blocks.',
    districtCode: 'BOK',
    contactEmail: 'contact@arogyahealth.example.in',
    domains: { healthcare: 5, accessibility: 4, education: 2 },
  },
  {
    id: id(206),
    type: 'industry',
    partnerKind: 'innovation_hub',
    name: 'Jharkhand Innovation Lab',
    shortName: 'JIL',
    description:
      'Incubator supporting student-led ventures with prototyping facilities, seed grants and mentorship.',
    districtCode: 'RAN',
    contactEmail: 'incubate@jhinnovation.example.in',
    domains: {
      education: 4,
      urban_development: 3,
      accessibility: 4,
      public_administration: 3,
      rural_livelihoods: 3,
    },
  },

  {
    id: id(301),
    type: 'government',
    name: 'Department of Higher, Technical Education and Skill Development',
    shortName: 'DHTE Jharkhand',
    description:
      'State department coordinating university participation, research funding and skill development programmes.',
    districtCode: 'RAN',
    contactEmail: 'akhra@jharkhand.example.in',
    domains: { education: 5, public_administration: 5 },
  },
  {
    id: id(310),
    type: 'government',
    name: 'Drinking Water and Sanitation Department',
    shortName: 'DWSD Jharkhand',
    description: 'Handpumps, piped water supply and sanitation across the state.',
    districtCode: 'RAN',
    contactEmail: 'dwsd-jharkhand@jharkhand.example.in',
    domains: { water_resources: 5 },
  },
  {
    id: id(311),
    type: 'government',
    name: 'Department of Health, Medical Education and Family Welfare',
    shortName: 'Health Jharkhand',
    description: 'Primary health centres, staffing and medical supplies.',
    districtCode: 'RAN',
    contactEmail: 'health-jharkhand@jharkhand.example.in',
    domains: { healthcare: 5 },
  },
  {
    id: id(312),
    type: 'government',
    name: 'School Education and Literacy Department',
    shortName: 'School Education',
    description: 'Government schools, teachers and mid-day meals.',
    districtCode: 'RAN',
    contactEmail: 'school-education@jharkhand.example.in',
    domains: { education: 5 },
  },
  {
    id: id(313),
    type: 'government',
    name: 'Rural Development Department',
    shortName: 'RDD Jharkhand',
    description: 'Rural roads, MGNREGA works and village livelihoods.',
    districtCode: 'RAN',
    contactEmail: 'rdd-jharkhand@jharkhand.example.in',
    domains: { rural_livelihoods: 5 },
  },
  {
    id: id(314),
    type: 'government',
    name: 'Department of Agriculture, Animal Husbandry and Co-operatives',
    shortName: 'Agriculture Jharkhand',
    description: 'Seeds, irrigation support, soil health and farmer services.',
    districtCode: 'RAN',
    contactEmail: 'agriculture-jharkhand@jharkhand.example.in',
    domains: { agriculture: 5 },
  },
  {
    id: id(315),
    type: 'government',
    name: 'Energy Department',
    shortName: 'Energy Jharkhand',
    description: 'Electricity distribution, transformers and street lighting.',
    districtCode: 'RAN',
    contactEmail: 'energy-jharkhand@jharkhand.example.in',
    domains: { energy: 5 },
  },
  {
    id: id(316),
    type: 'government',
    name: 'Urban Development and Housing Department',
    shortName: 'UD&HD Jharkhand',
    description: 'Municipal services, drainage, waste and city roads.',
    districtCode: 'RAN',
    contactEmail: 'udandhd-jharkhand@jharkhand.example.in',
    domains: { urban_development: 5 },
  },
  {
    id: id(317),
    type: 'government',
    name: 'Forest, Environment and Climate Change Department',
    shortName: 'Forest and Environment',
    description: 'Forests, pollution control and climate resilience.',
    districtCode: 'RAN',
    contactEmail: 'forest-and-environment@jharkhand.example.in',
    domains: { environment: 5 },
  },
  {
    id: id(318),
    type: 'government',
    name: 'Women, Child Development and Social Security Department',
    shortName: 'Social Security',
    description: 'Anganwadi services, pensions and accessibility support.',
    districtCode: 'RAN',
    contactEmail: 'social-security@jharkhand.example.in',
    domains: { accessibility: 5 },
  },
  {
    id: id(319),
    type: 'government',
    name: 'Department of Panchayati Raj',
    shortName: 'Panchayati Raj',
    description: 'Panchayat administration and local grievance handling.',
    districtCode: 'RAN',
    contactEmail: 'panchayati-raj@jharkhand.example.in',
    domains: { public_administration: 5 },
  },
];

export async function seedOrganizations(tx: Transaction): Promise<number> {
  await tx
    .insert(organizations)
    .values(
      SEED_ORGANIZATIONS.map((org) => ({
        id: org.id,
        type: org.type,
        name: org.name,
        shortName: org.shortName,
        description: org.description,
        districtCode: org.districtCode,
        websiteUrl: org.websiteUrl ?? null,
        contactEmail: org.contactEmail,
        partnerKind: org.partnerKind ?? null,
        disciplines: org.disciplines ?? [],
        facilities: org.facilities ?? [],
        isActive: true,
      })),
    )
    .onConflictDoUpdate({
      target: organizations.id,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        partnerKind: sql`excluded.partner_kind`,
        disciplines: sql`excluded.disciplines`,
        facilities: sql`excluded.facilities`,
      },
    });

  const domainRows = SEED_ORGANIZATIONS.flatMap((org) =>
    Object.entries(org.domains).map(([domain, strength]) => ({
      organizationId: org.id,
      domain: domain as Domain,
      strength: strength ?? 3,
    })),
  );

  await tx
    .insert(organizationDomains)
    .values(domainRows)
    .onConflictDoUpdate({
      target: [organizationDomains.organizationId, organizationDomains.domain],
      set: { strength: sql`excluded.strength` },
    });

  return SEED_ORGANIZATIONS.length;
}
