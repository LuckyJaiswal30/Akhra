import { applyMigrations, ensureDatabase } from '@akhra/db/migrator';
import { testDatabaseUrl } from './database';

/** Creates the test database on first run, brings its schema up to date and loads the districts. */
export default async function setup(): Promise<void> {
  const url = testDatabaseUrl();
  await ensureDatabase(url);
  await applyMigrations(url);

  process.env.DATABASE_URL = url;
  const { closeDb, getDb, withoutRls } = await import('@akhra/db');
  const { seedDistricts } = await import('@akhra/db/reference-data');
  await withoutRls(getDb(url), (tx) => seedDistricts(tx));
  await closeDb();
}
