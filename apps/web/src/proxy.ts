import { clerkMiddleware } from '@clerk/nextjs/server';
import createIntlMiddleware from 'next-intl/middleware';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { maybeSignedIn } from './server/clerk-cookies';
import { signInEnabled } from './server/sign-in-mode';

const handleLocale = createIntlMiddleware(routing);

function route(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api')) return;
  return handleLocale(request);
}

const withClerk = clerkMiddleware((_auth, request) => route(request));

// Pages where Clerk itself runs: they always go through it, cookies or not.
const AUTH_PAGE =
  /^(?:\/(?:en|hi))?\/(?:sign-in|sign-up|sso-callback|forgot-password|invite|complete-profile|secure-account)(?:\/|$)/;

function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname, searchParams } = request.nextUrl;
  const needsClerk =
    pathname.startsWith('/api') ||
    AUTH_PAGE.test(pathname) ||
    [...searchParams.keys()].some((key) => key.startsWith('__clerk')) ||
    maybeSignedIn(request.cookies.getAll().map((cookie) => cookie.name));
  return needsClerk ? withClerk(request, event) : route(request);
}

export default signInEnabled ? proxy : route;

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
