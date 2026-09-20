'use client';

import { useReverification, useUser } from '@clerk/nextjs';
import { isReverificationCancelledError } from '@clerk/nextjs/errors';
import { KeyRound, MonitorSmartphone } from 'lucide-react';
import { useState, useTransition, type FormEvent } from 'react';
import { passwordProblem, type PasswordPolicy } from '@akhra/shared';
import {
  Alert,
  Button,
  Field,
  PasswordChecklist,
  PasswordInput,
  PasswordStrength,
  buttonVariants,
} from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { GoogleMark } from './auth-parts';
import { clerkCode, clerkMessage } from './clerk-errors';
import { checklistLabels, passwordRuleMessage } from './password-labels';

type Labels = Record<string, string>;

function MethodRow({
  icon,
  title,
  detail,
  status,
  active,
  action,
  hideStatus = false,
}: {
  icon: React.ReactNode;
  title: string;
  detail?: string;
  status: string;
  active: boolean;
  action?: React.ReactNode;
  hideStatus?: boolean;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4 first:pt-0 last:pb-0">
      <span className="border-line bg-surface grid h-11 w-11 shrink-0 place-items-center rounded-full border">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-ink flex flex-wrap items-center gap-2 font-medium">
          {title}
          {!hideStatus && (
            <span
              className={
                active
                  ? 'bg-sal-wash text-sal-deep rounded-full px-2.5 py-0.5 text-xs font-medium'
                  : 'bg-well text-subtle rounded-full px-2.5 py-0.5 text-xs font-medium'
              }
            >
              {status}
            </span>
          )}
        </p>
        {detail && <p className="text-subtle mt-0.5 text-sm break-all">{detail}</p>}
      </div>
      {action}
    </li>
  );
}

export function AccountSecurity({
  labels,
  policy,
  googleEmail,
  hadPassword,
}: {
  labels: Labels;
  policy: PasswordPolicy;
  googleEmail: string | null;
  hadPassword: boolean;
}) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const hasPassword = user?.passwordEnabled ?? hadPassword;
  const google = user
    ? (user.externalAccounts.find((account) => account.provider === 'google')?.emailAddress ?? null)
    : googleEmail;

  return (
    <div className="space-y-5">
      {saved && <Alert tone="success">{labels.passwordSaved}</Alert>}
      <ul className="divide-line divide-y">
        {google && (
          <MethodRow
            icon={<GoogleMark />}
            title={labels.methodGoogle!}
            detail={google}
            status={labels.connected!}
            active
          />
        )}
        <MethodRow
          icon={<KeyRound aria-hidden className="text-sal h-5 w-5" />}
          title={labels.methodPassword!}
          detail={hasPassword ? labels.passwordHint : labels.passwordOffBody}
          status={hasPassword ? labels.active! : labels.notSet!}
          active={hasPassword}
          action={
            !open && (
              <Button
                type="button"
                size="sm"
                variant={hasPassword ? 'secondary' : 'primary'}
                aria-expanded={false}
                aria-controls="password-form"
                onClick={() => {
                  setSaved(false);
                  setOpen(true);
                }}
                className="w-full sm:w-auto"
              >
                {hasPassword ? labels.changePassword : labels.setPassword}
              </Button>
            )
          }
        />
        <MethodRow
          icon={<MonitorSmartphone aria-hidden className="text-danger h-5 w-5" />}
          title={labels.accountRowTitle!}
          detail={labels.accountRowBody}
          status={labels.connected!}
          active
          hideStatus
          action={
            <Link
              href="/secure-account"
              className={buttonVariants({
                size: 'sm',
                variant: 'secondary',
                className: 'w-full sm:w-auto',
              })}
            >
              {labels.signOutAll}
            </Link>
          }
        />
      </ul>
      {open && (
        <PasswordForm
          labels={labels}
          policy={policy}
          hasPassword={hasPassword}
          onCancel={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            setSaved(true);
          }}
        />
      )}
    </div>
  );
}

function PasswordForm({
  labels,
  policy,
  hasPassword,
  onCancel,
  onSaved,
}: {
  labels: Labels;
  policy: PasswordPolicy;
  hasPassword: boolean;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { user } = useUser();
  const updatePassword = useReverification(
    (params: Parameters<NonNullable<typeof user>['updatePassword']>[0]) =>
      user!.updatePassword(params),
  );
  const [password, setPassword] = useState('');
  const [error, setError] = useState<{
    field?: 'current' | 'password' | 'confirm';
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const email = user?.primaryEmailAddress?.emailAddress ?? undefined;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const currentPassword = String(data.get('currentPassword') ?? '');
    const confirm = String(data.get('confirmPassword') ?? '');
    setError(null);

    if (hasPassword && !currentPassword) {
      setError({ field: 'current', message: labels.errorCurrent! });
      return;
    }
    const problem = passwordProblem(password, { policy, email });
    if (problem) {
      setError({ field: 'password', message: passwordRuleMessage(problem, labels, policy) });
      return;
    }
    if (password !== confirm) {
      setError({ field: 'confirm', message: labels.errorMismatch! });
      return;
    }

    startTransition(async () => {
      try {
        await updatePassword({
          newPassword: password,
          ...(hasPassword ? { currentPassword } : {}),
          signOutOfOtherSessions: true,
        });
        onSaved();
      } catch (failure) {
        if (isReverificationCancelledError(failure)) return;
        const code = clerkCode(failure);
        if (code === 'form_password_incorrect')
          setError({ field: 'current', message: labels.errorCurrent! });
        else if (code?.startsWith('form_password'))
          setError({ field: 'password', message: clerkMessage(failure, labels) });
        else setError({ message: clerkMessage(failure, labels) });
      }
    });
  }

  return (
    <form
      id="password-form"
      onSubmit={submit}
      className="border-line bg-mint/40 space-y-5 rounded-xl border p-4 sm:p-5"
      noValidate
    >
      {error && !error.field && <Alert tone="error">{error.message}</Alert>}

      {hasPassword && (
        <Field
          label={labels.currentPassword!}
          htmlFor="current-password"
          error={error?.field === 'current' ? error.message : undefined}
          required
        >
          <PasswordInput
            id="current-password"
            name="currentPassword"
            autoComplete="current-password"
            showLabel={labels.showPassword!}
            hideLabel={labels.hidePassword!}
            onChange={() => setError((current) => (current?.field === 'current' ? null : current))}
            autoFocus
            required
          />
        </Field>
      )}

      <Field
        label={labels.newPassword!}
        htmlFor="new-password"
        error={error?.field === 'password' ? error.message : undefined}
        required
      >
        <PasswordInput
          id="new-password"
          name="newPassword"
          autoComplete="new-password"
          showLabel={labels.showPassword!}
          hideLabel={labels.hidePassword!}
          onChange={(event) => {
            setPassword(event.target.value);
            setError((current) => (current?.field === 'password' ? null : current));
          }}
          autoFocus={!hasPassword}
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
        htmlFor="confirm-password"
        error={error?.field === 'confirm' ? error.message : undefined}
        required
      >
        <PasswordInput
          id="confirm-password"
          name="confirmPassword"
          autoComplete="new-password"
          showLabel={labels.showPassword!}
          hideLabel={labels.hidePassword!}
          onChange={() => setError((current) => (current?.field === 'confirm' ? null : current))}
          required
        />
      </Field>

      <p className="text-subtle text-xs">{labels.signOutOthers}</p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          {labels.cancel}
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? labels.updating : hasPassword ? labels.updatePassword : labels.setPassword}
        </Button>
      </div>
    </form>
  );
}
