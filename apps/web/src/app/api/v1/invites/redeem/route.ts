import { acceptInviteSchema } from '@akhra/shared';
import { acceptInvite } from '@/modules/auth';
import { apiRoute, ok, readJson } from '@/server/api';
import { clientIdentifier } from '@/server/rate-limit';
import { getActor } from '@/server/session';

export const runtime = 'nodejs';

export const POST = apiRoute(async (request) => {
  const { token } = await readJson(request, acceptInviteSchema);
  const result = await acceptInvite(await getActor(), token, {
    ip: clientIdentifier(request.headers),
  });
  return ok({ ...result, message: 'Invitation accepted. Your new access is ready.' });
});
