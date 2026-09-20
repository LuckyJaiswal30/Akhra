import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const TONES = {
  error: { box: 'border-danger/30 bg-danger-wash', title: 'text-danger', Icon: CircleAlert },
  success: { box: 'border-sal/30 bg-sal-wash', title: 'text-sal-deep', Icon: CircleCheck },
  info: { box: 'border-line bg-mint', title: 'text-ink', Icon: Info },
  warning: { box: 'border-warning/40 bg-warning-wash', title: 'text-warning', Icon: TriangleAlert },
} as const;

export function Alert({
  tone = 'info',
  title,
  children,
}: {
  tone?: keyof typeof TONES;
  title?: string;
  children?: ReactNode;
}) {
  const { box, title: titleTone, Icon } = TONES[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('text-ink flex gap-3 rounded-xl border px-4 py-3 text-sm', box)}
    >
      <Icon aria-hidden className={cn('mt-0.5 h-[18px] w-[18px] shrink-0', titleTone)} />
      <div className="min-w-0">
        {title && <p className={cn('font-semibold', titleTone)}>{title}</p>}
        {children && <div className={cn(title && 'mt-0.5')}>{children}</div>}
      </div>
    </div>
  );
}
