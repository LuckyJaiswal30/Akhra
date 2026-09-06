import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, notify, recordAudit, requireRole } from "./lib/auth";

const DAY = 24 * 60 * 60 * 1000;

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user?.universityId) return [];

    const rows = await ctx.db
      .query("projects")
      .withIndex("by_university", (q) =>
        q.eq("universityId", user.universityId!),
      )
      .order("desc")
      .collect();

    return await Promise.all(
      rows.map(async (project) => {
        const problem = await ctx.db.get(project.problemId);
        const department = await ctx.db.get(project.departmentId);

        const members = await ctx.db
          .query("projectMembers")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

        const people = await Promise.all(
          members.map(async (member) => {
            const person = await ctx.db.get(member.userId);
            return {
              _id: member._id,
              position: member.position,
              name: person?.name ?? "Unknown",
            };
          }),
        );

        const milestones = await ctx.db
          .query("milestones")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

        const pledges = await ctx.db
          .query("pledges")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

        const backers = await Promise.all(
          pledges.map(async (pledge) => {
            const partner = await ctx.db.get(pledge.partnerId);
            return {
              _id: pledge._id,
              kind: pledge.kind,
              detail: pledge.detail,
              status: pledge.status,
              partnerName: partner?.name ?? "Unknown",
            };
          }),
        );

        return {
          ...project,
          district: problem?.district ?? "",
          domain: problem?.domain,
          priority: problem?.priority ?? 0,
          departmentName: department?.name ?? "Unknown",
          members: people,
          milestones: milestones.sort((a, b) => a.order - b.order),
          backers,
        };
      }),
    );
  },
});

export const submitProposal = mutation({
  args: { projectId: v.id("projects"), summary: v.string() },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "faculty", "student");
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("That project no longer exists.");
    if (project.universityId !== user.universityId) {
      throw new Error("That project belongs to another institution.");
    }
    if (args.summary.trim().length < 40) {
      throw new Error("Describe the proposed solution in at least forty characters.");
    }

    await ctx.db.patch(args.projectId, {
      proposalSummary: args.summary.trim(),
      stage: "proposal_submitted",
    });

    const problem = await ctx.db.get(project.problemId);
    if (problem) {
      await ctx.db.patch(problem._id, { status: "solution_proposed" });
      await notify(
        ctx,
        problem.reporterId,
        "A solution has been proposed",
        `A university team has proposed a solution for ${problem.title}.`,
        "/my-reports",
      );
    }

    await recordAudit(
      ctx,
      user._id,
      "submit_proposal",
      "projects",
      args.projectId,
    );
  },
});

export const addMilestone = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    dueInDays: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "faculty", "student");
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("That project no longer exists.");
    if (project.universityId !== user.universityId) {
      throw new Error("That project belongs to another institution.");
    }

    const existing = await ctx.db
      .query("milestones")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    await ctx.db.insert("milestones", {
      projectId: args.projectId,
      title: args.title.trim(),
      order: existing.length + 1,
      dueDate: Date.now() + Math.max(1, args.dueInDays) * DAY,
      status: "pending",
    });
  },
});

export const advanceMilestone = mutation({
  args: { milestoneId: v.id("milestones") },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "faculty", "student");
    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone) throw new Error("That milestone no longer exists.");

    const next =
      milestone.status === "pending"
        ? "in_progress"
        : milestone.status === "in_progress"
          ? "submitted"
          : "approved";

    await ctx.db.patch(args.milestoneId, {
      status: next,
      approvedBy: next === "approved" ? user._id : undefined,
      approvedAt: next === "approved" ? Date.now() : undefined,
    });

    if (next !== "approved") return next;

    const siblings = await ctx.db
      .query("milestones")
      .withIndex("by_project", (q) => q.eq("projectId", milestone.projectId))
      .collect();

    if (siblings.every((row) => row.status === "approved")) {
      const project = await ctx.db.get(milestone.projectId);
      if (project) {
        await ctx.db.patch(project._id, {
          stage: "deployed",
          deployedAt: Date.now(),
        });
        const problem = await ctx.db.get(project.problemId);
        if (problem) {
          await ctx.db.patch(problem._id, { status: "deployed" });
          await notify(
            ctx,
            problem.reporterId,
            "Your report led to something being deployed",
            `${problem.title} has reached deployment. Thank you for reporting it.`,
            "/my-reports",
          );
        }
      }
    }

    return next;
  },
});
