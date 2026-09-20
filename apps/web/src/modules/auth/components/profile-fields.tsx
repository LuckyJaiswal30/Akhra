'use client';

import { Phone } from 'lucide-react';
import { JHARKHAND_DISTRICTS, isDistrictCode, isIndianMobile, normalizePhone } from '@akhra/shared';
import { Field, Input, Select } from '@/components/ui';
import type { Labels } from './auth-parts';

const DRAFT_KEY = 'akhra:signup-draft';

export interface SignupDraft {
  name?: string;
  phone?: string;
  districtCode?: string;
}

export function saveSignupDraft(draft: SignupDraft): void {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {}
}

export function takeSignupDraft(): SignupDraft {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    sessionStorage.removeItem(DRAFT_KEY);
    const draft = raw ? (JSON.parse(raw) as SignupDraft) : {};
    return {
      name: typeof draft.name === 'string' ? draft.name.slice(0, 120) : undefined,
      phone: isIndianMobile(normalizePhone(draft.phone)) ? normalizePhone(draft.phone) : undefined,
      districtCode: isDistrictCode(draft.districtCode) ? draft.districtCode : undefined,
    };
  } catch {
    return {};
  }
}

export function phoneError(value: string, labels: Labels): string | null {
  return isIndianMobile(normalizePhone(value)) ? null : labels.errorPhone!;
}

export function PhoneField({
  id,
  labels,
  value,
  onChange,
  error,
  hint = true,
}: {
  id: string;
  labels: Labels;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: boolean;
}) {
  return (
    <Field
      label={labels.phone!}
      htmlFor={id}
      hint={hint ? labels.phoneHint : undefined}
      hintBelow
      error={error}
      required
    >
      <Input
        id={id}
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        maxLength={16}
        placeholder={labels.phonePlaceholder}
        icon={
          <span className="flex items-center gap-1 text-[15px] font-medium">
            <Phone aria-hidden className="h-4 w-4" />
            +91
          </span>
        }
        className="pl-[4.5rem]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </Field>
  );
}

export function DistrictField({
  id,
  labels,
  locale,
  value,
  onChange,
  error,
  hint = true,
}: {
  id: string;
  labels: Labels;
  locale: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: boolean;
}) {
  const isHindi = locale === 'hi';
  return (
    <Field
      label={labels.district!}
      htmlFor={id}
      hint={hint ? labels.districtHint : undefined}
      hintBelow
      error={error}
      required
    >
      <Select
        id={id}
        name="districtCode"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      >
        <option value="" disabled>
          {labels.districtPlaceholder}
        </option>
        {[...JHARKHAND_DISTRICTS]
          .sort((a, b) =>
            isHindi ? a.nameHi.localeCompare(b.nameHi, 'hi') : a.nameEn.localeCompare(b.nameEn),
          )
          .map((district) => (
            <option key={district.code} value={district.code}>
              {isHindi ? `${district.nameHi} (${district.nameEn})` : district.nameEn}
            </option>
          ))}
      </Select>
    </Field>
  );
}
