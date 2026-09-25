import { afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { getDb, problems, statusEvents, withoutRls } from '@akhra/db';
import { CONTACT_RETENTION_DAYS, type ProblemStatus } from '@akhra/shared';
import { eraseExpiredContacts } from '@/modules/citizen';
import { cleanupTestData, createReport } from '../helpers';

const DAY = 24 * 60 * 60 * 1000;

async function reportLastTouched(status: ProblemStatus, daysAgo: number): Promise<string> {
  const id = await createReport({ status });
  const at = new Date(Date.now() - daysAgo * DAY);
  await withoutRls(getDb(), async (tx) => {
    await tx
      .update(problems)
      .set({ updatedAt: at, submitterEmail: 'r@test.invalid' })
      .where(eq(problems.id, id));
    await tx.insert(statusEvents).values({
      entityType: 'problem',
      entityId: id,
      problemId: id,
      toStatus: status,
      actorLabel: 'Test Reporter',
      createdAt: at,
    });
  });
  return id;
}

async function contactOf(id: string) {
  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .select({
        name: problems.submitterName,
        phone: problems.submitterPhone,
        email: problems.submitterEmail,
        erasedAt: problems.contactErasedAt,
      })
      .from(problems)
      .where(eq(problems.id, id)),
  );
  const labels = await withoutRls(getDb(), (tx) =>
    tx
      .select({ label: statusEvents.actorLabel })
      .from(statusEvents)
      .where(eq(statusEvents.problemId, id)),
  );
  return { ...row!, labels: labels.map((l) => l.label) };
}

afterAll(cleanupTestData);

describe('contact retention', () => {
  it('erases the reporter from a report closed longer ago than the retention period', async () => {
    const id = await reportLastTouched('closed', CONTACT_RETENTION_DAYS + 5);

    await eraseExpiredContacts();

    const contact = await contactOf(id);
    expect(contact).toMatchObject({ name: 'Reporter', phone: '', email: null });
    expect(contact.erasedAt).toBeInstanceOf(Date);
    expect(contact.labels).not.toContain('Test Reporter');
  });

  it('keeps contact details on a recently closed report and on any open one', async () => {
    const recent = await reportLastTouched('closed', CONTACT_RETENTION_DAYS - 5);
    const open = await reportLastTouched('in_progress', CONTACT_RETENTION_DAYS + 50);

    await eraseExpiredContacts();

    expect((await contactOf(recent)).phone).toBe('9835012345');
    expect((await contactOf(open)).phone).toBe('9835012345');
  });
});
