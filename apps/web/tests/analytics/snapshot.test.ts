import { afterAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { analyticsSnapshots, getDb, problems, withoutRls } from '@akhra/db';
import { submitProblem } from '@/modules/citizen';
import { getActor } from '@/server/session';
import { cachedSnapshot, writeSnapshot } from '@/modules/analytics/snapshot';
import { actAs } from '../helpers';

const keys: string[] = [];
const reports: string[] = [];
const key = (name: string) => {
  const value = `test:${name}:${Math.random().toString(36).slice(2, 8)}`;
  keys.push(value);
  return value;
};

/** Backdates a stored snapshot, so a test does not have to wait out a time-to-live. */
async function age(snapshotKey: string, minutes: number) {
  await withoutRls(getDb(), (tx) =>
    tx
      .update(analyticsSnapshots)
      .set({ computedAt: new Date(Date.now() - minutes * 60 * 1000) })
      .where(inArray(analyticsSnapshots.key, [snapshotKey])),
  );
}

afterAll(async () => {
  await withoutRls(getDb(), async (tx) => {
    if (keys.length > 0)
      await tx.delete(analyticsSnapshots).where(inArray(analyticsSnapshots.key, keys));
    for (const id of reports) await tx.delete(problems).where(eq(problems.id, id));
  });
});

const PUBLIC_KEYS = ['public:stats:v1', 'public:impact:v1', 'public:stories:v1'];

describe('the figures the public sees', () => {
  it('are recounted as soon as someone files a report', async () => {
    for (const name of PUBLIC_KEYS) await writeSnapshot(name, { stale: true });

    actAs(null);
    const filed = await submitProblem(await getActor(), {
      districtCode: 'GUM',
      blockName: undefined,
      location: null,
      submitterType: 'individual',
      submitterName: 'Snapshot Tester',
      submitterPhone: '9835066124',
      submitterEmail: '',
      attachmentIds: [],
      consentToPublish: true,
      domain: null,
      affectedScale: 'household',
      safetyRisk: false,
      title: 'Street light out on the lane behind the block office',
      description:
        'The single street light on our lane has been out for two months and the lane is dark by six.',
    });
    reports.push(filed.id);

    const left = await withoutRls(getDb(), (tx) =>
      tx.select().from(analyticsSnapshots).where(inArray(analyticsSnapshots.key, PUBLIC_KEYS)),
    );
    expect(left).toHaveLength(0);
  });
});

describe('figures kept in a snapshot', () => {
  it('computes once, then serves the stored figures', async () => {
    const name = key('fresh');
    let computed = 0;
    const compute = async () => ({ total: ++computed });

    expect(await cachedSnapshot(name, 60_000, compute)).toEqual({ total: 1 });
    expect(await cachedSnapshot(name, 60_000, compute)).toEqual({ total: 1 });
    expect(computed).toBe(1);
  });

  it('serves figures that are past their time rather than making the reader wait', async () => {
    const name = key('stale');
    await writeSnapshot(name, { total: 1 });
    await age(name, 30);

    // The reader gets what was stored; the refresh happens behind them.
    expect(await cachedSnapshot(name, 60_000, async () => ({ total: 2 }))).toEqual({ total: 1 });
  });

  it('stores nothing when the figures cannot be computed', async () => {
    const name = key('failing');
    await expect(
      cachedSnapshot(name, 60_000, () => Promise.reject(new Error('database is down'))),
    ).rejects.toThrow('database is down');

    const rows = await withoutRls(getDb(), (tx) =>
      tx
        .select()
        .from(analyticsSnapshots)
        .where(inArray(analyticsSnapshots.key, [name])),
    );
    expect(rows).toHaveLength(0);
  });
});
