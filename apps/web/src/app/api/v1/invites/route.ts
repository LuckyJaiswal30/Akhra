import { issueInviteSchema } from '@akhra/shared';
import { issueInvite, listInvites } from '@/modules/auth';
import { apiRoute, created, ok, readJson } from '@/server/api';
import { requireActor } from '@/server/session';

export const runtime = 'nodejs';

export const GET = apiRoute(async () => {
  const actor = await requireActor();
  return ok({ invites: await listInvites(actor) });
});

export const POST = apiRoute(async (request) => {
  const actor = await requireActor();
  const input = await readJson(request, issueInviteSchema);
  return created(await issueInvite(actor, input));
});
