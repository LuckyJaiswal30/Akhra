'use client';

import type { Route } from 'next';
import { useClerk, useSignIn } from '@clerk/nextjs';
import { ArrowRight, Mail, MailCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { passwordProblem, type PasswordPolicy } from '@akhra/shared';
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  PasswordChecklist,
  PasswordInput,
  PasswordStrength,
} from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { BackButton, CodeStep, SuccessPanel, fill, type Labels } from './auth-parts';
import { clerkCode, clerkFieldError, clerkMessage, continueIfSignedIn } from './clerk-errors';
import { checklistLabels, passwordRuleMessage } from './password-labels';

type Step = 'email' | 'code' | 'password' | 'done';
// A Google-only account has no password to reset, so it signs in with an email code and sets one.
type Mode = 'reset' | 'emailCode';

export function ForgotPasswordCard({
  labels,
  signInPath,
  dashboardPath,
  policy,
}: {
  labels: Labels;
  signInPath: string;
  dashboardPath: string;
  policy: PasswordPolicy;
}) {
  const { signIn, fetchStatus } = useSignIn();
  const clerk = useClerk();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('reset');
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [unknown, setUnknown] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const busy = fetchStatus === 'fetching';

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const identifier = String(new FormData(event.currentTarget).get('email') ?? '')
      .trim()
      .toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
      setError({ field: 'email', message: labels.errorEmailInvalid! });
      return;
    }
    setError(null);
    setEmail(identifier);
    const created = await signIn.create({ identifier });
    if (continueIfSignedIn(created.error, dashboardPath)) return;
    setUnknown(Boolean(created.error));
    if (created.error && clerkCode(created.error) !== 'form_identifier_not_found') {
      setError({ message: clerkMessage(created.error, labels) });
      return;
    }
    if (!created.error) {
      const canReset = signIn.supportedFirstFactors.some(
        (factor) => factor.strategy === 'reset_password_email_code',
      );
      let sent = canReset ? await signIn.resetPasswordEmailCode.sendCode() : null;
      const useEmailCode = !canReset || clerkCode(sent?.error) === 'factor_not_found';
      if (useEmailCode) sent = await signIn.emailCode.sendCode();
      if (sent?.error) {
        setError({ message: clerkMessage(sent.error, labels) });
        return;
      }
      setMode(useEmailCode ? 'emailCode' : 'reset');
    }
    setStep('code');
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const confirm = String(new FormData(event.currentTarget).get('confirmPassword') ?? '');
    const problem = passwordProblem(password, { policy, email });
    if (problem) {
      setError({ field: 'password', message: passwordRuleMessage(problem, labels, policy) });
      return;
    }
    if (password !== confirm) {
      setError({ field: 'confirmPassword', message: labels.errorMismatch! });
      return;
    }
    setError(null);
    if (mode === 'emailCode') {
      try {
        await clerk.user?.updatePassword({ newPassword: password, signOutOfOtherSessions: true });
        window.location.assign(dashboardPath);
      } catch (failure) {
        setError(clerkFieldError(failure, labels));
      }
      return;
    }
    const { error: failure } = await signIn.resetPasswordEmailCode.submitPassword({
      password,
      signOutOfOtherSessions: true,
    });
    if (failure) {
      setError(clerkFieldError(failure, labels));
      return;
    }
    // The new password is saved either way. Signing in straight away saves a trip back through the
    // sign-in page; if Clerk wants more checks first, the person signs in normally.
    if (signIn.status === 'complete') {
      const { error: notFinalized } = await signIn.finalize({
        navigate: () => window.location.assign(dashboardPath),
      });
      if (!notFinalized) return;
    }
    setStep('done');
  }

  const checklist = checklistLabels(labels);

  return (
    <Card className="p-6 sm:p-10">
      {step === 'email' && (
        <div className="space-y-6">
          <BackButton label={labels.back!} onClick={() => router.push(signInPath as Route)} />
          <div>
            <h1 className="text-ink text-3xl font-bold">{labels.forgotTitle}</h1>
            <p className="text-subtle mt-2">{labels.forgotSubtitle}</p>
          </div>
          <form onSubmit={sendCode} className="space-y-5" noValidate>
            {error && !error.field && <Alert tone="error">{error.message}</Alert>}
            <Field
              label={labels.email!}
              htmlFor="forgot-email"
              error={error?.field === 'email' ? error.message : undefined}
            >
              <Input
                id="forgot-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder={labels.emailPlaceholder}
                icon={<Mail />}
                required
              />
            </Field>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? labels.sendingCode : labels.sendCode}
              {!busy && <ArrowRight aria-hidden className="h-4 w-4" />}
            </Button>
          </form>
          <p className="bg-mint text-subtle flex items-start gap-3 rounded-xl px-4 py-4 text-sm">
            <MailCheck aria-hidden className="text-sal mt-0.5 h-5 w-5 shrink-0" />
            {labels.forgotInfo}
          </p>
        </div>
      )}

      {step === 'code' && (
        <CodeStep
          title={labels.forgotCodeTitle!}
          intro={fill(labels.forgotCodeSent, { email })}
          labels={labels}
          submitLabel={labels.verifyCode!}
          busy={busy}
          onBack={() => setStep('email')}
          onResend={async () =>
            unknown
              ? null
              : mode === 'emailCode'
                ? signIn.emailCode.sendCode()
                : signIn.resetPasswordEmailCode.sendCode()
          }
          onVerify={async (code) => {
            if (unknown) return labels.errorCodeIncorrect!;
            if (mode === 'emailCode') {
              const { error: failure } = await signIn.emailCode.verifyCode({ code });
              if (failure) return clerkMessage(failure, labels);
              if (signIn.status !== 'complete') {
                return signIn.status === 'needs_second_factor'
                  ? labels.secondFactor!
                  : labels.errorGeneric!;
              }
              // Stay here: the person still has to choose a password before going anywhere.
              const { error: notFinalized } = await signIn.finalize({ navigate: () => undefined });
              if (notFinalized) return clerkMessage(notFinalized, labels);
              setStep('password');
              return null;
            }
            const { error: failure } = await signIn.resetPasswordEmailCode.verifyCode({ code });
            if (failure) return clerkMessage(failure, labels);
            if (signIn.status !== 'needs_new_password') return labels.errorGeneric!;
            setStep('password');
            return null;
          }}
        />
      )}

      {step === 'password' && (
        <div className="space-y-6">
          {mode === 'reset' && <BackButton label={labels.back!} onClick={() => setStep('code')} />}
          <div>
            <h1
              data-step-heading
              tabIndex={-1}
              className="text-ink text-3xl font-bold outline-none"
            >
              {mode === 'emailCode' ? labels.setPasswordTitle : labels.newPasswordTitle}
            </h1>
            <p className="text-subtle mt-2">
              {mode === 'emailCode' ? labels.setPasswordSubtitle : labels.newPasswordSubtitle}
            </p>
          </div>
          <form onSubmit={submitPassword} className="space-y-5" noValidate>
            {error && !['password', 'confirmPassword'].includes(error.field ?? '') && (
              <Alert tone="error">{error.message}</Alert>
            )}
            <Field
              label={labels.newPassword!}
              htmlFor="reset-password"
              error={error?.field === 'password' ? error.message : undefined}
            >
              <PasswordInput
                id="reset-password"
                name="password"
                autoComplete="new-password"
                placeholder={labels.newPasswordPlaceholder}
                showLabel={labels.showPassword!}
                hideLabel={labels.hidePassword!}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError((current) => (current?.field === 'password' ? null : current));
                }}
                required
              />
            </Field>
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
            <Field
              label={labels.confirmNewPassword!}
              htmlFor="reset-confirm"
              error={error?.field === 'confirmPassword' ? error.message : undefined}
            >
              <PasswordInput
                id="reset-confirm"
                name="confirmPassword"
                autoComplete="new-password"
                placeholder={labels.confirmNewPlaceholder}
                showLabel={labels.showPassword!}
                hideLabel={labels.hidePassword!}
                onChange={() =>
                  setError((current) => (current?.field === 'confirmPassword' ? null : current))
                }
                required
              />
            </Field>
            <PasswordChecklist
              password={password}
              email={email}
              policy={policy}
              labels={checklist}
            />
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? labels.resetting : labels.resetPassword}
              {!busy && <ArrowRight aria-hidden className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      )}

      {step === 'done' && (
        <SuccessPanel title={labels.resetDoneTitle!} body={labels.resetDoneBody!}>
          <Button
            type="button"
            size="lg"
            className="w-full sm:w-auto sm:min-w-64"
            onClick={async () => {
              await signIn.reset();
              router.push(signInPath as Route);
            }}
          >
            {labels.signIn}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Button>
          <Link
            href="/"
            className="text-sal inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4"
          >
            {labels.backToHome}
          </Link>
        </SuccessPanel>
      )}
    </Card>
  );
}
