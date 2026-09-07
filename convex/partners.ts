import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { pledgeKind } from "./schema";
import { getCurrentUser, notify, recordAudit, requireRole, requireUser } from "./lib/auth";
import { assertCompleteProfile } from "./lib/profile";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const rows = await ctx.db.query("partners").collect();
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user?.role !== "industry" || !user.partnerId) return null;
    return await ctx.db.get(user.partnerId);
  },
});

export const setMyPartner = mutation({
  args: { partnerId: v.id("partners") },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "industry");
    const partner = await ctx.db.get(args.partnerId);
    if (!partner) throw new Error("That organisation does not exist.");
    await ctx.db.patch(user._id, { partnerId: args.partnerId });
  },
});

export const openProposals = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "industry");

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_stage", (q) => q.eq("stage", "proposal_submitted"))
      .collect();

    const drafting = await ctx.db
      .query("projects")
      .withIndex("by_stage", (q) => q.eq("stage", "prototyping"))
      .collect();

    return await Promise.all(
      [...projects, ...drafting].map(async (project) => {
        const problem = await ctx.db.get(project.problemId);
        const university = await ctx.db.get(project.universityId);
        const department = await ctx.db.get(project.departmentId);
        const cluster = problem?.clusterId
          ? await ctx.db.get(problem.clusterId)
          : null;

        const pledges = await ctx.db
          .query("pledges")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

        return {
          projectId: project._id,
          title: project.title,
          stage: project.stage,
          proposalSummary: project.proposalSummary ?? "",
          problemTitle: problem?.title ?? "",
          problemDescription: problem?.description ?? "",
          district: problem?.district ?? "",
          domain: problem?.domain,
          affected: cluster?.totalAffected ?? problem?.affectedEstimate ?? 0,
          clusterSize: cluster?.memberCount ?? 1,
          universityName: university?.shortName ?? "Unknown",
          departmentName: department?.name ?? "Unknown",
          pledgeCount: pledges.length,
        };
      }),
    );
  },
});

export const pledge = mutation({
  args: {
    projectId: v.id("projects"),
    kind: pledgeKind,
    detail: v.string(),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "industry");
    assertCompleteProfile(user);
    if (!user.partnerId) {
      throw new Error("Choose your organisation in the header first.");
    }
    if (args.detail.trim().length < 10) {
      throw new Error("Say briefly what you are offering.");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("That project no longer exists.");

    const pledgeId = await ctx.db.insert("pledges", {
      projectId: args.projectId,
      partnerId: user.partnerId,
      kind: args.kind,
      detail: args.detail.trim(),
      amount: args.amount,
      status: "offered",
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.projectId, { stage: "prototyping" });

    const problem = await ctx.db.get(project.problemId);
    if (problem) {
      await ctx.db.patch(problem._id, { status: "industry_backed" });
      await notify(
        ctx,
        problem.reporterId,
        "An industry partner has joined",
        `A partner has offered support for the project working on ${problem.title}.`,
        "/my-reports",
      );
    }

    const mentors = await ctx.db
      .query("projectMembers")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    for (const mentor of mentors) {
      await notify(
        ctx,
        mentor.userId,
        "Your project has industry backing",
        `${args.detail.trim()}`,
        "/projects",
      );
    }

    await recordAudit(ctx, user._id, "pledge", "projects", args.projectId, args.kind);

    return pledgeId;
  },
});

export const myPledges = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user?.role !== "industry" || !user.partnerId) return [];

    const rows = await ctx.db
      .query("pledges")
      .withIndex("by_partner", (q) => q.eq("partnerId", user.partnerId!))
      .order("desc")
      .collect();

    return await Promise.all(
      rows.map(async (row) => {
        const project = await ctx.db.get(row.projectId);
        const problem = project ? await ctx.db.get(project.problemId) : null;
        const university = project
          ? await ctx.db.get(project.universityId)
          : null;

        const milestones = project
          ? await ctx.db
              .query("milestones")
              .withIndex("by_project", (q) => q.eq("projectId", project._id))
              .collect()
          : [];

        return {
          ...row,
          projectTitle: project?.title ?? "Unknown",
          stage: project?.stage ?? "team_forming",
          district: problem?.district ?? "",
          universityName: university?.shortName ?? "Unknown",
          milestonesTotal: milestones.length,
          milestonesDone: milestones.filter((m) => m.status === "approved").length,
        };
      }),
    );
  },
});
