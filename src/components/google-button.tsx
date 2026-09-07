"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui";

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="size-5 shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

type ClerkError = { message?: string; longMessage?: string } | null;

function readable(error: unknown) {
  const clerk = error as ClerkError;
  const message = clerk?.longMessage ?? clerk?.message;
  return message && message.length > 0
    ? message
    : "Could not reach Google. Try again in a moment.";
}

export function GoogleButton({
  action,
  label,
}: {
  action: () => Promise<{ error: unknown } | void>;
  label: string;
}) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={busy}
        aria-busy={busy || undefined}
        onClick={async () => {
          setProblem(null);
          setBusy(true);
          try {
            const outcome = await action();
            if (outcome && "error" in outcome && outcome.error) {
              setProblem(readable(outcome.error));
              setBusy(false);
            }
          } catch (cause) {
            setProblem(readable(cause));
            setBusy(false);
          }
        }}
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-sm border border-border-strong bg-card px-5 text-base font-medium transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-55"
      >
        {busy ? <Spinner /> : <GoogleMark />}
        {label}
      </button>
      {problem && (
        <p className="text-sm font-medium text-danger" role="alert">
          {problem}
        </p>
      )}
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-4">
      <span className="h-px flex-1 bg-border" />
      <span className="text-sm text-muted-foreground">or use your email</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
