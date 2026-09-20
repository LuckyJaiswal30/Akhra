import { config as loadEnv } from 'dotenv';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { HSTS, SECURITY_HEADERS } from './security-headers';

loadEnv({ path: ['../../.env.local', '../../.env'], quiet: true });

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@akhra/shared', '@akhra/db', '@akhra/classifier'],
  serverExternalPackages: ['pg', 'pino'],
  typedRoutes: true,
  images: { remotePatterns: [{ protocol: 'https', hostname: 'img.clerk.com' }] },
  async headers() {
    const headers = [...SECURITY_HEADERS];
    if (process.env.NODE_ENV === 'production') headers.push(HSTS);
    return [{ source: '/:path*', headers }];
  },
};

export default withNextIntl(nextConfig);
