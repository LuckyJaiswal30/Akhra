import { after } from 'next/server';
import { eq, inArray } from 'drizzle-orm';
import { analyticsSnapshots, getDb, withoutRls } from '@akhra/db';
import { logger } from '@/server/logger';

/**
 * Figures that cost a dozen aggregates to produce, kept in `analytics_snapshots` and shared by every
 * server that reads the same database.
 *
 * Akhra caches these itself rather than through the framework, for two reasons. A public page on a
 * government portal is read far more often than the figures change — one visitor should not make
 * twenty thousand of them wait on the same `count(*)`. And this cache outlives any one rendering
 * model: it is a table, not a build flag.
 *
 * A stale snapshot is served immediately and refreshed after the response. Nobody waits for a
 * number that was already good enough a minute ago.
 */
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

/**
 * Throws away stored figures, so the next reader recomputes them. Used when something happened that
 * a visitor would expect to see at once — a new report on the home page counter, for instance.
 */
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

/** Runs after the response has been sent, or inline where there is no request to finish. */
function afterResponse(task: () => Promise<void>): void {
  try {
    after(task);
  } catch {
    void task();
  }
}

/**
 * The stored figures under `key`, recomputing only when there are none. A snapshot older than
 * `ttlMs` is still served, and refreshed once the reader has their page.
 *
 * `compute` must return something `JSON.stringify` keeps whole: a Date comes back as a string.
 */
export async function cachedSnapshot<T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T>,
): Promise<T> {
  const stored = await read<T>(key);

  if (stored && Date.now() - stored.computedAt.getTime() <= ttlMs) return stored.payload;

  if (stored) {
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
