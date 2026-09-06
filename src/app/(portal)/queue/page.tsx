"use client";

import Image from "next/image";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { PageHeader } from "@/components/page-header";
import { Badge, Button, Card, Input } from "@/components/kit";
import { DOMAIN_LABEL, SEVERITY_LABEL } from "@/lib/jharkhand";
import { RoleGate } from "@/components/role-gate";

const TABS = [
  { value: "submitted", label: "Waiting" },
  { value: "routed", label: "Routed" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export default function QueuePage() {
  return (
    <RoleGate allow={["officer"]}>
      <QueueView />
    </RoleGate>
  );
}

function QueueView() {
  const [tab, setTab] = useState<TabValue>("submitted");
  const reports = useQuery(api.problems.queue, { status: tab });
  const counts = useQuery(api.problems.queueCounts);
  const validate = useMutation(api.problems.validateProblem);
  const reject = useMutation(api.problems.rejectProblem);

  const [rejecting, setRejecting] = useState<Id<"problems"> | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onValidate(problemId: Id<"problems">) {
    setBusy(problemId);
    setError(null);
    try {
      await validate({ problemId });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That did not work.");
    }
    setBusy(null);
  }

  async function onReject(problemId: Id<"problems">) {
    setBusy(problemId);
    setError(null);
    try {
      await reject({ problemId, reason });
      setRejecting(null);
      setReason("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That did not work.");
    }
    setBusy(null);
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Government officer" title="Validation queue">
        <p>
          Waiting reports, most urgent first. Duplicates are merged, so one row
          can stand for many people reporting the same thing.
        </p>
      </PageHeader>

      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((item) => (
          <button
            key={item.value}
            onClick={() => setTab(item.value)}
            className={
              tab === item.value
                ? "-mb-px border-b-2 border-primary px-3 py-2 text-sm font-medium text-foreground"
                : "-mb-px border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            }
          >
            {item.label}
            {counts && (
              <span className="ml-2 font-mono text-xs tabular-nums text-muted-foreground">
                {counts[item.value] ?? 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {reports === undefined && (
        <p className="font-mono text-sm text-muted-foreground">Loading…</p>
      )}

      {reports?.length === 0 && (
        <Card>
          <p className="text-muted-foreground">
            Nothing here right now.
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {reports?.map((report) => (
          <Card key={report._id} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-bold">{report.title}</h2>
                <p className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
                  {report.district}
                  {report.block ? ` · ${report.block}` : ""} · reported by{" "}
                  {report.reporterName}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                    Priority
                  </p>
                  <p className="font-display text-2xl font-bold tabular-nums text-primary">
                    {report.priority.toFixed(1)}
                  </p>
                </div>
                <Badge tone={report.domain ? "go" : "neutral"}>
                  {report.domain ? DOMAIN_LABEL[report.domain] : "Unsorted"}
                </Badge>
              </div>
            </div>

            {report.clusterSize > 1 && (
              <p className="rounded-md border-l-[3px] border-primary bg-secondary px-3 py-2 text-sm">
                <strong className="font-semibold">
                  {report.clusterSize} reports, one problem
                </strong>{" "}
                — around {report.clusterAffected.toLocaleString("en-IN")} people
                affected across this cluster.
              </p>
            )}

            <p className="max-w-[65ch] text-sm text-muted-foreground">
              {report.description}
            </p>

            {report.photoUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {report.photoUrls.map((url) => (
                  <div
                    key={url}
                    className="relative h-28 w-36 overflow-hidden rounded-md border border-border"
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
                <dt className="uppercase tracking-[0.08em] text-muted-foreground">
                  Severity
                </dt>
                <dd className="font-semibold">
                  {SEVERITY_LABEL[report.severity]}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="uppercase tracking-[0.08em] text-muted-foreground">
                  Affected
                </dt>
                <dd className="font-semibold tabular-nums">
                  {report.affectedEstimate.toLocaleString("en-IN")}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="uppercase tracking-[0.08em] text-muted-foreground">
                  Exact location
                </dt>
                <dd className="font-semibold tabular-nums">
                  {report.lat.toFixed(4)}, {report.lng.toFixed(4)}
                </dd>
              </div>
            </dl>

            {report.sourceNote && (
              <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                <span className="font-mono uppercase tracking-[0.1em]">
                  Source
                </span>
                {report.sourceStatus && (
                  <span
                    className={
                      report.sourceStatus === "verified"
                        ? "ml-2 font-mono text-[0.65rem] uppercase tracking-[0.1em] text-[var(--success)]"
                        : report.sourceStatus === "unverified"
                          ? "ml-2 font-mono text-[0.65rem] uppercase tracking-[0.1em] text-destructive"
                          : "ml-2 font-mono text-[0.65rem] uppercase tracking-[0.1em] text-[var(--warning)]"
                    }
                  >
                    {report.sourceStatus}
                  </span>
                )}{" "}
                {report.sourceNote}{" "}
                {report.sourceUrl && (
                  <a
                    href={report.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    reference
                  </a>
                )}
              </p>
            )}

            {report.suggestions.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <p className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                  Routed to
                </p>
                {report.suggestions.map((suggestion) => (
                  <div
                    key={suggestion._id}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-md bg-secondary px-3 py-2 text-sm"
                  >
                    <span className="font-mono text-xs font-semibold tabular-nums text-primary">
                      {Math.round(suggestion.matchScore * 100)}%
                    </span>
                    <span>{suggestion.reason}</span>
                    {suggestion.status !== "suggested" && (
                      <Badge tone={suggestion.status === "accepted" ? "go" : "stop"}>
                        {suggestion.status}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}

            {report.status !== "submitted" ? null : rejecting === report._id ? (
              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <Input
                  autoFocus
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why is this not being taken forward?"
                />
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    disabled={busy === report._id}
                    onClick={() => onReject(report._id)}
                  >
                    Confirm rejection
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setRejecting(null);
                      setReason("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Button
                  disabled={busy === report._id}
                  onClick={() => onValidate(report._id)}
                >
                  {busy === report._id ? "Working…" : "Validate and route"}
                </Button>
                <Button variant="ghost" onClick={() => setRejecting(report._id)}>
                  Reject
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
