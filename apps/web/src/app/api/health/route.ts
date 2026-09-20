import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb } from '@akhra/db';
import { apiRoute, ok } from '@/server/api';
import { logger } from '@/server/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = apiRoute(async () => {
  const started = Date.now();
  try {
    await getDb().execute(sql`select 1`);
  } catch (error) {
    logger.error({ err: error }, 'health check could not reach the database');
    return NextResponse.json(
      { data: { status: 'degraded', database: 'unreachable' } },
      { status: 503 },
    );
  }
  return ok({ status: 'ok', database: 'ok', latencyMs: Date.now() - started });
});
