import { afterAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { getDb, problems, statusEvents, users, withoutRls } from '@akhra/db';
import { getReporterProfile, submitProblemAction } from '@/modules/citizen';
import { getActor } from '@/server/session';
import { actAs, cleanupTestData, createUser, formData } from '../helpers';

const createdProblems: string[] = [];

const report = (overrides: Record<string, string> = {}) => ({
  title: 'Streetlights on the market road have been dark for weeks',
  description:
    'All six streetlights along the market road stopped working last month, and the road is unsafe after dark.',
  districtCode: 'DHA',
  blockName: 'Jharia',
  submitterName: 'Sunita Devi',
  submitterPhone: '9835011111',
  consentToPublish: 'on',
  ...overrides,
});

async function submit(fields: Record<string, string>) {
  const result = await submitProblemAction(null, formData(fields));
  if (result?.ok) createdProblems.push(result.data!.id);
  return result;
}

async function profileRow(id: string) {
  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .select({
        name: users.name,
        phone: users.phone,
        districtCode: users.districtCode,
        locality: users.locality,
      })
      .from(users)
      .where(eq(users.id, id)),
  );
  return row;
}

afterAll(async () => {
  if (createdProblems.length > 0) {
    await withoutRls(getDb(), async (tx) => {
      await tx.delete(statusEvents).where(inArray(statusEvents.problemId, createdProblems));
      await tx.delete(problems).where(inArray(problems.id, createdProblems));
    });
  }
  await cleanupTestData();
});

describe('what the report form already knows about a signed-in citizen', () => {
  it('reads the person’s own stored contact details to fill the form', async () => {
    const citizen = await createUser({ role: 'citizen' });
    actAs(citizen);

    const profile = await getReporterProfile(await getActor());

    expect(profile).toMatchObject({ name: citizen.name, email: citizen.email, phone: null });
  });

  it('has nothing to fill for someone who is not signed in', async () => {
    actAs(null);
    expect(await getReporterProfile(await getActor())).toBeNull();
  });

  it('saves the phone, district and locality from a first report, so the next one is pre-filled', async () => {
    const citizen = await createUser({ role: 'citizen' });
    actAs(citizen);

    expect((await submit(report()))?.ok).toBe(true);

    expect(await profileRow(citizen.id)).toMatchObject({
      phone: '9835011111',
      districtCode: 'DHA',
      locality: 'Jharia',
      name: citizen.name,
    });
  });

  it('never overwrites details the person already has', async () => {
    const citizen = await createUser({ role: 'citizen' });
    actAs(citizen);
    await submit(report());

    await submit(report({ submitterPhone: '9835022222', districtCode: 'RAN', blockName: 'Kanke' }));

    expect(await profileRow(citizen.id)).toMatchObject({
      phone: '9835011111',
      districtCode: 'DHA',
      locality: 'Jharia',
    });
  });
});
