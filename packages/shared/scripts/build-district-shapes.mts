/**
 * Turns official district boundaries into the SVG paths Akhra draws.
 *
 * Run it when the boundaries change — a new district, or a corrected outline:
 *
 *   curl -sL -o /tmp/ind-adm2.geojson \
 *     "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/IND/ADM2/geoBoundaries-IND-ADM2_simplified.geojson"
 *   pnpm --filter @akhra/shared build:district-shapes /tmp/ind-adm2.geojson
 *
 * The source is geoBoundaries' India ADM2 set, which takes its districts from the Government of
 * India's Local Government Directory (lgdirectory.gov.in). It is published under the Open Database
 * License 1.0, so the generated file and every page that draws it carry that attribution.
 *
 * The GeoJSON itself is 7.6 MB and is not committed: this script reduces it to the two dozen
 * outlines Akhra needs, simplified to roughly half a kilometre and projected once, so the app ships
 * a few tens of kilobytes of path data and no map library.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * geoBoundaries names each district as the Local Government Directory spells it; Akhra uses the
 * spellings the state itself uses. Mapping them by hand, once, is the only honest way: a fuzzy match
 * would quietly put West Singhbhum's outline under East Singhbhum the day a spelling changes.
 */
const DISTRICT_BY_SOURCE_NAME: Record<string, string> = {
  Bokaro: 'BOK',
  Chatra: 'CHA',
  Deoghar: 'DEO',
  Dhanbad: 'DHA',
  Dumka: 'DUM',
  Garhwa: 'GAR',
  Giridih: 'GIR',
  Godda: 'GOD',
  Gumla: 'GUM',
  Hazaribagh: 'HAZ',
  Jamtara: 'JAM',
  Khunti: 'KHU',
  Kodarma: 'KOD',
  Latehar: 'LAT',
  Lohardaga: 'LOH',
  Pakur: 'PAK',
  Palamu: 'PAL',
  'Pashchimi Singhbhum': 'WSB',
  'Purbi Singhbhum': 'ESB',
  Ramgarh: 'RAM',
  Ranchi: 'RAN',
  Sahibganj: 'SAH',
  'Saraikela-Kharsawan': 'SER',
  Simdega: 'SIM',
};

/** About half a kilometre. Small enough that a district keeps its shape, coarse enough to be light. */
const TOLERANCE_DEGREES = 0.005;

/** The drawing is 1000 units wide; the height follows from the state's own proportions. */
const WIDTH = 1000;

type Point = [number, number];
type Ring = Point[];

interface Feature {
  properties: { shapeName: string };
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] };
}

function ringsOf(feature: Feature): Ring[] {
  const { type, coordinates } = feature.geometry;
  const polygons =
    type === 'Polygon' ? [coordinates as number[][][]] : (coordinates as number[][][][]);
  // Only the outer ring of each polygon: a district's holes are islands in a reservoir, invisible
  // at the size this map is drawn.
  return polygons.map((polygon) => polygon[0] as Ring);
}

/** Douglas–Peucker: keeps the corners that give an outline its shape, drops the rest. */
function simplify(ring: Ring, tolerance: number): Ring {
  if (ring.length < 4) return ring;

  const keep = new Array<boolean>(ring.length).fill(false);
  keep[0] = true;
  keep[ring.length - 1] = true;

  const stack: [number, number][] = [[0, ring.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop() as [number, number];
    const a = ring[first] as Point;
    const b = ring[last] as Point;
    let farthest = -1;
    let distance = tolerance;

    for (let i = first + 1; i < last; i += 1) {
      const d = perpendicularDistance(ring[i] as Point, a, b);
      if (d > distance) {
        distance = d;
        farthest = i;
      }
    }

    if (farthest > -1) {
      keep[farthest] = true;
      stack.push([first, farthest], [farthest, last]);
    }
  }

  return ring.filter((_, index) => keep[index]);
}

function perpendicularDistance(point: Point, a: Point, b: Point): number {
  const [x, y] = point;
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(x - ax, y - ay);
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
}

function main(): void {
  const source = process.argv[2];
  if (!source) {
    console.error('usage: tsx build-district-shapes.mts <india-adm2.geojson>');
    process.exit(1);
  }

  const collection = JSON.parse(readFileSync(source, 'utf8')) as { features: Feature[] };
  const wanted = new Map<string, Ring[]>();

  for (const feature of collection.features) {
    const code = DISTRICT_BY_SOURCE_NAME[feature.properties.shapeName];
    if (!code || wanted.has(code)) continue;
    wanted.set(
      code,
      ringsOf(feature)
        .map((ring) => simplify(ring, TOLERANCE_DEGREES))
        .filter((ring) => ring.length >= 4),
    );
  }

  const missing = Object.values(DISTRICT_BY_SOURCE_NAME).filter((code) => !wanted.has(code));
  if (missing.length > 0) {
    console.error(`no boundary found for: ${missing.join(', ')}`);
    process.exit(1);
  }

  const points = [...wanted.values()].flat().flat();
  const lngs = points.map(([lng]) => lng);
  const lats = points.map(([, lat]) => lat);
  const west = Math.min(...lngs);
  const east = Math.max(...lngs);
  const south = Math.min(...lats);
  const north = Math.max(...lats);

  // Equirectangular, with longitudes squeezed by the latitude they sit at, so Jharkhand keeps its
  // proportions. At the width of one state the difference from a proper projection is invisible.
  const squeeze = Math.cos((((north + south) / 2) * Math.PI) / 180);
  const scale = WIDTH / ((east - west) * squeeze);
  const height = Math.round((north - south) * scale);

  const project = ([lng, lat]: Point): string => {
    const x = (lng - west) * squeeze * scale;
    const y = (north - lat) * scale;
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  };

  const paths = [...wanted.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, rings]) => {
      const d = rings.map((ring) => `M${ring.map(project).join('L')}Z`).join('');
      return `  ${code}: '${d}',`;
    });

  const file = `// Generated by scripts/build-district-shapes.mts — do not edit by hand.
//
// District outlines from geoBoundaries (India ADM2), whose source is the Government of India's
// Local Government Directory. Published under the Open Database License 1.0, which every page
// drawing this map credits.

/** The drawing these paths are written for. */
export const DISTRICT_MAP_VIEWBOX = '0 0 ${WIDTH} ${height}';

/** One SVG path per district, keyed by Akhra's district code. */
export const DISTRICT_SHAPES: Record<string, string> = {
${paths.join('\n')}
};
`;

  const target = join(dirname(fileURLToPath(import.meta.url)), '../src/district-shapes.ts');
  writeFileSync(target, file);
  console.log(
    `${wanted.size} districts, ${(file.length / 1024).toFixed(0)} KB, viewBox 0 0 ${WIDTH} ${height}`,
  );
}

main();
