'use client';

import type { Route } from 'next';
import { useSignIn } from '@clerk/nextjs';
import { ArrowLeft, CircleCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { JharkhandLandscape } from '@/components/illustrations/jharkhand-landscape';
import { Button, OtpInput, buttonVariants } from '@/components/ui';
import { clerkMessage } from './clerk-errors';

export type Labels = Record<string, string>;

export const fill = (text: string | undefined, values: Record<string, string>) =>
  (text ?? '').replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');

export function useFinishTo(target: string) {
  const router = useRouter();
  return ({ decorateUrl }: { decorateUrl: (url: string) => string }) => {
    const url = decorateUrl(target);
    if (url.startsWith('http')) {
      window.location.href = url;
      return;
    }
    router.push(url as Route);
    router.refresh();
  };
}

export function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 shrink-0">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3.01h3.88c2.27-2.09 3.57-5.17 3.57-8.83Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.01c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.26v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.37-2.29v-3.1H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.39l4.01-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.61l4.01 3.1C6.22 6.87 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

export function GoogleButton({
  labels,
  label,
  callbackUrl,
  completeUrl,
  onError,
  onStart,
}: {
  labels: Labels;
  label: string;
  callbackUrl: string;
  completeUrl: string;
  onError: (message: string) => void;
  onStart?: () => void;
}) {
  const { signIn, fetchStatus } = useSignIn();
  return (
    <button
      type="button"
      disabled={fetchStatus === 'fetching'}
      onClick={async () => {
        onStart?.();
        const { error } = await signIn.sso({
          strategy: 'oauth_google',
          redirectCallbackUrl: callbackUrl,
          redirectUrl: completeUrl,
        });
        if (error) onError(clerkMessage(error, labels));
      }}
      className={buttonVariants({ variant: 'secondary', size: 'lg', className: 'w-full' })}
    >
      <GoogleMark />
      {label}
    </button>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="text-subtle flex items-center gap-4 text-sm" role="separator">
      <span aria-hidden className="bg-line h-px flex-1" />
      {label}
      <span aria-hidden className="bg-line h-px flex-1" />
    </div>
  );
}

export function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-ink hover:text-sal inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
    >
      <ArrowLeft aria-hidden className="h-4 w-4" />
      {label}
    </button>
  );
}

const RESEND_AFTER_SECONDS = 30;

export function CodeStep({
  title,
  intro,
  labels,
  submitLabel,
  busy,
  onVerify,
  onResend,
  onBack,
}: {
  title: string;
  intro: string;
  labels: Labels;
  submitLabel: string;
  busy: boolean;
  onVerify: (code: string) => Promise<string | null>;
  onResend: () => Promise<unknown>;
  onBack: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(RESEND_AFTER_SECONDS);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get('code') ?? '');
    if (!/^\d{6}$/.test(code)) {
      setError(labels.errorCodeFormat!);
      return;
    }
    setError(await onVerify(code));
  }

  return (
    <div className="space-y-6">
      <BackButton label={labels.back!} onClick={onBack} />
      <div className="text-center">
        <h2
          data-step-heading
          tabIndex={-1}
          className="text-ink text-2xl font-bold outline-none sm:text-3xl"
        >
          {title}
        </h2>
        <p className="text-subtle mx-auto mt-2 max-w-sm">{intro}</p>
      </div>
      <form onSubmit={submit} className="space-y-6" noValidate>
        <OtpInput name="code" label={labels.codeLabel!} error={error ?? undefined} autoFocus />
        <p className="text-subtle text-center text-sm" aria-live="polite">
          {labels.resendPrompt}{' '}
          {seconds > 0 ? (
            <span className="text-sal font-semibold">
              {fill(labels.resendIn, { seconds: String(seconds).padStart(2, '0') })}
            </span>
          ) : (
            <button
              type="button"
              className="text-sal font-semibold underline underline-offset-4"
              onClick={async () => {
                setSeconds(RESEND_AFTER_SECONDS);
                setResent(true);
                await onResend();
              }}
            >
              {labels.resendNow}
            </button>
          )}
        </p>
        {resent && (
          <p role="status" className="text-subtle text-center text-sm">
            {labels.resent}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? labels.verifying : submitLabel}
        </Button>
      </form>
    </div>
  );
}

export function SuccessPanel({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div className="text-center">
      <span className="bg-sal-wash mx-auto grid h-20 w-20 place-items-center rounded-full">
        <CircleCheck aria-hidden className="text-sal h-11 w-11" />
      </span>
      <h2
        data-step-heading
        tabIndex={-1}
        className="text-ink mt-6 text-2xl font-bold outline-none sm:text-3xl"
      >
        {title}
      </h2>
      <p className="text-subtle mx-auto mt-2 max-w-sm">{body}</p>
      <div className="mt-8 flex flex-col items-center gap-3">{children}</div>
      <div
        aria-hidden
        className="-mx-6 mt-8 -mb-6 h-28 overflow-hidden rounded-b-2xl sm:-mx-10 sm:-mb-10"
      >
        <JharkhandLandscape variant="band" />
      </div>
    </div>
  );
}
