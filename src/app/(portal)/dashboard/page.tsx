"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/kit";
import { BarList, Funnel, Stat } from "@/components/bar-list";
import { DOMAIN_LABEL, STATUS_LABEL } from "@/lib/jharkhand";

export default function DashboardPage() {
  const data = useQuery(api.dashboard.overview);

  if (!data) {
    return (
      <p className="font-mono text-sm text-muted-foreground">Loading…</p>
    );
  }

  const t = data.totals;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Analytics" title="Jharkhand at a glance">
        <p>
          How the pipeline is performing — from a citizen&rsquo;s report to a
          deployed solution.
        </p>
      </PageHeader>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Reports received"
          value={t.reports.toLocaleString("en-IN")}
          note={`across ${t.districts} districts`}
        />
        <Stat
          label="People affected"
          value={
            t.peopleAffected >= 100000
              ? `${(t.peopleAffected / 100000).toFixed(1)} lakh`
              : t.peopleAffected.toLocaleString("en-IN")
          }
          note="as estimated by reporters"
        />
        <Stat
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
        <Card className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-bold">Reports by domain</h2>
            <p className="text-sm text-muted-foreground">
              Which kinds of problem citizens actually report.
            </p>
          </div>
          <BarList
            rows={data.domains.map((d) => ({
              label: DOMAIN_LABEL[d.domain] ?? d.domain,
              value: d.count,
            }))}
          />
        </Card>

        <Card className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-bold">The pipeline</h2>
            <p className="text-sm text-muted-foreground">
              Where reports currently sit, from submission to deployment.
            </p>
          </div>
          <Funnel
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
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-bold">Districts reporting most</h2>
            <p className="text-sm text-muted-foreground">
              Top ten by number of reports.
            </p>
          </div>
          <BarList
            rows={data.districts.map((d) => ({
              label: d.district,
              value: d.count,
            }))}
          />
        </Card>

        <Card className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-bold">One problem, many reports</h2>
            <p className="text-sm text-muted-foreground">
              Reports the system merged automatically because they describe the
              same thing.
            </p>
          </div>
          {data.clustered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing merged yet.
            </p>
          ) : (
            <ul className="flex flex-col">
              {data.clustered.map((c) => (
                <li
                  key={c.label}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-dashed border-border py-2.5 last:border-b-0"
                >
                  <span className="max-w-[26ch] flex-1 truncate text-sm" title={c.label}>
                    {c.label}
                  </span>
                  <span className="font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
                    {c.district}
                  </span>
                  <span className="font-mono text-sm tabular-nums">
                    <strong className="font-semibold text-primary">
                      {c.memberCount}
                    </strong>{" "}
                    reports ·{" "}
                    {c.totalAffected.toLocaleString("en-IN")} people
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
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
        <Stat
          label="Districts covered"
          value={`${t.districts} / 24`}
          note="of Jharkhand"
        />
      </section>
    </div>
  );
}
