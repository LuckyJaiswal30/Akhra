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
  Page,
  PageHeader,
} from "@/components/ui";
import { RoleGate } from "@/components/role-gate";
import { formatCount } from "@/lib/datetime";
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
      setError(
        cause instanceof Error ? cause.message : "That did not go through.",
      );
    }
    setBusy(null);
  }

  return (
    <Page width="column">
      <PageHeader
        title="Problems sent to you"
        description="Real problems an officer has confirmed and sent to your institution, with why each one landed with you."
      />

      {error && <Alert tone="danger">{error}</Alert>}

      {mine === undefined && <LoadingList rows={2} />}

      {mine === null && (
        <EmptyState
          title="Pick your institution first"
          description="Choose it from the dropdown at the top, and anything sent to it will show up here."
        />
      )}

      {mine && challenges === undefined && <LoadingList rows={2} />}

      {mine && challenges?.length === 0 && (
        <EmptyState
          title={`Nothing for ${mine.shortName} yet`}
          description="Nothing has been sent your way yet. Once an officer confirms a report that matches what you do, it will appear here."
        />
      )}

      <div className="flex flex-col gap-4">
        {challenges?.map((c) => (
          <Card key={c.routingId}>
            <CardBody className="flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className="flex w-16 shrink-0 flex-col items-center rounded-md bg-accent py-2">
                  <span className="text-2xl font-bold leading-none tabular text-accent-foreground">
                    {Math.round(c.matchScore * 100)}
                  </span>
                  <span className="mt-1 text-xs text-accent-foreground/70">
                    Match
                  </span>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <h2 className="text-lg font-bold leading-snug">{c.title}</h2>
                  <p className="eyebrow">
                    {c.district} · priority {c.priority.toFixed(1)}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {c.domain && (
                      <Badge tone="primary">{DOMAIN_LABEL[c.domain]}</Badge>
                    )}
                    {c.clusterSize > 1 && (
                      <Badge tone="neutral">{c.clusterSize} reports merged</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-md bg-secondary px-4 py-3">
                <p className="eyebrow">Why your department</p>
                <p className="mt-1 text-base">{c.reason}</p>
              </div>

              <p className="text-base text-muted-foreground">{c.description}</p>

              <dl className="flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-3 text-sm">
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Suggested department</dt>
                  <dd className="font-semibold">{c.departmentName}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">People affected</dt>
                  <dd className="font-semibold tabular">
                    {formatCount(c.affected)}
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
                <Button
                  variant="secondary"
                  onClick={() => setDeclining(c.routingId)}
                >
                  Decline
                </Button>
              </CardFooter>
            )}
          </Card>
        ))}
      </div>
    </Page>
  );
}
