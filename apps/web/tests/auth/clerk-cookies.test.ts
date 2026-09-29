import { describe, expect, it } from 'vitest';
import { maybeSignedIn } from '@/server/clerk-cookies';

describe('who might be signed in', () => {
  it('treats a browser with no Clerk cookie as signed out', () => {
    expect(maybeSignedIn([])).toBe(false);
    expect(maybeSignedIn(['NEXT_LOCALE', '_cfuvid'])).toBe(false);
  });

  it('asks Clerk whenever any Clerk cookie is present', () => {
    expect(maybeSignedIn(['__session'])).toBe(true);
    expect(maybeSignedIn(['__client_uat_6IcnwJD4'])).toBe(true);
    expect(maybeSignedIn(['__clerk_db_jwt'])).toBe(true);
  });
});
