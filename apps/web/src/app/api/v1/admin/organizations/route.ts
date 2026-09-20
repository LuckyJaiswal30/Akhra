import { onboardOrganizationSchema } from '@akhra/shared';
import { onboardOrganization } from '@/modules/auth';
import { apiRoute, created, readJson } from '@/server/api';
import { requireRole } from '@/server/session';

export const runtime = 'nodejs';

export const POST = apiRoute(async (request) => {
  const actor = await requireRole('super_admin');
  const input = await readJson(request, onboardOrganizationSchema);
  return created(await onboardOrganization(actor, input));
});
