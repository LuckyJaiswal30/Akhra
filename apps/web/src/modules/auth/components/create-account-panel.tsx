'use client';

import type { Route } from 'next';
import { useSignUp } from '@clerk/nextjs';
import { ArrowRight, Mail, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import {
  normalizePhone,
  passwordProblem,
  splitName,
  type PasswordPolicy,
  type SignupMetadata,
} from '@akhra/shared';
import {
  Alert,
  Button,
  Field,
  Input,
  PasswordChecklist,
  PasswordInput,
  PasswordStrength,
} from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { CodeStep, Divider, GoogleButton, SuccessPanel, fill, type Labels } from './auth-parts';
import { clerkFieldError, clerkMessage } from './clerk-errors';
import { checklistLabels, passwordRuleMessage } from './password-labels';
import { DistrictField, PhoneField, phoneError, saveSignupDraft } from './profile-fields';
import { useFocusOnChange, type FieldErrors, type Paths } from './auth-card-parts';

export function CreatePanel({
  labels,
  locale,
  paths,
  policy,
  social,
  onFlow,
  onSwitch,
}: {
  labels: Labels;
  locale: string;
  paths: Paths;
  policy: PasswordPolicy;
  social: string[];
  onFlow: (v: boolean) => void;
  onSwitch: () => void;
}) {
  const { signUp, fetchStatus } = useSignUp();
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'verify' | 'ready'>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const busy = fetchStatus === 'fetching';
  useFocusOnChange(step);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') ?? '').trim();
    const emailAddress = String(data.get('email') ?? '')
      .trim()
      .toLowerCase();
    const confirm = String(data.get('confirmPassword') ?? '');

    const found: FieldErrors = {};
    if (name.length < 2) found.name = labels.errorName;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) found.email = labels.errorEmailInvalid;
    const badPhone = phoneError(phone, labels);
    if (badPhone) found.phone = badPhone;
    if (!districtCode) found.districtCode = labels.errorDistrict;
    const problem = passwordProblem(password, { policy, email: emailAddress });
    if (problem) found.password = passwordRuleMessage(problem, labels, policy);
    if (password !== confirm) found.confirmPassword = labels.errorMismatch;
    if (data.get('acceptTerms') !== 'on') found.acceptTerms = labels.errorConsent;
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) {
      document.getElementById(`create-${Object.keys(found)[0]}`)?.focus();
      return;
    }

    const { error: failure } = await signUp.password({
      emailAddress,
      password,
      ...splitName(name),
      unsafeMetadata: {
        acceptedPrivacyNoticeAt: new Date().toISOString(),
        phone: normalizePhone(phone),
        districtCode,
      } satisfies SignupMetadata,
    });
    if (failure) {
      const { field, message } = clerkFieldError(failure, labels);
      if (field === 'email' || field === 'password') setErrors({ [field]: message });
      else setFormError(message);
      return;
    }
    const sent = await signUp.verifications.sendEmailCode();
    if (sent.error) {
      setFormError(clerkMessage(sent.error, labels));
      return;
    }
    setEmail(emailAddress);
    setStep('verify');
    onFlow(true);
  }

  if (step === 'verify') {
    return (
      <CodeStep
        title={labels.verifyTitle!}
        intro={fill(labels.verifySent, { email })}
        labels={labels}
        submitLabel={labels.verifyContinue!}
        busy={busy}
        onBack={() => {
          setStep('form');
          onFlow(false);
        }}
        onResend={() => signUp.verifications.sendEmailCode()}
        onVerify={async (code) => {
          const { error: failure } = await signUp.verifications.verifyEmailCode({ code });
          if (failure) return clerkMessage(failure, labels);
          if (signUp.status !== 'complete') return labels.errorGeneric!;
          await signUp.finalize({ navigate: () => setStep('ready') });
          return null;
        }}
      />
    );
  }

  if (step === 'ready') {
    return (
      <SuccessPanel title={labels.readyTitle!} body={labels.readyBody!}>
        <Button
          type="button"
          size="lg"
          className="w-full sm:w-auto sm:min-w-64"
          onClick={() => {
            router.push(paths.afterAuth as Route);
            router.refresh();
          }}
        >
          {labels.goToDashboard}
          <ArrowRight aria-hidden className="h-4 w-4" />
        </Button>
      </SuccessPanel>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="space-y-5" noValidate>
        {formError && <Alert tone="error">{formError}</Alert>}
        <Field label={labels.name!} htmlFor="create-name" error={errors.name} required>
          <Input
            id="create-name"
            name="name"
            autoComplete="name"
            placeholder={labels.namePlaceholder}
            icon={<User />}
            required
          />
        </Field>
        <Field label={labels.email!} htmlFor="create-email" error={errors.email} required>
          <Input
            id="create-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={labels.emailPlaceholder}
            icon={<Mail />}
            onChange={(event) => {
              setEmail(event.target.value);
              setErrors((current) => ({ ...current, email: undefined }));
            }}
            required
          />
        </Field>
        <div className="grid items-start gap-5 sm:grid-cols-2">
          <PhoneField
            id="create-phone"
            labels={labels}
            value={phone}
            onChange={(value) => {
              setPhone(value);
              setErrors((current) => ({ ...current, phone: undefined }));
            }}
            error={errors.phone}
            hint={false}
          />
          <DistrictField
            id="create-districtCode"
            labels={labels}
            locale={locale}
            value={districtCode}
            onChange={(value) => {
              setDistrictCode(value);
              setErrors((current) => ({ ...current, districtCode: undefined }));
            }}
            error={errors.districtCode}
            hint={false}
          />
        </div>
        <p className="text-subtle -mt-2 text-xs">{labels.phoneHint}</p>
        <Field label={labels.password!} htmlFor="create-password" error={errors.password} required>
          <PasswordInput
            id="create-password"
            name="password"
            autoComplete="new-password"
            placeholder={labels.createPasswordPlaceholder}
            showLabel={labels.showPassword!}
            hideLabel={labels.hidePassword!}
            onChange={(event) => {
              setPassword(event.target.value);
              setErrors((current) => ({
                ...current,
                password: undefined,
                confirmPassword: undefined,
              }));
            }}
            required
          />
        </Field>
        {password && (
          <div className="space-y-3">
            <PasswordStrength
              password={password}
              email={email}
              policy={policy}
              labels={{
                label: labels.strengthLabel!,
                weak: labels.strengthWeak!,
                medium: labels.strengthMedium!,
                strong: labels.strengthStrong!,
              }}
            />
            <PasswordChecklist
              password={password}
              email={email}
              policy={policy}
              labels={checklistLabels(labels)}
            />
          </div>
        )}
        <Field
          label={labels.confirmPassword!}
          htmlFor="create-confirm"
          error={errors.confirmPassword}
          required
        >
          <PasswordInput
            id="create-confirm"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder={labels.confirmPlaceholder}
            showLabel={labels.showPassword!}
            hideLabel={labels.hidePassword!}
            onChange={() => setErrors((current) => ({ ...current, confirmPassword: undefined }))}
            required
          />
        </Field>
        <div>
          <label className="text-ink flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="acceptTerms"
              className="accent-sal mt-0.5 h-5 w-5 shrink-0"
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
        <div id="clerk-captcha" />
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? labels.creating : labels.createAccount}
          {!busy && <ArrowRight aria-hidden className="h-4 w-4" />}
        </Button>
      </form>
      {social.includes('oauth_google') && (
        <>
          <Divider label={labels.orContinue!} />
          <div className="space-y-2">
            <GoogleButton
              labels={labels}
              label={labels.google!}
              callbackUrl={paths.ssoCallback}
              completeUrl={paths.afterAuth}
              onError={setFormError}
              onStart={() => {
                const name = (
                  document.getElementById('create-name') as HTMLInputElement | null
                )?.value.trim();
                saveSignupDraft({ name, phone, districtCode });
              }}
            />
            <p className="text-subtle text-center text-xs">{labels.googleNote}</p>
            <p className="text-subtle text-center text-xs">{labels.googleDraftNote}</p>
          </div>
        </>
      )}
      <p className="text-subtle text-center text-sm">
        {labels.haveAccount}{' '}
        <button
          type="button"
          onClick={onSwitch}
          className="text-sal font-semibold underline-offset-4 hover:underline"
        >
          {labels.signInLink}
        </button>
      </p>
    </div>
  );
}
