import { cn } from '@/lib/utils';

function AkhraMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn('h-9 w-9 shrink-0', className)}>
      <path d="M19.5 36C7.5 30.5 4.8 16.8 12.6 5.5c8.6 7.4 11.2 19.2 6.9 30.5Z" fill="#1F6B45" />
      <path d="M20.5 36c10.8-4.6 16-14.4 14.4-26.8-10.9 3.2-16.5 13.6-14.4 26.8Z" fill="#5AA476" />
      <path
        d="M19.6 35.2c.2-9 2.4-16.4 8.2-22.6M13 10.5c3.6 6.4 5.4 14 5.6 23.2"
        stroke="#EAF4EE"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
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
