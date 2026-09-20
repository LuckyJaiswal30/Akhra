import { config } from 'dotenv';
import { createClerkClient } from '@clerk/backend';
import { eq } from 'drizzle-orm';
import { closeDb, getDb, users, withoutRls } from '../client';
import { DEMO_PASSWORD, SEED_USERS } from '../seed/users';

config({ path: ['../../.env.local', '../../.env'], quiet: true });

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') fail('Demo users are for development only.');
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey)
    fail(
      'Set CLERK_SECRET_KEY in .env.local (Clerk dashboard → API keys, or run the dev server once for keyless keys).',
    );
  if (!secretKey.startsWith('sk_test_'))
    fail('Refusing to create demo users in a production Clerk instance.');

  const clerk = createClerkClient({ secretKey });
  const db = getDb();
  let created = 0;

  for (const user of SEED_USERS) {
    const [first = user.name, ...rest] = user.name.split(' ');
    const existing = await clerk.users.getUserList({ emailAddress: [user.email] });
    let clerkUserId = existing.data[0]?.id;

    if (!clerkUserId) {
      const account = await clerk.users.createUser({
        emailAddress: [user.email],
        password: DEMO_PASSWORD,
        skipPasswordChecks: true,
        firstName: first,
        lastName: rest.join(' ') || undefined,
        externalId: user.id,
        unsafeMetadata: { fullName: user.name },
      });
      clerkUserId = account.id;
      created++;
    }

    await withoutRls(db, (tx) =>
      tx.update(users).set({ clerkUserId }).where(eq(users.id, user.id)),
    );
  }

  console.log(
    `\n✓ ${SEED_USERS.length} demo users linked to Clerk (${created} created). Password: ${DEMO_PASSWORD}; code if asked: 424242.\n`,
  );
  await closeDb();
}

main().catch(async (error: unknown) => {
  console.error('\n✖ Could not create demo users:', error instanceof Error ? error.message : error);
  await closeDb();
  process.exit(1);
});
