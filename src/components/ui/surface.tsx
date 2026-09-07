"use client";

import { ComponentProps, ReactNode, useRef } from "react";
import { cn } from "@/lib/utils";

const WIDTH = {
  full: "",
  column: "mx-auto max-w-column",
  reading: "mx-auto max-w-reading",
} as const;

export type PageWidth = keyof typeof WIDTH;

export function Page({
  width = "full",
  className,
  ...props
}: ComponentProps<"div"> & { width?: PageWidth }) {
  return (
    <div
      {...props}
      className={cn("flex w-full flex-col gap-8", WIDTH[width], className)}
    />
  );
}

export function Split({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:gap-10",
        className,
      )}
    />
  );
}

export function Aside({ className, ...props }: ComponentProps<"aside">) {
  return (
    <aside
      {...props}
      className={cn(
        "flex flex-col gap-4 rounded-md border border-border bg-secondary/40 p-5",
        className,
      )}
    />
  );
}

export function Card({
  className,
  interactive = false,
  ...props
}: ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-md border border-border bg-card text-card-foreground",
        interactive &&
          "transition-colors hover:border-border-strong hover:bg-secondary/30",
        className,
      )}
    />
  );
}

export function CardBody({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cn("p-5 sm:p-6", className)} />;
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "flex flex-wrap items-center gap-2 border-t border-border px-5 py-4 sm:px-6",
        className,
      )}
    />
  );
}

type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

const TONE: Record<Tone, string> = {
  neutral: "bg-secondary text-secondary-foreground",
  primary: "bg-accent text-accent-foreground",
  success: "bg-success-surface text-success",
  warning: "bg-warning-surface text-warning",
  danger: "bg-danger-surface text-danger",
  info: "bg-info-surface text-info",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-sm px-2 py-1",
        "text-sm leading-none font-semibold",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Alert({
  tone = "danger",
  title,
  children,
}: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
}) {
  const border: Record<Tone, string> = {
    neutral: "border-border",
    primary: "border-primary/30",
    success: "border-success-border",
    warning: "border-warning-border",
    danger: "border-danger-border",
    info: "border-info-border",
  };

  return (
    <div
      role="alert"
      className={cn(
        "rounded-md border px-4 py-3 text-base",
        TONE[tone],
        border[tone],
      )}
    >
      {title && <p className="font-semibold">{title}</p>}
      <div className={cn(title && "mt-1")}>{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card>
      <CardBody className="flex flex-col items-start gap-3 py-10 text-center sm:items-center">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="measure text-base text-muted-foreground">
            {description}
          </p>
        )}
        {action}
      </CardBody>
    </Card>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("skeleton block rounded-md", className)}
    />
  );
}

export function CardSkeleton() {
  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-3.5 w-1/4" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
      </CardBody>
    </Card>
  );
}

export function LoadingList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  counts,
  label,
  idPrefix,
}: {
  tabs: readonly { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  counts?: Partial<Record<string, number>>;
  label: string;
  idPrefix: string;
}) {
  const strip = useRef<HTMLDivElement>(null);

  function move(delta: number) {
    const index = tabs.findIndex((tab) => tab.value === value);
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    onChange(next.value);
    requestAnimationFrame(() => {
      strip.current
        ?.querySelector<HTMLButtonElement>(`#${idPrefix}-tab-${next.value}`)
        ?.focus();
    });
  }

  return (
    <div
      ref={strip}
      role="tablist"
      aria-label={label}
      className="flex flex-wrap gap-x-1"
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          move(1);
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          move(-1);
        } else if (event.key === "Home") {
          event.preventDefault();
          onChange(tabs[0].value);
        } else if (event.key === "End") {
          event.preventDefault();
          onChange(tabs[tabs.length - 1].value);
        }
      }}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            id={`${idPrefix}-tab-${tab.value}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={active ? `${idPrefix}-panel-${tab.value}` : undefined}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.value)}
            className={cn(
              "flex min-h-11 flex-1 shrink-0 basis-auto items-center justify-center gap-2 border-b-2 px-3 text-base whitespace-nowrap transition-colors sm:flex-none sm:justify-start",
              active
                ? "border-primary font-semibold text-foreground"
                : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
            )}
          >
            {tab.label}
            {counts && (
              <span className="text-sm tabular text-muted-foreground">
                {counts[tab.value] ?? 0}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  idPrefix,
  value,
  className,
  ...props
}: ComponentProps<"div"> & { idPrefix: string; value: string }) {
  return (
    <div
      {...props}
      id={`${idPrefix}-panel-${value}`}
      role="tabpanel"
      aria-labelledby={`${idPrefix}-tab-${value}`}
      tabIndex={0}
      className={cn("flex flex-col gap-4 outline-none", className)}
    />
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
      <div className="flex min-w-0 flex-col gap-2">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <div className="measure text-base text-muted-foreground">
            {description}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2 sm:pt-1">{actions}</div>
      )}
    </header>
  );
}
