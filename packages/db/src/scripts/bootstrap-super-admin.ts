import { config } from 'dotenv';
import { eq, sql } from 'drizzle-orm';
import { auditEvents, closeDb, getDb, users, withoutRls } from '../client';

config({ path: ['../../.env.local', '../../.env'], quiet: true });

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

async function main(): Promise<void> {
  const email = argument('email')?.trim().toLowerCase();
  const name = argument('name')?.trim();
  const force = process.argv.includes('--force');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fail(
      'Usage: pnpm admin:bootstrap --email officer@jharkhand.gov.in [--name "Full Name"] [--force]',
    );
  }

  const db = getDb();
  const [existing] = (
    await db.execute<{ count: number }>(
      sql`select count(*)::int as count from users where role = 'super_admin'`,
    )
  ).rows;
  if ((existing?.count ?? 0) > 0 && !force) {
    fail(
      'A super administrator already exists. Promote further ones from the admin console, or pass --force to grant this one from the command line anyway.',
    );
  }

  const [account] = await db
    .select({ id: users.id, role: users.role, status: users.status })
    .from(users)
    .where(eq(sql`lower(${users.email})`, email))
    .limit(1);

  if (account) {
    if (account.status !== 'active')
      fail('That account is suspended. Reactivate it before making it the super administrator.');
    await withoutRls(db, async (tx) => {
      await tx
        .update(users)
        .set({ role: 'super_admin', organizationId: null, updatedAt: new Date() })
        .where(eq(users.id, account.id));
      await tx.insert(auditEvents).values({
        action: 'user.bootstrapped',
        targetEmail: email,
        targetUserId: account.id,
        role: 'super_admin',
        metadata: { via: 'cli', previousRole: account.role, forced: force },
      });
    });
    console.log(
      `\n✓ ${email} is now the super administrator (was ${account.role}). Sign in and open /admin.\n`,
    );
    await closeDb();
    return;
  }

  if (!name || name.length < 2)
    fail('No account uses that email yet, so provide the administrator’s full name with --name.');

  const created = await withoutRls(db, async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ email, name, role: 'super_admin', status: 'active' })
      .returning({ id: users.id });
    if (!user) throw new Error('The account could not be created.');
    await tx.insert(auditEvents).values({
      action: 'user.bootstrapped',
      targetEmail: email,
      targetUserId: user.id,
      role: 'super_admin',
      metadata: { via: 'cli' },
    });
    return user;
  });

  console.log(
    `\n✓ Super administrator reserved for ${email} (${created.id}).\n` +
      '  Create an account with that exact address on the sign-in page (Create Account tab, or Continue with Google).\n' +
      '  Clerk verifies the address, Akhra links it to this role, and /admin opens.\n',
  );
  await closeDb();
}

main().catch(async (error: unknown) => {
  console.error('\n✖ Bootstrap failed:', error instanceof Error ? error.message : error);
  await closeDb();
  process.exit(1);
});
