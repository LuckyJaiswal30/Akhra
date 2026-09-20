'use client';

import { ChevronDown } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function MobileCollapsible({
  label,
  count = 0,
  defaultOpen = false,
  inline = false,
  children,
}: {
  label: string;
  count?: number;
  defaultOpen?: boolean;
  inline?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <div className={inline ? 'sm:contents' : undefined}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="border-line bg-surface text-ink flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border px-4 text-sm font-medium sm:hidden"
      >
        <span>
          {label}
          {count > 0 && (
            <span className="bg-sal text-on-sal ml-2 rounded-full px-2 py-0.5 text-xs">
              {count}
            </span>
          )}
        </span>
        <ChevronDown
          aria-hidden
          className={cn('text-subtle h-4 w-4 transition-transform', open && 'rotate-180')}
        />
      </button>
      <div
        id={id}
        className={cn(
          open ? 'mt-3 grid gap-4' : 'hidden',
          'sm:mt-0',
          inline ? 'sm:contents' : 'sm:block',
        )}
      >
        {children}
      </div>
    </div>
  );
}
