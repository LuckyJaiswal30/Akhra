'use client';

import { useSignIn } from '@clerk/nextjs';
import { ArrowRight, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Alert, Button, Field, Input, PasswordInput } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { CodeStep, Divider, GoogleButton, fill, useFinishTo, type Labels } from './auth-parts';
import { clerkFieldError, clerkMessage } from './clerk-errors';
import { useFocusOnChange, type Paths } from './auth-card-parts';

export function SignInPanel({
  labels,
  paths,
  social,
  onFlow,
  onSwitch,
}: {
  labels: Labels;
  paths: Paths;
  social: string[];
  onFlow: (v: boolean) => void;
  onSwitch: () => void;
}) {
  const { signIn, fetchStatus } = useSignIn();
  const finish = useFinishTo(paths.afterAuth);
  const [step, setStep] = useState<'form' | 'trust'>('form');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<{
    field?: 'email' | 'password' | 'code';
    message: string;
  } | null>(null);
  const busy = fetchStatus === 'fetching';
  useFocusOnChange(step);

  async function afterPassword() {
    if (signIn.status === 'complete') {
      await signIn.finalize({ navigate: finish });
      return;
    }
    if (
      signIn.status === 'needs_client_trust' &&
      signIn.supportedSecondFactors.some((factor) => factor.strategy === 'email_code')
    ) {
      await signIn.mfa.sendEmailCode();
      setStep('trust');
      onFlow(true);
      return;
    }
    setError({
      message:
        signIn.status === 'needs_second_factor' ? labels.secondFactor! : labels.errorGeneric!,
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const emailAddress = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    if (!emailAddress || !password) {
      setError({ message: labels.errorMissingCredentials! });
      return;
    }
    setError(null);
    setEmail(emailAddress);
    const { error: failure } = await signIn.password({ emailAddress, password });
    if (failure) {
      setError(clerkFieldError(failure, labels));
      return;
    }
    await afterPassword();
  }

  if (step === 'trust') {
    return (
      <CodeStep
        title={labels.trustTitle!}
        intro={fill(labels.trustSent, { email })}
        labels={labels}
        submitLabel={labels.verifyContinue!}
        busy={busy}
        onBack={() => {
          void signIn.reset();
          setStep('form');
          onFlow(false);
        }}
        onResend={() => signIn.mfa.sendEmailCode()}
        onVerify={async (code) => {
          const { error: failure } = await signIn.mfa.verifyEmailCode({ code });
          if (failure) return clerkMessage(failure, labels);
          if (signIn.status !== 'complete') return labels.errorGeneric!;
          await signIn.finalize({ navigate: finish });
          return null;
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="space-y-5" noValidate>
        {error && !error.field && <Alert tone="error">{error.message}</Alert>}
        <Field
          label={labels.email!}
          htmlFor="signin-email"
          error={error?.field === 'email' ? error.message : undefined}
        >
          <Input
            id="signin-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={labels.emailPlaceholder}
            icon={<Mail />}
            required
          />
        </Field>
        <div className="space-y-1">
          <Field
            label={labels.password!}
            htmlFor="signin-password"
            error={error?.field === 'password' ? error.message : undefined}
          >
            <PasswordInput
              id="signin-password"
              name="password"
              autoComplete="current-password"
              placeholder={labels.passwordPlaceholder}
              showLabel={labels.showPassword!}
              hideLabel={labels.hidePassword!}
              required
            />
          </Field>
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sal inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline"
            >
              {labels.forgotLink}
            </Link>
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? labels.signingIn : labels.signIn}
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
              onError={(message) => setError({ message })}
            />
            <p className="text-subtle text-center text-xs">{labels.googleNote}</p>
          </div>
        </>
      )}
      <p className="text-subtle text-center text-sm">
        {labels.noAccount}{' '}
        <button
          type="button"
          onClick={onSwitch}
          className="text-sal font-semibold underline-offset-4 hover:underline"
        >
          {labels.createLink}
        </button>
      </p>
    </div>
  );
}
