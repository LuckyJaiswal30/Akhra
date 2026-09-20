import { config } from 'dotenv';
import { closeDb, getDb, withoutRls } from '../client';
import { seedDistricts } from '../seed/districts';
import { seedOrganizations } from '../seed/organizations';
import { seedUsers } from '../seed/users';
import { seedProblems } from '../seed/problems';
import { seedProjects } from '../seed/projects';
import { seedHistory } from '../seed/history';
import { DEMO_PASSWORD } from '../seed/users';

config({ path: ['../../.env.local', '../../.env'], quiet: true });

const FORCE_FLAG = '--force';

function assertSafeToSeed(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const forced = process.argv.includes(FORCE_FLAG);

  if (isProduction && !forced) {
    console.error(
      'Refusing to seed: NODE_ENV=production.\n' +
        'Demo data must never be written to a production database.\n' +
        `If this really is intended, re-run with ${FORCE_FLAG}.`,
    );
    process.exit(1);
  }

  if (process.env.ALLOW_SEED !== 'true' && !forced) {
    console.error(
      'Refusing to seed: ALLOW_SEED is not "true".\n' +
        'Set ALLOW_SEED=true in .env.local to enable demo data.',
    );
    process.exit(1);
  }
}

async function main(): Promise<void> {
  assertSafeToSeed();

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
    process.exit(1);
  }

  const db = getDb();
  const started = Date.now();

  const counts = await withoutRls(db, async (tx) => ({
    districts: await seedDistricts(tx),
    organizations: await seedOrganizations(tx),
    users: await seedUsers(tx),
    problems: await seedProblems(tx),
    projects: await seedProjects(tx),
    'background reports': await seedHistory(tx),
  }));

  console.log('\nAkhra demo data loaded:\n');
  for (const [label, count] of Object.entries(counts)) {
    console.log(`  ${String(count).padStart(4)}  ${label}`);
  }
  console.log(`\n  Completed in ${Date.now() - started} ms`);
  console.log(
    '\n  Demo accounts sign in through Clerk. Create them once in a development instance with:',
  );
  console.log(
    '    pnpm clerk:demo-users        (password ' + DEMO_PASSWORD + '; code 424242 if Clerk asks)',
  );
  console.log('    gov+clerk_test@example.com         Government administrator (state-wide)');
  console.log('    district.ranchi+clerk_test@example.com  District officer, Ranchi');
  console.log('    university+clerk_test@example.com  University administrator (BAU Ranchi)');
  console.log('    faculty+clerk_test@example.com     Faculty member');
  console.log('    industry+clerk_test@example.com    Industry administrator (Sahaj Water)');
  console.log('    citizen+clerk_test@example.com     Citizen\n');

  await closeDb();
}

main().catch(async (error: unknown) => {
  console.error('Seeding failed:', error instanceof Error ? error.message : error);
  await closeDb().catch(() => undefined);
  process.exit(1);
});
