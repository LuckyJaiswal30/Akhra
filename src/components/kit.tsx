import { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Button({
  className,
  variant = "primary",
  ...props
}: ComponentProps<"button"> & { variant?: "primary" | "ghost" | "danger" }) {
  return (
    <button
      {...props}
      className={cn(
        "rounded-md px-4 py-2 text-sm font-medium transition-opacity disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        variant === "primary" &&
          "bg-primary text-primary-foreground hover:opacity-90",
        variant === "ghost" &&
          "border border-border bg-card hover:bg-secondary",
        variant === "danger" &&
          "bg-destructive text-destructive-foreground hover:opacity-90",
        className,
      )}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && (
        <span className="text-xs text-muted-foreground">{hint}</span>
      )}
    </label>
  );
}

const controlClass =
  "w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input {...props} className={cn(controlClass, className)} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea {...props} className={cn(controlClass, className)} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select {...props} className={cn(controlClass, className)} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-lg border border-border bg-card p-5",
        className,
      )}
    />
  );
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "go" | "warn" | "stop";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[0.7rem] uppercase tracking-[0.08em]",
        tone === "neutral" && "bg-secondary text-secondary-foreground",
        tone === "go" && "bg-accent text-accent-foreground",
        tone === "warn" && "bg-[var(--warning)]/15 text-[var(--warning)]",
        tone === "stop" && "bg-destructive/12 text-destructive",
      )}
    >
      {children}
    </span>
  );
}
