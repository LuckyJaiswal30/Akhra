"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  LoadingList,
  PageHeader,
} from "@/components/ui";
import {
  DOMAIN_LABEL,
  SEVERITY_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
} from "@/lib/jharkhand";

const TONE = {
  neutral: "neutral",
  go: "success",
  warn: "warning",
  stop: "danger",
} as const;

export default function MyReportsPage() {
  const reports = useQuery(api.problems.listMine);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        eyebrow="Citizen"
        title="My reports"
        description="Everything you have reported, and exactly where each one has reached."
        actions={
          <Link href="/report">
            <Button size="sm">Report a problem</Button>
          </Link>
        }
      />

      {reports === undefined && <LoadingList rows={2} />}

      {reports?.length === 0 && (
        <EmptyState
          title="You have not reported anything yet"
          description="When you report a problem it appears here, and you will be told each time it moves forward."
          action={
            <Link href="/report">
              <Button>Report a problem</Button>
            </Link>
          }
        />
      )}

      <div className="flex flex-col gap-4">
        {reports?.map((report) => (
          <Card key={report._id}>
            <CardBody className="flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <h2 className="text-lg font-bold leading-snug">
                    {report.title}
                  </h2>
                  <p className="eyebrow">
                    {report.district}
                    {report.block ? ` · ${report.block}` : ""} ·{" "}
                    {new Date(report.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <Badge tone={TONE[STATUS_TONE[report.status] ?? "neutral"]}>
                  {STATUS_LABEL[report.status] ?? report.status}
                </Badge>
              </div>

              <p className="max-w-[65ch] text-sm text-muted-foreground">
                {report.description}
              </p>

              {report.photoUrls.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {report.photoUrls.map((url) => (
                    <li
                      key={url}
                      className="relative size-20 overflow-hidden rounded-lg border border-border"
                    >
                      <Image src={url} alt="" fill unoptimized className="object-cover" />
                    </li>
                  ))}
                </ul>
              )}

              {report.clusterSize > 1 && (
                <p className="rounded-lg border border-accent-foreground/15 bg-accent px-4 py-3 text-sm text-accent-foreground">
                  <strong className="font-semibold">You are not alone.</strong>{" "}
                  {report.clusterSize - 1} other{" "}
                  {report.clusterSize === 2 ? "person has" : "people have"} reported
                  the same problem. They have been counted together.
                </p>
              )}

              <dl className="flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-3 font-mono text-xs">
                <div className="flex gap-2">
                  <dt className="uppercase tracking-[0.08em] text-muted-foreground">
                    Priority
                  </dt>
                  <dd className="font-semibold tabular-nums">
                    {report.priority.toFixed(1)}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="uppercase tracking-[0.08em] text-muted-foreground">
                    Sorted as
                  </dt>
                  <dd className="font-semibold">
                    {report.domain ? DOMAIN_LABEL[report.domain] : "Being sorted"}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="uppercase tracking-[0.08em] text-muted-foreground">
                    Severity
                  </dt>
                  <dd className="font-semibold">
                    {SEVERITY_LABEL[report.severity]}
                  </dd>
                </div>
              </dl>

              {report.rejectionReason && (
                <Alert tone="danger" title="Not taken forward">
                  {report.rejectionReason}
                </Alert>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
