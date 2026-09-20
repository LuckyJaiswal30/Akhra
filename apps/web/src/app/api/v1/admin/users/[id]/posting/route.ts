import { reassignOfficerSchema } from '@akhra/shared';
import { reassignOfficer } from '@/modules/auth';
import { apiRoute, ok, readJson } from '@/server/api';
import { requireActor } from '@/server/session';

export const runtime = 'nodejs';

export const POST = apiRoute<{ id: string }>(async (request, { params }) => {
  const actor = await requireActor();
  const { id } = await params;
  await reassignOfficer(actor, id, await readJson(request, reassignOfficerSchema));
  return ok({ reposted: true });
});
