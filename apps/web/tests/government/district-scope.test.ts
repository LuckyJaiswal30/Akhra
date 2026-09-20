import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { getDb, problemAttachments, problemRoutings, problems, users, withoutRls } from '@akhra/db';
import { GET as readFile } from '@/app/api/files/[...key]/route';
import { POST as upload } from '@/app/api/uploads/route';
import { POST as issueInvite } from '@/app/api/v1/invites/route';
import { POST as redeemInvite } from '@/app/api/v1/invites/redeem/route';
import { getDashboard } from '@/modules/analytics';
import { decideProblemAction, listValidationQueue } from '@/modules/classification';
import { localUploadRoot } from '@/server/file-storage';
import { getActor } from '@/server/session';
import {
  actAs,
  callMultipart,
  callRoute,
  cleanupTestData,
  clerkFake,
  createOrg,
  createUser,
  formData,
  type TestUser,
} from '../helpers';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const ref = () => `AKH-9998-${String(Math.floor(Math.random() * 999_999)).padStart(6, '0')}`;

async function report(
  districtCode: string,
  submitterId: string | null = null,
  status: 'submitted' | 'validated' = 'submitted',
) {
  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .insert(problems)
      .values({
        refCode: ref(),
        title: `District scope test report in ${districtCode}`,
        description: 'A description long enough to be realistic for a district-scope test fixture.',
        districtCode,
        submitterId,
        submitterName: 'Scope Tester',
        submitterPhone: '9800000000',
        status,
      })
      .returning({ id: problems.id }),
  );
  return row!.id;
}

async function fileStatus(storageKey: string, as: TestUser | null): Promise<number> {
  actAs(as);
  const res = await readFile(new Request(`http://localhost:3000/api/files/${storageKey}`), {
    params: Promise.resolve({ key: storageKey.split('/') }),
  });
  return res.status;
}

let ranchiOfficer: TestUser;
let dhanbadOfficer: TestUser;
let stateOfficer: TestUser;
let citizen: TestUser;
const storedKeys: string[] = [];

beforeAll(async () => {
  ranchiOfficer = await createUser({ role: 'gov_admin', jurisdictionCode: 'RAN' });
  dhanbadOfficer = await createUser({ role: 'gov_admin', jurisdictionCode: 'DHA' });
  stateOfficer = await createUser({ role: 'gov_admin' });
  citizen = await createUser({ role: 'citizen' });
});

afterAll(async () => {
  await Promise.all(storedKeys.map((key) => rm(join(localUploadRoot(), key), { force: true })));
  await withoutRls(getDb(), async (tx) => {
    for (const key of storedKeys)
      await tx.delete(problemAttachments).where(eq(problemAttachments.storageKey, key));
  });
  await cleanupTestData();
});

describe('a district officer works only on their own district', () => {
  it('sees only their district in the validation queue, while a state officer sees every district', async () => {
    const inRanchi = await report('RAN');
    const inDhanbad = await report('DHA');

    actAs(ranchiOfficer);
    const ranchiQueue = (await listValidationQueue(await getActor())).map((item) => item.id);
    expect(ranchiQueue).toContain(inRanchi);
    expect(ranchiQueue).not.toContain(inDhanbad);

    actAs(stateOfficer);
    const stateQueue = (await listValidationQueue(await getActor())).map((item) => item.id);
    expect(stateQueue).toEqual(expect.arrayContaining([inRanchi, inDhanbad]));
  });

  it('cannot validate a report from another district', async () => {
    const inDhanbad = await report('DHA');
    actAs(ranchiOfficer);

    const result = await decideProblemAction(
      null,
      formData({ problemId: inDhanbad, decision: 'validate' }),
    );

    expect(result).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    const [row] = await withoutRls(getDb(), (tx) =>
      tx.select({ status: problems.status }).from(problems).where(eq(problems.id, inDhanbad)),
    );
    expect(row?.status).toBe('submitted');
  });

  it('validates a report from their own district for university routing', async () => {
    const inRanchi = await report('RAN');
    actAs(ranchiOfficer);

    const result = await decideProblemAction(
      null,
      formData({ problemId: inRanchi, decision: 'validate' }),
    );

    expect(result?.ok).toBe(true);
    const [row] = await withoutRls(getDb(), (tx) =>
      tx.select({ status: problems.status }).from(problems).where(eq(problems.id, inRanchi)),
    );
    expect(row?.status).toBe('validated');
  });

  it('resolves a routine report directly, but only with a note saying what was done', async () => {
    const inRanchi = await report('RAN');
    actAs(ranchiOfficer);

    const noNote = await decideProblemAction(
      null,
      formData({ problemId: inRanchi, decision: 'resolve' }),
    );
    expect(noNote).toMatchObject({ ok: false, error: { code: 'VALIDATION_FAILED' } });

    const resolved = await decideProblemAction(
      null,
      formData({
        problemId: inRanchi,
        decision: 'resolve',
        note: 'The ward office replaced the broken handpump washer on 12 September.',
      }),
    );
    expect(resolved?.ok).toBe(true);
    const [row] = await withoutRls(getDb(), (tx) =>
      tx.select({ status: problems.status }).from(problems).where(eq(problems.id, inRanchi)),
    );
    expect(row?.status).toBe('closed');
  });

  it('counts only their own district on the dashboard, whatever filter is asked for', async () => {
    await report('DHA');
    actAs(ranchiOfficer);

    const dashboard = await getDashboard(await getActor(), { districtCode: 'DHA' });

    expect(dashboard.districts.filter((d) => d.total > 0).every((d) => d.code === 'RAN')).toBe(
      true,
    );
  });
});

describe('district officers are invited, never self-made', () => {
  it('a super admin can scope a government invite to one district, and accepting applies it', async () => {
    const superAdmin = await createUser({ role: 'super_admin' });
    const invitee = await createUser({ role: 'citizen' });
    actAs(superAdmin);

    const issued = await callRoute(issueInvite, {
      body: { email: invitee.email, role: 'gov_admin', scope: 'district', jurisdictionCode: 'GUM' },
    });
    expect(issued.status).toBe(201);

    const token = new URL(clerkFake().invitations.at(-1)!.redirectUrl).pathname.split('/').pop()!;
    actAs(invitee);
    const accepted = await callRoute(redeemInvite, { body: { token } });
    expect(accepted.status).toBe(200);

    const [row] = await withoutRls(getDb(), (tx) =>
      tx
        .select({ role: users.role, jurisdictionCode: users.jurisdictionCode })
        .from(users)
        .where(eq(users.id, invitee.id)),
    );
    expect(row).toEqual({ role: 'gov_admin', jurisdictionCode: 'GUM' });
  });

  it('refuses a district on any role other than a government officer', async () => {
    const superAdmin = await createUser({ role: 'super_admin' });
    const org = await createOrg('university');
    actAs(superAdmin);

    const res = await callRoute(issueInvite, {
      body: {
        email: `x-${Date.now()}@test.invalid`,
        role: 'university_admin',
        organizationId: org,
        jurisdictionCode: 'RAN',
      },
    });

    expect(res.status).toBe(400);
    expect(res.body?.error.details.fields.jurisdictionCode).toBeTruthy();
  });
});

describe('who can open a report’s photos', () => {
  let storageKey = '';
  let routedMember: TestUser;
  let otherUniversityMember: TestUser;

  beforeAll(async () => {
    actAs(citizen);
    const data = new FormData();
    data.append('file', new File([PNG], 'evidence.png', { type: 'image/png' }));
    const uploaded = await callMultipart(upload, data);
    const attachmentId = uploaded.body!.data.id as string;

    const problemId = await report('RAN', citizen.id, 'validated');
    const routedOrg = await createOrg('university');
    const otherOrg = await createOrg('university');
    routedMember = await createUser({ role: 'faculty', organizationId: routedOrg });
    otherUniversityMember = await createUser({ role: 'faculty', organizationId: otherOrg });

    await withoutRls(getDb(), async (tx) => {
      const [file] = await tx
        .update(problemAttachments)
        .set({ problemId })
        .where(eq(problemAttachments.id, attachmentId))
        .returning({ storageKey: problemAttachments.storageKey });
      storageKey = file!.storageKey;
      await tx
        .insert(problemRoutings)
        .values({ problemId, organizationId: routedOrg, matchScore: 0.8, matchRationale: 'test' });
    });
    storedKeys.push(storageKey);
  });

  it('lets the reporter, the district’s officer, a state officer and the routed university see it', async () => {
    expect(await fileStatus(storageKey, citizen)).toBe(200);
    expect(await fileStatus(storageKey, ranchiOfficer)).toBe(200);
    expect(await fileStatus(storageKey, stateOfficer)).toBe(200);
    expect(await fileStatus(storageKey, routedMember)).toBe(200);
  });

  it('hides it from another district’s officer, another university and anyone signed out', async () => {
    expect(await fileStatus(storageKey, dhanbadOfficer)).toBe(404);
    expect(await fileStatus(storageKey, otherUniversityMember)).toBe(404);
    expect(await fileStatus(storageKey, null)).toBe(404);
  });
});
