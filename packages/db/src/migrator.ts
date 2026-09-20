import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool, type PoolClient } from 'pg';

const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), '../migrations');

interface JournalEntry {
  tag: string;
  when: number;
}

interface Migration {
  tag: string;
  when: number;
  hash: string;
  statements: string[];
}

function pending(applied: Set<string>): Migration[] {
  const journal = JSON.parse(
    readFileSync(join(migrationsFolder, 'meta', '_journal.json'), 'utf8'),
  ) as { entries: JournalEntry[] };

  return journal.entries
    .map((entry) => {
      const sql = readFileSync(join(migrationsFolder, `${entry.tag}.sql`)).toString();
      return {
        tag: entry.tag,
        when: entry.when,
        hash: createHash('sha256').update(sql).digest('hex'),
        statements: sql
          .split('--> statement-breakpoint')
          .map((statement) => statement.trim())
          .filter(Boolean),
      };
    })
    .filter((entry) => !applied.has(entry.hash));
}

async function appliedHashes(client: PoolClient): Promise<Set<string>> {
  await client.query('CREATE SCHEMA IF NOT EXISTS drizzle');
  await client.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);
  const { rows } = await client.query<{ hash: string }>(
    'SELECT hash FROM drizzle.__drizzle_migrations',
  );
  return new Set(rows.map((row) => row.hash));
}

/**
 * Applies every migration the database has not seen, each in its own transaction.
 *
 * Drizzle's own migrator wraps the whole run in one transaction, which Postgres refuses the moment a
 * migration adds an enum value and a later one uses it. Committing file by file keeps the same
 * bookkeeping table, so either tool can take over from the other.
 */
export async function applyMigrations(
  connectionString: string,
  log: (message: string) => void = () => undefined,
): Promise<string[]> {
  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  const applied: string[] = [];

  try {
    for (const migration of pending(await appliedHashes(client))) {
      await client.query('BEGIN');
      try {
        for (const statement of migration.statements) await client.query(statement);
        await client.query(
          'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
          [migration.hash, migration.when],
        );
        await client.query('COMMIT');
        applied.push(migration.tag);
        log(migration.tag);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(
          `${migration.tag}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
  return applied;
}

/** Creates the database named in the connection string when it does not exist yet. */
export async function ensureDatabase(connectionString: string): Promise<void> {
  const name = decodeURIComponent(new URL(connectionString).pathname.replace(/^\//, ''));
  const maintenance = new URL(connectionString);
  maintenance.pathname = '/postgres';

  const pool = new Pool({ connectionString: maintenance.toString(), max: 1 });
  try {
    const { rowCount } = await pool.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (rowCount === 0) await pool.query(`CREATE DATABASE "${name.replaceAll('"', '""')}"`);
  } finally {
    await pool.end();
  }
}

export { migrationsFolder };
