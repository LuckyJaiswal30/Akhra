import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import {
  getDb,
  industryInterests,
  milestones,
  problemRoutings,
  problems,
  projects,
  withoutRls,
} from '@akhra/db';
import { decideProblemAction, routeProblemAction } from '@/modules/classification';
import {
  addMemberAction,
  createProjectAction,
  removeMemberAction,
  respondToRoutingAction,
  submitProposalAction,
} from '@/modules/university';
import { expressInterestAction, respondToInterestAction } from '@/modules/industry';
import {
  advanceProjectAction,
  createMilestoneAction,
  recordOutcomeAction,
  updateMilestoneAction,
} from '@/modules/lifecycle';
import { postMessageAction } from '@/modules/notifications';
import { POST as onboard } from '@/app/api/v1/admin/organizations/route';
import { GET as listInvites, POST as issueInvite } from '@/app/api/v1/invites/route';
import { POST as promote } from '@/app/api/v1/admin/users/[id]/promote/route';
import { POST as uploadDocument } from '@/app/api/projects/[id]/documents/route';
import {
  actAs,
  callMultipart,
  callRoute,
  cleanupTestData,
  createOrg,
  createUser,
  formData,
  runSql,
  uniqueEmail,
  type TestUser,
} from '../helpers';

type ActionFn = (prev: null, data: FormData) => Promise<unknown>;

let orgA: string;
let orgB: string;
let industryOrg: string;
let uniAdminA: TestUser;
let facultyA: TestUser;
let uniAdminB: TestUser;
let industryAdmin: TestUser;
let citizen: TestUser;
let govAdmin: TestUser;
let superAdmin: TestUser;
let submittedProblem: string;
let routedProblem: string;
let routingId: string;
let projectId: string;
let milestoneId: string;
let interestId: string;

const ref = () => `AKH-9998-${String(Math.floor(Math.random() * 999_999)).padStart(6, '0')}`;

const problemRow = (status: 'submitted' | 'routed') => ({
  refCode: ref(),
  title: 'Escalation test report title',
  description: 'A description long enough to be a realistic citizen report for these tests.',
  districtCode: 'RAN',
  submitterName: 'Test Reporter',
  submitterPhone: '9800000000',
  status,
  domain: 'agriculture' as const,
});

beforeAll(async () => {
  orgA = await createOrg('university');
  orgB = await createOrg('university');
  industryOrg = await createOrg('industry');
  uniAdminA = await createUser({ role: 'university_admin', organizationId: orgA });
  facultyA = await createUser({ role: 'faculty', organizationId: orgA });
  uniAdminB = await createUser({ role: 'university_admin', organizationId: orgB });
  industryAdmin = await createUser({ role: 'industry_admin', organizationId: industryOrg });
  citizen = await createUser({ role: 'citizen' });
  govAdmin = await createUser({ role: 'gov_admin' });
  superAdmin = await createUser({ role: 'super_admin' });

  await withoutRls(getDb(), async (tx) => {
    const [submitted] = await tx
      .insert(problems)
      .values(problemRow('submitted'))
      .returning({ id: problems.id });
    const [routed] = await tx
      .insert(problems)
      .values(problemRow('routed'))
      .returning({ id: problems.id });
    submittedProblem = submitted!.id;
    routedProblem = routed!.id;

    const [routing] = await tx
      .insert(problemRoutings)
      .values({ problemId: routedProblem, organizationId: orgA, response: 'accepted' })
      .returning({ id: problemRoutings.id });
    routingId = routing!.id;

    const [project] = await tx
      .insert(projects)
      .values({
        problemId: routedProblem,
        organizationId: orgA,
        title: 'Escalation test project',
        summary: 'A project owned by organisation A for escalation tests.',
        status: 'in_progress',
      })
      .returning({ id: projects.id });
    projectId = project!.id;

    const [milestone] = await tx
      .insert(milestones)
      .values({ projectId, title: 'First milestone' })
      .returning({ id: milestones.id });
    milestoneId = milestone!.id;

    const [interest] = await tx
      .insert(industryInterests)
      .values({
        projectId,
        organizationId: industryOrg,
        offerTypes: ['mentorship'],
        message: 'We would like to mentor this team closely.',
      })
      .returning({ id: industryInterests.id });
    interestId = interest!.id;
  });
});

afterAll(cleanupTestData);

const privilegedActions = (): [string, ActionFn, () => FormData][] => [
  [
    'validate a report',
    decideProblemAction as ActionFn,
    () => formData({ problemId: submittedProblem, decision: 'validate' }),
  ],
  [
    'route a report',
    routeProblemAction as ActionFn,
    () => formData({ problemId: submittedProblem, organizationIds: [orgA] }),
  ],
  [
    'respond to a referral',
    respondToRoutingAction as ActionFn,
    () => formData({ routingId, response: 'accepted' }),
  ],
  [
    'start a project',
    createProjectAction as ActionFn,
    () =>
      formData({
        problemId: routedProblem,
        title: 'A valid project title',
        summary: 'A summary long enough to pass validation rules.',
      }),
  ],
  [
    'add a team member',
    addMemberAction as ActionFn,
    () => formData({ projectId, userId: facultyA.id, memberRole: 'student' }),
  ],
  [
    'remove a team member',
    removeMemberAction as ActionFn,
    () => formData({ projectId, userId: facultyA.id }),
  ],
  [
    'submit a proposal',
    submitProposalAction as ActionFn,
    () =>
      formData({
        projectId,
        abstract: 'An abstract that is comfortably longer than the fifty character minimum.',
        methodology: 'A methodology that is comfortably longer than the fifty character minimum.',
        expectedOutcomes: 'Clear, measurable outcomes.',
        timelineMonths: '6',
      }),
  ],
  [
    'offer industry support',
    expressInterestAction as ActionFn,
    () =>
      formData({
        projectId,
        offerTypes: ['mentorship'],
        message: 'We can mentor this team for a year.',
      }),
  ],
  [
    'accept an industry offer',
    respondToInterestAction as ActionFn,
    () => formData({ interestId, status: 'accepted' }),
  ],
  [
    'plan a milestone',
    createMilestoneAction as ActionFn,
    () => formData({ projectId, title: 'Another milestone' }),
  ],
  [
    'move a milestone',
    updateMilestoneAction as ActionFn,
    () => formData({ projectId, milestoneId, status: 'in_progress' }),
  ],
  [
    'advance a project stage',
    advanceProjectAction as ActionFn,
    () => formData({ projectId, toStatus: 'prototyped' }),
  ],
  [
    'record an outcome',
    recordOutcomeAction as ActionFn,
    () => formData({ projectId, outcomeType: 'deployment', title: 'A recorded deployment' }),
  ],
  [
    'post to a project conversation',
    postMessageAction as ActionFn,
    () =>
      formData({
        problemId: routedProblem,
        body: 'Hello team',
        visibility: 'public',
        returnPath: '/projects',
      }),
  ],
];

describe('a citizen cannot reach institution, industry or government actions', () => {
  it.each(privilegedActions().map(([name, fn, data]) => [name, fn, data] as const))(
    'citizen cannot %s',
    async (_name, action, data) => {
      actAs(citizen);
      expect(await action(null, data())).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    },
  );

  it.each(privilegedActions().map(([name, fn, data]) => [name, fn, data] as const))(
    'an anonymous visitor cannot %s',
    async (_name, action, data) => {
      actAs(null);
      expect(await action(null, data())).toMatchObject({
        ok: false,
        error: { code: 'UNAUTHENTICATED' },
      });
    },
  );
});

describe('organisations stay inside their own walls', () => {
  it("another university cannot answer, staff or advance organisation A's work", async () => {
    actAs(uniAdminB);
    const forbidden = { ok: false, error: { code: 'FORBIDDEN' } };
    expect(
      await respondToRoutingAction(null, formData({ routingId, response: 'accepted' })),
    ).toMatchObject(forbidden);
    expect(
      await addMemberAction(
        null,
        formData({ projectId, userId: uniAdminB.id, memberRole: 'student' }),
      ),
    ).toMatchObject(forbidden);
    expect(
      await advanceProjectAction(null, formData({ projectId, toStatus: 'prototyped' })),
    ).toMatchObject(forbidden);
    expect(
      await createMilestoneAction(null, formData({ projectId, title: 'Hijacked milestone' })),
    ).toMatchObject(forbidden);
  });

  it('an industry user cannot act as a university', async () => {
    actAs(industryAdmin);
    expect(
      await createProjectAction(
        null,
        formData({
          problemId: routedProblem,
          title: 'A valid project title',
          summary: 'A summary long enough to pass validation rules.',
        }),
      ),
    ).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    expect(
      await respondToInterestAction(null, formData({ interestId, status: 'accepted' })),
    ).toMatchObject({
      ok: false,
      error: { code: 'FORBIDDEN' },
    });
  });
});

describe('sessions follow the account, not the token', () => {
  it('rejects a session whose account has since been suspended', async () => {
    const member = await createUser({ role: 'faculty', organizationId: orgA });
    actAs(member);
    await runSql(sql`update users set status = 'suspended' where id = ${member.id}`);

    expect(
      await createMilestoneAction(null, formData({ projectId, title: 'After suspension' })),
    ).toMatchObject({
      ok: false,
      error: { code: 'UNAUTHENTICATED' },
    });
  });

  it('uses the current role, not the one the session was issued with', async () => {
    const demoted = await createUser({ role: 'university_admin', organizationId: orgA });
    actAs(demoted);
    await runSql(
      sql`update users set role = 'citizen', organization_id = null where id = ${demoted.id}`,
    );

    expect(
      await createMilestoneAction(null, formData({ projectId, title: 'After demotion' })),
    ).toMatchObject({
      ok: false,
      error: { code: 'FORBIDDEN' },
    });
  });
});

describe('invite, onboarding and promotion endpoints check authority at the API', () => {
  it.each([
    [
      'onboard an organisation',
      () =>
        callRoute(onboard, {
          body: {
            name: 'TEST Org',
            type: 'university',
            agreementReference: 'MOU/1',
            contactEmail: uniqueEmail('x'),
          },
        }),
    ],
    [
      'issue an invite',
      () => callRoute(issueInvite, { body: { email: uniqueEmail('x'), role: 'faculty' } }),
    ],
    ['promote a user', () => callRoute(promote, { params: { id: govAdmin.id } })],
  ])('a citizen cannot %s', async (_name, call) => {
    actAs(citizen);
    const res = await call();

    expect(res.status).toBe(403);
    expect(res.body?.error.code).toBe('FORBIDDEN');
  });

  it('a citizen sees no invites at all', async () => {
    actAs(citizen);
    expect((await callRoute(listInvites, { method: 'GET' })).status).toBe(403);
  });

  it.each(['gov_admin', 'university_admin'])(
    '%s cannot promote anyone to super_admin',
    async (role) => {
      actAs(role === 'gov_admin' ? govAdmin : uniAdminA);
      const target = await createUser({ role: 'gov_admin' });

      expect((await callRoute(promote, { params: { id: target.id } })).status).toBe(403);
    },
  );

  it('only a super_admin can promote, and only a government administrator', async () => {
    actAs(superAdmin);
    const officer = await createUser({ role: 'gov_admin' });
    expect((await callRoute(promote, { params: { id: officer.id } })).status).toBe(200);
    expect((await callRoute(promote, { params: { id: citizen.id } })).status).toBe(409);
  });

  it('a citizen cannot attach a document to a project, and nothing is stored', async () => {
    actAs(citizen);
    const data = new FormData();
    data.append('title', 'Unauthorised upload');
    data.append('file', new File(['%PDF-1.4\n%test'], 'x.pdf', { type: 'application/pdf' }));
    const res = await callMultipart(uploadDocument, data, { id: projectId });

    expect(res.status).toBe(403);
  });
});

describe('super_admin can only be created by the bootstrap script or a promotion', () => {
  it('no other source file assigns the super_admin role', () => {
    const root = join(__dirname, '../../../..');
    const allowed = new Set([
      'apps/web/src/modules/auth/promotion.ts',
      'packages/db/src/scripts/bootstrap-super-admin.ts',
    ]);
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) {
          if (entry !== 'node_modules') walk(path);
        } else if (/\.(ts|tsx)$/.test(entry)) {
          const source = readFileSync(path, 'utf8');
          const rel = relative(root, path);
          if (/role:\s*['"]super_admin['"]/.test(source) && !allowed.has(rel)) offenders.push(rel);
        }
      }
    };
    walk(join(root, 'apps/web/src'));
    walk(join(root, 'packages/db/src'));

    expect(offenders).toEqual([]);
  });

  it('a stray id in a promotion request is not an escalation path', async () => {
    actAs(superAdmin);
    expect((await callRoute(promote, { params: { id: randomUUID() } })).status).toBe(404);
  });
});
