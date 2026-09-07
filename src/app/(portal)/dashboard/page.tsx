"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  BarList,
  Funnel,
  Page,
  PageHeader,
  Panel,
  Skeleton,
} from "@/components/ui";
import { formatCount as n } from "@/lib/datetime";
import { DOMAIN_LABEL, STATUS_LABEL } from "@/lib/jharkhand";
import { LAST_UPDATED } from "@/lib/site";
import { cn } from "@/lib/utils";

function lakh(value: number) {
  return value >= 100000 ? `${(value / 100000).toFixed(1)} lakh` : n(value);
}

export default function DashboardPage() {
  const data = useQuery(api.dashboard.overview);
  const [sort, setSort] = useState<"receipts" | "pendency">("receipts");

  if (!data) {
    return (
      <Page className="gap-12" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading</span>
        <div className="flex flex-col gap-3 border-b border-border pb-6">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-5 w-full max-w-md" />
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 border-b border-border pb-10 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
        <Skeleton className="h-96" />
      </Page>
    );
  }

  const total = data.totals;
  const register = [...data.register].sort((a, b) =>
    sort === "receipts" ? b.receipts - a.receipts : b.pendency - a.pendency,
  );

  const headline: [string, string, string][] = [
    ["Reported", n(total.reports + data.rejected), "problems sent in by people"],
    ["Dealt with", n(data.totalDisposed), "fixed or closed"],
    ["Still open", n(data.totalPendency), "waiting on somebody"],
    [
      "Time to a decision",
      data.avgDecisionDays === null ? "—" : `${data.avgDecisionDays}`,
      "average days before an officer rules on a report",
    ],
  ];

  return (
    <Page className="gap-12">
      <PageHeader
        title="How it is going"
        description="What has been reported across Jharkhand, what has been dealt with, and what is still waiting."
        actions={
          <p className="text-sm text-muted-foreground">Updated {LAST_UPDATED}</p>
        }
      />

      <section
        aria-label="Summary"
        className="grid grid-cols-2 gap-x-6 gap-y-8 border-b border-border pb-10 lg:grid-cols-4 lg:gap-0"
      >
        {headline.map(([label, value, note], i) => (
          <div
            key={label}
            className={cn(
              "flex flex-col gap-2",
              i > 0 && "lg:border-l lg:border-border lg:pl-8",
              i < 3 && "lg:pr-8",
            )}
          >
            <p className="text-sm text-muted-foreground">{label}</p>
            <p
              className={cn(
                "font-semibold tracking-tight tabular",
                value === "—"
                  ? "text-2xl text-muted-foreground"
                  : "text-3xl sm:text-4xl",
              )}
            >
              {value}
            </p>
            <p className="text-sm text-muted-foreground">{note}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="flex flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">
              District by district
            </h2>
            <p className="measure mt-1 text-base text-muted-foreground">
              Every district people have reported from, and how much of it has
              actually been dealt with.
            </p>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted-foreground">Sort by</span>
            {(
              [
                ["receipts", "Most reported"],
                ["pendency", "Most still open"],
              ] as const
            ).map(([value, text]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSort(value)}
                aria-pressed={sort === value}
                className={cn(
                  "rounded-sm px-2 py-1 transition-colors",
                  sort === value
                    ? "bg-foreground font-medium text-background"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto border border-border bg-card">
          <table className="w-full min-w-[38rem] text-base">
            <caption className="sr-only">
              How many problems each district reported, and how many are
              checked, being worked on, fixed, closed or still open
            </caption>
            <thead>
              <tr className="border-b-2 border-border-strong bg-secondary text-left">
                <Th align="left">District</Th>
                <Th>Reported</Th>
                <Th>Not checked yet</Th>
                <Th>Being worked on</Th>
                <Th>Fixed</Th>
                <Th>Closed</Th>
                <Th>Still open</Th>
                <Th>Avg. days</Th>
              </tr>
            </thead>
            <tbody>
              {register.map((row) => (
                <tr
                  key={row.district}
                  className="border-b border-border last:border-0 hover:bg-secondary/60"
                >
                  <th scope="row" className="px-4 py-2 text-left font-medium">
                    {row.district}
                  </th>
                  <Td>{n(row.receipts)}</Td>
                  <Td muted={row.awaitingVerification === 0}>
                    {n(row.awaitingVerification)}
                  </Td>
                  <Td muted={row.underExamination === 0}>
                    {n(row.underExamination)}
                  </Td>
                  <Td muted={row.resolved === 0}>{n(row.resolved)}</Td>
                  <Td muted={row.closed === 0}>{n(row.closed)}</Td>
                  <Td strong>{n(row.pendency)}</Td>
                  <Td muted={row.avgDecisionDays === null}>
                    {row.avgDecisionDays === null ? "—" : row.avgDecisionDays}
                  </Td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border-strong bg-secondary font-semibold">
                <th scope="row" className="px-4 py-2 text-left">
                  Total
                </th>
                <Td>{n(register.reduce((s, r) => s + r.receipts, 0))}</Td>
                <Td>
                  {n(register.reduce((s, r) => s + r.awaitingVerification, 0))}
                </Td>
                <Td>
                  {n(register.reduce((s, r) => s + r.underExamination, 0))}
                </Td>
                <Td>{n(register.reduce((s, r) => s + r.resolved, 0))}</Td>
                <Td>{n(register.reduce((s, r) => s + r.closed, 0))}</Td>
                <Td>{n(data.totalPendency)}</Td>
                <Td>{data.avgDecisionDays ?? "—"}</Td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="grid items-start gap-10 lg:grid-cols-2">
        <div>
          <h2 className="pb-4 text-lg font-semibold tracking-tight">
            How long people have been waiting
          </h2>
          <div className="overflow-x-auto border border-border bg-card">
            <table className="w-full text-base">
              <caption className="sr-only">
                How long reports have been sitting without a decision
              </caption>
              <thead>
                <tr className="border-b-2 border-border-strong bg-secondary text-left">
                  <Th align="left">Waiting for</Th>
                  <Th>Reports</Th>
                </tr>
              </thead>
              <tbody>
                {data.ageBuckets.map((bucket) => (
                  <tr
                    key={bucket.label}
                    className="border-b border-border last:border-0"
                  >
                    <th scope="row" className="px-4 py-2 text-left font-normal">
                      {bucket.label}
                    </th>
                    <Td strong={bucket.count > 0}>{n(bucket.count)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-base text-muted-foreground">
            Only counts reports nobody has ruled on yet.
          </p>
        </div>

        <div>
          <h2 className="pb-4 text-lg font-semibold tracking-tight">
            One problem, many reports
          </h2>
          <div className="overflow-x-auto border border-border bg-card">
            <table className="w-full text-base">
              <caption className="sr-only">
                Reports that were merged because they describe the same thing
              </caption>
              <thead>
                <tr className="border-b-2 border-border-strong bg-secondary text-left">
                  <Th align="left">Problem</Th>
                  <Th align="left">District</Th>
                  <Th>Reports</Th>
                  <Th>People affected</Th>
                </tr>
              </thead>
              <tbody>
                {data.clustered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-muted-foreground"
                    >
                      Nothing yet
                    </td>
                  </tr>
                ) : (
                  data.clustered.map((c) => (
                    <tr
                      key={c.label}
                      className="border-b border-border last:border-0"
                    >
                      <th scope="row" className="px-4 py-3 text-left font-normal">
                        {c.label}
                      </th>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {c.district}
                      </td>
                      <Td strong>{c.memberCount}</Td>
                      <Td>{lakh(c.totalAffected)}</Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-base text-muted-foreground">
            {n(total.mergedReports)} repeat reports merged into{" "}
            {n(total.clusters)} actual problems.
          </p>
        </div>
      </section>

      <section className="grid items-start gap-10 lg:grid-cols-2">
        <Panel
          title="What people report"
          description="The kinds of problem that come in most."
        >
          <BarList
            caption="Number of reports in each subject"
            rows={data.domains.map((d) => ({
              label: DOMAIN_LABEL[d.domain] ?? d.domain,
              value: d.count,
            }))}
          />
        </Panel>

        <Panel
          title="Where things have got to"
          description="How far along each report is, from just arrived to fixed."
        >
          <Funnel
            caption="Count of reports at each stage"
            stages={data.pipeline.map((p) => ({
              label: STATUS_LABEL[p.stage] ?? p.stage,
              count: p.count,
              terminal: p.stage === "deployed",
            }))}
          />
          {data.rejected > 0 && (
            <p className="mt-3 border-t border-border pt-3 text-base text-muted-foreground">
              {n(data.rejected)} were closed at the checking stage without
              further action.
            </p>
          )}
        </Panel>
      </section>

      <section className="border-t border-border pt-8">
        <h2 className="text-lg font-semibold tracking-tight">
          Who is taking part
        </h2>
        <dl className="mt-5 grid gap-x-10 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              [
                "Institutions engaged",
                `${total.universitiesEngaged} / ${total.universitiesTotal}`,
                "have taken on a problem",
              ],
              ["Projects running", String(total.projects), ""],
              [
                "Industry partners",
                String(total.partners),
                `${total.pledges} offers of support`,
              ],
              [
                "Districts reporting",
                `${total.districts} / 24`,
                "across Jharkhand",
              ],
            ] as [string, string, string][]
          ).map(([label, value, note]) => (
            <div
              key={label}
              className="flex flex-col gap-1 border-b border-border py-4"
            >
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="text-xl font-semibold tabular">{value}</dd>
              </div>
              {note && <p className="text-sm text-muted-foreground">{note}</p>}
            </div>
          ))}
        </dl>
      </section>
    </Page>
  );
}

function Th({
  children,
  align = "right",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-2 text-base font-semibold",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  muted = false,
  strong = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-4 py-2 text-right tabular",
        muted && "text-muted-foreground",
        strong && "font-semibold",
      )}
    >
      {children}
    </td>
  );
}
