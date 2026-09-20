import { eq } from 'drizzle-orm';
import { cache } from 'react';
import { getDb, organizations, users, withoutRls } from '@akhra/db';
import {
  AppError,
  Errors,
  needsDistrict,
  profileGaps,
  type CompleteProfileInput,
  type ProfileGap,
  type Role,
  type UpdateProfileInput,
} from '@akhra/shared';
import type { Actor } from '@/server/session';

export interface OwnProfile {
  name: string | null;
  email: string;
  phone: string | null;
  districtCode: string | null;
  locality: string | null;
  image: string | null;
  role: Role;
  privacyAcceptedAt: Date | null;
  createdAt: Date;
}

const profileColumns = {
  name: users.name,
  email: users.email,
  phone: users.phone,
  districtCode: users.districtCode,
  locality: users.locality,
  image: users.image,
  role: users.role,
  privacyAcceptedAt: users.privacyAcceptedAt,
  createdAt: users.createdAt,
};

export async function listOrganizationName(organizationId: string): Promise<string | null> {
  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1),
  );
  return row?.name ?? null;
}

export const getOwnProfile = cache(async (actor: Actor): Promise<OwnProfile | null> => {
  const userId = actor.userId;
  if (!userId) return null;
  const [row] = await withoutRls(getDb(), (tx) =>
    tx.select(profileColumns).from(users).where(eq(users.id, userId)).limit(1),
  );
  return row ?? null;
});

export async function getProfileGaps(actor: Actor): Promise<ProfileGap[]> {
  const profile = await getOwnProfile(actor);
  return profile ? profileGaps(profile) : [];
}

const GAP_FIELD: Record<Exclude<ProfileGap, 'consent'>, { field: string; message: string }> = {
  name: { field: 'name', message: 'Enter your name.' },
  phone: { field: 'phone', message: 'Enter your 10-digit mobile number.' },
  district: { field: 'districtCode', message: 'Choose your district.' },
};

function refuseNewGaps(
  role: Role,
  next: { name: string; phone: string | null; districtCode: string | null },
) {
  const gaps = profileGaps({ role, ...next, privacyAcceptedAt: new Date() }).filter(
    (gap) => gap !== 'consent',
  );
  if (gaps.length === 0) return;
  const fields = Object.fromEntries(
    gaps.map((gap) => [GAP_FIELD[gap].field, GAP_FIELD[gap].message]),
  );
  throw new AppError('VALIDATION_FAILED', 'Some required details are missing.', { fields });
}

export async function updateOwnProfile(
  actor: Actor,
  input: UpdateProfileInput,
): Promise<OwnProfile> {
  const userId = actor.userId;
  if (!userId) throw Errors.unauthenticated();
  const next = {
    name: input.name,
    phone: input.phone || null,
    districtCode: input.districtCode || null,
  };
  refuseNewGaps(actor.role as Role, next);

  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .update(users)
      .set({ ...next, locality: input.locality || null, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning(profileColumns),
  );
  if (!row) throw Errors.notFound('That account no longer exists.');
  return row;
}

export async function completeOwnProfile(
  actor: Actor,
  input: CompleteProfileInput,
): Promise<OwnProfile> {
  const userId = actor.userId;
  if (!userId) throw Errors.unauthenticated();
  const current = await getOwnProfile(actor);
  if (!current) throw Errors.notFound('That account no longer exists.');

  const role = current.role;
  const districtCode = input.districtCode || (needsDistrict(role) ? null : current.districtCode);
  refuseNewGaps(role, { name: input.name, phone: input.phone, districtCode });
  if (!current.privacyAcceptedAt && !input.acceptTerms) {
    throw new AppError(
      'VALIDATION_FAILED',
      'Agree to how Akhra uses your information to continue.',
      {
        fields: { acceptTerms: 'Agree to how Akhra uses your information to continue.' },
      },
    );
  }

  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .update(users)
      .set({
        name: input.name,
        phone: input.phone,
        districtCode,
        locality: input.locality || current.locality,
        privacyAcceptedAt: current.privacyAcceptedAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning(profileColumns),
  );
  if (!row) throw Errors.notFound('That account no longer exists.');
  return row;
}
