export const DISTRICT_NAMES = [
  "Bokaro",
  "Chatra",
  "Deoghar",
  "Dhanbad",
  "Dumka",
  "East Singhbhum",
  "Garhwa",
  "Giridih",
  "Godda",
  "Gumla",
  "Hazaribagh",
  "Jamtara",
  "Khunti",
  "Koderma",
  "Latehar",
  "Lohardaga",
  "Pakur",
  "Palamu",
  "Ramgarh",
  "Ranchi",
  "Sahibganj",
  "Seraikela-Kharsawan",
  "Simdega",
  "West Singhbhum",
] as const;

export type DistrictName = (typeof DISTRICT_NAMES)[number];

export function isDistrict(value: string | undefined): value is DistrictName {
  return Boolean(value) && DISTRICT_NAMES.includes(value as DistrictName);
}

const BOUNDS = { south: 21.8, north: 25.5, west: 83.2, east: 88.1 };

export function isInJharkhand(lat: number, lng: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= BOUNDS.south &&
    lat <= BOUNDS.north &&
    lng >= BOUNDS.west &&
    lng <= BOUNDS.east
  );
}
