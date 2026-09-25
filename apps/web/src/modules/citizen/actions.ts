'use server';

import { createProblemSchema, type ActionState } from '@akhra/shared';
import { formId, parseInput, runAction } from '@/server/api';
import { serverEnv } from '@/server/env';
import { headers } from 'next/headers';
import { clientIdentifier, consumeRateLimit, rateLimitedError } from '@/server/rate-limit';
import { getActor } from '@/server/session';
import { submitProblem, type SubmissionResult } from './service';
import { supportProblem, withdrawSupport, type SupportState } from './support';

export type SubmitState = ActionState<SubmissionResult>;

const ONE_HOUR = 60 * 60 * 1000;

function parseLocation(value: FormDataEntryValue | null): { lat: number; lng: number } | null {
  if (typeof value !== 'string' || !value) return null;
  try {
    const parsed = JSON.parse(value) as { lat: number; lng: number };
    return Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng) ? parsed : null;
  } catch {
    return null;
  }
}

export async function submitProblemAction(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  return runAction('problem submission', async () => {
    const input = parseInput(createProblemSchema, {
      title: formData.get('title'),
      description: formData.get('description'),
      domain: formData.get('domain') || null,
      districtCode: formData.get('districtCode'),
      blockName: formData.get('blockName') || undefined,
      location: parseLocation(formData.get('location')),
      submitterType: formData.get('submitterType') || 'individual',
      submitterName: formData.get('submitterName'),
      submitterPhone: formData.get('submitterPhone'),
      submitterEmail: formData.get('submitterEmail') || '',
      submitterOrganization: formData.get('submitterOrganization') || undefined,
      affectedScale: formData.get('affectedScale') || null,
      safetyRisk: formData.get('safetyRisk') === 'on',
      attachmentIds: formData.getAll('attachmentIds').filter(Boolean) as string[],
      consentToPublish: formData.get('consentToPublish') === 'on',
    });

    const actor = await getActor();
    const limit = await consumeRateLimit(
      `submit:${actor.userId ?? input.submitterPhone}`,
      serverEnv.RATE_LIMIT_SUBMISSIONS_PER_HOUR,
      ONE_HOUR,
    );
    if (!limit.allowed) throw rateLimitedError(limit.resetAt, 'reports this hour');
    const address = clientIdentifier(await headers());
    if (!actor.userId && address !== 'unknown') {
      // The phone number is typed by the sender, so a spammer would change it; the network address
      // is not. Set higher, because a village or a CSC often shares one address.
      const network = await consumeRateLimit(
        `submit-ip:${address}`,
        serverEnv.RATE_LIMIT_SUBMISSIONS_PER_HOUR * 4,
        ONE_HOUR,
      );
      if (!network.allowed) throw rateLimitedError(network.resetAt, 'reports this hour');
    }

    return { data: await submitProblem(actor, input), message: 'Your report has been received.' };
  });
}

export async function toggleSupportAction(
  _prev: ActionState<SupportState>,
  formData: FormData,
): Promise<ActionState<SupportState>> {
  return runAction('supporting a report', async () => {
    const actor = await getActor();
    const problemId = formId(formData, 'problemId');
    const state =
      formData.get('intent') === 'withdraw'
        ? await withdrawSupport(actor, problemId)
        : await supportProblem(actor, problemId);
    return { data: state };
  });
}
