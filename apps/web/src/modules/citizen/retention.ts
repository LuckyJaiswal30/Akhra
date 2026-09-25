import { and, inArray, isNull, lt, sql } from 'drizzle-orm';
import { getDb, problems, statusEvents, withoutRls } from '@akhra/db';
import { CONTACT_RETENTION_DAYS, TERMINAL_STATUSES } from '@akhra/shared';

const DAY_MS = 24 * 60 * 60 * 1000;
export const ERASED_REPORTER = 'Reporter';

export async function eraseExpiredContacts(now = new Date(), batch = 200): Promise<number> {
  const cutoff = new Date(now.getTime() - CONTACT_RETENTION_DAYS * DAY_MS);
  const lastActivity = sql`(select max(${statusEvents.createdAt}) from ${statusEvents} where ${statusEvents.problemId} = ${problems.id})`;

  return withoutRls(getDb(), async (tx) => {
    const due = await tx
      .select({ id: problems.id, name: problems.submitterName })
      .from(problems)
      .where(
        and(
          inArray(problems.status, [...TERMINAL_STATUSES]),
          isNull(problems.contactErasedAt),
          lt(problems.updatedAt, cutoff),
          sql`coalesce(${lastActivity}, ${problems.updatedAt}) < ${cutoff}`,
          // A merged report's reporter still hears about the original, so wait until it has closed too.
          sql`not exists (select 1 from problems original where original.id = "problems"."duplicate_of_id" and original.status not in ('closed', 'rejected', 'duplicate'))`,
        ),
      )
      .limit(batch);

    if (due.length === 0) return 0;
    const ids = due.map((report) => report.id);

    await tx.execute(sql`
      update ${statusEvents} set actor_label = ${ERASED_REPORTER}
      from ${problems}
      where ${statusEvents.problemId} = ${problems.id}
        and ${inArray(problems.id, ids)}
        and ${statusEvents.actorLabel} = ${problems.submitterName}
    `);
    await tx
      .update(problems)
      .set({
        submitterName: ERASED_REPORTER,
        submitterPhone: '',
        submitterEmail: null,
        submitterOrganization: null,
        contactErasedAt: now,
      })
      .where(inArray(problems.id, ids));
    return due.length;
  });
}
