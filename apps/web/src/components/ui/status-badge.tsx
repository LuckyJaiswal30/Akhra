import { STATUS_DEFINITIONS, type ProblemStatus } from '@akhra/shared';
import { cn } from '@/lib/utils';

const TONE_BY_STATUS: Record<ProblemStatus, keyof typeof TONES> = {
  submitted: 'waiting',
  on_hold: 'waiting',
  validated: 'active',
  assigned: 'active',
  action_taken: 'active',
  routed: 'active',
  in_progress: 'active',
  prototyped: 'active',
  piloted: 'active',
  deployed: 'active',
  closed: 'done',
  duplicate: 'done',
  rejected: 'stopped',
};

const TONES = {
  waiting: 'border-warning/40 bg-warning-wash text-warning',
  active: 'border-sal/40 bg-sal-wash text-sal-deep',
  done: 'border-line bg-well text-ink',
  stopped: 'border-danger/40 bg-danger-wash text-danger',
} as const;

export function StatusBadge({
  status,
  locale,
  className,
}: {
  status: ProblemStatus;
  locale: string;
  className?: string;
}) {
  const definition = STATUS_DEFINITIONS[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        TONES[TONE_BY_STATUS[status]],
        className,
      )}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {locale === 'hi' ? definition.labelHi : definition.labelEn}
    </span>
  );
}
