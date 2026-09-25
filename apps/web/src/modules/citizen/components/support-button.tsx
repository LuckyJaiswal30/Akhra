'use client';

import { HandHeart } from 'lucide-react';
import { useActionState } from 'react';
import { Alert, Button, buttonVariants } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { toggleSupportAction } from '../actions';
import type { SupportState } from '../support';

export function SupportButton({
  problemId,
  initial,
  signedIn,
  returnPath,
  labels,
}: {
  problemId: string;
  initial: SupportState;
  signedIn: boolean;
  returnPath: string;
  labels: { support: string; withdraw: string; count: string; signInToSupport: string };
}) {
  const [state, action, isPending] = useActionState(toggleSupportAction, null);
  const current = state?.ok && state.data ? state.data : initial;
  const count = labels.count.replace('{count}', String(current.supportCount));

  if (!signedIn) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/sign-in?redirect_url=${encodeURIComponent(returnPath)}` as never}
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
        >
          <HandHeart aria-hidden className="h-4 w-4" />
          {labels.signInToSupport}
        </Link>
        <span className="text-subtle text-sm">{count}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <form action={action} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="problemId" value={problemId} />
        <input type="hidden" name="intent" value={current.supported ? 'withdraw' : 'support'} />
        <Button
          type="submit"
          size="sm"
          variant={current.supported ? 'primary' : 'secondary'}
          aria-pressed={current.supported}
          disabled={isPending}
        >
          <HandHeart aria-hidden className="h-4 w-4" />
          {current.supported ? labels.withdraw : labels.support}
        </Button>
        <span className="text-subtle text-sm" aria-live="polite">
          {count}
        </span>
      </form>
      {state && !state.ok && <Alert tone="error">{state.error.message}</Alert>}
    </div>
  );
}
