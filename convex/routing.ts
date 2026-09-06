import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { embedText } from "./lib/gemini";
import { getCurrentUser, notify, recordAudit, requireRole } from "./lib/auth";

const SUGGESTIONS = 3;

export const context = internalQuery({
  args: { problemId: v.id("problems") },
  handler: async (ctx, args) => {
    const problem = await ctx.db.get(args.problemId);
    if (!problem) return null;

    const stored = await ctx.db
      .query("problemEmbeddings")
      .withIndex("by_problem", (q) => q.eq("problemId", args.problemId))
      .unique();

    return { problem, embedding: stored?.embedding ?? null };
  },
});

export const departmentDetail = internalQuery({
  args: { departmentId: v.id("departments") },
  handler: async (ctx, args) => {
    const department = await ctx.db.get(args.departmentId);
    if (!department) return null;
    const university = await ctx.db.get(department.universityId);
    if (!university) return null;
    return { department, university };
  },
});

export const saveRoutings = internalMutation({
  args: {
    problemId: v.id("problems"),
    rows: v.array(
      v.object({
        universityId: v.id("universities"),
        departmentId: v.id("departments"),
        matchScore: v.number(),
        reason: v.string(),
        rank: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("routings")
      .withIndex("by_problem", (q) => q.eq("problemId", args.problemId))
      .collect();

    for (const row of existing) {
      if (row.status === "suggested") await ctx.db.delete(row._id);
    }

    for (const row of args.rows) {
      await ctx.db.insert("routings", {
        problemId: args.problemId,
        universityId: row.universityId,
        departmentId: row.departmentId,
        matchScore: row.matchScore,
        reason: row.reason,
        rank: row.rank,
        status: "suggested",
        createdAt: Date.now(),
      });
    }

    if (args.rows.length > 0) {
      await ctx.db.patch(args.problemId, { status: "routed" });
    }
  },
});

export const routeProblem = internalAction({
  args: { problemId: v.id("problems") },
  handler: async (ctx, args) => {
    const loaded = await ctx.runQuery(internal.routing.context, {
      problemId: args.problemId,
    });
    if (!loaded) return;

    const { problem } = loaded;

    let embedding = loaded.embedding;
    if (!embedding) {
      try {
        embedding = await embedText(`${problem.title}. ${problem.description}`);
      } catch (cause) {
        console.error("routing skipped, embedding failed", cause);
        return;
      }
    }

    const matches = await ctx.vectorSearch("departments", "by_embedding", {
      vector: embedding,
      limit: 12,
    });

    const rows = [];
    const seenUniversities = new Set<string>();

    for (const match of matches) {
      if (rows.length >= SUGGESTIONS) break;

      const detail = await ctx.runQuery(internal.routing.departmentDetail, {
        departmentId: match._id as Id<"departments">,
      });
      if (!detail) continue;
      if (seenUniversities.has(detail.university._id)) continue;
      seenUniversities.add(detail.university._id);

      rows.push({
        universityId: detail.university._id,
        departmentId: detail.department._id,
        matchScore: Math.round(match._score * 1000) / 1000,
        reason: buildReason(
          `${problem.title} ${problem.description}`,
          detail.department.name,
          detail.university.shortName,
          detail.department.expertise,
          detail.department.facultyCount,
          detail.university.hasIncubation,
          detail.university.hasInnovationCentre,
        ),
        rank: rows.length + 1,
      });
    }

    await ctx.runMutation(internal.routing.saveRoutings, {
      problemId: args.problemId,
      rows,
    });
  },
});

function buildReason(
  problemText: string,
  departmentName: string,
  universityShortName: string,
  expertise: string[],
  facultyCount: number,
  hasIncubation: boolean,
  hasInnovationCentre: boolean,
) {
  const words = new Set(
    problemText
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((w) => w.length > 3),
  );

  const scored = expertise
    .map((phrase) => ({
      phrase,
      hits: phrase
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((w) => w.length > 3 && words.has(w)).length,
    }))
    .sort((a, b) => b.hits - a.hits);

  const cited = scored
    .slice(0, 2)
    .filter((item, index) => item.hits > 0 || index === 0)
    .map((item) => item.phrase);

  const facilities = [
    hasIncubation ? "an incubation centre" : null,
    hasInnovationCentre ? "an innovation centre" : null,
  ].filter(Boolean);

  const parts = [
    `${universityShortName} — ${departmentName}`,
    `${facultyCount} faculty, working on ${cited.join(" and ")}`,
  ];

  if (facilities.length > 0) {
    parts.push(`Has ${facilities.join(" and ")}`);
  }

  return parts.join(". ") + ".";
}

export const myUniversityChallenges = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.universityId) return [];

    const rows = await ctx.db
      .query("routings")
      .withIndex("by_university_and_status", (q) =>
        q.eq("universityId", user.universityId!).eq("status", "suggested"),
      )
      .collect();

    return await Promise.all(
      rows.map(async (row) => {
        const problem = await ctx.db.get(row.problemId);
        const department = await ctx.db.get(row.departmentId);
        const cluster = problem?.clusterId
          ? await ctx.db.get(problem.clusterId)
          : null;
        return {
          routingId: row._id,
          matchScore: row.matchScore,
          reason: row.reason,
          departmentName: department?.name ?? "Unknown",
          problemId: row.problemId,
          title: problem?.title ?? "Unknown",
          description: problem?.description ?? "",
          district: problem?.district ?? "",
          domain: problem?.domain,
          priority: problem?.priority ?? 0,
          clusterSize: cluster?.memberCount ?? 1,
          affected: cluster?.totalAffected ?? problem?.affectedEstimate ?? 0,
        };
      }),
    );
  },
});

export const acceptChallenge = mutation({
  args: { routingId: v.id("routings") },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "faculty");
    const routing = await ctx.db.get(args.routingId);
    if (!routing) throw new Error("That challenge is no longer available.");
    if (routing.universityId !== user.universityId) {
      throw new Error("That challenge was not routed to your institution.");
    }

    const problem = await ctx.db.get(routing.problemId);
    if (!problem) throw new Error("That report no longer exists.");

    await ctx.db.patch(args.routingId, { status: "accepted" });

    const projectId = await ctx.db.insert("projects", {
      problemId: routing.problemId,
      universityId: routing.universityId,
      departmentId: routing.departmentId,
      title: problem.title,
      stage: "team_forming",
      startedAt: Date.now(),
    });

    await ctx.db.insert("projectMembers", {
      projectId,
      userId: user._id,
      position: "faculty_mentor",
    });

    await ctx.db.patch(routing.problemId, { status: "accepted" });

    await recordAudit(
      ctx,
      user._id,
      "accept_challenge",
      "projects",
      projectId,
      problem.title,
    );

    await notify(
      ctx,
      problem.reporterId,
      "A university has taken this on",
      `${problem.title} has been accepted and a project team is being formed.`,
      "/my-reports",
    );

    return projectId;
  },
});

export const declineChallenge = mutation({
  args: { routingId: v.id("routings"), reason: v.string() },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "faculty");
    const routing = await ctx.db.get(args.routingId);
    if (!routing) throw new Error("That challenge is no longer available.");
    if (routing.universityId !== user.universityId) {
      throw new Error("That challenge was not routed to your institution.");
    }

    await ctx.db.patch(args.routingId, { status: "declined" });
    await recordAudit(
      ctx,
      user._id,
      "decline_challenge",
      "routings",
      args.routingId,
      args.reason,
    );
  },
});
