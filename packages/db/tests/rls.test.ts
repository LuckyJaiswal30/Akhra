import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import {
  closeDb,
  getDb,
  withUserContext,
  withoutRls,
  type Database,
  ANONYMOUS,
} from '../src/client';
import { districts, notifications, organizations, problems, users } from '../src/schema/index';

const DATABASE_URL = process.env.DATABASE_URL;

const describeWithDb = DATABASE_URL ? describe : describe.skip;

const ids = {
  districtCode: 'RLS',
  orgA: '00000000-0000-4000-8000-0000000000a1',
  orgB: '00000000-0000-4000-8000-0000000000b1',
  userA: '00000000-0000-4000-8000-0000000000a2',
  userB: '00000000-0000-4000-8000-0000000000b2',
  admin: '00000000-0000-4000-8000-0000000000c2',
  publicProblem: '00000000-0000-4000-8000-0000000000d1',
  privateProblem: '00000000-0000-4000-8000-0000000000d2',
  notificationA: '00000000-0000-4000-8000-0000000000e1',
};

describeWithDb('row-level security', () => {
  let db: Database;

  beforeAll(async () => {
    db = getDb(DATABASE_URL);
    await cleanup(db);

    await withoutRls(db, async (tx) => {
      await tx.insert(districts).values({
        code: ids.districtCode,
        nameEn: 'RLS Test District',
        nameHi: 'परीक्षण',
        division: 'Test',
        headquarters: 'Test',
        lat: 23.5,
        lng: 85.3,
      });

      await tx.insert(organizations).values([
        { id: ids.orgA, type: 'university', name: 'University A' },
        { id: ids.orgB, type: 'university', name: 'University B' },
      ]);

      await tx.insert(users).values([
        {
          id: ids.userA,
          email: 'rls-a@test.invalid',
          role: 'university_admin',
          organizationId: ids.orgA,
        },
        {
          id: ids.userB,
          email: 'rls-b@test.invalid',
          role: 'university_admin',
          organizationId: ids.orgB,
        },
        { id: ids.admin, email: 'rls-admin@test.invalid', role: 'gov_admin' },
      ]);

      const base = {
        districtCode: ids.districtCode,
        submitterName: 'Test Reporter',
        submitterPhone: '9800000000',
        description: 'A description long enough to be realistic for a citizen report.',
      };

      await tx.insert(problems).values([
        {
          ...base,
          id: ids.publicProblem,
          refCode: 'AKH-9999-000001',
          title: 'Public report',
          isPublic: true,
        },
        {
          ...base,
          id: ids.privateProblem,
          refCode: 'AKH-9999-000002',
          title: 'Private report',
          isPublic: false,
          submitterId: ids.userA,
        },
      ]);

      await tx.insert(notifications).values({
        id: ids.notificationA,
        userId: ids.userA,
        type: 'test',
        title: 'Only for user A',
      });
    });
  });

  afterAll(async () => {
    await cleanup(db);
    await closeDb();
  });

  async function visibleProblemIds(ctx: {
    userId: string | null;
    role: string;
  }): Promise<string[]> {
    return withUserContext(db, ctx, async (tx) => {
      const rows = await tx
        .select({ id: problems.id })
        .from(problems)
        .where(sql`${problems.refCode} like 'AKH-9999-%'`);
      return rows.map((r) => r.id);
    });
  }

  it('is actually enforced, not merely enabled', async () => {
    const [row] = (
      await db.execute<{ forced: boolean }>(
        sql`select relforcerowsecurity as forced from pg_class where relname = 'problems'`,
      )
    ).rows;
    expect(row?.forced).toBe(true);
  });

  it('shows an anonymous visitor only public reports', async () => {
    const visible = await visibleProblemIds(ANONYMOUS);
    expect(visible).toContain(ids.publicProblem);
    expect(visible).not.toContain(ids.privateProblem);
  });

  it("hides another institution's private report", async () => {
    const visible = await visibleProblemIds({ userId: ids.userB, role: 'university_admin' });
    expect(visible).not.toContain(ids.privateProblem);
  });

  it('shows a submitter their own private report', async () => {
    const visible = await visibleProblemIds({ userId: ids.userA, role: 'university_admin' });
    expect(visible).toContain(ids.privateProblem);
  });

  it('shows a government administrator everything', async () => {
    const visible = await visibleProblemIds({ userId: ids.admin, role: 'gov_admin' });
    expect(visible).toEqual(expect.arrayContaining([ids.publicProblem, ids.privateProblem]));
  });

  it('keeps notifications private to their recipient', async () => {
    const forB = await withUserContext(db, { userId: ids.userB, role: 'university_admin' }, (tx) =>
      tx.select().from(notifications).where(eq(notifications.id, ids.notificationA)),
    );
    expect(forB).toHaveLength(0);

    const forA = await withUserContext(db, { userId: ids.userA, role: 'university_admin' }, (tx) =>
      tx.select().from(notifications).where(eq(notifications.id, ids.notificationA)),
    );
    expect(forA).toHaveLength(1);
  });

  it('does not leak a notification to a government administrator either', async () => {
    const forAdmin = await withUserContext(db, { userId: ids.admin, role: 'gov_admin' }, (tx) =>
      tx.select().from(notifications).where(eq(notifications.id, ids.notificationA)),
    );
    expect(forAdmin).toHaveLength(0);
  });
});

async function cleanup(db: Database): Promise<void> {
  await withoutRls(db, async (tx) => {
    await tx.execute(
      sql`delete from notifications where user_id in (${ids.userA}, ${ids.userB}, ${ids.admin})`,
    );
    await tx.execute(sql`delete from problems where ref_code like 'AKH-9999-%'`);
    await tx.execute(sql`delete from users where email like 'rls-%@test.invalid'`);
    await tx.execute(sql`delete from organizations where id in (${ids.orgA}, ${ids.orgB})`);
    await tx.execute(sql`delete from districts where code = ${ids.districtCode}`);
  });
}
