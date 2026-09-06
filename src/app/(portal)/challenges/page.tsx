"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { PageHeader } from "@/components/page-header";
import { Badge, Button, Card, Input } from "@/components/kit";
import { DOMAIN_LABEL } from "@/lib/jharkhand";
import { RoleGate } from "@/components/role-gate";

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

  async function run(action: () => Promise<unknown>, key: string) {
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
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="University" title="Assigned challenges">
        <p>
          Validated problems routed to your institution, with the reason each
          one came to you.
        </p>
      </PageHeader>

      {!mine && (
        <Card>
          <p className="text-muted-foreground">
            Choose your institution from the header to see what has been routed
            to it.
          </p>
        </Card>
      )}

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {mine && challenges?.length === 0 && (
        <Card>
          <p className="text-muted-foreground">
            Nothing routed to {mine.shortName} yet. Validate a report as an
            officer and it will appear here within a few seconds.
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {challenges?.map((challenge) => (
          <Card key={challenge.routingId} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-bold">{challenge.title}</h2>
                <p className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
                  {challenge.district} · priority{" "}
                  {challenge.priority.toFixed(1)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                    Match
                  </p>
                  <p className="font-display text-2xl font-bold tabular-nums text-primary">
                    {Math.round(challenge.matchScore * 100)}%
                  </p>
                </div>
                <Badge tone={challenge.domain ? "go" : "neutral"}>
                  {challenge.domain
                    ? DOMAIN_LABEL[challenge.domain]
                    : "Unsorted"}
                </Badge>
              </div>
            </div>

            <p className="rounded-md border-l-[3px] border-primary bg-secondary px-3 py-2 text-sm">
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                Why you
              </span>
              <br />
              {challenge.reason}
            </p>

            <p className="max-w-[65ch] text-sm text-muted-foreground">
              {challenge.description}
            </p>

            <dl className="flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-3 font-mono text-xs">
              <div className="flex gap-2">
                <dt className="uppercase tracking-[0.08em] text-muted-foreground">
                  Suggested department
                </dt>
                <dd className="font-semibold">{challenge.departmentName}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="uppercase tracking-[0.08em] text-muted-foreground">
                  People affected
                </dt>
                <dd className="font-semibold tabular-nums">
                  {challenge.affected.toLocaleString("en-IN")}
                </dd>
              </div>
              {challenge.clusterSize > 1 && (
                <div className="flex gap-2">
                  <dt className="uppercase tracking-[0.08em] text-muted-foreground">
                    Reports merged
                  </dt>
                  <dd className="font-semibold tabular-nums">
                    {challenge.clusterSize}
                  </dd>
                </div>
              )}
            </dl>

            {declining === challenge.routingId ? (
              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <Input
                  autoFocus
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why can your department not take this on?"
                />
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    disabled={busy === challenge.routingId}
                    onClick={() =>
                      run(
                        () =>
                          decline({
                            routingId: challenge.routingId,
                            reason,
                          }),
                        challenge.routingId,
                      )
                    }
                  >
                    Confirm decline
                  </Button>
                  <Button variant="ghost" onClick={() => setDeclining(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Button
                  disabled={busy === challenge.routingId}
                  onClick={() =>
                    run(
                      () => accept({ routingId: challenge.routingId }),
                      challenge.routingId,
                    )
                  }
                >
                  {busy === challenge.routingId
                    ? "Working…"
                    : "Accept and form a team"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setDeclining(challenge.routingId)}
                >
                  Decline
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
