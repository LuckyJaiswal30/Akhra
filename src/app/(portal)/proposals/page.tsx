"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { PageHeader } from "@/components/page-header";
import { RoleGate } from "@/components/role-gate";
import { Badge, Button, Card, Input, Select } from "@/components/kit";
import { DOMAIN_LABEL } from "@/lib/jharkhand";

const PLEDGE_KINDS = [
  { value: "mentoring", label: "Mentoring" },
  { value: "funding", label: "Funding" },
  { value: "prototyping", label: "Prototyping" },
  { value: "testing", label: "Testing" },
  { value: "deployment", label: "Deployment" },
  { value: "technology_transfer", label: "Technology transfer" },
] as const;

type PledgeKind = (typeof PLEDGE_KINDS)[number]["value"];

export default function ProposalsPage() {
  return (
    <RoleGate allow={["industry"]}>
      <ProposalsView />
    </RoleGate>
  );
}

function ProposalsView() {
  const proposals = useQuery(api.partners.openProposals);
  const mine = useQuery(api.partners.mine);
  const pledge = useMutation(api.partners.pledge);

  const [offering, setOffering] = useState<Id<"projects"> | null>(null);
  const [kind, setKind] = useState<PledgeKind>("prototyping");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(projectId: Id<"projects">) {
    setBusy(projectId);
    setError(null);
    try {
      await pledge({ projectId, kind, detail });
      setOffering(null);
      setDetail("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That did not work.");
    }
    setBusy(null);
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Industry partner" title="Open proposals">
        <p>
          Solution proposals from universities, each with the citizen problem it
          came from.
        </p>
      </PageHeader>

      {!mine && (
        <Card>
          <p className="text-muted-foreground">
            Choose your organisation from the header before offering support.
          </p>
        </Card>
      )}

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {proposals?.length === 0 && (
        <Card>
          <p className="text-muted-foreground">
            No open proposals right now. A university needs to submit one first.
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {proposals?.map((p) => (
          <Card key={p.projectId} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-bold">{p.title}</h2>
                <p className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
                  {p.universityName} · {p.departmentName} · {p.district}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                    People affected
                  </p>
                  <p className="font-display text-2xl font-bold tabular-nums text-primary">
                    {p.affected.toLocaleString("en-IN")}
                  </p>
                </div>
                {p.domain && <Badge tone="go">{DOMAIN_LABEL[p.domain]}</Badge>}
              </div>
            </div>

            <p className="rounded-md border-l-[3px] border-primary bg-secondary px-3 py-2 text-sm">
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                The problem this solves
              </span>
              <br />
              {p.problemDescription}
            </p>

            {p.proposalSummary && (
              <p className="max-w-[65ch] text-sm text-muted-foreground">
                <strong className="font-semibold text-foreground">
                  Proposed solution.{" "}
                </strong>
                {p.proposalSummary}
              </p>
            )}

            <dl className="flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-3 font-mono text-xs">
              {p.clusterSize > 1 && (
                <div className="flex gap-2">
                  <dt className="uppercase tracking-[0.08em] text-muted-foreground">
                    Reports merged
                  </dt>
                  <dd className="font-semibold tabular-nums">{p.clusterSize}</dd>
                </div>
              )}
              <div className="flex gap-2">
                <dt className="uppercase tracking-[0.08em] text-muted-foreground">
                  Partners so far
                </dt>
                <dd className="font-semibold tabular-nums">{p.pledgeCount}</dd>
              </div>
            </dl>

            {offering === p.projectId ? (
              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <div className="flex flex-wrap gap-2">
                  <Select
                    className="max-w-52"
                    value={kind}
                    onChange={(e) => setKind(e.target.value as PledgeKind)}
                  >
                    {PLEDGE_KINDS.map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </Select>
                  <Input
                    autoFocus
                    className="max-w-md"
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    placeholder="What exactly are you offering?"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={busy === p.projectId}
                    onClick={() => submit(p.projectId)}
                  >
                    {busy === p.projectId ? "Sending…" : "Offer support"}
                  </Button>
                  <Button variant="ghost" onClick={() => setOffering(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-t border-border pt-4">
                <Button
                  disabled={!mine}
                  onClick={() => setOffering(p.projectId)}
                >
                  Back this project
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
