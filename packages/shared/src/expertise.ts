import type { Domain } from './domains';

/**
 * Academic disciplines an institution teaches and its faculty belong to. A fixed list rather than
 * free text, because routing has to match a problem's domain against them.
 */
export const ACADEMIC_DISCIPLINES = [
  'agricultural_sciences',
  'veterinary_animal_sciences',
  'civil_engineering',
  'water_engineering',
  'environmental_science',
  'mining_geology',
  'electrical_engineering',
  'mechanical_engineering',
  'electronics_communication',
  'computer_science',
  'medicine_public_health',
  'nursing_paramedical',
  'pharmacy_biotechnology',
  'education',
  'social_work_sociology',
  'economics_management',
  'public_policy_law',
  'architecture_planning',
] as const;

export type AcademicDiscipline = (typeof ACADEMIC_DISCIPLINES)[number];

export const DISCIPLINE_LABELS: Record<AcademicDiscipline, { en: string; hi: string }> = {
  agricultural_sciences: { en: 'Agricultural sciences', hi: 'कृषि विज्ञान' },
  veterinary_animal_sciences: {
    en: 'Veterinary and animal sciences',
    hi: 'पशु चिकित्सा एवं पशु विज्ञान',
  },
  civil_engineering: { en: 'Civil engineering', hi: 'सिविल इंजीनियरिंग' },
  water_engineering: { en: 'Water and hydrology', hi: 'जल एवं जलविज्ञान' },
  environmental_science: { en: 'Environmental science', hi: 'पर्यावरण विज्ञान' },
  mining_geology: { en: 'Mining and geology', hi: 'खनन एवं भूविज्ञान' },
  electrical_engineering: { en: 'Electrical engineering', hi: 'विद्युत इंजीनियरिंग' },
  mechanical_engineering: { en: 'Mechanical engineering', hi: 'यांत्रिक इंजीनियरिंग' },
  electronics_communication: {
    en: 'Electronics and communication',
    hi: 'इलेक्ट्रॉनिक्स एवं संचार',
  },
  computer_science: { en: 'Computer science', hi: 'कंप्यूटर विज्ञान' },
  medicine_public_health: { en: 'Medicine and public health', hi: 'चिकित्सा एवं जन स्वास्थ्य' },
  nursing_paramedical: { en: 'Nursing and paramedical', hi: 'नर्सिंग एवं पैरामेडिकल' },
  pharmacy_biotechnology: { en: 'Pharmacy and biotechnology', hi: 'फार्मेसी एवं जैव प्रौद्योगिकी' },
  education: { en: 'Education', hi: 'शिक्षा' },
  social_work_sociology: { en: 'Social work and sociology', hi: 'समाज कार्य एवं समाजशास्त्र' },
  economics_management: { en: 'Economics and management', hi: 'अर्थशास्त्र एवं प्रबंधन' },
  public_policy_law: { en: 'Public policy and law', hi: 'लोक नीति एवं विधि' },
  architecture_planning: { en: 'Architecture and planning', hi: 'वास्तुकला एवं नियोजन' },
};

/** The disciplines whose people are most likely to solve a problem in each domain. */
export const DOMAIN_DISCIPLINES: Record<Domain, readonly AcademicDiscipline[]> = {
  education: ['education', 'computer_science', 'social_work_sociology'],
  agriculture: ['agricultural_sciences', 'veterinary_animal_sciences', 'water_engineering'],
  healthcare: ['medicine_public_health', 'nursing_paramedical', 'pharmacy_biotechnology'],
  water_resources: ['water_engineering', 'civil_engineering', 'environmental_science'],
  environment: ['environmental_science', 'mining_geology', 'civil_engineering'],
  energy: ['electrical_engineering', 'mechanical_engineering', 'electronics_communication'],
  urban_development: ['architecture_planning', 'civil_engineering', 'public_policy_law'],
  accessibility: ['computer_science', 'electronics_communication', 'architecture_planning'],
  public_administration: ['public_policy_law', 'economics_management', 'computer_science'],
  rural_livelihoods: ['economics_management', 'agricultural_sciences', 'social_work_sociology'],
};

/** Facilities that let an institution go beyond a report to a prototype, a pilot or a venture. */
export const INSTITUTION_FACILITIES = [
  'research_centre',
  'innovation_centre',
  'incubation_centre',
  'testing_lab',
  'field_station',
] as const;

export type InstitutionFacility = (typeof INSTITUTION_FACILITIES)[number];

export const FACILITY_LABELS: Record<InstitutionFacility, { en: string; hi: string }> = {
  research_centre: { en: 'Research centre', hi: 'अनुसंधान केंद्र' },
  innovation_centre: { en: 'Innovation centre', hi: 'नवाचार केंद्र' },
  incubation_centre: { en: 'Incubation centre', hi: 'इनक्यूबेशन केंद्र' },
  testing_lab: { en: 'Testing laboratory', hi: 'परीक्षण प्रयोगशाला' },
  field_station: { en: 'Field station', hi: 'क्षेत्रीय केंद्र' },
};

export const EXPERTISE_STRENGTHS = [1, 2, 3, 4, 5] as const;

export interface InstitutionSignals {
  /** 1–5 as the institution declared it for the problem's domain, or null if it did not. */
  domainStrength: number | null;
  disciplines: readonly AcademicDiscipline[];
  facilities: readonly InstitutionFacility[];
  /** Active faculty whose discipline is relevant to the problem's domain. */
  relevantFaculty: number;
  /** Straight-line distance to the report's district, or null when either location is unknown. */
  distanceKm: number | null;
}

export interface InstitutionScore {
  score: number;
  relevantDisciplines: AcademicDiscipline[];
}

const WEIGHTS = {
  expertise: 0.4,
  disciplines: 0.2,
  faculty: 0.15,
  facilities: 0.1,
  proximity: 0.15,
} as const;

/** Faculty beyond this number stop adding to the score; a large department is not twice as good. */
const FACULTY_SATURATION = 5;
const FACILITY_SATURATION = 3;
const MAX_MEANINGFUL_KM = 250;

/**
 * How well an institution fits a problem, from 0 to 1. Each signal is capped so that no single one,
 * such as a long faculty list, can make up for having no relevant expertise at all. An institution
 * with neither a declared domain nor a relevant discipline scores zero and is not suggested.
 */
export function scoreInstitution(domain: Domain, signals: InstitutionSignals): InstitutionScore {
  const wanted = DOMAIN_DISCIPLINES[domain];
  const relevantDisciplines = wanted.filter((d) => signals.disciplines.includes(d));

  if (signals.domainStrength === null && relevantDisciplines.length === 0) {
    return { score: 0, relevantDisciplines };
  }

  const expertise = (signals.domainStrength ?? 0) / 5;
  const disciplines = Math.min(1, relevantDisciplines.length / 2);
  const faculty = Math.min(1, signals.relevantFaculty / FACULTY_SATURATION);
  const facilities = Math.min(1, signals.facilities.length / FACILITY_SATURATION);
  const proximity =
    signals.distanceKm === null ? 0.5 : Math.max(0, 1 - signals.distanceKm / MAX_MEANINGFUL_KM);

  const score =
    WEIGHTS.expertise * expertise +
    WEIGHTS.disciplines * disciplines +
    WEIGHTS.faculty * faculty +
    WEIGHTS.facilities * facilities +
    WEIGHTS.proximity * proximity;

  return { score: Number(score.toFixed(3)), relevantDisciplines };
}
