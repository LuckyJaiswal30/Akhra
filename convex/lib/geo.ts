const FUZZ_METRES = 500;
const METRES_PER_DEGREE_LAT = 111320;

export function fuzzCoordinates(lat: number, lng: number, seed: string) {
  const angle = (hash(seed) % 360) * (Math.PI / 180);
  const distance = FUZZ_METRES * (0.4 + ((hash(seed + "r") % 60) / 100));

  const deltaLat = (distance * Math.cos(angle)) / METRES_PER_DEGREE_LAT;
  const deltaLng =
    (distance * Math.sin(angle)) /
    (METRES_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180));

  return {
    lat: round(lat + deltaLat),
    lng: round(lng + deltaLng),
  };
}

function round(value: number) {
  return Math.round(value * 100000) / 100000;
}

function hash(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const EARTH_RADIUS_KM = 6371;

export function distanceKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
) {
  const dLat = toRadians(bLat - aLat);
  const dLng = toRadians(bLng - aLng);
  const lat1 = toRadians(aLat);
  const lat2 = toRadians(bLat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}
