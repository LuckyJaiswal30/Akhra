import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StepProgress({
  steps,
  current,
  label,
}: {
  steps: string[];
  current: number;
  label: string;
}) {
  return (
    <div>
      <ol aria-label={label} className="flex items-center">
        {steps.map((step, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li
              key={step}
              aria-current={active ? 'step' : undefined}
              className="flex flex-1 items-center last:flex-none"
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    'grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums',
                    done && 'bg-sal-wash text-sal',
                    active && 'bg-sal text-on-sal',
                    !done && !active && 'border-line bg-surface text-subtle border',
                  )}
                >
                  {done ? <Check aria-hidden className="h-4 w-4" strokeWidth={3} /> : index + 1}
                </span>
                <span
                  className={cn(
                    'hidden text-sm whitespace-nowrap md:inline',
                    active ? 'text-ink font-semibold' : 'text-subtle',
                  )}
                >
                  {step}
                  {done && <span className="sr-only"> (done)</span>}
                </span>
              </span>
              {index < steps.length - 1 && (
                <span
                  aria-hidden
                  className={cn('mx-2 h-px min-w-3 flex-1 md:mx-3', done ? 'bg-sal/40' : 'bg-line')}
                />
              )}
            </li>
          );
        })}
      </ol>
      <p className="text-ink mt-2 text-sm font-semibold md:hidden">{steps[current]}</p>
    </div>
  );
}
