'use server';

import { revalidatePath } from 'next/cache';
import {
  milestoneSchema,
  milestoneUpdateSchema,
  outcomeSchema,
  projectTestSchema,
  reviewProposalSchema,
  transitionStatusSchema,
  type ActionState,
} from '@akhra/shared';
import { formId, parseInput, runAction } from '@/server/api';
import { requireActor, requireRole } from '@/server/session';
import { reviewProposal } from './proposals';
import {
  advanceProject,
  createMilestone,
  recordOutcome,
  recordTest,
  updateMilestoneStatus,
} from './service';

const projectPath = (projectId: string) => `/projects/${projectId}`;

export async function createMilestoneAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction('creating a milestone', async () => {
    const actor = await requireActor();
    const projectId = formId(formData, 'projectId');
    const input = parseInput(milestoneSchema, {
      title: formData.get('title'),
      description: formData.get('description') || undefined,
      dueDate: formData.get('dueDate') || undefined,
      orderIndex: formData.get('orderIndex') || 0,
    });
    await createMilestone(actor, projectId, input);
    revalidatePath(projectPath(projectId));
    return { message: 'Milestone added.' };
  });
}

export async function updateMilestoneAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction('updating a milestone', async () => {
    const actor = await requireActor();
    const projectId = formId(formData, 'projectId');
    const milestoneId = formId(formData, 'milestoneId');
    const input = parseInput(milestoneUpdateSchema, { status: formData.get('status') });
    await updateMilestoneStatus(actor, milestoneId, input.status);
    revalidatePath(projectPath(projectId));
    return { message: 'Milestone updated.' };
  });
}

export async function advanceProjectAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction('advancing a project', async () => {
    const actor = await requireActor();
    const projectId = formId(formData, 'projectId');
    const input = parseInput(transitionStatusSchema, {
      toStatus: formData.get('toStatus'),
      note: formData.get('note') || undefined,
    });
    await advanceProject(actor, projectId, input.toStatus, input.note);
    revalidatePath(projectPath(projectId));
    return { message: 'Project stage updated.' };
  });
}

export async function recordOutcomeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction('recording an outcome', async () => {
    const actor = await requireActor();
    const projectId = formId(formData, 'projectId');
    const input = parseInput(outcomeSchema, {
      outcomeType: formData.get('outcomeType'),
      title: formData.get('title'),
      detail: formData.get('detail') || undefined,
      evidenceUrl: formData.get('evidenceUrl') || '',
      impactMetricName: formData.get('impactMetricName') || undefined,
      impactMetricValue: formData.get('impactMetricValue') || undefined,
      reference: formData.get('reference') || undefined,
      ipStatus:
        formData.get('outcomeType') === 'patent'
          ? formData.get('ipStatus') || undefined
          : undefined,
    });
    await recordOutcome(actor, projectId, input);
    revalidatePath(projectPath(projectId));
    return { message: 'Outcome recorded.' };
  });
}

export async function reviewProposalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction('reviewing a proposal', async () => {
    const actor = await requireRole('gov_admin', 'super_admin');
    const projectId = formId(formData, 'projectId');
    const proposalId = formId(formData, 'proposalId');
    const input = parseInput(reviewProposalSchema, {
      decision: formData.get('decision'),
      note: formData.get('note') || undefined,
    });
    await reviewProposal(actor, proposalId, input);
    revalidatePath(projectPath(projectId));
    revalidatePath('/government/proposals');
    return { message: 'Decision recorded.' };
  });
}

export async function recordTestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction('recording a test', async () => {
    const actor = await requireActor();
    const projectId = formId(formData, 'projectId');
    const input = parseInput(projectTestSchema, {
      title: formData.get('title'),
      method: formData.get('method'),
      result: formData.get('result'),
      findings: formData.get('findings'),
      conductedOn: formData.get('conductedOn'),
      milestoneId: formData.get('milestoneId') || undefined,
    });
    await recordTest(actor, projectId, input);
    revalidatePath(projectPath(projectId));
    return { message: 'Test recorded.' };
  });
}
