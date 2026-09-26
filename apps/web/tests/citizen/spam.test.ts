import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { getDb, problems, statusEvents, withoutRls } from '@akhra/db';
import { submitProblemAction } from '@/modules/citizen';
import { serverEnv } from '@/server/env';
import { checkHuman } from '@/server/turnstile';
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

describe('the check that a person is sending the report', () => {
  afterEach(() => vi.restoreAllMocks());

  const cloudflareSays = (body: unknown) =>
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body)));

  it('passes when Cloudflare confirms the token', async () => {
    const fetch = cloudflareSays({ success: true });
    expect(await checkHuman('token', '203.0.113.7', 'secret')).toBe('passed');
    expect(String((fetch.mock.calls[0]?.[1]?.body as URLSearchParams).get('remoteip'))).toBe(
      '203.0.113.7',
    );
  });

  it('fails when Cloudflare rejects the token, or when there is no token at all', async () => {
    cloudflareSays({ success: false, 'error-codes': ['invalid-input-response'] });
    expect(await checkHuman('forged', null, 'secret')).toBe('failed');
    expect(await checkHuman(null, null, 'secret')).toBe('failed');
  });

  it('lets the report through when Cloudflare cannot be reached, leaving the hourly limits', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
    expect(await checkHuman('token', null, 'secret')).toBe('skipped');
  });

  it('is skipped when no secret is configured, as in local development', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    expect(await checkHuman(null, null, '')).toBe('skipped');
    expect(fetch).not.toHaveBeenCalled();
  });
});
