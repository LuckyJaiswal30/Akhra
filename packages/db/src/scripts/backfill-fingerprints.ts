import { config } from 'dotenv';
import { eq, isNull } from 'drizzle-orm';
import { contentFingerprint } from '@akhra/classifier';
import { closeDb, getDb, problems, withoutRls } from '../client';

config({ path: ['../../.env.local', '../../.env'], quiet: true });

const BATCH = 500;

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
    process.exit(1);
  }

  const db = getDb();
  let done = 0;

  for (;;) {
    const batch = await withoutRls(db, (tx) =>
      tx
        .select({ id: problems.id, title: problems.title, description: problems.description })
        .from(problems)
        .where(isNull(problems.contentFingerprint))
        .limit(BATCH),
    );
    if (batch.length === 0) break;

    await withoutRls(db, async (tx) => {
      for (const row of batch) {
        await tx
          .update(problems)
          .set({ contentFingerprint: contentFingerprint(row.title, row.description) ?? '' })
          .where(eq(problems.id, row.id));
      }
    });

    done += batch.length;
    console.log(`[akhra:fingerprints] ${done} reports`);
    if (batch.length < BATCH) break;
  }

  console.log(
    done === 0
      ? '[akhra:fingerprints] every report already has one'
      : `[akhra:fingerprints] done, ${done} reports updated`,
  );
  await closeDb();
}

main().catch(async (error: unknown) => {
  console.error('[akhra:fingerprints] failed:', error instanceof Error ? error.message : error);
  await closeDb();
  process.exit(1);
});
