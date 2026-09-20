'use client';

import type { Route } from 'next';
import { useClerk } from '@clerk/nextjs';
import {
  ArrowRight,
  Check,
  KeyRound,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  UserRoundCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Alert, Button, Card, buttonVariants } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { signOutEverywhereAction } from '../security-actions';
import type { Labels } from './auth-parts';

export type SecureAccountState = { kind: 'confirm' } | { kind: 'guide' } | { kind: 'done' };

function Badge({ tone, children }: { tone: 'danger' | 'sal'; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'mx-auto grid h-16 w-16 place-items-center rounded-full',
        tone === 'danger' ? 'bg-danger-wash text-danger' : 'bg-sal-wash text-sal',
      )}
    >
      {children}
    </span>
  );
}

export function SecureAccountCard({
  state,
  labels,
  donePath,
}: {
  state: SecureAccountState;
  labels: Labels;
  donePath: string;
}) {
  const router = useRouter();
  const clerk = useClerk();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await signOutEverywhereAction();
      if (!result.ok) {
        if (result.reason === 'signed_out') router.refresh();
        else setError(labels.errorFailed!);
        return;
      }
      if (clerk.isSignedIn) await clerk.signOut().catch(() => undefined);
      router.replace(donePath as Route);
      router.refresh();
    });
  }

  if (state.kind === 'done') {
    return (
      <Card className="p-6 sm:p-10">
        <div className="text-center">
          <Badge tone="sal">
            <ShieldCheck aria-hidden className="h-8 w-8" />
          </Badge>
          <h1 className="text-ink mt-5 text-2xl font-bold sm:text-3xl">{labels.doneTitle}</h1>
          <p className="text-subtle mx-auto mt-2 max-w-md">{labels.doneBody}</p>
        </div>
        <div className="border-line mt-8 rounded-xl border p-5">
          <h2 className="text-subtle text-sm font-semibold tracking-wide uppercase">
            {labels.nextTitle}
          </h2>
          <ol className="mt-4 space-y-4">
            {[
              { Icon: KeyRound, text: labels.nextReset },
              { Icon: UserRoundCheck, text: labels.nextReview },
            ].map(({ Icon, text }, index) => (
              <li key={text} className="flex gap-3">
                <span className="bg-sal-wash text-sal grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold">
                  {index + 1}
                </span>
                <p className="text-ink flex-1 pt-1">
                  <Icon aria-hidden className="text-sal mr-1.5 inline h-4 w-4 -translate-y-px" />
                  {text}
                </p>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/forgot-password"
            className={buttonVariants({ size: 'lg', className: 'w-full sm:flex-1' })}
          >
            {labels.resetPassword}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
          <Link
            href="/sign-in"
            className={buttonVariants({
              size: 'lg',
              variant: 'secondary',
              className: 'w-full sm:flex-1',
            })}
          >
            {labels.signIn}
          </Link>
        </div>
      </Card>
    );
  }

  if (state.kind === 'guide') {
    return (
      <Card className="p-6 sm:p-10">
        <div className="text-center">
          <Badge tone="sal">
            <ShieldAlert aria-hidden className="h-8 w-8" />
          </Badge>
          <h1 className="text-ink mt-5 text-2xl font-bold sm:text-3xl">{labels.guideTitle}</h1>
          <p className="text-subtle mx-auto mt-2 max-w-md">{labels.guideBody}</p>
        </div>
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/forgot-password"
            className={buttonVariants({ size: 'lg', className: 'w-full' })}
          >
            <KeyRound aria-hidden className="h-4 w-4" />
            {labels.resetPassword}
          </Link>
          <Link
            href="/sign-in?redirect_url=%2Fsecure-account"
            className={buttonVariants({ size: 'lg', variant: 'secondary', className: 'w-full' })}
          >
            {labels.signIn}
          </Link>
        </div>
        <p className="text-subtle mt-5 text-center text-sm">{labels.guideSignedIn}</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-10">
      <div className="text-center">
        <Badge tone="danger">
          <ShieldAlert aria-hidden className="h-8 w-8" />
        </Badge>
        <h1 className="text-ink mt-5 text-2xl font-bold sm:text-3xl">{labels.confirmTitle}</h1>
        <p className="text-subtle mx-auto mt-2 max-w-md">{labels.confirmBodySession}</p>
      </div>

      <div className="bg-mint mt-7 rounded-xl px-5 py-4">
        <h2 className="text-ink text-sm font-semibold">{labels.willHappen}</h2>
        <ul className="text-ink mt-3 space-y-2 text-sm">
          {[labels.happensSessions, labels.happensData].map((text) => (
            <li key={text} className="flex items-start gap-2">
              <Check aria-hidden className="text-sal mt-0.5 h-4 w-4 shrink-0" strokeWidth={3} />
              {text}
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <div className="mt-5">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <div className="mt-7 flex flex-col gap-3">
        <Button
          type="button"
          size="lg"
          variant="destructive"
          className="w-full"
          disabled={pending}
          onClick={confirm}
        >
          <LogOut aria-hidden className="h-4 w-4" />
          {pending ? labels.signingOut : labels.signOutAll}
        </Button>
        <Link
          href="/account"
          className={buttonVariants({ size: 'lg', variant: 'secondary', className: 'w-full' })}
        >
          {labels.cancel}
        </Link>
      </div>
    </Card>
  );
}
