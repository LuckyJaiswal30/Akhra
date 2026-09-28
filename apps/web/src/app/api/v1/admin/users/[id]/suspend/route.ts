import { suspendAccountSchema } from '@akhra/shared';
import { suspendAccount } from '@/modules/auth';
import { apiRoute, ok, readJson } from '@/server/api';
import { requireActor } from '@/server/session';

export const runtime = 'nodejs';

export const POST = apiRoute<{ id: string }>(async (request, { params }) => {
  const actor = await requireActor();
  const { id } = await params;
  return ok(await suspendAccount(actor, id, await readJson(request, suspendAccountSchema)));
});
