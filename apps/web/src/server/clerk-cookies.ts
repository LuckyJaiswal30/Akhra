const CLERK_COOKIE = /^__(?:session|client_uat|clerk|refresh)/;

/**
 * Someone can only be signed in if the browser holds a Clerk cookie. Without one, Clerk's
 * development instance would send them to its own server and back before the first page, which
 * costs a phone on a slow network about a second and a half, so public pages skip Clerk for them.
 */
export function maybeSignedIn(cookieNames: Iterable<string>): boolean {
  for (const name of cookieNames) if (CLERK_COOKIE.test(name)) return true;
  return false;
}
