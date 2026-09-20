import { sql, type ExtractTablesWithRelations } from 'drizzle-orm';
import { drizzle, type NodePgDatabase, type NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';
import * as schema from './schema/index';

export type Schema = typeof schema;
export type Database = NodePgDatabase<Schema>;
export type Transaction = PgTransaction<
  NodePgQueryResultHKT,
  Schema,
  ExtractTablesWithRelations<Schema>
>;
export type Executor = Database | Transaction;

let cached: { url: string; db: Database; pool: Pool } | undefined;

export function getDb(connectionString?: string): Database {
  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
  }
  if (cached && cached.url === url) return cached.db;

  const pool = new Pool({
    connectionString: url,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
  });
  pool.on('error', (err) => {
    console.error('[akhra:db] idle client error', err.message);
  });

  const db = drizzle(pool, { schema, casing: 'snake_case' });
  cached = { url, db, pool };
  return db;
}

export async function closeDb(): Promise<void> {
  if (cached) {
    await cached.pool.end();
    cached = undefined;
  }
}

const APP_ROLE = 'akhra_app';

export interface UserContext {
  userId: string | null;
  role: string;
}

export const ANONYMOUS: UserContext = { userId: null, role: 'anonymous' };

export async function withUserContext<T>(
  db: Database,
  ctx: UserContext,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local role ${sql.raw(APP_ROLE)}`);
    await tx.execute(sql`select set_config('akhra.user_id', ${ctx.userId ?? ''}, true)`);
    await tx.execute(sql`select set_config('akhra.role', ${ctx.role}, true)`);
    return fn(tx);
  });
}

export async function withoutRls<T>(db: Database, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local row_security = off`);
    return fn(tx);
  });
}

export { schema, sql };
export * from './schema/index';
