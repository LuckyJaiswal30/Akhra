'use client';

import type { Route } from 'next';
import { useClerk, useUser } from '@clerk/nextjs';
import { ArrowRight, Info, MapPin, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition, type FormEvent } from 'react';
import { splitName } from '@akhra/shared';
import { Alert, Button, Card, Field, Input, StepProgress } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { completeProfileAction } from '../actions';
import { fill, type Labels } from './auth-parts';
import { DistrictField, PhoneField, phoneError, takeSignupDraft } from './profile-fields';

type FieldName = 'name' | 'phone' | 'districtCode' | 'acceptTerms';

const MESSAGE_FOR: Record<FieldName, string> = {
  name: 'errorName',
  phone: 'errorPhone',
  districtCode: 'errorDistrict',
  acceptTerms: 'errorConsent',
};

export function CompleteProfileCard({
  labels,
  locale,
  initial,
  email,
  needsDistrict,
  needsConsent,
  isNew,
  target,
  signInPath,
}: {
  labels: Labels;
  locale: string;
  initial: { name: string; phone: string; districtCode: string; locality: string };
  email: string;
  needsDistrict: boolean;
  needsConsent: boolean;
  isNew: boolean;
  target: string;
  signInPath: string;
}) {
  const router = useRouter();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [districtCode, setDistrictCode] = useState(initial.districtCode);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const draft = takeSignupDraft();
    if (draft.name) setName((current) => current || draft.name!);
    if (draft.phone) setPhone((current) => current || draft.phone!);
    if (draft.districtCode) setDistrictCode((current) => current || draft.districtCode!);
  }, []);

  function clear(field: FieldName) {
    setErrors(({ [field]: _cleared, ...rest }) => rest);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const found: Partial<Record<FieldName, string>> = {};
    if (name.trim().length < 2) found.name = labels.errorName;
    const badPhone = phoneError(phone, labels);
    if (badPhone) found.phone = badPhone;
    if (needsDistrict && !districtCode) found.districtCode = labels.errorDistrict;
    if (needsConsent && data.get('acceptTerms') !== 'on') found.acceptTerms = labels.errorConsent;
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) {
      document.getElementById(`onboard-${Object.keys(found)[0]}`)?.focus();
      return;
    }

    startTransition(async () => {
      const result = await completeProfileAction(null, data);
      if (!result?.ok) {
        const fields = result?.error.details?.fields ?? {};
        const mapped = Object.fromEntries(
          Object.keys(fields)
            .filter((key): key is FieldName => key in MESSAGE_FOR)
            .map((key) => [key, labels[MESSAGE_FOR[key]]!]),
        );
        if (Object.keys(mapped).length > 0) setErrors(mapped);
        else setFormError(labels.errorGeneric!);
        return;
      }
      const trimmed = name.trim();
      if (user && trimmed !== (user.fullName ?? '')) {
        await user.update(splitName(trimmed)).catch(() => undefined);
      }
      router.replace(target as Route);
      router.refresh();
    });
  }

  return (
    <Card className="p-6 sm:p-10">
      <StepProgress
        steps={[labels.stepAccount!, labels.stepDetails!]}
        current={1}
        label={labels.stepsLabel!}
      />
      <h1 className="text-ink mt-6 text-3xl font-bold">
        {isNew ? labels.welcomeTitle : labels.title}
      </h1>
      <p className="text-subtle mt-2">{isNew ? labels.welcomeIntro : labels.intro}</p>
      <p className="text-subtle mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="break-all">{fill(labels.signedInAs, { email })}</span>
        <span aria-hidden>·</span>
        <button
          type="button"
          onClick={() => void signOut({ redirectUrl: signInPath })}
          className="text-sal font-semibold underline-offset-4 hover:underline"
        >
          {labels.notYou}
        </button>
      </p>

      <form onSubmit={submit} className="mt-7 space-y-5" noValidate>
        {formError && <Alert tone="error">{formError}</Alert>}

        <Field label={labels.name!} htmlFor="onboard-name" error={errors.name} required>
          <Input
            id="onboard-name"
            name="name"
            autoComplete="name"
            placeholder={labels.namePlaceholder}
            icon={<User />}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              clear('name');
            }}
            required
          />
        </Field>

        <div className="grid items-start gap-5 sm:grid-cols-2">
          <PhoneField
            id="onboard-phone"
            labels={labels}
            value={phone}
            onChange={(value) => {
              setPhone(value);
              clear('phone');
            }}
            error={errors.phone}
          />
          {needsDistrict && (
            <DistrictField
              id="onboard-districtCode"
              labels={labels}
              locale={locale}
              value={districtCode}
              onChange={(value) => {
                setDistrictCode(value);
                clear('districtCode');
              }}
              error={errors.districtCode}
            />
          )}
        </div>

        <Field
          label={`${labels.locality} (${labels.optional})`}
          htmlFor="onboard-locality"
          hint={labels.localityHint}
          hintBelow
        >
          <Input
            id="onboard-locality"
            name="locality"
            maxLength={120}
            placeholder={labels.localityPlaceholder}
            icon={<MapPin />}
            defaultValue={initial.locality}
          />
        </Field>

        {needsConsent ? (
          <div>
            <label className="text-ink flex items-start gap-3 text-sm">
              <input
                id="onboard-acceptTerms"
                type="checkbox"
                name="acceptTerms"
                className="accent-sal mt-0.5 h-5 w-5 shrink-0"
                onChange={() => clear('acceptTerms')}
                required
              />
              <span>
                {labels.consent}{' '}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="text-sal font-semibold underline underline-offset-4"
                >
                  {labels.consentLink}
                </Link>
              </span>
            </label>
            {errors.acceptTerms && (
              <p role="alert" className="text-danger mt-2 text-sm font-medium">
                {errors.acceptTerms}
              </p>
            )}
          </div>
        ) : (
          <p className="text-subtle text-sm">{labels.consentDone}</p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? labels.saving : labels.save}
          {!pending && <ArrowRight aria-hidden className="h-4 w-4" />}
        </Button>
      </form>

      <div className="bg-mint text-subtle mt-6 flex items-start gap-3 rounded-xl px-4 py-3 text-sm">
        <Info aria-hidden className="text-sal mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <span className="text-ink font-semibold">{labels.whyTitle}. </span>
          {labels.whyBody}
        </p>
      </div>
    </Card>
  );
}
