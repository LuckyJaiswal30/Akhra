'use server';

import { revalidatePath } from 'next/cache';
import {
  actionTakenSchema,
  AppError,
  assignDepartmentSchema,
  DISTRICT_ROLES,
  GOVERNMENT_ROLES,
  reporterDecisionSchema,
  routeProblemSchema,
  validateProblemSchema,
  type ActionState,
} from '@akhra/shared';
import { formId, parseInput, runAction } from '@/server/api';
import { consumeRateLimit, rateLimitedError } from '@/server/rate-limit';
import { getActor, requireRole } from '@/server/session';
import {
  assignToDepartment,
  confirmResolved,
  recordActionTaken,
  reopenReport,
  reporterProblemFor,
} from './service-department';
import {
  markAsDuplicate,
  rejectProblem,
  resolveProblem,
  routeProblem,
  transferDistrict,
  validateProblem,
} from './service-admin';

export type AdminActionState = ActionState;

export async function decideProblemAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  return runAction('validation decision', async () => {
    const actor = await requireRole(...DISTRICT_ROLES);
    const problemId = formId(formData, 'problemId');
    const input = parseInput(validateProblemSchema, {
      decision: formData.get('decision'),
      domain: formData.get('domain') || undefined,
      duplicateOfId: formData.get('duplicateOfId') || undefined,
      districtCode: formData.get('districtCode') || undefined,
      note: formData.get('note') || undefined,
    });

    switch (input.decision) {
      case 'validate':
        await validateProblem(actor, problemId, { domain: input.domain, note: input.note });
        break;
      case 'reject':
        await rejectProblem(
          actor,
          problemId,
          input.note ?? 'Did not meet the validation criteria.',
        );
        break;
      case 'mark_duplicate':
        if (!input.duplicateOfId) {
          throw new AppError('VALIDATION_FAILED', 'Select the original report to merge into.', {
            fields: { duplicateOfId: 'Select the original report to merge into.' },
          });
        }
        await markAsDuplicate(actor, problemId, input.duplicateOfId, input.note);
        break;
      case 'transfer':
        if (!input.districtCode) {
          throw new AppError(
            'VALIDATION_FAILED',
            'Choose the district the problem is actually in.',
            {
              fields: { districtCode: 'Choose the district the problem is actually in.' },
            },
          );
        }
        if (!input.note || input.note.length < 10) {
          throw new AppError('VALIDATION_FAILED', 'Say why it belongs to that district.', {
            fields: { note: 'Say why it belongs to that district.' },
          });
        }
        await transferDistrict(actor, problemId, input.districtCode, input.note);
        break;
      case 'resolve':
        if (!input.note || input.note.length < 10) {
          throw new AppError(
            'VALIDATION_FAILED',
            'Say what was done to resolve it; the reporter sees this note.',
            {
              fields: { note: 'Say what was done to resolve it; the reporter sees this note.' },
            },
          );
        }
        await resolveProblem(actor, problemId, input.note);
        break;
    }

    revalidatePath('/government/queue');
    return { message: 'Decision recorded.' };
  });
}

export async function routeProblemAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  return runAction('routing', async () => {
    const actor = await requireRole(...DISTRICT_ROLES);
    const problemId = formId(formData, 'problemId');
    const input = parseInput(routeProblemSchema, {
      organizationIds: formData.getAll('organizationIds').filter(Boolean),
      note: formData.get('note') || undefined,
    });

    const result = await routeProblem(actor, problemId, input.organizationIds, input.note);
    revalidatePath('/government/queue');
    return { message: `Routed to ${result.routed.map((r) => r.name).join(', ')}.` };
  });
}

export async function assignDepartmentAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  return runAction('department assignment', async () => {
    const actor = await requireRole(...DISTRICT_ROLES);
    const problemId = formId(formData, 'problemId');
    const input = parseInput(assignDepartmentSchema, {
      organizationId: formData.get('organizationId'),
      note: formData.get('note') || undefined,
    });

    await assignToDepartment(actor, problemId, input.organizationId, input.note);
    revalidatePath('/government/queue');
    return { message: 'Sent to the department.' };
  });
}

export async function actionTakenAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  return runAction('action taken', async () => {
    const actor = await requireRole(...GOVERNMENT_ROLES);
    const problemId = formId(formData, 'problemId');
    const input = parseInput(actionTakenSchema, { note: formData.get('note') });

    await recordActionTaken(actor, problemId, input.note);
    revalidatePath('/government/queue');
    return { message: 'Recorded. The person who reported it has been told.' };
  });
}

export async function reporterDecisionAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  return runAction('reporter decision', async () => {
    const input = parseInput(reporterDecisionSchema, {
      refCode: formData.get('refCode'),
      phoneLast4: formData.get('phoneLast4') || undefined,
      decision: formData.get('decision'),
      note: formData.get('note') || undefined,
    });

    // Four digits are 10,000 guesses; a handful per report per hour makes guessing hopeless.
    const attempts = await consumeRateLimit(
      `reporter-decision:${input.refCode}`,
      5,
      60 * 60 * 1000,
    );
    if (!attempts.allowed) throw rateLimitedError(attempts.resetAt, 'attempts on this report');

    const actor = await getActor();
    const problem = await reporterProblemFor(input.refCode, {
      actorUserId: actor.userId,
      phoneLast4: input.phoneLast4,
    });
    if (!problem) {
      throw new AppError(
        'NOT_FOUND',
        'We could not match that report. Check the reference code and mobile number.',
      );
    }

    // The department that did the work never signs it off, even on a report one of its staff filed.
    if (
      actor.role === 'dept_officer' &&
      actor.organizationId !== null &&
      actor.organizationId === problem.assignedOrgId
    ) {
      throw new AppError(
        'FORBIDDEN',
        'Your department did this work, so someone outside it has to confirm or reopen it.',
      );
    }

    if (input.decision === 'confirm') {
      await confirmResolved(problem, input.note);
      revalidatePath('/track');
      return { message: 'Thank you. This report is now closed.' };
    }

    if (!input.note || input.note.length < 10) {
      throw new AppError('VALIDATION_FAILED', 'Tell the department what is still wrong.', {
        fields: { note: 'Tell the department what is still wrong.' },
      });
    }
    await reopenReport(problem, input.note);
    revalidatePath('/track');
    return { message: 'Reopened. The department has been told.' };
  });
}
