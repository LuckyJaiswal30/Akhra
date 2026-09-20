export interface BarListRow {
  key: string;
  label: string;
  value: number;
  detail?: string;
}

export function BarList({ rows, valueSuffix }: { rows: BarListRow[]; valueSuffix?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li
          key={row.key}
          tabIndex={0}
          title={row.detail}
          className="group rounded-md px-1.5 py-1 transition-colors outline-none hover:bg-(--viz-hover) focus-visible:bg-(--viz-hover)"
        >
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{row.label}</span>
            <span className="shrink-0 text-(--viz-text-secondary) tabular-nums">
              {row.value.toLocaleString('en-IN')}
              {valueSuffix}
            </span>
          </div>
          <div className="mt-1 h-4">
            {row.value > 0 && (
              <div
                className="h-4 rounded-r-[4px] transition-opacity group-hover:opacity-85"
                style={{
                  width: `${Math.max(1.5, (row.value / max) * 100)}%`,
                  background: 'var(--series-1)',
                }}
              />
            )}
          </div>
          {row.detail && (
            <p className="mt-0.5 hidden text-xs text-(--viz-text-secondary) group-hover:block group-focus-visible:block">
              {row.detail}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
