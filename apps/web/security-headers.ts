/**
 * Response headers every page and API route carries.
 *
 * These are the headers a government security audit looks for first (GIGW 3.0 asks for hardening
 * against exactly this list). They are deliberately the ones that cannot break a working page: no
 * script or style restrictions, so no nonce plumbing and no silently blocked asset. A full
 * `script-src` policy needs per-request nonces through Next's middleware and is the next step, not
 * a header bolted on here.
 */
export const SECURITY_HEADERS: { key: string; value: string }[] = [
  // Clickjacking. frame-ancestors is the modern rule; X-Frame-Options covers older browsers.
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Frame-Options', value: 'DENY' },
  // A response typed text/plain must never be executed as a script.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // A reference code in a URL should not travel to another site.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Akhra asks for none of these; saying so stops an embedded page from asking on its behalf.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
  // A window Akhra opened cannot reach back into it.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

/**
 * HSTS only makes sense once the site is actually served over HTTPS, and it is remembered by the
 * browser for a year — sending it from a local http:// dev server would lock that browser out of
 * localhost. `includeSubDomains` and `preload` are deliberate: a jharkhand.gov.in subdomain should
 * inherit it.
 */
export const HSTS = {
  key: 'Strict-Transport-Security',
  value: 'max-age=31536000; includeSubDomains; preload',
};
