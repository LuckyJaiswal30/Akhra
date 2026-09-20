import { config } from 'dotenv';
import { applyMigrations, migrationsFolder } from '../migrator';

config({ path: ['../../.env.local', '../../.env'], quiet: true });

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
    process.exit(1);
  }

  console.log('[akhra:migrate] applying migrations from', migrationsFolder);
  const applied = await applyMigrations(url, (tag) => console.log('[akhra:migrate]', tag));
  console.log(
    applied.length === 0
      ? '[akhra:migrate] up to date'
      : `[akhra:migrate] ${applied.length} applied`,
  );
}

main().catch((error: unknown) => {
  console.error('[akhra:migrate] failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
