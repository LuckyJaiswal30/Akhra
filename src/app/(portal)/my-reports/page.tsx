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
  Page,
  PageHeader,
} from "@/components/ui";
import { formatDayMonthYear, machineDateTime } from "@/lib/datetime";
import {
  DOMAIN_LABEL,
  SEVERITY_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
} from "@/lib/jharkhand";
import { referenceFor } from "@/lib/reference";

export default function MyReportsPage() {
  const reports = useQuery(api.problems.listMine);

  return (
    <Page width="column">
      <PageHeader
        title="My reports"
        description="Everything you have sent in, and where each one has got to."
        actions={
          <Link href="/report">
            <Button size="sm">Report a problem</Button>
          </Link>
        }
      />

      {reports === undefined && <LoadingList rows={2} />}

      {reports?.length === 0 && (
        <EmptyState
          title="Nothing here yet"
          description="Report something and it will show up here. We will tell you every time it moves forward."
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
                  <h2 className="text-lg font-semibold leading-snug">
                    {report.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold tabular">
                      {referenceFor(report._id, report.createdAt)}
                    </span>{" "}
                    · {report.district}
                    {report.block ? ` · ${report.block}` : ""} ·{" "}
                    <time dateTime={machineDateTime(report.createdAt)}>
                      {formatDayMonthYear(report.createdAt)}
                    </time>
                  </p>
                </div>
                <Badge tone={STATUS_TONE[report.status] ?? "neutral"}>
                  {STATUS_LABEL[report.status] ?? report.status}
                </Badge>
              </div>

              <p className="text-base text-muted-foreground">
                {report.description}
              </p>

              {report.photoUrls.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {report.photoUrls.map((url) => (
                    <li
                      key={url}
                      className="relative size-20 overflow-hidden rounded-sm border border-border"
                    >
                      <Image src={url} alt="" fill unoptimized className="object-cover" />
                    </li>
                  ))}
                </ul>
              )}

              {report.clusterSize > 1 && (
                <p className="rounded-md border border-accent-foreground/15 bg-accent px-4 py-3 text-base text-accent-foreground">
                  <strong className="font-semibold">
                    You are not the only one.
                  </strong>{" "}
                  {report.clusterSize - 1} other{" "}
                  {report.clusterSize === 2 ? "person has" : "people have"}{" "}
                  reported this same problem. It is being counted as one thing,
                  which makes it harder to ignore.
                </p>
              )}

              <dl className="flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-3 text-sm">
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Priority</dt>
                  <dd className="font-semibold tabular">
                    {report.priority.toFixed(1)}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Sorted as</dt>
                  <dd className="font-semibold">
                    {report.domain ? DOMAIN_LABEL[report.domain] : "Still sorting"}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Severity</dt>
                  <dd className="font-semibold">
                    {SEVERITY_LABEL[report.severity]}
                  </dd>
                </div>
              </dl>

              {report.rejectionReason && (
                <Alert tone="danger" title="Why this was closed">
                  {report.rejectionReason}
                </Alert>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </Page>
  );
}
