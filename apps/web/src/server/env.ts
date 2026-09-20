import { getServerEnv } from '@akhra/shared/env';

export const serverEnv = getServerEnv();

// eslint-disable-next-line no-restricted-syntax
const LOCAL_FALLBACK = 'http://localhost:3000';

export const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : LOCAL_FALLBACK);
