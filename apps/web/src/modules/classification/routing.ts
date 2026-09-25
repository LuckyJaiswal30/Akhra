import { and, eq, sql } from 'drizzle-orm';
import { districts, organizationDomains, organizations, users } from '@akhra/db';
import {
  DISCIPLINE_LABELS,
  DISTRICT_BY_CODE,
  DOMAIN_DEFINITIONS,
  DOMAIN_DISCIPLINES,
  FACILITY_LABELS,
  distanceKm,
  scoreInstitution,
  type Domain,
} from '@akhra/shared';
import { queryAsAnonymous } from '@/server/session';

export interface RoutingSuggestion {
  organizationId: string;
  name: string;
  shortName: string | null;
  districtCode: string | null;
  districtName: string | null;
  matchScore: number;
  rationale: string;
}

export async function suggestOrganizations(input: {
  domain: Domain;
  districtCode: string;
  limit?: number;
}): Promise<RoutingSuggestion[]> {
  const relevantDisciplines = [...DOMAIN_DISCIPLINES[input.domain]];

  const rows = await queryAsAnonymous((tx) =>
    tx
      .select({
        organizationId: organizations.id,
        name: organizations.name,
        shortName: organizations.shortName,
        districtCode: organizations.districtCode,
        districtName: districts.nameEn,
        lat: districts.lat,
        lng: districts.lng,
        disciplines: organizations.disciplines,
        facilities: organizations.facilities,
        strength: organizationDomains.strength,
        relevantFaculty: sql<number>`(
          select count(*)::int from ${users} u
          where u.organization_id = ${organizations.id}
            and u.role in ('faculty', 'university_admin')
            and u.status = 'active'
            and u.discipline in (${sql.join(
              relevantDisciplines.map((d) => sql`${d}`),
              sql`, `,
            )})
        )`,
      })
      .from(organizations)
      .leftJoin(
        organizationDomains,
        and(
          eq(organizationDomains.organizationId, organizations.id),
          eq(organizationDomains.domain, input.domain),
        ),
      )
      .leftJoin(districts, eq(organizations.districtCode, districts.code))
      .where(and(eq(organizations.type, 'university'), eq(organizations.isActive, true))),
  );

  const origin = DISTRICT_BY_CODE[input.districtCode];

  return rows
    .map((row) => {
      const km =
        origin && row.lat != null && row.lng != null
          ? distanceKm(origin, { lat: row.lat, lng: row.lng })
          : null;
      const { score, relevantDisciplines: matched } = scoreInstitution(input.domain, {
        domainStrength: row.strength,
        disciplines: row.disciplines,
        facilities: row.facilities,
        relevantFaculty: row.relevantFaculty,
        distanceKm: km,
      });
      return { row, km, score, matched };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit ?? 5)
    .map(({ row, km, score, matched }) => ({
      organizationId: row.organizationId,
      name: row.name,
      shortName: row.shortName,
      districtCode: row.districtCode,
      districtName: row.districtName,
      matchScore: score,
      rationale: rationale({
        domain: input.domain,
        strength: row.strength,
        disciplines: matched.map((d) => DISCIPLINE_LABELS[d].en),
        faculty: row.relevantFaculty,
        facilities: row.facilities.map((f) => FACILITY_LABELS[f].en),
        km,
      }),
    }));
}

function rationale(facts: {
  domain: Domain;
  strength: number | null;
  disciplines: string[];
  faculty: number;
  facilities: string[];
  km: number | null;
}): string {
  const domain = DOMAIN_DEFINITIONS[facts.domain].labelEn;
  return [
    facts.strength === null ? `No declared ${domain} expertise` : `${domain} ${facts.strength}/5`,
    facts.disciplines.length > 0 ? facts.disciplines.join(', ') : null,
    facts.faculty > 0 ? `${facts.faculty} faculty in these fields` : null,
    facts.facilities.length > 0 ? facts.facilities.join(', ') : null,
    facts.km === null
      ? 'location unknown'
      : facts.km < 1
        ? 'same district'
        : `${Math.round(facts.km)} km away`,
  ]
    .filter(Boolean)
    .join(' · ');
}
