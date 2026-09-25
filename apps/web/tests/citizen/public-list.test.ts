import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { getDb, problems, statusEvents, withoutRls } from '@akhra/db';
import { problemFilterSchema } from '@akhra/shared';
import { listProblems, trackByRefCode } from '@/modules/citizen';
import { reporterDecisionAction } from '@/modules/classification/actions';
import { ANONYMOUS_ACTOR } from '@/server/session';
import { actAs, cleanupTestData, createReport, formData } from '../helpers';

const TAG = `zq${Date.now()}`;
let khuntiReport: string;

async function refOf(id: string): Promise<string> {
  const [row] = await withoutRls(getDb(), (tx) =>
    tx.select({ refCode: problems.refCode }).from(problems).where(eq(problems.id, id)),
  );
  return row!.refCode;
}

beforeAll(async () => {
  khuntiReport = await createReport({ districtCode: 'KHU', title: `Culvert ${TAG} collapsed` });
  await createReport({ districtCode: 'RAN', title: `Culvert ${TAG} 100% blocked` });
  await createReport({
    districtCode: 'RAN',
    title: `Culvert ${TAG} merged copy`,
    status: 'duplicate',
  });
});

afterAll(cleanupTestData);

const search = (params: Record<string, string>) =>
  listProblems(ANONYMOUS_ACTOR, problemFilterSchema.parse(params));

describe('the public problems list', () => {
  it('applies one filter when the form sends the others blank', async () => {
    const { items } = await search({ q: TAG, domain: '', districtCode: 'KHU', status: '' });
    expect(items.map((item) => item.id)).toEqual([khuntiReport]);
  });

  it('ignores a bad value instead of discarding every filter', async () => {
    const { items } = await search({
      q: TAG,
      domain: 'not-a-domain',
      districtCode: 'KHU',
      page: 'x',
    });
    expect(items.map((item) => item.id)).toEqual([khuntiReport]);
  });

  it('treats % and _ as text, not wildcards', async () => {
    expect((await search({ q: `${TAG} 100%` })).total).toBe(1);
    expect((await search({ q: '%' })).items.every((item) => item.title.includes('%'))).toBe(true);
  });

  it('lists a merged duplicate once, under its original, unless asked for duplicates', async () => {
    expect((await search({ q: TAG })).total).toBe(2);
    expect((await search({ q: TAG, status: 'duplicate' })).total).toBe(1);
  });
});

describe('the public tracker', () => {
  it('never names the citizen who reported the problem', async () => {
    const id = await createReport();
    await withoutRls(getDb(), (tx) =>
      tx.insert(statusEvents).values({
        entityType: 'problem',
        entityId: id,
        problemId: id,
        toStatus: 'submitted',
        actorLabel: 'Test Reporter',
      }),
    );
    const tracked = await trackByRefCode(await refOf(id));
    expect(JSON.stringify(tracked)).not.toContain('Test Reporter');
  });

  it('stops guessing the mobile digits after a few tries', async () => {
    const refCode = await refOf(await createReport({ status: 'action_taken' }));
    actAs(null);
    const attempt = (digits: string) =>
      reporterDecisionAction(null, formData({ refCode, phoneLast4: digits, decision: 'confirm' }));

    for (const digits of ['0001', '0002', '0003', '0004', '0005']) {
      expect((await attempt(digits))?.ok).toBe(false);
    }
    const blocked = await attempt('2345');
    expect(blocked && !blocked.ok && blocked.error.code).toBe('RATE_LIMITED');
  });
});
