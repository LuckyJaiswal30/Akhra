const DEVELOPMENT_URL = 'postgresql://akhra:akhra@localhost:5432/akhra';

/**
 * Tests run against their own database, never the one the app is using.
 *
 * Several jobs under test act on every row they can see: escalation, reminders, auto-closing.
 * Pointed at the development database they escalated real demo reports and filled real inboxes.
 * The test database takes the development database's name with `_test` appended, unless
 * TEST_DATABASE_URL names one outright.
 */
export function testDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const url = new URL(process.env.DATABASE_URL ?? DEVELOPMENT_URL);
  const name = url.pathname.replace(/^\//, '') || 'akhra';
  url.pathname = `/${name.endsWith('_test') ? name : `${name}_test`}`;
  return url.toString();
}
