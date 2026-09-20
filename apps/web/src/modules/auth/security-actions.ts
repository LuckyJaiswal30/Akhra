'use server';

import { logger } from '@/server/logger';
import { getActor } from '@/server/session';
import { accountById, signOutEverywhere } from './security';

export type SignOutEverywhereResult = { ok: true } | { ok: false; reason: 'signed_out' | 'failed' };

export async function signOutEverywhereAction(): Promise<SignOutEverywhereResult> {
  const actor = await getActor();
  const account = actor.userId ? await accountById(actor.userId) : null;
  if (!account) return { ok: false, reason: 'signed_out' };
  try {
    await signOutEverywhere(account);
    return { ok: true };
  } catch (error) {
    logger.error(
      { userId: account.id, err: error instanceof Error ? error.message : String(error) },
      'sign out everywhere failed',
    );
    return { ok: false, reason: 'failed' };
  }
}
