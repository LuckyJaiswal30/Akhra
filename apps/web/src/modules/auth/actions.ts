'use server';

import { revalidatePath } from 'next/cache';
import {
  completeProfileSchema,
  normalizePhone,
  updateProfileSchema,
  type ActionState,
} from '@akhra/shared';
import { parseInput, runAction } from '@/server/api';
import { requireActor } from '@/server/session';
import { completeOwnProfile, updateOwnProfile, type OwnProfile } from './profile';

export type ProfileActionState = ActionState<OwnProfile>;

export async function updateProfileAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  return runAction('profile update', async () => {
    const actor = await requireActor();
    const input = parseInput(updateProfileSchema, {
      name: formData.get('name'),
      phone: normalizePhone(formData.get('phone')),
      districtCode: formData.get('districtCode') ?? '',
      locality: formData.get('locality') ?? '',
    });

    const profile = await updateOwnProfile(actor, input);
    revalidatePath('/account');
    return { data: profile, message: 'Your details are saved.' };
  });
}

export async function completeProfileAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  return runAction('profile completion', async () => {
    const actor = await requireActor();
    const input = parseInput(completeProfileSchema, {
      name: formData.get('name'),
      phone: normalizePhone(formData.get('phone')),
      districtCode: formData.get('districtCode') ?? '',
      locality: formData.get('locality') ?? '',
      acceptTerms: formData.get('acceptTerms') === 'on',
    });

    const profile = await completeOwnProfile(actor, input);
    revalidatePath('/', 'layout');
    return { data: profile };
  });
}
