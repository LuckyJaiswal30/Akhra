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
  Page,
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
    <Page width="column">
      <PageHeader
        title="What we backed"
        description={`What ${mine?.name ?? "your organisation"} has put its name to, and how those projects are getting on.`}
      />

      {(pledges === undefined || mine === undefined) && <LoadingList rows={2} />}

      {mine === null && (
        <EmptyState
          title="Pick your organisation first"
          description="Choose it from the dropdown at the top and anything you have backed will show up here."
        />
      )}

      {mine && pledges?.length === 0 && (
        <EmptyState
          title="You have not backed anything yet"
          description="Have a look at the projects looking for help and offer mentoring, money or a place to prototype."
        />
      )}

      <div className="flex flex-col gap-4">
        {pledges?.map((p) => (
          <Card key={p._id}>
            <CardBody className="flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-bold">{p.projectTitle}</h2>
                  <p className="text-sm text-muted-foreground">
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

              <p className="text-base text-muted-foreground">{p.detail}</p>

              <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
                <span className="eyebrow">Milestones</span>
                <span className="text-base font-semibold tabular">
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
                          : Math.round((p.milestonesDone / p.milestonesTotal) * 100)
                      }%`,
                    }}
                  />
                </span>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </Page>
  );
}
