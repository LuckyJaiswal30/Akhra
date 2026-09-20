import { isDistrictCode } from './districts';
import type { Role } from './roles';

export type ProfileGap = 'name' | 'phone' | 'district' | 'consent';

export interface ProfileFacts {
  role: Role;
  name: string | null;
  phone: string | null;
  districtCode: string | null;
  privacyAcceptedAt: Date | string | null;
}

const PHONE = /^[6-9]\d{9}$/;

export function needsDistrict(role: Role): boolean {
  return role === 'citizen';
}

export function isIndianMobile(value: string | null | undefined): value is string {
  return typeof value === 'string' && PHONE.test(value);
}

export function profileGaps(profile: ProfileFacts): ProfileGap[] {
  const gaps: ProfileGap[] = [];
  if (!profile.name || profile.name.trim().length < 2) gaps.push('name');
  if (!isIndianMobile(profile.phone)) gaps.push('phone');
  if (
    needsDistrict(profile.role) &&
    !(profile.districtCode && isDistrictCode(profile.districtCode))
  )
    gaps.push('district');
  if (!profile.privacyAcceptedAt) gaps.push('consent');
  return gaps;
}

export function normalizePhone(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!/^[\d\s+\-()]*$/.test(raw)) return raw;
  const digits = raw.replace(/\D/g, '');
  return digits.length > 10 ? digits.replace(/^(?:91|0)(?=\d{10}$)/, '') : digits;
}

export interface SignupMetadata {
  acceptedPrivacyNoticeAt?: string;
  phone?: string;
  districtCode?: string;
}

export interface SignupDetails {
  phone: string | null;
  districtCode: string | null;
  acceptedPrivacyAt: Date | null;
}

const CLOCK_SKEW_MS = 10 * 60 * 1000;

export function readSignupDetails(
  metadata: Record<string, unknown> | null | undefined,
  now = new Date(),
): SignupDetails {
  const phone = normalizePhone(metadata?.phone);
  const accepted =
    typeof metadata?.acceptedPrivacyNoticeAt === 'string'
      ? new Date(metadata.acceptedPrivacyNoticeAt)
      : null;
  const acceptedValid =
    accepted &&
    !Number.isNaN(accepted.getTime()) &&
    accepted.getTime() <= now.getTime() + CLOCK_SKEW_MS;
  return {
    phone: isIndianMobile(phone) ? phone : null,
    districtCode:
      typeof metadata?.districtCode === 'string' && isDistrictCode(metadata.districtCode)
        ? metadata.districtCode
        : null,
    acceptedPrivacyAt: acceptedValid ? (accepted.getTime() > now.getTime() ? now : accepted) : null,
  };
}
