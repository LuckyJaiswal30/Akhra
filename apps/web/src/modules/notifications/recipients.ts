import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { getDb, industryInterests, problems, projects, users, withoutRls } from '@akhra/db';
import type { Role } from '@akhra/shared';

export async function organizationMemberIds(
  organizationIds: string[],
  roles: readonly Role[],
): Promise<string[]> {
  const ids = [...new Set(organizationIds.filter(Boolean))];
  if (ids.length === 0) return [];
  const rows = await withoutRls(getDb(), (tx) =>
    tx
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          inArray(users.organizationId, ids),
          inArray(users.role, [...roles]),
          eq(users.status, 'active'),
        ),
      ),
  );
  return rows.map((r) => r.id);
}

/**
 * The officers answerable for a district's routine work: its own district officer. A district
 * whose post is vacant is covered by the state desk, so the work is never addressed to nobody.
 */
export async function districtOfficerIds(districtCode: string): Promise<string[]> {
  const officers = (district: string | null) =>
    withoutRls(getDb(), (tx) =>
      tx
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.role, 'gov_admin'),
            eq(users.status, 'active'),
            district === null
              ? isNull(users.jurisdictionCode)
              : eq(users.jurisdictionCode, district),
          ),
        ),
    );
  const posted = await officers(districtCode);
  return (posted.length > 0 ? posted : await officers(null)).map((row) => row.id);
}

/** Everyone an escalation reaches: the district's officer, the state desk and super administrators. */
export async function escalationRecipientIds(districtCode: string): Promise<string[]> {
  const rows = await withoutRls(getDb(), (tx) =>
    tx
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.status, 'active'),
          or(
            eq(users.role, 'super_admin'),
            and(
              eq(users.role, 'gov_admin'),
              or(isNull(users.jurisdictionCode), eq(users.jurisdictionCode, districtCode)),
            ),
          ),
        ),
      ),
  );
  return rows.map((row) => row.id);
}

export interface Reporter {
  refCode: string;
  title: string;
  userId: string | null;
  email: string | null;
  /** Set when this person's report was merged into the one the update is about. */
  mergedInto: string | null;
}

/**
 * Everyone who reported this problem: its own reporter, and the reporters whose reports an officer
 * merged into it as duplicates. Each keeps their own reference code.
 */
export async function findReporters(problemId: string): Promise<Reporter[]> {
  return withoutRls(getDb(), async (tx) => {
    const [original] = await tx
      .select({
        refCode: problems.refCode,
        title: problems.title,
        userId: problems.submitterId,
        email: problems.submitterEmail,
      })
      .from(problems)
      .where(eq(problems.id, problemId))
      .limit(1);
    if (!original) return [];

    const merged = await tx
      .select({
        refCode: problems.refCode,
        title: problems.title,
        userId: problems.submitterId,
        email: problems.submitterEmail,
      })
      .from(problems)
      .where(and(eq(problems.duplicateOfId, problemId), eq(problems.status, 'duplicate')));

    return [
      { ...original, mergedInto: null },
      ...merged.map((row) => ({ ...row, mergedInto: original.refCode })),
    ];
  });
}

export interface ProblemParticipants {
  districtCode: string | null;
  projectId: string | null;
  ownerOrganizationId: string | null;
  partnerOrganizationIds: string[];
  submitterId: string | null;
}

export async function findParticipants(problemId: string): Promise<ProblemParticipants> {
  return withoutRls(getDb(), async (tx) => {
    const [problem] = await tx
      .select({ submitterId: problems.submitterId, districtCode: problems.districtCode })
      .from(problems)
      .where(eq(problems.id, problemId))
      .limit(1);

    const [project] = await tx
      .select({ id: projects.id, organizationId: projects.organizationId })
      .from(projects)
      .where(eq(projects.problemId, problemId))
      .orderBy(desc(projects.createdAt))
      .limit(1);

    const partners = project
      ? await tx
          .select({ organizationId: industryInterests.organizationId })
          .from(industryInterests)
          .where(
            and(
              eq(industryInterests.projectId, project.id),
              eq(industryInterests.status, 'accepted'),
            ),
          )
      : [];

    return {
      districtCode: problem?.districtCode ?? null,
      projectId: project?.id ?? null,
      ownerOrganizationId: project?.organizationId ?? null,
      partnerOrganizationIds: partners.map((p) => p.organizationId),
      submitterId: problem?.submitterId ?? null,
    };
  });
}
