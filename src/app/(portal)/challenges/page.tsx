"use client";

import { useState } from "react";
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
} from "@/components/ui";
import { RoleGate } from "@/components/role-gate";
import { DOMAIN_LABEL } from "@/lib/jharkhand";

export default function ChallengesPage() {
  return (
    <RoleGate allow={["faculty", "student"]}>
      <ChallengesView />
    </RoleGate>
  );
}

function ChallengesView() {
  const challenges = useQuery(api.routing.myUniversityChallenges);
  const mine = useQuery(api.institutions.myUniversity);
  const accept = useMutation(api.routing.acceptChallenge);
  const decline = useMutation(api.routing.declineChallenge);

  const [declining, setDeclining] = useState<Id<"routings"> | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, action: () => Promise<unknown>) {
    setBusy(key);
    setError(null);
    try {
      await action();
      setDeclining(null);
      setReason("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That did not work.");
    }
    setBusy(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="University"
        title="Assigned challenges"
        description="Validated problems routed to your institution, with the reason each one came to you."
      />

      {error && <Alert tone="danger">{error}</Alert>}

      {!mine && (
        <EmptyState
          title="Choose your institution"
          description="Pick it from the dropdown in the header and anything routed to it will appear here."
        />
      )}

      {mine && challenges === undefined && <LoadingList rows={2} />}

      {mine && challenges?.length === 0 && (
        <EmptyState
          title={`Nothing routed to ${mine.shortName} yet`}
          description="Validate a report as a government officer and matching institutions are suggested within a few seconds."
        />
      )}

      <div className="flex flex-col gap-4">
        {challenges?.map((c) => (
          <Card key={c.routingId}>
            <CardBody className="flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-accent py-2">
                  <span className="font-display text-2xl font-extrabold leading-none tabular-nums text-accent-foreground">
                    {Math.round(c.matchScore * 100)}
                  </span>
                  <span className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-accent-foreground/70">
                    Match
                  </span>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <h2 className="text-lg font-bold leading-snug">{c.title}</h2>
                  <p className="eyebrow">
                    {c.district} · priority {c.priority.toFixed(1)}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {c.domain && <Badge tone="primary">{DOMAIN_LABEL[c.domain]}</Badge>}
                    {c.clusterSize > 1 && (
                      <Badge tone="neutral">{c.clusterSize} reports merged</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-secondary px-4 py-3">
                <p className="eyebrow">Why your department</p>
                <p className="mt-1 text-sm">{c.reason}</p>
              </div>

              <p className="max-w-[68ch] text-sm text-muted-foreground">
                {c.description}
              </p>

              <dl className="flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-3 font-mono text-xs">
                <div className="flex gap-2">
                  <dt className="uppercase tracking-[0.08em] text-muted-foreground">
                    Suggested department
                  </dt>
                  <dd className="font-semibold">{c.departmentName}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="uppercase tracking-[0.08em] text-muted-foreground">
                    People affected
                  </dt>
                  <dd className="font-semibold tabular-nums">
                    {c.affected.toLocaleString("en-IN")}
                  </dd>
                </div>
              </dl>
            </CardBody>

            {declining === c.routingId ? (
              <CardFooter className="flex-col items-stretch gap-3">
                <Field label="Why can your department not take this on?" required>
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
                    loading={busy === c.routingId}
                    onClick={() =>
                      run(c.routingId, () =>
                        decline({ routingId: c.routingId, reason }),
                      )
                    }
                  >
                    Confirm decline
                  </Button>
                  <Button variant="ghost" onClick={() => setDeclining(null)}>
                    Cancel
                  </Button>
                </div>
              </CardFooter>
            ) : (
              <CardFooter>
                <Button
                  loading={busy === c.routingId}
                  onClick={() =>
                    run(c.routingId, () => accept({ routingId: c.routingId }))
                  }
                >
                  Accept and form a team
                </Button>
                <Button variant="secondary" onClick={() => setDeclining(c.routingId)}>
                  Decline
                </Button>
              </CardFooter>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
