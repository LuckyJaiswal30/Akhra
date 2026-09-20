import { JHARKHAND_DISTRICTS, type AcademicDiscipline, type Role } from '@akhra/shared';
import { sql } from 'drizzle-orm';
import { users, type Transaction } from '../index';

export const DEMO_PASSWORD = 'akhra2026';

export interface SeedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  organizationId: string | null;
  jurisdictionCode?: string;
  designation?: string;
  discipline?: AcademicDiscipline;
  specialisation?: string;
  phone?: string;
  districtCode?: string;
}

const id = (n: number) => `00000000-0000-4000-9000-${String(n).padStart(12, '0')}`;
const org = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export const SEED_USERS: SeedUser[] = [
  {
    id: id(1),
    name: 'Anjali Verma',
    email: 'gov+clerk_test@example.com',
    role: 'gov_admin',
    organizationId: null,
    designation: 'State Grievance Nodal Officer',
    phone: '9835100001',
  },
  {
    id: id(2),
    name: 'Rakesh Oraon',
    email: 'district.ranchi+clerk_test@example.com',
    role: 'gov_admin',
    organizationId: null,
    jurisdictionCode: 'RAN',
    designation: 'District Grievance Redressal Officer, Ranchi',
    phone: '9835100002',
  },

  {
    id: id(10),
    name: 'Dr. Meera Kujur',
    email: 'university+clerk_test@example.com',
    role: 'university_admin',
    organizationId: org(102),
    designation: 'Dean of Research',
    phone: '9835100010',
  },
  {
    id: id(11),
    name: 'Dr. Rakesh Prasad',
    email: 'faculty+clerk_test@example.com',
    role: 'faculty',
    organizationId: org(102),
    designation: 'Associate Professor',
    discipline: 'agricultural_sciences',
    specialisation: 'Soil Science',
    phone: '9835100011',
  },
  {
    id: id(12),
    name: 'Dr. Farhan Ansari',
    email: 'faculty.env+clerk_test@example.com',
    role: 'faculty',
    organizationId: org(101),
    designation: 'Professor',
    discipline: 'environmental_science',
    specialisation: 'Environmental Engineering',
    phone: '9835100012',
  },
  {
    id: id(13),
    name: 'Dr. Nisha Toppo',
    email: 'university.med+clerk_test@example.com',
    role: 'university_admin',
    organizationId: org(103),
    designation: 'Head, Community Medicine',
    phone: '9835100013',
  },
  {
    id: id(14),
    name: 'Dr. Vikram Singh',
    email: 'faculty.water+clerk_test@example.com',
    role: 'faculty',
    organizationId: org(105),
    designation: 'Assistant Professor',
    discipline: 'water_engineering',
    specialisation: 'Water Engineering',
    phone: '9835100014',
  },
  {
    id: id(15),
    name: 'Priya Hembrom',
    email: 'student.priya+clerk_test@example.com',
    role: 'student',
    organizationId: org(102),
    designation: 'Research Scholar',
    discipline: 'agricultural_sciences',
    specialisation: 'Agronomy',
    phone: '9835100015',
  },
  {
    id: id(16),
    name: 'Amit Mahto',
    email: 'student.amit+clerk_test@example.com',
    role: 'student',
    organizationId: org(101),
    designation: 'M.Tech Student',
    discipline: 'environmental_science',
    specialisation: 'Environmental Engineering',
    phone: '9835100016',
  },
  {
    id: id(17),
    name: 'Dr. Suresh Munda',
    email: 'faculty.edu+clerk_test@example.com',
    role: 'faculty',
    organizationId: org(106),
    designation: 'Professor',
    discipline: 'education',
    specialisation: 'Education',
    phone: '9835100017',
  },

  {
    id: id(20),
    name: 'Kavita Sharma',
    email: 'industry+clerk_test@example.com',
    role: 'industry_admin',
    organizationId: org(203),
    designation: 'Head of Partnerships',
    phone: '9835100020',
  },
  {
    id: id(21),
    name: 'Rohit Agarwal',
    email: 'industry.csr+clerk_test@example.com',
    role: 'industry_admin',
    organizationId: org(201),
    designation: 'Programme Manager, CSR',
    phone: '9835100021',
  },
  {
    id: id(22),
    name: 'Deepak Rana',
    email: 'industry.energy+clerk_test@example.com',
    role: 'industry_admin',
    organizationId: org(202),
    designation: 'Project Lead',
    phone: '9835100022',
  },
  {
    id: id(23),
    name: 'Sneha Tirkey',
    email: 'industry.agri+clerk_test@example.com',
    role: 'industry_admin',
    organizationId: org(204),
    designation: 'Co-founder',
    phone: '9835100023',
  },
  {
    id: id(24),
    name: 'Manish Gupta',
    email: 'industry.incubator+clerk_test@example.com',
    role: 'industry_admin',
    organizationId: org(206),
    designation: 'Incubation Manager',
    phone: '9835100024',
  },

  {
    id: id(25),
    name: 'Arjun Lakra',
    email: 'industry.agri.member+clerk_test@example.com',
    role: 'industry_partner',
    organizationId: org(204),
    designation: 'Field Operations Lead',
    phone: '9835100025',
  },

  {
    id: id(30),
    name: 'Ramesh Mahto',
    email: 'citizen+clerk_test@example.com',
    role: 'citizen',
    organizationId: null,
    phone: '9835100030',
    districtCode: 'RAN',
  },
  {
    id: id(31),
    name: 'Sunita Devi',
    email: 'citizen.sunita+clerk_test@example.com',
    role: 'citizen',
    organizationId: null,
    phone: '9835100031',
    districtCode: 'GUM',
  },
  {
    id: id(32),
    name: 'Mukhiya Birsa Munda',
    email: 'panchayat+clerk_test@example.com',
    role: 'citizen',
    organizationId: null,
    phone: '9835100032',
    districtCode: 'KHU',
  },
];

const DISTRICT_OFFICER_NAMES = [
  'Rakesh',
  'Sunita',
  'Anil',
  'Pooja',
  'Manoj',
  'Rekha',
  'Vikas',
  'Nisha',
  'Sanjay',
  'Kavita',
  'Ajay',
  'Neha',
  'Deepak',
  'Shalini',
  'Rohit',
  'Anita',
  'Sunil',
  'Meena',
  'Arun',
  'Priya',
  'Alok',
  'Seema',
  'Ravi',
  'Geeta',
];

const DISTRICT_OFFICERS: SeedUser[] = JHARKHAND_DISTRICTS.filter(
  (district) => district.code !== 'RAN',
).map((district, index) => ({
  id: `00000000-0000-4000-9000-${String(400 + index).padStart(12, '0')}`,
  name: `${DISTRICT_OFFICER_NAMES[index % DISTRICT_OFFICER_NAMES.length]} ${['Oraon', 'Munda', 'Mahto', 'Kujur', 'Tirkey', 'Singh', 'Prasad', 'Toppo', 'Hembrom', 'Soren', 'Bhagat', 'Lakra'][index % 12]}`,
  email: `district.${district.code.toLowerCase()}+clerk_test@example.com`,
  role: 'gov_admin' as Role,
  organizationId: null,
  jurisdictionCode: district.code,
  designation: `District Grievance Redressal Officer, ${district.nameEn}`,
  phone: `98352${String(100000 + index).slice(-5)}`,
  districtCode: district.code,
}));

const DEPARTMENTS: { org: number; name: string; email: string; designation: string }[] = [
  {
    org: 310,
    name: 'Irfan Ansari',
    email: 'dept.water',
    designation: 'Executive Engineer, Drinking Water and Sanitation',
  },
  {
    org: 311,
    name: 'Sarita Devi',
    email: 'dept.health',
    designation: 'District Programme Officer, Health',
  },
  {
    org: 312,
    name: 'Nutan Kumari',
    email: 'dept.education',
    designation: 'District Education Officer',
  },
  {
    org: 313,
    name: 'Pankaj Bhagat',
    email: 'dept.rural',
    designation: 'Block Development Officer',
  },
  {
    org: 314,
    name: 'Mahesh Mahto',
    email: 'dept.agriculture',
    designation: 'District Agriculture Officer',
  },
  {
    org: 315,
    name: 'Rajiv Tirkey',
    email: 'dept.energy',
    designation: 'Executive Engineer, Electricity Supply',
  },
  {
    org: 316,
    name: 'Pooja Sinha',
    email: 'dept.urban',
    designation: 'City Manager, Urban Development',
  },
  {
    org: 317,
    name: 'Birsa Munda',
    email: 'dept.forest',
    designation: 'Range Officer, Forest Division',
  },
  {
    org: 318,
    name: 'Kiran Toppo',
    email: 'dept.social',
    designation: 'District Social Welfare Officer',
  },
  {
    org: 319,
    name: 'Sudhir Oraon',
    email: 'dept.panchayat',
    designation: 'District Panchayati Raj Officer',
  },
];

const DEPARTMENT_STAFF: SeedUser[] = DEPARTMENTS.map((department, index) => ({
  id: id(60 + index),
  name: department.name,
  email: `${department.email}+clerk_test@example.com`,
  role: 'dept_officer' as Role,
  organizationId: org(department.org),
  designation: department.designation,
  phone: `98351000${String(60 + index)}`,
}));

SEED_USERS.push(...DISTRICT_OFFICERS, ...DEPARTMENT_STAFF);

export async function seedUsers(tx: Transaction): Promise<number> {
  await tx
    .insert(users)
    .values(
      SEED_USERS.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        jurisdictionCode: user.jurisdictionCode ?? null,
        designation: user.designation ?? null,
        discipline: user.discipline ?? null,
        specialisation: user.specialisation ?? null,
        phone: user.phone ?? null,
        districtCode: user.districtCode ?? null,
        privacyAcceptedAt: new Date('2026-01-01T00:00:00Z'),
        isActive: true,
        status: 'active' as const,
      })),
    )
    .onConflictDoUpdate({
      target: users.id,
      set: {
        name: sql`excluded.name`,
        email: sql`excluded.email`,
        role: sql`excluded.role`,
        status: sql`excluded.status`,
        organizationId: sql`excluded.organization_id`,
        jurisdictionCode: sql`excluded.jurisdiction_code`,
        discipline: sql`excluded.discipline`,
        specialisation: sql`excluded.specialisation`,
        phone: sql`coalesce(${users.phone}, excluded.phone)`,
        districtCode: sql`coalesce(${users.districtCode}, excluded.district_code)`,
        privacyAcceptedAt: sql`coalesce(${users.privacyAcceptedAt}, excluded.privacy_accepted_at)`,
      },
    });

  return SEED_USERS.length;
}
