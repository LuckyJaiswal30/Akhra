import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { auditEvents, getDb, withoutRls } from '@akhra/db';
import { signOutEverywhereAction } from '@/modules/auth/security-actions';
import { actAs, cleanupTestData, clerkFake, createUser, resetClerkFake } from '../helpers';

beforeEach(() => {
  resetClerkFake();
  actAs(null);
});
afterAll(cleanupTestData);

describe('"sign out of all devices"', () => {
  it('ends every Clerk session on the signed-in person’s account and records it', async () => {
    const person = await createUser({ role: 'citizen' });
    actAs(person);

    expect(await signOutEverywhereAction()).toEqual({ ok: true });

    expect(clerkFake().revokedSessionsFor).toEqual([person.clerkUserId]);
    const audit = await withoutRls(getDb(), (tx) =>
      tx
        .select({ metadata: auditEvents.metadata })
        .from(auditEvents)
        .where(
          and(
            eq(auditEvents.targetUserId, person.id),
            eq(auditEvents.action, 'user.signed_out_everywhere'),
          ),
        ),
    );
    expect(audit).toEqual([{ metadata: { revoked: 2 } }]);
  });

  it('never touches another account', async () => {
    const person = await createUser({ role: 'citizen' });
    const other = await createUser({ role: 'citizen' });
    actAs(person);

    await signOutEverywhereAction();

    expect(clerkFake().revokedSessionsFor).not.toContain(other.clerkUserId);
  });

  it('does nothing for someone who is not signed in', async () => {
    expect(await signOutEverywhereAction()).toEqual({ ok: false, reason: 'signed_out' });
    expect(clerkFake().revokedSessionsFor).toEqual([]);
  });
});
