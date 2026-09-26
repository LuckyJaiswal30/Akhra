import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { getDb, problems, statusEvents, withoutRls } from '@akhra/db';
import { submitProblemAction } from '@/modules/citizen';
import { serverEnv } from '@/server/env';
import { actAs, cleanupTestData, formData } from '../helpers';

const created: string[] = [];

const randomPhone = () => `98${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;

const report = (phone: string, extra: Record<string, string> = {}) =>
  formData({
    title: 'Drain overflowing onto the main road near the bus stand',
    description:
      'The drain beside the bus stand overflows every evening and the dirty water spreads across the road.',
    districtCode: 'RAN',
    submitterName: 'Test Reporter',
    submitterPhone: phone,
    consentToPublish: 'on',
    ...extra,
  });

async function submit(data: FormData) {
  const result = await submitProblemAction(null, data);
  if (result?.ok) created.push(result.data!.id);
  return result;
}

beforeEach(() => actAs(null));

afterAll(async () => {
  if (created.length > 0) {
    await withoutRls(getDb(), async (tx) => {
      await tx.delete(statusEvents).where(inArray(statusEvents.problemId, created));
      await tx.delete(problems).where(inArray(problems.id, created));
    });
  }
  await cleanupTestData();
});

describe('a bot filling the report form', () => {
  it('is refused when it fills the field people never see, and nothing is stored', async () => {
    const phone = randomPhone();
    const result = await submit(report(phone, { website: 'https://spam.example' }));

    expect(result?.ok).toBe(false);
    const stored = await withoutRls(getDb(), (tx) =>
      tx.select({ id: problems.id }).from(problems).where(eq(problems.submitterPhone, phone)),
    );
    expect(stored).toHaveLength(0);
  });

  it('is stopped after the hourly limit for one mobile number', async () => {
    const phone = randomPhone();
    for (let i = 0; i < serverEnv.RATE_LIMIT_SUBMISSIONS_PER_HOUR; i++) {
      expect((await submit(report(phone)))?.ok).toBe(true);
    }

    const blocked = await submit(report(phone));
    expect(blocked?.ok).toBe(false);
    expect(blocked && !blocked.ok && blocked.error.code).toBe('RATE_LIMITED');
  });
});
