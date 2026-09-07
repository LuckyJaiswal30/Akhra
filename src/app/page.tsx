"use client";

import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { PublicShell } from "@/components/public-shell";

const STEPS: [string, string, string][] = [
  [
    "You",
    "Report it",
    "A photo, roughly where it is, and what is wrong in your own words. Takes about a minute.",
  ],
  [
    "Akhra",
    "Groups it",
    "If forty people report the same broken bridge, that is one problem with forty voices behind it, not forty separate complaints nobody reads.",
  ],
  [
    "A district officer",
    "Goes and checks",
    "They confirm it is real and pass it on. Every decision they make is recorded and cannot be quietly edited later.",
  ],
  [
    "A university team",
    "Takes it on",
    "Students and a faculty mentor pick it up as an actual project, not a hypothetical one.",
  ],
  [
    "A company",
    "Backs it",
    "Mentoring, money, a prototype, somewhere to test it, or help putting it in the ground.",
  ],
  [
    "You",
    "Hear back",
    "When it is fixed, you are told. That is the part most complaint systems never get to.",
  ],
];

const FACTS: [string, string][] = [
  ["Problems on record", "150, each traced to a published source"],
  ["Districts", "All 24 in Jharkhand"],
  ["Universities listed", "15, across 34 departments"],
  ["Kinds of problem", "10, from drinking water to jobs"],
];

export default function Home() {
  return (
    <PublicShell>
      <div className="border-b border-border bg-card">
        <div className="mx-auto grid w-full max-w-page gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-20 lg:py-24">
          <div className="min-w-0">
            <p className="eyebrow">Smart India Hackathon 2026 &middot; Jharkhand</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Tell someone about the problem where you live, and actually find
              out what happened to it.
            </h1>
            <p className="measure mt-6 text-base text-muted-foreground">
              An <em>akhra</em> is the open ground at the middle of a village,
              where people bring what is wrong and work out what to do about it.
              This is that, for the whole state. You report a problem. An officer
              checks it. A university team takes it on. A company helps pay for
              it. And you get told when it is done.
            </p>

            <div className="mt-10 flex min-h-12 flex-wrap gap-3">
              <Show when="signed-out">
                <Link
                  href="/sign-up"
                  className="flex min-h-12 items-center rounded-sm bg-primary px-6 text-base font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  Report a problem
                </Link>
                <Link
                  href="/help"
                  className="flex min-h-12 items-center rounded-sm border border-border-strong px-6 text-base font-medium transition-colors hover:bg-secondary"
                >
                  How it works
                </Link>
              </Show>
              <Show when="signed-in">
                <Link
                  href="/home"
                  className="flex min-h-12 items-center rounded-sm bg-primary px-6 text-base font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  Go to your workspace
                </Link>
                <Link
                  href="/help"
                  className="flex min-h-12 items-center rounded-sm border border-border-strong px-6 text-base font-medium transition-colors hover:bg-secondary"
                >
                  How it works
                </Link>
              </Show>
            </div>
          </div>

          <dl className="min-w-0 self-start border-t border-border-strong lg:mt-11">
            {FACTS.map(([term, value]) => (
              <div
                key={term}
                className="flex flex-col gap-1 border-b border-border py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
              >
                <dt className="shrink-0 text-sm text-muted-foreground">{term}</dt>
                <dd className="text-sm font-medium sm:text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="mx-auto w-full max-w-page px-4 py-16 sm:px-6 lg:py-20">
        <section>
          <h2 className="text-xl font-semibold tracking-tight">
            What happens after you press send
          </h2>
          <ol className="mt-6 border border-border bg-card">
            {STEPS.map(([who, action, text], i) => (
              <li
                key={who + i}
                className="grid grid-cols-[1.75rem_1fr] gap-x-3 gap-y-1 border-b border-border px-4 py-4 last:border-0 sm:grid-cols-[1.75rem_13rem_1fr] sm:gap-x-5"
              >
                <span className="tabular text-sm font-medium text-muted-foreground">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">{who}</span>
                  <span className="block text-sm text-muted-foreground">
                    {action}
                  </span>
                </span>
                <span className="col-start-2 min-w-0 text-muted-foreground sm:col-start-3">
                  {text}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-20 grid gap-12 border-t border-border pt-16 sm:grid-cols-2 sm:gap-16">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">
              Where these problems came from
            </h2>
            <p className="measure mt-4 text-base text-muted-foreground">
              Every problem in here is taken from a real government report,
              study or news article, and each one carries a link to its source.
              We wrote them the way a resident would actually say it, because no
              public dataset of citizen complaints exists to copy from. Company
              names are stand-ins and represent no real commitment from anyone.
            </p>
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">
              What we do not share
            </h2>
            <p className="measure mt-4 text-base text-muted-foreground">
              The exact spot you reported from is shown only to the officer
              checking your report. Everyone else sees your district and a
              location blurred to about five hundred metres. When we ask a
              language model to sort your report, we send it the description and
              the district. Never your name, your phone number, or your photos.{" "}
              <Link
                href="/privacy"
                className="font-medium text-foreground underline underline-offset-4"
              >
                The full privacy note
              </Link>{" "}
              is short and worth reading.
            </p>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
