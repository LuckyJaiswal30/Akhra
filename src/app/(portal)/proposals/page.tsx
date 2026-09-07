"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { RoleGate } from "@/components/role-gate";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  Input,
  LoadingList,
  Page,
  PageHeader,
  Select,
} from "@/components/ui";
import { formatCount } from "@/lib/datetime";
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
      setError(cause instanceof Error ? cause.message : "That did not go through.");
    }
    setBusy(null);
  }

  return (
    <Page width="column">
      <PageHeader
        title="Projects looking for help"
        description="Plans from university teams, each one showing the problem a real person reported."
      />

      {mine === undefined && <LoadingList rows={2} />}

      {mine === null && (
        <EmptyState
          title="Pick your organisation first"
          description="Choose it from the dropdown at the top before you offer anything."
        />
      )}

      {error && <Alert tone="danger">{error}</Alert>}

      {mine && proposals === undefined && <LoadingList rows={2} />}

      {mine && proposals?.length === 0 && (
        <EmptyState
          title="Nothing needs backing right now"
          description="When a university team sends in a plan, it turns up here."
        />
      )}

      <div className="flex flex-col gap-4">
        {proposals?.map((p) => (
          <Card key={p.projectId}>
            <CardBody className="flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-bold">{p.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {p.universityName} · {p.departmentName} · {p.district}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="eyebrow">People affected</p>
                    <p className="text-2xl font-bold tabular text-primary">
                      {formatCount(p.affected)}
                    </p>
                  </div>
                  {p.domain && <Badge tone="primary">{DOMAIN_LABEL[p.domain]}</Badge>}
                </div>
              </div>

              <div className="rounded-md border-l-[3px] border-primary bg-secondary px-4 py-3">
                <p className="eyebrow">The problem this solves</p>
                <p className="mt-1 text-base">{p.problemDescription}</p>
              </div>

              {p.proposalSummary && (
                <p className="text-base text-muted-foreground">
                  <strong className="font-semibold text-foreground">
                    Proposed solution.{" "}
                  </strong>
                  {p.proposalSummary}
                </p>
              )}

              <dl className="flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-3 text-sm">
                {p.clusterSize > 1 && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">Reports merged</dt>
                    <dd className="font-semibold tabular">{p.clusterSize}</dd>
                  </div>
                )}
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Partners so far</dt>
                  <dd className="font-semibold tabular">{p.pledgeCount}</dd>
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
                      placeholder="What exactly are you offering, and what do you need from them?"
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
                  <Button disabled={!mine} onClick={() => setOffering(p.projectId)}>
                    Back this project
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </Page>
  );
}
