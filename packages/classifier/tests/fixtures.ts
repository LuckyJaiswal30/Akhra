import type { Domain } from '@akhra/shared';

export interface LabelledProblem {
  title: string;
  description: string;
  expected: Domain;
}

export const LABELLED_PROBLEMS: LabelledProblem[] = [
  {
    title: 'No teachers in the upper primary school for three months',
    description:
      'The upper primary school in our village has had no science teacher since June. Around 120 students are sitting in the classroom without any instruction and many have stopped attending. Parents have complained to the block office but nothing has changed.',
    expected: 'education',
  },
  {
    title: 'Handpump water turning yellow and smelling of iron',
    description:
      'The handpump that supplies drinking water to about 60 households has started giving yellow water with a strong iron smell. People are getting stomach problems. There is no other source nearby and women walk two kilometres to fetch water from a well.',
    expected: 'water_resources',
  },
  {
    title: 'Paddy crop destroyed by pest attack, no guidance available',
    description:
      'A pest attack has damaged the paddy crop across nearly forty acres in our panchayat this kharif season. Farmers do not know which pesticide to use and the nearest agriculture extension officer has not visited. Yield will fall sharply and many families depend on this harvest.',
    expected: 'agriculture',
  },
  {
    title: 'Primary health centre has no doctor at night',
    description:
      'Our primary health centre is closed after six in the evening because no doctor is posted for night duty. Pregnant women in labour have to be taken forty kilometres to the district hospital by private vehicle. Two emergencies last month were handled without any medical help.',
    expected: 'healthcare',
  },
  {
    title: 'Coal dust from open transport covering homes and fields',
    description:
      'Trucks carrying coal from the nearby mine pass through our settlement uncovered. A thick layer of black dust settles on houses, drinking water containers and vegetable fields. Children have developed persistent coughs and the crops are visibly affected.',
    expected: 'environment',
  },
  {
    title: 'Village transformer burnt out, no electricity for six weeks',
    description:
      'The transformer serving our village burnt out six weeks ago and has not been replaced. There is no electricity for lighting or for running irrigation pumps. Students cannot study after dark and shopkeepers are losing business every evening.',
    expected: 'energy',
  },
  {
    title: 'Main approach road broken, buses no longer run',
    description:
      'The approach road connecting our village to the block headquarters has large potholes and a collapsed culvert. Bus operators have stopped the service entirely. People walk six kilometres to reach the nearest stop and patients cannot be taken out during the monsoon.',
    expected: 'urban_development',
  },
  {
    title: 'No ramp or accessible toilet at the block office',
    description:
      'The block development office has a flight of steps at the entrance and no ramp. Persons with disabilities and elderly pensioners have to be carried up by relatives to submit forms. There is also no accessible toilet in the building.',
    expected: 'accessibility',
  },
  {
    title: 'Ration card applications pending for over a year',
    description:
      'More than thirty families in our panchayat applied for ration cards last year and the applications are still shown as pending on the portal. Without the card they cannot draw their monthly food grain entitlement. Repeated visits to the circle office have not resolved anything.',
    expected: 'public_administration',
  },
  {
    title: 'Self help group unable to sell bamboo baskets',
    description:
      'Our self help group of twenty two women makes bamboo baskets and mats but has no way to reach buyers beyond the weekly village market. Prices offered by middlemen are very low. Several members have started migrating for wage work because the craft income is not enough.',
    expected: 'rural_livelihoods',
  },
];

export const NEAR_DUPLICATE_PAIR = {
  original: {
    problemId: '11111111-1111-1111-1111-111111111111',
    refCode: 'AKH-2026-000001',
    title: 'Handpump water turning yellow and smelling of iron',
    description:
      'The handpump that supplies drinking water to about 60 households has started giving yellow water with a strong iron smell. People are getting stomach problems.',
  },
  restatement: {
    title: 'Yellow smelly water coming from the village handpump',
    description:
      'Drinking water from our handpump has turned yellow and smells strongly of iron. Around sixty families use it and many are falling sick with stomach trouble.',
  },
  unrelated: {
    problemId: '22222222-2222-2222-2222-222222222222',
    refCode: 'AKH-2026-000002',
    title: 'No ramp or accessible toilet at the block office',
    description:
      'The block development office has a flight of steps at the entrance and no ramp for persons with disabilities or elderly pensioners.',
  },
};
