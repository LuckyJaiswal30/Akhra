import { vi } from 'vitest';
import type * as ClerkModule from '@/server/clerk';
import { testDatabaseUrl } from './database';

process.env.DATABASE_URL = testDatabaseUrl();
process.env.INVITE_SIGNING_SECRET ??= 'test-invite-signing-secret-at-least-32-chars';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';
process.env.MAIL_DRIVER = 'console';
process.env.LOG_LEVEL = 'silent';
process.env.AI_PROVIDER_CHAIN = 'tfidf';

interface ClerkFakeState {
  identities: Map<string, ClerkModule.ClerkIdentity>;
  identityLookups: number;
  invitations: { email: string; redirectUrl: string; expiresInDays: number }[];
  revoked: string[];
  invitationOutcome: 'clerk' | 'existing_account' | 'failed';
  revokedSessionsFor: string[];
}

const fake = () => (globalThis as { __clerkFake?: ClerkFakeState }).__clerkFake!;

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({
    userId: (globalThis as { __clerkUserId?: string | null }).__clerkUserId ?? null,
  }),
  // Enough for a suite that reads the proxy's matcher; nothing here runs the proxy itself.
  clerkMiddleware: (handler: unknown) => handler,
  clerkClient: async () => {
    throw new Error('The Clerk backend is not reachable from tests.');
  },
}));

// The suites sign people in through the fake above, so they run as if Clerk keys were set.
vi.mock('@/server/sign-in-mode', () => ({ signInEnabled: true }));

vi.mock('@/server/clerk', async (importOriginal) => {
  const real = await importOriginal<typeof ClerkModule>();
  return {
    ...real,
    fetchClerkIdentity: async (clerkUserId: string) => {
      fake().identityLookups++;
      return fake().identities.get(clerkUserId) ?? null;
    },
    sendClerkInvitation: async (
      input: ClerkFakeState['invitations'][number],
    ): Promise<ClerkModule.InvitationDelivery> => {
      fake().invitations.push(input);
      const outcome = fake().invitationOutcome;
      return outcome === 'clerk'
        ? { channel: 'clerk', invitationId: `inv_test_${fake().invitations.length}` }
        : { channel: 'none', reason: outcome };
    },
    revokeClerkInvitation: async (invitationId: string) => {
      fake().revoked.push(invitationId);
    },
    revokeAllClerkSessions: async (clerkUserId: string) => {
      fake().revokedSessionsFor.push(clerkUserId);
      return 2;
    },
  };
});

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));

vi.mock('next/cache', () => ({
  revalidatePath: () => undefined,
  revalidateTag: () => undefined,
}));
