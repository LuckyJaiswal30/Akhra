"use client";

import { useState } from "react";
import Image from "next/image";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  EmptyState,
  Field,
  Input,
  LoadingList,
  PageHeader,
  Tabs,
} from "@/components/ui";
import { RoleGate } from "@/components/role-gate";
import { DOMAIN_LABEL, SEVERITY_LABEL } from "@/lib/jharkhand";

const TABS = [
  { value: "submitted", label: "Waiting" },
  { value: "routed", label: "Routed" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

const EMPTY: Record<TabValue, { title: string; description: string }> = {
  submitted: {
    title: "Nothing waiting",
    description: "Every report has been dealt with. New ones appear here as citizens submit them.",
  },
  routed: {
    title: "Nothing routed yet",
    description: "Validate a waiting report and it will be sent to matching universities within a few seconds.",
  },
  accepted: {
    title: "Nothing accepted yet",
    description: "Once a university takes on a routed challenge it will show here.",
  },
  rejected: {
    title: "Nothing rejected",
    description: "Reports you decline, with the reason given, will be listed here.",
  },
};

const SOURCE_TONE = {
  verified: "success",
  partial: "warning",
  corrected: "info",
  unverified: "danger",
} as const;

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

  async function run(key: string, action: () => Promise<unknown>) {
    setBusy(key);
    setError(null);
    try {
      await action();
      setRejecting(null);
      setReason("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That did not work.");
    }
    setBusy(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Government officer"
        title="Validation queue"
        description="Most urgent first. Reports describing the same problem are already merged, so one row can stand for many people."
      />

      <Tabs tabs={TABS} value={tab} onChange={setTab} counts={counts ?? undefined} />

      {error && <Alert tone="danger">{error}</Alert>}

      {reports === undefined && <LoadingList rows={3} />}

      {reports?.length === 0 && (
        <EmptyState title={EMPTY[tab].title} description={EMPTY[tab].description} />
      )}

      <div className="flex flex-col gap-4">
        {reports?.map((report) => (
          <Card key={report._id}>
            <CardBody className="flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-secondary py-2">
                  <span className="font-display text-2xl font-extrabold leading-none tabular-nums text-primary">
                    {report.priority.toFixed(1)}
                  </span>
                  <span className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground">
                    Priority
                  </span>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <h2 className="text-lg font-bold leading-snug">{report.title}</h2>
                  <p className="eyebrow">
                    {report.district}
                    {report.block ? ` · ${report.block}` : ""} · {report.reporterName}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Badge tone={report.domain ? "primary" : "neutral"}>
                      {report.domain ? DOMAIN_LABEL[report.domain] : "Unsorted"}
                    </Badge>
                    <Badge tone={report.severity >= 4 ? "danger" : "neutral"}>
                      {SEVERITY_LABEL[report.severity]}
                    </Badge>
                    {report.sourceStatus && (
                      <Badge tone={SOURCE_TONE[report.sourceStatus]}>
                        Source {report.sourceStatus}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {report.clusterSize > 1 && (
                <p className="rounded-lg border border-accent-foreground/15 bg-accent px-4 py-3 text-sm text-accent-foreground">
                  <strong className="font-semibold">
                    {report.clusterSize} reports, one problem
                  </strong>{" "}
                  — around {report.clusterAffected.toLocaleString("en-IN")} people
                  affected across this cluster.
                </p>
              )}

              <p className="max-w-[68ch] text-sm text-muted-foreground">
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

              <dl className="flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-3 font-mono text-xs">
                <Pair label="Affected" value={report.affectedEstimate.toLocaleString("en-IN")} />
                <Pair
                  label="Exact location"
                  value={`${report.lat.toFixed(4)}, ${report.lng.toFixed(4)}`}
                />
                <Pair
                  label="Reported"
                  value={new Date(report.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                />
              </dl>

              {report.sourceNote && (
                <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                  {report.sourceNote}{" "}
                  {report.sourceUrl && (
                    <a
                      href={report.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      reference
                    </a>
                  )}
                </p>
              )}

              {report.suggestions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="eyebrow">Routed to</p>
                  {report.suggestions.map((s) => (
                    <div
                      key={s._id}
                      className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg bg-secondary px-3 py-2.5 text-sm"
                    >
                      <span className="font-mono text-xs font-bold tabular-nums text-primary">
                        {Math.round(s.matchScore * 100)}%
                      </span>
                      <span className="flex-1">{s.reason}</span>
                      {s.status !== "suggested" && (
                        <Badge tone={s.status === "accepted" ? "success" : "danger"}>
                          {s.status}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardBody>

            {report.status === "submitted" &&
              (rejecting === report._id ? (
                <CardFooter className="flex-col items-stretch gap-3">
                  <Field
                    label="Why is this not being taken forward?"
                    hint="The person who reported it will see this."
                    required
                  >
                    {(p) => (
                      <Input
                        {...p}
                        autoFocus
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    )}
                  </Field>
                  <div className="flex gap-2">
                    <Button
                      variant="danger"
                      loading={busy === report._id}
                      onClick={() =>
                        run(report._id, () =>
                          reject({ problemId: report._id, reason }),
                        )
                      }
                    >
                      Confirm rejection
                    </Button>
                    <Button variant="ghost" onClick={() => setRejecting(null)}>
                      Cancel
                    </Button>
                  </div>
                </CardFooter>
              ) : (
                <CardFooter>
                  <Button
                    loading={busy === report._id}
                    onClick={() =>
                      run(report._id, () => validate({ problemId: report._id }))
                    }
                  >
                    Validate and route
                  </Button>
                  <Button variant="secondary" onClick={() => setRejecting(report._id)}>
                    Reject
                  </Button>
                </CardFooter>
              ))}
          </Card>
        ))}
      </div>
    </div>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="uppercase tracking-[0.08em] text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
