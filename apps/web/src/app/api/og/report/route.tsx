import { NextResponse, type NextRequest } from 'next/server';
import { trackByRefCode } from '@/modules/citizen';
import { canDrawReport, renderShareImage, reportCard, siteImage } from '@/server/og';

export const runtime = 'nodejs';

// A report's share image shows only what its public tracker shows. A report that is not public,
// does not exist, or has a Hindi title the renderer cannot draw gets the site's own image instead.
export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') ?? 'en';
  const ref = (request.nextUrl.searchParams.get('ref') ?? '').trim().toUpperCase();
  const problem = /^AKH-\d{4}-\d{6}$/.test(ref) ? await trackByRefCode(ref) : null;
  if (!problem || !canDrawReport(problem)) {
    return NextResponse.redirect(new URL(siteImage(locale), request.url));
  }
  const image = await renderShareImage(reportCard(problem));
  image.headers.set('Cache-Control', 'public, max-age=600, s-maxage=600');
  return image;
}
