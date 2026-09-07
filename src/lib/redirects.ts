export const AFTER_AUTH = "/home";
export const SSO_CALLBACK = "/sso-callback";
export const AFTER_SIGN_OUT = "/";

export function safeReturnPath(raw: string | null | undefined): string {
  if (!raw) return AFTER_AUTH;

  let candidate = raw;

  if (/^[a-z][a-z0-9+.-]*:/i.test(candidate)) {
    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      return AFTER_AUTH;
    }
    candidate = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  }

  if (!candidate.startsWith("/")) return AFTER_AUTH;
  if (candidate.startsWith("//") || candidate.startsWith("/\\")) {
    return AFTER_AUTH;
  }
  if (candidate.startsWith(SSO_CALLBACK)) return AFTER_AUTH;
  if (candidate.startsWith("/sign-in") || candidate.startsWith("/sign-up")) {
    return AFTER_AUTH;
  }

  return candidate;
}

export function ssoCallbackFor(returnPath: string): string {
  if (returnPath === AFTER_AUTH) return SSO_CALLBACK;
  return `${SSO_CALLBACK}?redirect_url=${encodeURIComponent(returnPath)}`;
}
