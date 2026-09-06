"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BarRow = { label: string; value: number };

export function BarList({
  rows,
  caption,
}: {
  rows: BarRow[];
  caption: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="sr-only">{caption}</figcaption>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li
            key={row.label}
            className="grid grid-cols-[minmax(6rem,9rem)_1fr_auto] items-center gap-3 rounded-md py-0.5 transition-colors hover:bg-secondary/60"
            title={`${row.label}: ${row.value.toLocaleString("en-IN")}`}
          >
            <span className="truncate text-sm">{row.label}</span>
            <span className="h-2.5 w-full rounded-full bg-secondary">
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${Math.max(1.5, (row.value / max) * 100)}%` }}
              />
            </span>
            <span className="w-14 text-right font-mono text-sm font-semibold tabular-nums">
              {row.value.toLocaleString("en-IN")}
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
    <figure className="flex flex-col gap-3">
      <figcaption className="sr-only">{caption}</figcaption>
      <ol className="flex flex-col gap-2">
        {stages.map((stage, i) => (
          <li
            key={stage.label}
            className="grid grid-cols-[1.5rem_minmax(6rem,9.5rem)_1fr_auto] items-center gap-3 rounded-md py-0.5 transition-colors hover:bg-secondary/60"
            title={`${stage.label}: ${stage.count}`}
          >
            <span className="font-mono text-[0.65rem] text-muted-foreground">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="truncate text-sm">{stage.label}</span>
            <span className="h-2.5 w-full rounded-full bg-secondary">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${Math.max(1.5, (stage.count / max) * 100)}%`,
                  backgroundColor: stage.terminal ? "var(--success)" : "var(--primary)",
                  opacity: stage.terminal ? 1 : 0.5 + (0.5 * (i + 1)) / stages.length,
                }}
              />
            </span>
            <span className="w-10 text-right font-mono text-sm font-semibold tabular-nums">
              {stage.count}
            </span>
          </li>
        ))}
      </ol>
    </figure>
  );
}

export function Stat({
  label,
  value,
  note,
  tone = "default",
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "default" | "primary";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-xl border p-5",
        tone === "primary" ? "border-primary/25 bg-accent" : "border-border bg-card",
      )}
    >
      <span className="eyebrow">{label}</span>
      <span
        className={cn(
          "font-display text-[2rem] font-extrabold leading-none tabular-nums",
          tone === "primary" ? "text-accent-foreground" : "text-foreground",
        )}
      >
        {value}
      </span>
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </div>
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
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}
