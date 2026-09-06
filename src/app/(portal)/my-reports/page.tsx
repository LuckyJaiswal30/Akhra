"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { PageHeader } from "@/components/page-header";
import { Badge, Button, Card } from "@/components/kit";
import {
  DOMAIN_LABEL,
  SEVERITY_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
} from "@/lib/jharkhand";

export default function MyReportsPage() {
  const reports = useQuery(api.problems.listMine);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Citizen" title="My reports">
        <p>Everything you have submitted, and where each one has reached.</p>
      </PageHeader>

      {reports === undefined && (
        <p className="font-mono text-sm text-muted-foreground">Loading…</p>
      )}

      {reports?.length === 0 && (
        <Card className="flex flex-col items-start gap-4">
          <p className="text-muted-foreground">
            You have not reported anything yet.
          </p>
          <Link href="/report">
            <Button>Report a problem</Button>
          </Link>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {reports?.map((report) => (
          <Card key={report._id} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-bold">{report.title}</h2>
                <p className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
                  {report.district}
                  {report.block ? ` · ${report.block}` : ""} ·{" "}
                  {new Date(report.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <Badge tone={STATUS_TONE[report.status] ?? "neutral"}>
                {STATUS_LABEL[report.status] ?? report.status}
              </Badge>
            </div>

            <p className="max-w-[65ch] text-sm text-muted-foreground">
              {report.description}
            </p>

            {report.photoUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {report.photoUrls.map((url) => (
                  <div
                    key={url}
                    className="relative h-24 w-32 overflow-hidden rounded-md border border-border"
                  >
                    <Image
                      src={url}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            <dl className="flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-3 font-mono text-xs">
              <div className="flex gap-2">
                <dt className="text-muted-foreground uppercase tracking-[0.08em]">
                  Priority
                </dt>
                <dd className="font-semibold tabular-nums">
                  {report.priority.toFixed(1)}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground uppercase tracking-[0.08em]">
                  Domain
                </dt>
                <dd className="font-semibold">
                  {report.domain ? DOMAIN_LABEL[report.domain] : "Being sorted"}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground uppercase tracking-[0.08em]">
                  Severity
                </dt>
                <dd className="font-semibold">
                  {SEVERITY_LABEL[report.severity]}
                </dd>
              </div>
              {report.clusterSize > 1 && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground uppercase tracking-[0.08em]">
                    Merged with
                  </dt>
                  <dd className="font-semibold tabular-nums">
                    {report.clusterSize - 1} similar reports
                  </dd>
                </div>
              )}
            </dl>

            {report.rejectionReason && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {report.rejectionReason}
              </p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
