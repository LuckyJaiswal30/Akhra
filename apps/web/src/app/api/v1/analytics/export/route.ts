import { analyticsRangeSchema } from '@akhra/shared';
import { exportReportsCsv } from '@/modules/analytics';
import { apiRoute } from '@/server/api';
import { requireRole } from '@/server/session';

export const runtime = 'nodejs';

export const GET = apiRoute(async (request) => {
  const actor = await requireRole('gov_admin', 'super_admin');
  const search = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = analyticsRangeSchema.safeParse(search);
  const filter = parsed.success
    ? { domain: parsed.data.domain, districtCode: parsed.data.districtCode }
    : {};

  const csv = await exportReportsCsv(actor, filter);
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="akhra-reports-${stamp}.csv"`,
      'cache-control': 'no-store',
    },
  });
});
