export interface ShareSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

export function ShareBar({ segments, locale }: { segments: ShareSegment[]; locale: string }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const visible = segments.filter((s) => s.value > 0);
  const pct = (value: number) =>
    new Intl.NumberFormat(locale === 'hi' ? 'hi-IN' : 'en-IN', {
      style: 'percent',
      maximumFractionDigits: 0,
    }).format(total === 0 ? 0 : value / total);

  return (
    <div>
      <div className="flex h-5 w-full gap-[2px] overflow-hidden rounded-[4px] bg-(--viz-surface)">
        {visible.map((segment) => (
          <div
            key={segment.key}
            tabIndex={0}
            title={`${segment.label}: ${segment.value} (${pct(segment.value)})`}
            aria-label={`${segment.label}: ${segment.value} (${pct(segment.value)})`}
            className="h-full transition-opacity outline-none hover:opacity-80 focus-visible:opacity-80"
            style={{ flexGrow: segment.value, flexBasis: 0, background: segment.color }}
          />
        ))}
      </div>

      <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="h-3 w-3 shrink-0 rounded-[3px]"
              style={{ background: segment.color }}
            />
            <span className="min-w-0 flex-1 truncate">{segment.label}</span>
            <span className="font-medium tabular-nums">{segment.value}</span>
            <span className="w-10 text-right text-(--viz-text-secondary) tabular-nums">
              {pct(segment.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
