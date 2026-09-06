"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { PageHeader } from "@/components/page-header";
import { RoleGate } from "@/components/role-gate";
import { Badge, Button, Card, Input, Textarea } from "@/components/kit";
import { DOMAIN_LABEL } from "@/lib/jharkhand";

const STAGE_LABEL: Record<string, string> = {
  team_forming: "Forming a team",
  proposal_draft: "Drafting a proposal",
  proposal_submitted: "Proposal submitted",
  prototyping: "Prototyping",
  field_testing: "Field testing",
  deployed: "Deployed",
};

const MILESTONE_LABEL: Record<string, string> = {
  pending: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  approved: "Approved",
};

const NEXT_ACTION: Record<string, string> = {
  pending: "Start",
  in_progress: "Mark submitted",
  submitted: "Approve",
  approved: "Done",
};

export default function ProjectsPage() {
  return (
    <RoleGate allow={["faculty", "student"]}>
      <ProjectsView />
    </RoleGate>
  );
}

function ProjectsView() {
  const projects = useQuery(api.projects.mine);
  const submitProposal = useMutation(api.projects.submitProposal);
  const addMilestone = useMutation(api.projects.addMilestone);
  const advanceMilestone = useMutation(api.projects.advanceMilestone);

  const [drafting, setDrafting] = useState<Id<"projects"> | null>(null);
  const [summary, setSummary] = useState("");
  const [milestoneFor, setMilestoneFor] = useState<Id<"projects"> | null>(null);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, action: () => Promise<unknown>) {
    setBusy(key);
    setError(null);
    try {
      await action();
      setDrafting(null);
      setSummary("");
      setMilestoneFor(null);
      setMilestoneTitle("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That did not work.");
    }
    setBusy(null);
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="University" title="Projects">
        <p>Work in progress on the challenges your department accepted.</p>
      </PageHeader>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {projects?.length === 0 && (
        <Card>
          <p className="text-muted-foreground">
            No projects yet. Accept a challenge and one is created for you.
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {projects?.map((project) => {
          const done = project.milestones.filter(
            (m) => m.status === "approved",
          ).length;

          return (
            <Card key={project._id} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-bold">{project.title}</h2>
                  <p className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
                    {project.district} · {project.departmentName}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={project.stage === "deployed" ? "go" : "neutral"}>
                    {STAGE_LABEL[project.stage] ?? project.stage}
                  </Badge>
                  {project.domain && (
                    <Badge tone="go">{DOMAIN_LABEL[project.domain]}</Badge>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                    Team
                  </p>
                  <ul className="mt-1 flex flex-col gap-1 text-sm">
                    {project.members.map((m) => (
                      <li key={m._id}>
                        {m.name}{" "}
                        <span className="text-muted-foreground">
                          — {m.position.replace(/_/g, " ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                    Industry backing
                  </p>
                  {project.backers.length === 0 ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      None yet.
                    </p>
                  ) : (
                    <ul className="mt-1 flex flex-col gap-1 text-sm">
                      {project.backers.map((b) => (
                        <li key={b._id}>
                          <strong className="font-semibold">
                            {b.partnerName}
                          </strong>{" "}
                          <span className="text-muted-foreground">
                            — {b.kind}: {b.detail}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {project.proposalSummary ? (
                <p className="rounded-md border-l-[3px] border-primary bg-secondary px-3 py-2 text-sm">
                  <span className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                    Proposed solution
                  </span>
                  <br />
                  {project.proposalSummary}
                </p>
              ) : drafting === project._id ? (
                <div className="flex flex-col gap-3">
                  <Textarea
                    autoFocus
                    rows={4}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="What will the team build, and how does it solve the problem?"
                  />
                  <div className="flex gap-2">
                    <Button
                      disabled={busy === project._id}
                      onClick={() =>
                        run(project._id, () =>
                          submitProposal({
                            projectId: project._id,
                            summary,
                          }),
                        )
                      }
                    >
                      Submit proposal
                    </Button>
                    <Button variant="ghost" onClick={() => setDrafting(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <Button variant="ghost" onClick={() => setDrafting(project._id)}>
                    Write a solution proposal
                  </Button>
                </div>
              )}

              <div className="border-t border-border pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                    Milestones {done}/{project.milestones.length}
                  </p>
                  <Button
                    variant="ghost"
                    onClick={() => setMilestoneFor(project._id)}
                  >
                    Add milestone
                  </Button>
                </div>

                {milestoneFor === project._id && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Input
                      autoFocus
                      className="max-w-md"
                      value={milestoneTitle}
                      onChange={(e) => setMilestoneTitle(e.target.value)}
                      placeholder="Prototype built and bench tested"
                    />
                    <Button
                      disabled={busy === project._id}
                      onClick={() =>
                        run(project._id, () =>
                          addMilestone({
                            projectId: project._id,
                            title: milestoneTitle,
                            dueInDays: 14,
                          }),
                        )
                      }
                    >
                      Add
                    </Button>
                    <Button variant="ghost" onClick={() => setMilestoneFor(null)}>
                      Cancel
                    </Button>
                  </div>
                )}

                <ul className="mt-3 flex flex-col gap-2">
                  {project.milestones.map((m) => (
                    <li
                      key={m._id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-secondary px-3 py-2 text-sm"
                    >
                      <span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {String(m.order).padStart(2, "0")}
                        </span>{" "}
                        {m.title}
                      </span>
                      <span className="flex items-center gap-3">
                        <Badge tone={m.status === "approved" ? "go" : "neutral"}>
                          {MILESTONE_LABEL[m.status]}
                        </Badge>
                        {m.status !== "approved" && (
                          <Button
                            variant="ghost"
                            className="px-2 py-1 text-xs"
                            disabled={busy === m._id}
                            onClick={() =>
                              run(m._id, () =>
                                advanceMilestone({ milestoneId: m._id }),
                              )
                            }
                          >
                            {NEXT_ACTION[m.status]}
                          </Button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
