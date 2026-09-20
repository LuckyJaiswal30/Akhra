export const DIVISIONS = [
  'North Chotanagpur',
  'South Chotanagpur',
  'Palamu',
  'Kolhan',
  'Santhal Pargana',
] as const;

export type Division = (typeof DIVISIONS)[number];

export interface District {
  code: string;
  nameEn: string;
  nameHi: string;
  division: Division;
  headquarters: string;
  lat: number;
  lng: number;
}

export const JHARKHAND_DISTRICTS: District[] = [
  {
    code: 'BOK',
    nameEn: 'Bokaro',
    nameHi: 'बोकारो',
    division: 'North Chotanagpur',
    headquarters: 'Bokaro Steel City',
    lat: 23.6693,
    lng: 86.1511,
  },
  {
    code: 'CHA',
    nameEn: 'Chatra',
    nameHi: 'चतरा',
    division: 'North Chotanagpur',
    headquarters: 'Chatra',
    lat: 24.2065,
    lng: 84.8717,
  },
  {
    code: 'DEO',
    nameEn: 'Deoghar',
    nameHi: 'देवघर',
    division: 'Santhal Pargana',
    headquarters: 'Deoghar',
    lat: 24.4823,
    lng: 86.696,
  },
  {
    code: 'DHA',
    nameEn: 'Dhanbad',
    nameHi: 'धनबाद',
    division: 'North Chotanagpur',
    headquarters: 'Dhanbad',
    lat: 23.7957,
    lng: 86.4304,
  },
  {
    code: 'DUM',
    nameEn: 'Dumka',
    nameHi: 'दुमका',
    division: 'Santhal Pargana',
    headquarters: 'Dumka',
    lat: 24.2676,
    lng: 87.2497,
  },
  {
    code: 'ESB',
    nameEn: 'East Singhbhum',
    nameHi: 'पूर्वी सिंहभूम',
    division: 'Kolhan',
    headquarters: 'Jamshedpur',
    lat: 22.8046,
    lng: 86.2029,
  },
  {
    code: 'GAR',
    nameEn: 'Garhwa',
    nameHi: 'गढ़वा',
    division: 'Palamu',
    headquarters: 'Garhwa',
    lat: 24.1541,
    lng: 83.8078,
  },
  {
    code: 'GIR',
    nameEn: 'Giridih',
    nameHi: 'गिरिडीह',
    division: 'North Chotanagpur',
    headquarters: 'Giridih',
    lat: 24.1913,
    lng: 86.3009,
  },
  {
    code: 'GOD',
    nameEn: 'Godda',
    nameHi: 'गोड्डा',
    division: 'Santhal Pargana',
    headquarters: 'Godda',
    lat: 24.8268,
    lng: 87.2128,
  },
  {
    code: 'GUM',
    nameEn: 'Gumla',
    nameHi: 'गुमला',
    division: 'South Chotanagpur',
    headquarters: 'Gumla',
    lat: 23.0444,
    lng: 84.5382,
  },
  {
    code: 'HAZ',
    nameEn: 'Hazaribagh',
    nameHi: 'हजारीबाग',
    division: 'North Chotanagpur',
    headquarters: 'Hazaribagh',
    lat: 23.9925,
    lng: 85.3637,
  },
  {
    code: 'JAM',
    nameEn: 'Jamtara',
    nameHi: 'जामताड़ा',
    division: 'Santhal Pargana',
    headquarters: 'Jamtara',
    lat: 23.957,
    lng: 86.805,
  },
  {
    code: 'KHU',
    nameEn: 'Khunti',
    nameHi: 'खूंटी',
    division: 'South Chotanagpur',
    headquarters: 'Khunti',
    lat: 23.0716,
    lng: 85.2784,
  },
  {
    code: 'KOD',
    nameEn: 'Koderma',
    nameHi: 'कोडरमा',
    division: 'North Chotanagpur',
    headquarters: 'Koderma',
    lat: 24.4675,
    lng: 85.594,
  },
  {
    code: 'LAT',
    nameEn: 'Latehar',
    nameHi: 'लातेहार',
    division: 'Palamu',
    headquarters: 'Latehar',
    lat: 23.7441,
    lng: 84.4998,
  },
  {
    code: 'LOH',
    nameEn: 'Lohardaga',
    nameHi: 'लोहरदगा',
    division: 'South Chotanagpur',
    headquarters: 'Lohardaga',
    lat: 23.4333,
    lng: 84.6833,
  },
  {
    code: 'PAK',
    nameEn: 'Pakur',
    nameHi: 'पाकुड़',
    division: 'Santhal Pargana',
    headquarters: 'Pakur',
    lat: 24.636,
    lng: 87.8464,
  },
  {
    code: 'PAL',
    nameEn: 'Palamu',
    nameHi: 'पलामू',
    division: 'Palamu',
    headquarters: 'Medininagar',
    lat: 24.0333,
    lng: 84.0667,
  },
  {
    code: 'RAM',
    nameEn: 'Ramgarh',
    nameHi: 'रामगढ़',
    division: 'North Chotanagpur',
    headquarters: 'Ramgarh',
    lat: 23.6304,
    lng: 85.5602,
  },
  {
    code: 'RAN',
    nameEn: 'Ranchi',
    nameHi: 'रांची',
    division: 'South Chotanagpur',
    headquarters: 'Ranchi',
    lat: 23.3441,
    lng: 85.3096,
  },
  {
    code: 'SAH',
    nameEn: 'Sahibganj',
    nameHi: 'साहिबगंज',
    division: 'Santhal Pargana',
    headquarters: 'Sahibganj',
    lat: 25.238,
    lng: 87.6463,
  },
  {
    code: 'SER',
    nameEn: 'Seraikela-Kharsawan',
    nameHi: 'सरायकेला-खरसावां',
    division: 'Kolhan',
    headquarters: 'Seraikela',
    lat: 22.6969,
    lng: 85.9314,
  },
  {
    code: 'SIM',
    nameEn: 'Simdega',
    nameHi: 'सिमडेगा',
    division: 'South Chotanagpur',
    headquarters: 'Simdega',
    lat: 22.6155,
    lng: 84.5085,
  },
  {
    code: 'WSB',
    nameEn: 'West Singhbhum',
    nameHi: 'पश्चिमी सिंहभूम',
    division: 'Kolhan',
    headquarters: 'Chaibasa',
    lat: 22.5646,
    lng: 85.8144,
  },
];

export const DISTRICT_BY_CODE: Record<string, District> = Object.fromEntries(
  JHARKHAND_DISTRICTS.map((d) => [d.code, d]),
);

export const DISTRICT_CODES = JHARKHAND_DISTRICTS.map((d) => d.code);

export const JHARKHAND_CENTER = { lat: 23.6102, lng: 85.2799 } as const;
export const JHARKHAND_BOUNDS = {
  south: 21.95,
  west: 83.32,
  north: 25.35,
  east: 87.95,
} as const;

export function isDistrictCode(value: unknown): value is string {
  return typeof value === 'string' && value in DISTRICT_BY_CODE;
}

const EARTH_RADIUS_KM = 6371;

export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}
