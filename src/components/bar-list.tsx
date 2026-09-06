"use client";

export type BarRow = {
  label: string;
  value: number;
  note?: string;
};

export function BarList({
  rows,
  valueSuffix,
}: {
  rows: BarRow[];
  valueSuffix?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <li key={row.label} className="grid grid-cols-[9.5rem_1fr_4.5rem] items-center gap-3">
          <span className="truncate text-sm" title={row.label}>
            {row.label}
          </span>
          <span
            className="h-2.5 w-full overflow-hidden rounded-sm bg-secondary"
            role="img"
            aria-label={`${row.label}: ${row.value}`}
          >
            <span
              className="block h-full rounded-sm bg-primary"
              style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
            />
          </span>
          <span className="text-right font-mono text-sm font-semibold tabular-nums">
            {row.value.toLocaleString("en-IN")}
            {valueSuffix ?? ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Funnel({
  stages,
}: {
  stages: { label: string; count: number; terminal?: boolean }[];
}) {
  const max = Math.max(1, ...stages.map((s) => s.count));

  return (
    <ol className="flex flex-col gap-2.5">
      {stages.map((stage, i) => (
        <li
          key={stage.label}
          className="grid grid-cols-[2rem_10.5rem_1fr_3.5rem] items-center gap-3"
        >
          <span className="font-mono text-[0.7rem] text-muted-foreground">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="truncate text-sm">{stage.label}</span>
          <span className="h-2.5 w-full overflow-hidden rounded-sm bg-secondary">
            <span
              className="block h-full rounded-sm"
              style={{
                width: `${Math.max(2, (stage.count / max) * 100)}%`,
                backgroundColor: stage.terminal
                  ? "var(--success)"
                  : "var(--primary)",
                opacity: stage.terminal ? 1 : 0.45 + (0.55 * (i + 1)) / stages.length,
              }}
            />
          </span>
          <span className="text-right font-mono text-sm font-semibold tabular-nums">
            {stage.count}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-5">
      <span className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <span className="font-display text-3xl font-extrabold tabular-nums">
        {value}
      </span>
      {note && (
        <span className="text-xs text-muted-foreground">{note}</span>
      )}
    </div>
  );
}
