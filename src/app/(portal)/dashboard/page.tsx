"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  BarList,
  Funnel,
  PageHeader,
  Panel,
  Skeleton,
  Stat,
} from "@/components/ui";
import { DOMAIN_LABEL, STATUS_LABEL } from "@/lib/jharkhand";

function lakh(n: number) {
  return n >= 100000 ? `${(n / 100000).toFixed(1)} lakh` : n.toLocaleString("en-IN");
}

export default function DashboardPage() {
  const data = useQuery(api.dashboard.overview);

  if (!data) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading dashboard</span>
        <Skeleton className="h-9 w-72" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const t = data.totals;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Analytics"
        title="Jharkhand at a glance"
        description="How the pipeline is performing — from a citizen's report to a deployed solution."
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Reports received"
          value={t.reports.toLocaleString("en-IN")}
          note={`across ${t.districts} districts`}
        />
        <Stat
          label="People affected"
          value={lakh(t.peopleAffected)}
          note="as estimated by the people reporting"
        />
        <Stat
          tone="primary"
          label="Duplicates merged"
          value={t.mergedReports.toLocaleString("en-IN")}
          note={`into ${t.clusters} distinct problems`}
        />
        <Stat
          label="Solutions deployed"
          value={t.deployed.toLocaleString("en-IN")}
          note={`from ${t.projects} projects underway`}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Reports by domain"
          description="Which kinds of problem people actually report."
        >
          <BarList
            caption="Number of reports in each of the ten domains"
            rows={data.domains.map((d) => ({
              label: DOMAIN_LABEL[d.domain] ?? d.domain,
              value: d.count,
            }))}
          />
        </Panel>

        <Panel
          title="The pipeline"
          description="Where reports currently sit, from submission to deployment."
        >
          <Funnel
            caption="Count of reports at each stage of the pipeline"
            stages={data.pipeline.map((p) => ({
              label: STATUS_LABEL[p.stage] ?? p.stage,
              count: p.count,
              terminal: p.stage === "deployed",
            }))}
          />
          {data.rejected > 0 && (
            <p className="border-t border-border pt-3 font-mono text-xs text-muted-foreground">
              {data.rejected} rejected at validation
            </p>
          )}
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Districts reporting most"
          description="Top ten by number of reports received."
        >
          <BarList
            caption="Reports received per district, top ten"
            rows={data.districts.map((d) => ({
              label: d.district,
              value: d.count,
            }))}
          />
        </Panel>

        <Panel
          title="One problem, many reports"
          description="Reports the system merged because they describe the same thing."
        >
          {data.clustered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing merged yet.</p>
          ) : (
            <ul className="flex flex-col">
              {data.clustered.map((c) => (
                <li
                  key={c.label}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-dashed border-border py-3 last:border-b-0"
                >
                  <span className="min-w-0 flex-1 truncate text-sm" title={c.label}>
                    {c.label}
                  </span>
                  <span className="eyebrow">{c.district}</span>
                  <span className="font-mono text-sm tabular-nums">
                    <strong className="font-bold text-primary">{c.memberCount}</strong>{" "}
                    reports · {lakh(c.totalAffected)} people
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Institutions engaged"
          value={`${t.universitiesEngaged} / ${t.universitiesTotal}`}
          note="have accepted a challenge"
        />
        <Stat label="Projects underway" value={String(t.projects)} />
        <Stat
          label="Industry partners"
          value={String(t.partners)}
          note={`${t.pledges} pledges made`}
        />
        <Stat label="Districts covered" value={`${t.districts} / 24`} note="of Jharkhand" />
      </section>
    </div>
  );
}
