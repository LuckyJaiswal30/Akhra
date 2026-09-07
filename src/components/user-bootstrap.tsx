"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Alert } from "@/components/ui";

/**
 * Creates the application's record of whoever just signed in. It runs on
 * every portal mount because that is the only moment we are certain the
 * session is live, and it is written to be safe to run again — an
 * interrupted sign-up, a refresh, or an OAuth callback all land here and
 * converge on the same row. A failure is shown rather than swallowed,
 * because the alternative is an account that half exists.
 */
export function UserBootstrap() {
  const { user, isLoaded } = useUser();
  const ensureUser = useMutation(api.users.ensureUser);
  const [problem, setProblem] = useState<string | null>(null);
  const attempts = useRef(0);

  useEffect(() => {
    if (!isLoaded || !user) return;

    let cancelled = false;
    const name = user.fullName ?? user.username ?? "";

    async function run() {
      try {
        await ensureUser({ name });
        if (!cancelled) setProblem(null);
      } catch (cause) {
        if (cancelled) return;
        attempts.current += 1;
        if (attempts.current < 3) {
          setTimeout(run, 400 * attempts.current);
          return;
        }
        setProblem(
          cause instanceof Error
            ? cause.message
            : "We could not finish setting up your account.",
        );
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, user, ensureUser]);

  if (!problem) return null;

  return (
    <div className="mx-auto w-full max-w-page px-4 pt-6 sm:px-6">
      <Alert tone="danger" title="Your account is not set up yet">
        {problem} Reload the page to try again.
      </Alert>
    </div>
  );
}
