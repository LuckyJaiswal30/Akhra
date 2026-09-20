import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ActionState } from '@akhra/shared';
import { expirePublicFigures, getPlatformStats, listSuccessStories } from '@/modules/analytics';
import { submitProblemAction, trackByRefCode } from '@/modules/citizen';
import { decideProblemAction, routeProblemAction } from '@/modules/classification';
import {
  advanceProjectAction,
  createMilestoneAction,
  getLifecycle,
  listProposalsForReview,
  recordOutcomeAction,
  reviewProposal,
  updateMilestoneAction,
} from '@/modules/lifecycle';
import {
  addMemberAction,
  createProjectAction,
  listOrganizationProjects,
  listRoutedProblems,
  respondToRoutingAction,
  submitProposalAction,
} from '@/modules/university';
import { getActor } from '@/server/session';
import { actAs, cleanupTestData, createOrg, createUser, formData, type TestUser } from '../helpers';

/**
 * One report, walked from the citizen who files it to the solution the state deploys — through the
 * same server actions the screens post to, against a real database with row-level security on.
 *
 * The per-module tests prove each rule. This one proves the handoffs between them still line up:
 * every step below is a different person on a different screen, and the step before it is the only
 * reason they can see anything at all.
 */

let officer: TestUser;
let neighbouringOfficer: TestUser;
let principal: TestUser;
let student: TestUser;
let university: string;

/** A form posts to an action with no previous state. */
const NEW_FORM = null;

async function as(user: TestUser) {
  actAs(user);
  return getActor();
}

/** Reads an action result the way the screen does, and fails with the message the user would see. */
function succeeded<T>(result: ActionState<T>, step: string): T {
  if (!result) return expect.fail(`${step}: the action returned nothing`);
  if (!result.ok) return expect.fail(`${step}: ${result.error.code} — ${result.error.message}`);
  return result.data;
}

function refused(result: ActionState<unknown>, step: string): string {
  if (!result) return expect.fail(`${step}: the action returned nothing`);
  if (result.ok) return expect.fail(`${step}: this was allowed, and it should not have been`);
  return result.error.code;
}

beforeAll(async () => {
  university = await createOrg('university');
  officer = await createUser({ role: 'gov_admin', jurisdictionCode: 'PAL' });
  neighbouringOfficer = await createUser({ role: 'gov_admin', jurisdictionCode: 'RAN' });
  principal = await createUser({ role: 'university_admin', organizationId: university });
  student = await createUser({ role: 'student', organizationId: university });
});

afterAll(cleanupTestData);

describe('a report becomes a deployed solution', () => {
  it('carries one report from the citizen who files it to the impact figures', async () => {
    // 1. A citizen files a report. Nobody is signed in.
    actAs(null);
    const filed = succeeded(
      await submitProblemAction(
        NEW_FORM,
        formData({
          title: 'Handpumps in Chainpur draw water that stains every vessel red',
          description:
            'Every handpump in the block draws water with so much iron that vessels stain red within a day, and families have gone back to drinking from the open well.',
          districtCode: 'PAL',
          submitterName: 'Test Reporter',
          submitterPhone: '9835012345',
          consentToPublish: 'on',
        }),
      ),
      'filing the report',
    );
    expect(filed.refCode).toMatch(/^AKH-/);

    // The public tracker finds it straight away, with no account.
    const tracked = await trackByRefCode(filed.refCode);
    expect(tracked).toMatchObject({ status: 'submitted' });
    const problemId = tracked!.id;
    const statusNow = async () => (await trackByRefCode(filed.refCode))?.status;

    // 2. An officer from the next district cannot touch it. The district owns the report.
    await as(neighbouringOfficer);
    expect(
      refused(
        await decideProblemAction(
          NEW_FORM,
          formData({ problemId, decision: 'validate', domain: 'water_resources' }),
        ),
        'validating another district’s report',
      ),
    ).toBe('FORBIDDEN');
    expect(await statusNow()).toBe('submitted');

    // 3. The district's own officer validates it and gives it a domain.
    await as(officer);
    succeeded(
      await decideProblemAction(
        NEW_FORM,
        formData({ problemId, decision: 'validate', domain: 'water_resources' }),
      ),
      'validating the report',
    );
    expect(await statusNow()).toBe('validated');

    // 4. The officer routes it to an institution that works on water.
    succeeded(
      await routeProblemAction(
        NEW_FORM,
        formData({
          problemId,
          organizationIds: university,
          note: 'Closest institution with a water laboratory.',
        }),
      ),
      'routing the report',
    );
    expect(await statusNow()).toBe('routed');

    // 5. The institution sees the referral in its inbox and accepts it.
    const referrals = await listRoutedProblems(await as(principal));
    const referral = referrals.find((row) => row.problemId === problemId);
    expect(referral, 'the referral never reached the institution').toMatchObject({
      response: 'proposed',
    });
    succeeded(
      await respondToRoutingAction(
        NEW_FORM,
        formData({ routingId: referral!.routingId, response: 'accepted' }),
      ),
      'accepting the referral',
    );

    // 6. It forms a team and writes a proposal.
    const { projectId } = succeeded(
      await createProjectAction(
        NEW_FORM,
        formData({
          problemId,
          title: 'Gravity-fed iron removal for Chainpur handpumps',
          summary:
            'Fit a gravity-fed iron removal bed to four handpumps and have a village volunteer maintain it.',
        }),
      ),
      'starting the project',
    );

    succeeded(
      await addMemberAction(
        NEW_FORM,
        formData({ projectId, userId: student.id, memberRole: 'student', discipline: 'Civil' }),
      ),
      'adding a student to the team',
    );

    succeeded(
      await submitProposalAction(
        NEW_FORM,
        formData({
          projectId,
          abstract:
            'A gravity-fed iron removal bed fitted to four handpumps, maintained by a trained village volunteer.',
          methodology:
            'Build two beds, run them for eight weeks, and test the water at the district laboratory every week.',
          expectedOutcomes: 'Iron below the permissible limit at all four handpumps.',
          timelineMonths: '6',
        }),
      ),
      'submitting the proposal',
    );

    // Until the officer approves it, the report still reads "sent to an institution".
    expect(await statusNow()).toBe('routed');

    // 7. The proposal reaches the officer's review list, and the officer approves it.
    const forReview = await listProposalsForReview(await as(officer));
    const proposal = forReview.find((row) => row.projectId === projectId);
    expect(proposal, 'the proposal never reached the officer').toBeDefined();
    await reviewProposal(await as(officer), proposal!.proposalId, { decision: 'approved' });
    expect(await statusNow()).toBe('in_progress');

    // 8. The team plans a milestone, completes it, and the officer approves it.
    const team = await as(principal);
    succeeded(
      await createMilestoneAction(
        NEW_FORM,
        formData({ projectId, title: 'Two beds built and commissioned', orderIndex: '0' }),
      ),
      'planning a milestone',
    );

    const [milestone] = (await getLifecycle(team, projectId)).milestones;
    for (const status of ['in_progress', 'submitted'] as const) {
      succeeded(
        await updateMilestoneAction(
          NEW_FORM,
          formData({ projectId, milestoneId: milestone!.id, status }),
        ),
        `moving the milestone to ${status}`,
      );
    }

    await as(officer);
    succeeded(
      await updateMilestoneAction(
        NEW_FORM,
        formData({ projectId, milestoneId: milestone!.id, status: 'approved' }),
      ),
      'approving the milestone',
    );

    // 9. The team takes the solution through piloting to deployment.
    await as(principal);
    for (const stage of ['prototyped', 'piloted', 'deployed'] as const) {
      succeeded(
        await advanceProjectAction(NEW_FORM, formData({ projectId, toStatus: stage })),
        `advancing the project to ${stage}`,
      );
    }
    expect(await statusNow()).toBe('deployed');

    // 10. It records what the solution actually changed.
    succeeded(
      await recordOutcomeAction(
        NEW_FORM,
        formData({
          projectId,
          outcomeType: 'deployment',
          title: 'Four handpumps fitted with iron removal beds',
          impactMetricName: 'people with safe drinking water',
          impactMetricValue: '1200',
        }),
      ),
      'recording the outcome',
    );

    // 11. The public pages show the result: the tracker, the story and the impact figures.
    await expirePublicFigures();
    const story = (await listSuccessStories()).find((row) => row.refCode === filed.refCode);
    expect(story, 'the finished project never became a public story').toMatchObject({
      status: 'deployed',
    });
    expect(story!.outcomes.map((row) => row.metricValue)).toContain(1200);

    const stats = await getPlatformStats();
    expect(stats.solutionsDeployed).toBeGreaterThan(0);
    expect(stats.peopleImpacted).toBeGreaterThanOrEqual(1200);

    // And the institution still sees its own project, now finished.
    const own = await listOrganizationProjects(await as(principal));
    expect(own.find((row) => row.id === projectId)).toMatchObject({ status: 'deployed' });
  });
});
