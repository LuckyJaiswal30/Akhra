import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { NextResponse, type NextRequest } from 'next/server';
import { identityFromWebhook } from '@/server/clerk';
import { applyClerkUpdate, detachClerkUser, linkOrCreate } from '@/server/identity';
import { logger } from '@/server/logger';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let event: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    event = await verifyWebhook(request);
  } catch {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'The webhook signature could not be verified.' } },
      { status: 400 },
    );
  }

  if (event.type === 'user.created') await linkOrCreate(identityFromWebhook(event.data));
  else if (event.type === 'user.updated') await applyClerkUpdate(identityFromWebhook(event.data));
  else if (event.type === 'user.deleted' && event.data.id) await detachClerkUser(event.data.id);

  logger.info({ type: event.type }, 'Clerk webhook processed');
  return NextResponse.json({ data: { received: true } });
}
