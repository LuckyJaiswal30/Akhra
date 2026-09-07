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
  Page,
  PageHeader,
  TabPanel,
  Tabs,
} from "@/components/ui";
import { RoleGate } from "@/components/role-gate";
import { formatCount, formatShortDate } from "@/lib/datetime";
import { DOMAIN_LABEL, SEVERITY_LABEL } from "@/lib/jharkhand";

const TABS = [
  { value: "submitted", label: "To check" },
  { value: "validated", label: "Not sent on yet" },
  { value: "routed", label: "Sent on" },
  { value: "accepted", label: "Picked up" },
  { value: "rejected", label: "Closed" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

const EMPTY: Record<TabValue, { title: string; description: string }> = {
  submitted: {
    title: "Nothing to check",
    description:
      "You are all caught up. New reports land here as people send them in.",
  },
  validated: {
    title: "Nothing waiting",
    description:
      "Reports you confirmed that no university could be matched to end up here, so they are not lost.",
  },
  routed: {
    title: "Nothing sent on yet",
    description:
      "Confirm a report and it goes out to universities that could work on it, within seconds.",
  },
  accepted: {
    title: "Nobody has picked one up yet",
    description:
      "When a university takes on something you sent them, it shows up here.",
  },
  rejected: {
    title: "You have not closed anything",
    description: "Reports you close, and the reason you gave, are listed here.",
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
  const me = useQuery(api.users.current);
  const [tab, setTab] = useState<TabValue>("submitted");
  const reports = useQuery(api.problems.queue, { status: tab });
  const counts = useQuery(api.problems.queueCounts);
  const validate = useMutation(api.problems.validateProblem);
  const reject = useMutation(api.problems.rejectProblem);
  const retryRouting = useMutation(api.problems.retryRouting);

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
      setError(
        cause instanceof Error ? cause.message : "That did not go through.",
      );
    }
    setBusy(null);
  }

  if (me && !me.district) {
    return (
      <Page width="column">
        <PageHeader title="Reports to check" />
        <EmptyState
          title="Your account has no district on it"
          description="Officers only see reports from the district they are posted in. Ask an administrator to set yours, then reload this page."
        />
      </Page>
    );
  }

  return (
    <Page width="column">
      <PageHeader
        title="Reports to check"
        description={`Most urgent at the top${
          me?.district ? `, from ${me.district}` : ""
        }. Reports about the same thing are already merged, so one row here can be a lot of people.`}
      />

      <Tabs
        tabs={TABS}
        value={tab}
        onChange={setTab}
        label="Report states"
        idPrefix="queue"
        counts={counts ?? undefined}
      />

      {error && <Alert tone="danger">{error}</Alert>}

      <TabPanel idPrefix="queue" value={tab}>
        {reports === undefined && <LoadingList rows={3} />}

        {reports?.length === 0 && (
          <EmptyState
            title={EMPTY[tab].title}
            description={EMPTY[tab].description}
          />
        )}

        <div className="flex flex-col gap-4">
          {reports?.map((report) => (
            <Card key={report._id}>
              <CardBody className="flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex w-16 shrink-0 flex-col items-center rounded-md bg-secondary py-2">
                    <span className="text-2xl font-bold leading-none tabular text-primary">
                      {report.priority.toFixed(1)}
                    </span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      Priority
                    </span>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <h2 className="text-lg font-bold leading-snug">
                      {report.title}
                    </h2>
                    <p className="eyebrow">
                      {report.district}
                      {report.block ? ` · ${report.block}` : ""} ·{" "}
                      {report.reporterName}
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
                  <p className="rounded-md border border-accent-foreground/15 bg-accent px-4 py-3 text-base text-accent-foreground">
                    <strong className="font-semibold">
                      {report.clusterSize} reports, one problem
                    </strong>{" "}
                    — around {formatCount(report.clusterAffected)} people
                    affected across this cluster.
                  </p>
                )}

                <p className="text-base text-muted-foreground">
                  {report.description}
                </p>

                {report.photoUrls.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {report.photoUrls.map((url) => (
                      <li
                        key={url}
                        className="relative size-20 overflow-hidden rounded-md border border-border"
                      >
                        <Image
                          src={url}
                          alt=""
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </li>
                    ))}
                  </ul>
                )}

                <dl className="flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-3 text-sm">
                  <Pair
                    label="Affected"
                    value={formatCount(report.affectedEstimate)}
                  />
                  <Pair
                    label="Exact spot"
                    value={`${report.lat.toFixed(4)}, ${report.lng.toFixed(4)}`}
                  />
                  <Pair
                    label="Reported"
                    value={formatShortDate(report.createdAt)}
                  />
                </dl>

                {report.sourceNote && (
                  <p className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
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
                        className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-md bg-secondary px-3 py-2 text-sm"
                      >
                        <span className="text-sm font-bold tabular text-primary">
                          {Math.round(s.matchScore * 100)}%
                        </span>
                        <span className="flex-1">{s.reason}</span>
                        {s.status !== "suggested" && (
                          <Badge
                            tone={s.status === "accepted" ? "success" : "danger"}
                          >
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
                      label="Why are you closing this?"
                      hint="Whoever reported it will read exactly this, so be straight with them."
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
                        run(report._id, () =>
                          validate({ problemId: report._id }),
                        )
                      }
                    >
                      Validate and route
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setRejecting(report._id)}
                    >
                      Reject
                    </Button>
                  </CardFooter>
                ))}

              {report.status === "validated" && (
                <CardFooter className="flex-col items-start gap-3">
                  <p className="text-base text-muted-foreground">
                    You confirmed this, but no university department could be
                    matched to it, so nobody has been sent it yet.
                  </p>
                  <Button
                    loading={busy === report._id}
                    onClick={() =>
                      run(report._id, () =>
                        retryRouting({ problemId: report._id }),
                      )
                    }
                  >
                    Try sending it on again
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      </TabPanel>
    </Page>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular">{value}</dd>
    </div>
  );
}
