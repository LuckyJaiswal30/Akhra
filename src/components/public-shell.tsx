"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { Show } from "@clerk/nextjs";
import { SkipLink, Wordmark } from "@/components/site-chrome";
import { cn } from "@/lib/utils";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <SkipLink />

      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-page flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="rounded-sm">
            <Wordmark tagline />
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Show when="signed-out">
              <Link
                href="/sign-in"
                className="flex min-h-11 items-center rounded-sm px-4 text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="flex min-h-11 items-center rounded-sm bg-primary px-5 text-base font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Get started
              </Link>
            </Show>
            <Show when="signed-in">
              <Link
                href="/home"
                className="flex min-h-11 items-center rounded-sm bg-primary px-5 text-base font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Go to your workspace
              </Link>
            </Show>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="flex-1">
        {children}
      </main>
    </div>
  );
}

export function Prose({
  title,
  intro,
  wide = false,
  children,
}: {
  title: string;
  intro?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-12 sm:px-6 lg:py-16",
        wide ? "max-w-page" : "max-w-reading",
      )}
    >
      <header className="border-b border-border pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {intro && (
          <p className="measure mt-3 text-base text-muted-foreground">
            {intro}
          </p>
        )}
      </header>
      <div className="mt-10 flex flex-col gap-10">{children}</div>
    </div>
  );
}

export function Section({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold tracking-tight">{heading}</h2>
      {children}
    </section>
  );
}
