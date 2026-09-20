'use server';

import { revalidatePath } from 'next/cache';
import { messageSchema, type ActionState } from '@akhra/shared';
import { formId, parseInput, runAction } from '@/server/api';
import { requireActor } from '@/server/session';
import { markRead } from './service';
import { postMessage } from './thread';

export async function postMessageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction('posting a message', async () => {
    const actor = await requireActor();
    const problemId = formId(formData, 'problemId');
    const input = parseInput(messageSchema, {
      body: formData.get('body'),
      visibility: formData.get('visibility') || 'public',
    });
    await postMessage(actor, problemId, input);

    const returnPath = String(formData.get('returnPath') ?? '');
    if (returnPath.startsWith('/') && !returnPath.startsWith('//')) revalidatePath(returnPath);
  });
}

export async function markAllReadAction(): Promise<void> {
  const actor = await requireActor();
  await markRead(actor);
  revalidatePath('/notifications');
}
