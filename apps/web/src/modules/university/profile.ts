import { and, asc, eq, inArray } from 'drizzle-orm';
import { organizationDomains, organizations, users } from '@akhra/db';
import {
  Errors,
  type AcademicDiscipline,
  type Domain,
  type FacultyExpertiseInput,
  type InstitutionFacility,
  type InstitutionProfileInput,
  type Role,
} from '@akhra/shared';
import { logger } from '@/server/logger';
import { ForbiddenError, query, type Actor } from '@/server/session';

export interface FacultyExpertise {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  designation: string | null;
  discipline: AcademicDiscipline | null;
  specialisation: string | null;
}

export interface InstitutionProfile {
  organizationId: string;
  name: string;
  description: string;
  domains: { domain: Domain; strength: number }[];
  disciplines: AcademicDiscipline[];
  facilities: InstitutionFacility[];
  faculty: FacultyExpertise[];
  isRoutable: boolean;
}

const UNIVERSITY_STAFF = ['university_admin', 'faculty'] as const;

function institutionOf(actor: Actor): string {
  if (!actor.organizationId || !(UNIVERSITY_STAFF as readonly string[]).includes(actor.role)) {
    throw new ForbiddenError('Only university staff can see their institution’s profile.');
  }
  return actor.organizationId;
}

function requireUniversityAdmin(actor: Actor): string {
  const organizationId = institutionOf(actor);
  if (actor.role !== 'university_admin') {
    throw new ForbiddenError('Only the institution’s administrator can change its profile.');
  }
  return organizationId;
}

export async function getInstitutionProfile(actor: Actor): Promise<InstitutionProfile> {
  const organizationId = institutionOf(actor);

  return query(actor, async (tx) => {
    const [organization] = await tx
      .select({
        name: organizations.name,
        description: organizations.description,
        disciplines: organizations.disciplines,
        facilities: organizations.facilities,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    if (!organization) throw Errors.notFound('Your institution could not be found.');

    const domains = await tx
      .select({ domain: organizationDomains.domain, strength: organizationDomains.strength })
      .from(organizationDomains)
      .where(eq(organizationDomains.organizationId, organizationId))
      .orderBy(asc(organizationDomains.domain));

    const faculty = await tx
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        designation: users.designation,
        discipline: users.discipline,
        specialisation: users.specialisation,
      })
      .from(users)
      .where(
        and(
          eq(users.organizationId, organizationId),
          inArray(users.role, [...UNIVERSITY_STAFF]),
          eq(users.status, 'active'),
        ),
      )
      .orderBy(asc(users.name));

    return {
      organizationId,
      name: organization.name,
      description: organization.description ?? '',
      domains,
      disciplines: organization.disciplines,
      facilities: organization.facilities,
      faculty,
      isRoutable: domains.length > 0 || organization.disciplines.length > 0,
    };
  });
}

export async function updateInstitutionProfile(
  actor: Actor,
  input: InstitutionProfileInput,
): Promise<void> {
  const organizationId = requireUniversityAdmin(actor);

  await query(actor, async (tx) => {
    await tx
      .update(organizations)
      .set({
        description: input.description || null,
        disciplines: input.disciplines,
        facilities: input.facilities,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId));

    await tx
      .delete(organizationDomains)
      .where(eq(organizationDomains.organizationId, organizationId));
    await tx
      .insert(organizationDomains)
      .values(input.domains.map((row) => ({ organizationId, ...row })));
  });

  logger.info(
    { organizationId, domains: input.domains.length, disciplines: input.disciplines.length },
    'institution profile updated',
  );
}

export async function setFacultyExpertise(
  actor: Actor,
  userId: string,
  input: FacultyExpertiseInput,
): Promise<void> {
  const organizationId = requireUniversityAdmin(actor);

  const updated = await query(actor, (tx) =>
    tx
      .update(users)
      .set({
        discipline: input.discipline,
        specialisation: input.specialisation || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(users.id, userId),
          eq(users.organizationId, organizationId),
          inArray(users.role, [...UNIVERSITY_STAFF]),
        ),
      )
      .returning({ id: users.id }),
  );
  if (updated.length === 0)
    throw Errors.notFound('That person is not on your institution’s staff.');
}
