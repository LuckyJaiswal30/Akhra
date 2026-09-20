import { asc, eq, inArray, sql } from 'drizzle-orm';
import { getDb, users } from '@akhra/db';
import { Errors, type Role } from '@akhra/shared';
import type { Actor } from '@/server/session';

export interface Person {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  image: string | null;
  role: Role;
  jurisdictionCode: string | null;
  organizationId: string | null;
  designation: string | null;
  status: 'active' | 'suspended';
}

const personColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  phone: users.phone,
  image: users.image,
  role: users.role,
  jurisdictionCode: users.jurisdictionCode,
  organizationId: users.organizationId,
  designation: users.designation,
  status: users.status,
};

export async function listOrganizationPeople(actor: Actor): Promise<Person[]> {
  if (!actor.organizationId)
    throw Errors.forbidden('Your account is not linked to an organisation.');
  return getDb()
    .select(personColumns)
    .from(users)
    .where(eq(users.organizationId, actor.organizationId))
    .orderBy(asc(users.name));
}

export async function listGovernmentAdministrators(actor: Actor): Promise<Person[]> {
  if (actor.role !== 'super_admin')
    throw Errors.forbidden('Only a super administrator can see this list.');
  return (
    getDb()
      .select(personColumns)
      .from(users)
      .where(inArray(users.role, ['dept_officer', 'gov_admin', 'super_admin']))
      // One alphabetical list, not one list per role: a super administrator looking for a person
      // knows their name, not which of three roles they happen to hold.
      .orderBy(asc(sql`lower(coalesce(${users.name}, ${users.email}))`))
  );
}

export interface OrganizationSummary {
  id: string;
  name: string;
  type: string;
  agreementReference: string | null;
}
