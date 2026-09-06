"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { RoleGate } from "@/components/role-gate";
import {
  Badge,
  Card,
  CardBody,
  EmptyState,
  LoadingList,
  PageHeader,
} from "@/components/ui";

const STATUS_LABEL: Record<string, string> = {
  offered: "Offered",
  accepted: "Accepted",
  delivered: "Delivered",
};

export default function PledgesPage() {
  return (
    <RoleGate allow={["industry"]}>
      <PledgesView />
    </RoleGate>
  );
}

function PledgesView() {
  const pledges = useQuery(api.partners.myPledges);
  const mine = useQuery(api.partners.mine);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Industry partner"
        title="Our pledges"
        description={`What ${mine?.name ?? "your organisation"} has committed to, and how those projects are progressing.`}
      />

      {pledges === undefined && <LoadingList rows={2} />}

      {pledges?.length === 0 && (
        <EmptyState
          title="Nothing pledged yet"
          description="Browse open proposals and back one with mentoring, funding or prototyping."
        />
      )}

      <div className="flex flex-col gap-4">
        {pledges?.map((p) => (
          <Card key={p._id}><CardBody className="flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-bold">{p.projectTitle}</h2>
                <p className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
                  {p.universityName} · {p.district}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={p.stage === "deployed" ? "success" : "neutral"}>
                  {p.kind.replace(/_/g, " ")}
                </Badge>
                <Badge tone={p.status === "delivered" ? "success" : "neutral"}>
                  {STATUS_LABEL[p.status] ?? p.status}
                </Badge>
              </div>
            </div>

            <p className="max-w-[65ch] text-sm text-muted-foreground">
              {p.detail}
            </p>

            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                Milestones
              </span>
              <span className="font-mono text-sm font-semibold tabular-nums">
                {p.milestonesDone}/{p.milestonesTotal}
              </span>
              <span
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"
                aria-hidden="true"
              >
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{
                    width: `${
                      p.milestonesTotal === 0
                        ? 0
                        : Math.round(
                            (p.milestonesDone / p.milestonesTotal) * 100,
                          )
                    }%`,
                  }}
                />
              </span>
            </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
