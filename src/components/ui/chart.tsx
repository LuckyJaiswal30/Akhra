"use client";

import { ReactNode } from "react";
import { formatCount } from "@/lib/datetime";
import { cn } from "@/lib/utils";

export type BarRow = { label: string; value: number };

const track = "h-3 w-full bg-secondary";
const fill = "block h-full";

export function BarList({
  rows,
  caption,
}: {
  rows: BarRow[];
  caption: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <figure className="flex flex-col">
      <figcaption className="sr-only">{caption}</figcaption>
      <ul className="flex flex-col">
        {rows.map((row) => (
          <li
            key={row.label}
            className="grid grid-cols-[minmax(6rem,10rem)_1fr_auto] items-center gap-4 border-b border-border py-2 last:border-b-0 hover:bg-secondary/50"
            title={`${row.label}: ${formatCount(row.value)}`}
          >
            <span className="truncate text-sm">{row.label}</span>
            <span className={track}>
              <span
                className={cn(fill, "bg-primary")}
                style={{ width: `${Math.max(1.5, (row.value / max) * 100)}%` }}
              />
            </span>
            <span className="w-14 text-right text-sm font-semibold tabular">
              {formatCount(row.value)}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

export function Funnel({
  stages,
  caption,
}: {
  stages: { label: string; count: number; terminal?: boolean }[];
  caption: string;
}) {
  const max = Math.max(1, ...stages.map((s) => s.count));

  return (
    <figure className="flex flex-col">
      <figcaption className="sr-only">{caption}</figcaption>
      <ol className="flex flex-col">
        {stages.map((stage, i) => (
          <li
            key={stage.label}
            className="grid grid-cols-[1.5rem_minmax(6rem,10rem)_1fr_auto] items-center gap-4 border-b border-border py-2 last:border-b-0 hover:bg-secondary/50"
            title={`${stage.label}: ${stage.count}`}
          >
            <span className="text-xs text-muted-foreground tabular">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="truncate text-sm">{stage.label}</span>
            <span className={track}>
              <span
                className={fill}
                style={{
                  width: `${Math.max(1.5, (stage.count / max) * 100)}%`,
                  backgroundColor: stage.terminal
                    ? "var(--success)"
                    : "var(--primary)",
                  opacity: stage.terminal
                    ? 1
                    : 0.45 + (0.55 * (i + 1)) / stages.length,
                }}
              />
            </span>
            <span className="w-10 text-right text-sm font-semibold tabular">
              {stage.count}
            </span>
          </li>
        ))}
      </ol>
    </figure>
  );
}

export function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col border border-border bg-card">
      <div className="flex flex-col gap-1 border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
