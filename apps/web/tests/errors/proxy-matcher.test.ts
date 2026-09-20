import { describe, expect, it } from 'vitest';
import { config } from '@/proxy';

/**
 * The proxy is where `clerkMiddleware()` runs. A route it skips gets no Clerk context, so the
 * `auth()` inside that route's handler throws and the request 500s.
 *
 * This caught a real one: the first pattern excludes anything ending in a static-asset extension,
 * and `/api/files/problems/<id>.png` ends in `.png`. Every uploaded photograph, video and PDF on
 * the platform returned 500 until `/api/(.*)` was added.
 */
const matchers = (config.matcher as string[]).map((pattern) => new RegExp(`^${pattern}$`));
const matched = (path: string) => matchers.some((pattern) => pattern.test(path));

describe('the proxy matcher', () => {
  it('runs for every API route, whatever the path looks like', () => {
    for (const path of [
      '/api/files/problems/8ab71c7d-d907-48d7-beac-c2d1de302bb3.png',
      '/api/files/problems/8ab71c7d-d907-48d7-beac-c2d1de302bb3.jpg',
      '/api/files/projects/8ab71c7d-d907-48d7-beac-c2d1de302bb3.pdf',
      '/api/files/problems/8ab71c7d-d907-48d7-beac-c2d1de302bb3.mp4',
      '/api/uploads',
      '/api/v1/invites',
      '/api/webhooks/clerk',
    ]) {
      expect(matched(path), path).toBe(true);
    }
  });

  it('runs for pages, in both locales', () => {
    for (const path of ['/', '/hi', '/track', '/hi/track', '/dashboard', '/projects/abc']) {
      expect(matched(path), path).toBe(true);
    }
  });

  it('leaves the build output and the files in public/ alone', () => {
    for (const path of ['/_next/static/chunks/main.js', '/icons/icon-192.png', '/favicon.ico']) {
      expect(matched(path), path).toBe(false);
    }
  });
});
