import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { getDb, notifications, problems, statusEvents, withoutRls } from '@akhra/db';
import { CONTACT_RETENTION_DAYS } from '@akhra/shared';
import { eraseExpiredContacts, trackByRefCode } from '@/modules/citizen';
import { decideProblemAction, markAsDuplicate } from '@/modules/classification';
import { getActor } from '@/server/session';
import {
  actAs,
  cleanupTestData,
  createReport,
  createUser,
  formData,
  type TestUser,
} from '../helpers';

let officer: TestUser;
let firstReporter: TestUser;
let laterReporter: TestUser;

async function refOf(id: string): Promise<string> {
  const [row] = await withoutRls(getDb(), (tx) =>
    tx.select({ refCode: problems.refCode }).from(problems).where(eq(problems.id, id)),
  );
  return row!.refCode;
}

async function notificationsFor(user: TestUser, type: string) {
  return withoutRls(getDb(), (tx) =>
    tx
      .select({ body: notifications.body })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), eq(notifications.type, type))),
  );
}

beforeAll(async () => {
  officer = await createUser({ role: 'gov_admin', jurisdictionCode: 'RAN' });
  firstReporter = await createUser({ role: 'citizen' });
  laterReporter = await createUser({ role: 'citizen' });
});

afterAll(cleanupTestData);

describe('reports merged as duplicates', () => {
  it('keeps every reporter of the same problem informed and pointed at one case', async () => {
    const original = await createReport({ submitterId: firstReporter.id });
    const duplicate = await createReport({ submitterId: laterReporter.id });

    actAs(officer);
    await markAsDuplicate(await getActor(), duplicate, original);

    const tracked = await trackByRefCode(await refOf(duplicate));
    expect(tracked?.mergedInto).toMatchObject({
      refCode: await refOf(original),
      status: 'submitted',
    });

    await decideProblemAction(
      null,
      formData({ problemId: original, decision: 'validate', domain: 'water_resources' }),
    );

    expect(await notificationsFor(firstReporter, 'problem_validated')).toHaveLength(1);
    const [forLater] = await notificationsFor(laterReporter, 'problem_validated');
    expect(forLater?.body).toContain(`merged into ${await refOf(original)}`);
  });

  it('writes to each reporter in the language they reported in', async () => {
    const original = await createReport({ submitterId: firstReporter.id });
    const duplicate = await createReport({ submitterId: laterReporter.id });
    await withoutRls(getDb(), (tx) =>
      tx.update(problems).set({ locale: 'hi' }).where(eq(problems.id, duplicate)),
    );

    actAs(officer);
    await markAsDuplicate(await getActor(), duplicate, original);
    await decideProblemAction(
      null,
      formData({ problemId: original, decision: 'reject', note: 'Outside the scheme' }),
    );

    const [english] = await notificationsFor(firstReporter, 'problem_rejected');
    const [hindi] = await notificationsFor(laterReporter, 'problem_rejected');
    expect(english?.body).toContain('is now:');
    expect(hindi?.body).toContain(`${await refOf(original)} में मिला दिया गया है`);
    expect(hindi?.body).toContain('की स्थिति अब:');
  });

  it('carries earlier merges along when the original is itself merged', async () => {
    const first = await createReport({ submitterId: firstReporter.id });
    const second = await createReport({ submitterId: laterReporter.id });
    const survivor = await createReport();

    actAs(officer);
    const actor = await getActor();
    await markAsDuplicate(actor, second, first);
    await markAsDuplicate(actor, first, survivor);

    expect((await trackByRefCode(await refOf(second)))?.mergedInto?.refCode).toBe(
      await refOf(survivor),
    );
  });

  it('keeps a merged reporter’s contact details while the report they follow is open', async () => {
    const original = await createReport();
    const duplicate = await createReport({ status: 'duplicate' });
    const longAgo = new Date(Date.now() - (CONTACT_RETENTION_DAYS + 10) * 24 * 60 * 60 * 1000);
    await withoutRls(getDb(), async (tx) => {
      await tx
        .update(problems)
        .set({ duplicateOfId: original, updatedAt: longAgo })
        .where(eq(problems.id, duplicate));
      await tx.insert(statusEvents).values({
        entityType: 'problem',
        entityId: duplicate,
        problemId: duplicate,
        toStatus: 'duplicate',
        createdAt: longAgo,
      });
    });

    await eraseExpiredContacts();

    const [row] = await withoutRls(getDb(), (tx) =>
      tx
        .select({ phone: problems.submitterPhone })
        .from(problems)
        .where(eq(problems.id, duplicate)),
    );
    expect(row?.phone).toBe('9835012345');
  });
});
