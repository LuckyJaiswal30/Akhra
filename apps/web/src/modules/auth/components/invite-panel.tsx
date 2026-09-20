'use client';

import type { Route } from 'next';
import { useClerk, useSignUp } from '@clerk/nextjs';
import { ArrowRight, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
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
  buttonVariants,
} from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { requestJson } from '@/lib/api-client';
import { fill, type Labels } from './auth-parts';
import { clerkCode, clerkMessage } from './clerk-errors';
import { checklistLabels, passwordRuleMessage } from './password-labels';
import { PhoneField, phoneError } from './profile-fields';

type Viewer = { kind: 'signed-out' } | { kind: 'mismatch'; email: string } | { kind: 'ready' };

function SignInLink({
  labels,
  paths,
}: {
  labels: Labels;
  paths: { signIn: string; invite: string };
}) {
  return (
    <Link
      href={`${paths.signIn}?redirect_url=${encodeURIComponent(paths.invite)}` as never}
      className={buttonVariants({ size: 'lg', className: 'w-full' })}
    >
      {labels.signInToAccept}
    </Link>
  );
}

export function InvitePanel({
  token,
  invitedEmail,
  viewer,
  hasAccount,
  ticket,
  labels,
  paths,
  policy,
}: {
  token: string;
  invitedEmail: string;
  viewer: Viewer;
  hasAccount: boolean;
  ticket: string | null;
  labels: Labels;
  paths: { signIn: string; signUp: string; invite: string; dashboard: string };
  policy: PasswordPolicy;
}) {
  if (viewer.kind === 'ready')
    return <AcceptButton token={token} labels={labels} dashboard={paths.dashboard} />;
  if (viewer.kind === 'mismatch')
    return (
      <Mismatch
        current={viewer.email}
        invited={invitedEmail}
        labels={labels}
        returnTo={paths.invite}
      />
    );

  /**
   * Someone who already signs in to Akhra only needs to sign in. Offering them a sign-up form and
   * refusing it after they have chosen a password is a wasted form and a confusing one.
   */
  if (hasAccount) {
    return (
      <div className="space-y-4">
        <Alert tone="info">{labels.alreadyAccount}</Alert>
        <SignInLink labels={labels} paths={paths} />
      </div>
    );
  }

  if (ticket) return <TicketSignUp ticket={ticket} labels={labels} paths={paths} policy={policy} />;

  return (
    <div className="space-y-4">
      <p className="text-subtle text-center">{labels.signedOutPrompt}</p>
      <Link
        href={`${paths.signUp}?redirect_url=${encodeURIComponent(paths.invite)}` as never}
        className={buttonVariants({ size: 'lg', className: 'w-full' })}
      >
        {labels.createAccount}
      </Link>
      <Link
        href={`${paths.signIn}?redirect_url=${encodeURIComponent(paths.invite)}` as never}
        className={buttonVariants({ size: 'lg', variant: 'secondary', className: 'w-full' })}
      >
        {labels.signIn}
      </Link>
    </div>
  );
}

function AcceptButton({
  token,
  labels,
  dashboard,
}: {
  token: string;
  labels: Labels;
  dashboard: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [pending, startTransition] = useTransition();

  if (accepted) {
    return (
      <div className="space-y-5">
        <Alert tone="success" title={labels.acceptedTitle}>
          {labels.acceptedBody}
        </Alert>
        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={() => {
            router.push(dashboard as Route);
            router.refresh();
          }}
        >
          {labels.goToDashboard}
          <ArrowRight aria-hidden className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}
      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await requestJson('/api/v1/invites/redeem', { body: { token } });
            if (result.ok) setAccepted(true);
            else setError(result.error.message);
          })
        }
      >
        {pending ? labels.accepting : labels.acceptButton}
      </Button>
    </div>
  );
}

function Mismatch({
  current,
  invited,
  labels,
  returnTo,
}: {
  current: string;
  invited: string;
  labels: Labels;
  returnTo: string;
}) {
  const { signOut } = useClerk();
  return (
    <div className="space-y-4">
      <Alert tone="error">{fill(labels.mismatch, { current, invited })}</Alert>
      <Button
        type="button"
        size="lg"
        variant="secondary"
        className="w-full"
        onClick={() => void signOut({ redirectUrl: returnTo })}
      >
        {labels.signOut}
      </Button>
    </div>
  );
}

function TicketSignUp({
  ticket,
  labels,
  paths,
  policy,
}: {
  ticket: string;
  labels: Labels;
  paths: { signIn: string; invite: string };
  policy: PasswordPolicy;
}) {
  const { signUp, fetchStatus } = useSignUp();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [existing, setExisting] = useState(false);
  const busy = fetchStatus === 'fetching';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') ?? '').trim();
    const found: Record<string, string> = {};
    if (name.length < 2) found.name = labels.errorName!;
    const badPhone = phoneError(phone, labels);
    if (badPhone) found.phone = badPhone;
    const problem = passwordProblem(password, { policy });
    if (problem) found.password = passwordRuleMessage(problem, labels, policy);
    if (password !== String(data.get('confirmPassword') ?? ''))
      found.confirmPassword = labels.errorMismatch!;
    if (data.get('acceptTerms') !== 'on') found.acceptTerms = labels.errorConsent!;
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;

    const { error } = await signUp.create({
      strategy: 'ticket',
      ticket,
      password,
      ...splitName(name),
      unsafeMetadata: {
        acceptedPrivacyNoticeAt: new Date().toISOString(),
        phone: normalizePhone(phone),
      } satisfies SignupMetadata,
    });
    if (error) {
      if (clerkCode(error) === 'form_identifier_exists') setExisting(true);
      else setFormError(clerkMessage(error, labels));
      return;
    }
    if (signUp.status !== 'complete') {
      setFormError(labels.errorGeneric!);
      return;
    }
    await signUp.finalize({
      navigate: () => {
        router.replace(paths.invite as Route);
        router.refresh();
      },
    });
  }

  if (existing) {
    return (
      <div className="space-y-4">
        <Alert tone="info">{labels.alreadyAccount}</Alert>
        <SignInLink labels={labels} paths={paths} />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div>
        <h2 className="text-ink text-xl font-bold">{labels.ticketTitle}</h2>
        <p className="text-subtle mt-1 text-sm">{labels.ticketBody}</p>
      </div>
      {formError && <Alert tone="error">{formError}</Alert>}
      <Field label={labels.name!} htmlFor="invite-name" error={errors.name} required>
        <Input id="invite-name" name="name" autoComplete="name" icon={<User />} required />
      </Field>
      <PhoneField
        id="invite-phone"
        labels={labels}
        value={phone}
        onChange={(value) => {
          setPhone(value);
          setErrors(({ phone: _cleared, ...rest }) => rest);
        }}
        error={errors.phone}
      />
      <Field label={labels.password!} htmlFor="invite-password" error={errors.password} required>
        <PasswordInput
          id="invite-password"
          name="password"
          autoComplete="new-password"
          showLabel={labels.showPassword!}
          hideLabel={labels.hidePassword!}
          onChange={(event) => {
            setPassword(event.target.value);
            setErrors(({ password: _cleared, confirmPassword: _also, ...rest }) => rest);
          }}
          required
        />
      </Field>
      <PasswordChecklist password={password} policy={policy} labels={checklistLabels(labels)} />
      <Field
        label={labels.confirmPassword!}
        htmlFor="invite-confirm"
        error={errors.confirmPassword}
        required
      >
        <PasswordInput
          id="invite-confirm"
          name="confirmPassword"
          autoComplete="new-password"
          showLabel={labels.showPassword!}
          hideLabel={labels.hidePassword!}
          onChange={() => setErrors(({ confirmPassword: _cleared, ...rest }) => rest)}
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
      </Button>
    </form>
  );
}
