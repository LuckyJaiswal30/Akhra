'use client';

import { useUser } from '@clerk/nextjs';
import { Camera, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState, useTransition, type ReactNode } from 'react';
import { JHARKHAND_DISTRICTS, needsDistrict, splitName } from '@akhra/shared';
import {
  ActionFeedback,
  Button,
  Field,
  Input,
  Select,
  fieldError,
  useActionForm,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { updateProfileAction, type ProfileActionState } from '../actions';
import type { OwnProfile } from '../profile';

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function ProfilePhoto({
  fallbackImage,
  name,
  labels,
  children,
}: {
  fallbackImage: string | null;
  name: string;
  labels: Record<string, string>;
  children: ReactNode;
}) {
  const { user } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [pending, startPhoto] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const image = user?.imageUrl ?? fallbackImage;
  const removable = user ? user.hasImage : Boolean(fallbackImage);

  function change(file: File) {
    setError(null);
    if (!PHOTO_TYPES.includes(file.type) || file.size > MAX_PHOTO_BYTES) {
      setError(labels.errorPhoto!);
      return;
    }
    startPhoto(async () => {
      try {
        await user?.setProfileImage({ file });
      } catch {
        setError(labels.errorPhoto!);
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-left">
      <div className={cn('relative shrink-0', pending && 'opacity-60')}>
        {image ? (
          <Image
            src={image}
            alt=""
            width={96}
            height={96}
            className="bg-sal-wash h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="bg-sal-wash text-sal grid h-24 w-24 place-items-center rounded-full text-3xl font-semibold"
          >
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => fileRef.current?.click()}
          aria-label={labels.changePhoto}
          className="border-line bg-surface text-ink shadow-card hover:text-sal absolute -right-0.5 -bottom-0.5 grid h-9 w-9 place-items-center rounded-full border transition-colors"
        >
          <Camera aria-hidden className="h-4 w-4" />
        </button>
      </div>
      <div className="min-w-0 flex-1">
        {children}
        <div className="mt-2 -ml-3 flex flex-wrap justify-center gap-1 sm:justify-start">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => fileRef.current?.click()}
          >
            {labels.changePhoto}
          </Button>
          {removable && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() =>
                startPhoto(async () => {
                  try {
                    await user?.setProfileImage({ file: null });
                  } catch {
                    setError(labels.errorPhoto!);
                  }
                })
              }
            >
              <Trash2 aria-hidden className="h-4 w-4" />
              {labels.removePhoto}
            </Button>
          )}
        </div>
        {error && (
          <p role="alert" className="text-danger mt-1 text-sm font-medium">
            {error}
          </p>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={PHOTO_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) change(file);
          event.target.value = '';
        }}
      />
    </div>
  );
}

export function AccountDetails({
  profile,
  labels,
  locale,
}: {
  profile: OwnProfile;
  labels: Record<string, string>;
  locale: string;
}) {
  const districtRequired = needsDistrict(profile.role);
  const [state, formAction, isPending] = useActionStateWithClerk(profile);
  const form = useActionForm(formAction, state);
  const isHindi = locale === 'hi';
  const feedback: ProfileActionState = state?.ok ? { ...state, message: labels.saved } : state;

  return (
    <form {...form} className="space-y-5" noValidate>
      <ActionFeedback state={feedback} />

      <Field label={labels.name!} htmlFor="profile-name" error={fieldError(state, 'name')} required>
        <Input
          id="profile-name"
          name="name"
          autoComplete="name"
          defaultValue={profile.name ?? ''}
          required
        />
      </Field>

      <div className="grid items-start gap-5 sm:grid-cols-2">
        <Field
          label={labels.phone!}
          htmlFor="profile-phone"
          hint={labels.phoneHint}
          hintBelow
          error={fieldError(state, 'phone')}
          required
        >
          <Input
            id="profile-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            maxLength={16}
            autoComplete="tel-national"
            placeholder={labels.phonePlaceholder}
            icon={<span className="text-[15px] font-medium">+91</span>}
            defaultValue={profile.phone ?? ''}
            required
          />
        </Field>
        <Field
          label={labels.district!}
          htmlFor="profile-district"
          hint={labels.districtHint}
          hintBelow
          error={fieldError(state, 'districtCode')}
          required={districtRequired}
        >
          <Select
            id="profile-district"
            name="districtCode"
            defaultValue={profile.districtCode ?? ''}
            required={districtRequired}
          >
            <option value="" disabled={districtRequired}>
              {labels.districtNone}
            </option>
            {JHARKHAND_DISTRICTS.map((d) => (
              <option key={d.code} value={d.code}>
                {isHindi ? d.nameHi : d.nameEn}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label={labels.locality!}
        htmlFor="profile-locality"
        hint={labels.localityHint}
        hintBelow
        error={fieldError(state, 'locality')}
      >
        <Input
          id="profile-locality"
          name="locality"
          maxLength={120}
          placeholder={labels.localityPlaceholder}
          defaultValue={profile.locality ?? ''}
        />
      </Field>

      <Button type="submit" disabled={isPending}>
        {isPending ? labels.saving : labels.save}
      </Button>
    </form>
  );
}

function useActionStateWithClerk(profile: OwnProfile) {
  const { user } = useUser();
  const [state, setState] = useState<ProfileActionState>(null);
  const [isPending, startTransition] = useTransition();

  const action = (formData: FormData) => {
    startTransition(async () => {
      const name = String(formData.get('name') ?? '').trim();
      const result = await updateProfileAction(state, formData);
      setState(result);
      if (result?.ok && user && name && name !== profile.name) {
        try {
          await user.update(splitName(name));
        } catch {}
      }
    });
  };

  return [state, action, isPending] as const;
}
