import { reactivateAccount } from '@/modules/auth';
import { apiRoute, ok } from '@/server/api';
import { requireActor } from '@/server/session';

export const runtime = 'nodejs';

export const POST = apiRoute<{ id: string }>(async (_request, { params }) => {
  const actor = await requireActor();
  const { id } = await params;
  await reactivateAccount(actor, id);
  return ok({ reactivated: true });
});
