'use server';

import { revalidatePath } from 'next/cache';
import {
  INDUSTRY_ROLES,
  industryInterestSchema,
  interestDecisionSchema,
  UNIVERSITY_ROLES,
  type ActionState,
} from '@akhra/shared';
import { formId, parseInput, runAction } from '@/server/api';
import { requireRole } from '@/server/session';
import { expressInterest, respondToInterest } from './service';

export async function expressInterestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction('expressing interest', async () => {
    const actor = await requireRole(...INDUSTRY_ROLES);
    const projectId = formId(formData, 'projectId');
    const input = parseInput(industryInterestSchema, {
      offerTypes: formData.getAll('offerTypes').filter(Boolean),
      fundingAmount: formData.get('fundingAmount') || undefined,
      message: formData.get('message'),
    });
    await expressInterest(actor, projectId, input);
    revalidatePath('/industry');
    return { message: 'Your offer has been sent to the team.' };
  });
}

export async function respondToInterestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction('responding to an offer', async () => {
    const actor = await requireRole(...UNIVERSITY_ROLES, ...INDUSTRY_ROLES);
    const interestId = formId(formData, 'interestId');
    const input = parseInput(interestDecisionSchema, {
      status: formData.get('status'),
      note: formData.get('note') || undefined,
    });
    await respondToInterest(actor, interestId, input.status, input.note);
    revalidatePath('/university/partnerships');
    revalidatePath('/industry');
    return { message: 'Decision recorded.' };
  });
}
