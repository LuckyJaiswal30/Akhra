import { clerkMiddleware } from '@clerk/nextjs/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const handleLocale = createIntlMiddleware(routing);

export default clerkMiddleware((_auth, request) => {
  if (request.nextUrl.pathname.startsWith('/api')) return;
  return handleLocale(request);
});

export const config = {
  matcher: [
    /**
     * Pages, minus the static assets in `public/`, which are matched by their extension.
     *
     * That extension list is why the second entry exists. An API route may end in an extension
     * too — `/api/files/problems/<id>.png` serves an uploaded photograph — and being skipped here
     * means `clerkMiddleware()` never runs, so the `auth()` inside the handler throws and every
     * attachment on the platform returns 500. API routes always run through the proxy.
     */
    '/((?!_next|_vercel|.*\\.(?:ico|png|jpe?g|gif|svg|webp|avif|txt|xml|json|webmanifest|map|html|css|js|pdf|csv|woff2?|ttf|otf|mp4|webm|mov)$).*)',
    '/api/(.*)',
  ],
};
