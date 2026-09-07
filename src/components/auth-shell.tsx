"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { SkipLink, Wordmark } from "@/components/site-chrome";

const POINTS = [
  "You report what is broken where you live.",
  "A district officer goes and checks it.",
  "A university team takes it on as a real project.",
  "A company backs the ones that look like they will work.",
];

export function AuthShell({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <SkipLink />

      <main
        id="main"
        tabIndex={-1}
        className="flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
      >
        <aside className="hidden flex-col justify-between gap-16 bg-ink px-10 py-14 text-ink-foreground lg:flex xl:px-16">
          <Link href="/" className="self-start">
            <Wordmark />
          </Link>

          <div className="max-w-reading">
            <p className="text-sm font-semibold text-ink-muted">
              Smart India Hackathon 2026 &middot; Jharkhand
            </p>
            <h2 className="mt-4 text-2xl font-semibold">
              The same broken handpump should not have to be reported
              twenty-four times before anyone fixes it.
            </h2>
            <ul className="mt-8 flex flex-col gap-4">
              {POINTS.map((point) => (
                <li key={point} className="flex gap-3 text-base text-white/80">
                  <span
                    aria-hidden="true"
                    className="mt-2 size-1 shrink-0 rounded-full bg-white/40"
                  />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <p className="max-w-reading text-sm text-ink-muted">
            A student-built prototype. Not an official service of the Government
            of Jharkhand.
          </p>
        </aside>

        <section className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8 sm:py-12 lg:px-12">
          <div className="w-full max-w-[28rem]">
            <Link href="/" className="mb-7 block lg:hidden">
              <Wordmark />
            </Link>

            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-base text-muted-foreground">{subtitle}</p>

            <div className="mt-7">{children}</div>

            <div className="mt-7 border-t border-border pt-5 text-sm text-muted-foreground">
              {footer}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
