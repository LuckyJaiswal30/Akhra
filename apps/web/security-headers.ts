export const SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
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
