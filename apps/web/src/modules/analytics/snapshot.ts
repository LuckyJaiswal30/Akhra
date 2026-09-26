import { after } from 'next/server';
import { eq, inArray } from 'drizzle-orm';
import { analyticsSnapshots, getDb, withoutRls } from '@akhra/db';
import { logger } from '@/server/logger';

export interface Snapshot<T> {
  payload: T;
  computedAt: Date;
}

async function read<T>(key: string): Promise<Snapshot<T> | null> {
  try {
    const [row] = await withoutRls(getDb(), (tx) =>
      tx
        .select({ payload: analyticsSnapshots.payload, computedAt: analyticsSnapshots.computedAt })
        .from(analyticsSnapshots)
        .where(eq(analyticsSnapshots.key, key))
        .limit(1),
    );
    return row ? { payload: row.payload as T, computedAt: row.computedAt } : null;
  } catch (error) {
    logger.warn(
      { err: error instanceof Error ? error.message : String(error), key },
      'snapshot could not be read; computing instead',
    );
    return null;
  }
}

export async function writeSnapshot<T>(key: string, payload: T): Promise<void> {
  try {
    const computedAt = new Date();
    await withoutRls(getDb(), (tx) =>
      tx
        .insert(analyticsSnapshots)
        .values({ key, payload, computedAt })
        .onConflictDoUpdate({ target: analyticsSnapshots.key, set: { payload, computedAt } }),
    );
  } catch (error) {
    logger.warn(
      { err: error instanceof Error ? error.message : String(error), key },
      'snapshot could not be stored; the next view recomputes it',
    );
  }
}

export async function forgetSnapshots(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    await withoutRls(getDb(), (tx) =>
      tx.delete(analyticsSnapshots).where(inArray(analyticsSnapshots.key, keys)),
    );
  } catch (error) {
    logger.warn(
      { err: error instanceof Error ? error.message : String(error), keys },
      'snapshots could not be cleared; they expire on their own',
    );
  }
}

function afterResponse(task: () => Promise<void>): void {
  try {
    after(task);
  } catch {
    void task();
  }
}

export async function cachedSnapshot<T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T>,
): Promise<T> {
  const stored = await read<T>(key);
  const age = stored ? Date.now() - stored.computedAt.getTime() : Infinity;

  if (stored && age <= ttlMs) return stored.payload;

  // Slightly stale figures are served while they refresh; figures from a quiet week are not.
  if (stored && age <= Math.max(ttlMs * 12, 60 * 60 * 1000)) {
    afterResponse(async () => {
      try {
        await writeSnapshot(key, await compute());
      } catch (error) {
        logger.warn(
          { err: error instanceof Error ? error.message : String(error), key },
          'snapshot refresh failed; the stored figures stand',
        );
      }
    });
    return stored.payload;
  }

  const fresh = await compute();
  await writeSnapshot(key, fresh);
  return fresh;
}
