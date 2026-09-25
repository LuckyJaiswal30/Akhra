import { cn } from '@/lib/utils';

const FIGURES = [0, 72, 144, 216, 288];

/** Five people seated around common ground: the akhra where a village meets to decide. */
export function AkhraMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={cn('h-9 w-9 shrink-0', className)}>
      <g className="fill-sal">
        {FIGURES.map((angle) => (
          <g key={angle} transform={`rotate(${angle} 24 24)`}>
            <circle cx="24" cy="6.3" r="4.3" />
            <path d="M18.4 18.2a5.6 6.6 0 0 1 11.2 0z" />
          </g>
        ))}
      </g>
      <circle cx="24" cy="24" r="4.6" className="fill-amber" />
    </svg>
  );
}

export function AkhraLogo({
  name,
  tagline,
  compact = false,
}: {
  name: string;
  tagline: string;
  compact?: boolean;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <AkhraMark />
      <span className="flex min-w-0 flex-col">
        <span className="text-ink text-xl leading-none font-bold tracking-tight">{name}</span>
        {!compact && (
          <span className="text-subtle mt-1 max-w-[15rem] text-[11px] leading-tight font-medium">
            {tagline}
          </span>
        )}
      </span>
    </span>
  );
}
