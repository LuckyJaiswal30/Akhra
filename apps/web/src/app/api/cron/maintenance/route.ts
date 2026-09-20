import { timingSafeEqual } from 'node:crypto';
import { runMaintenance } from '@/modules/automation';
import { apiRoute, ok } from '@/server/api';
import { serverEnv } from '@/server/env';
import { AppError } from '@akhra/shared';

export const runtime = 'nodejs';
export const maxDuration = 60;

function authorised(request: Request): boolean {
  const secret = serverEnv.CRON_SECRET;
  if (!secret) return false;
  const offered = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const a = Buffer.from(offered);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const POST = apiRoute(async (request) => {
  if (!authorised(request))
    throw new AppError('FORBIDDEN', 'This endpoint is only for the scheduler.');
  return ok(await runMaintenance());
});

export const GET = POST;
