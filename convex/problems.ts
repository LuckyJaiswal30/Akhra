import { v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { problemStatus, reporterKind } from "./schema";
import {
  getCurrentUser,
  notify,
  recordAudit,
  requireRole,
  requireUser,
} from "./lib/auth";
import { assertCompleteProfile } from "./lib/profile";
import { priorityScore } from "./lib/priority";
import { fuzzCoordinates } from "./lib/geo";
import { isDistrict, isInJharkhand } from "./lib/districts";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const submit = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    language: v.string(),
    district: v.string(),
    block: v.optional(v.string()),
    lat: v.number(),
    lng: v.number(),
    severity: v.number(),
    affectedEstimate: v.number(),
    reporterKind,
    consentGiven: v.boolean(),
    photoIds: v.array(v.id("_storage")),
    photoWaiver: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    assertCompleteProfile(user);

    if (!args.consentGiven) {
      throw new Error("We cannot accept a report without your consent.");
    }
    if (args.title.trim().length < 6) {
      throw new Error("Give the problem a title of at least six characters.");
    }
    if (args.description.trim().length < 20) {
      throw new Error("Describe the problem in at least twenty characters.");
    }

    // The district decides which officer this lands on, so it is checked here
    // and not only in the browser.
    if (!isDistrict(args.district)) {
      throw new Error("Choose one of the 24 districts of Jharkhand.");
    }
    if (!isInJharkhand(args.lat, args.lng)) {
      throw new Error("That location is outside Jharkhand.");
    }

    const waiver = args.photoWaiver?.trim();
    if (args.photoIds.length === 0 && !waiver) {
      throw new Error(
        "Add a photo, or say why you cannot add one.",
      );
    }

    if (!Number.isFinite(args.severity) || args.severity < 1 || args.severity > 5) {
      throw new Error("Say how bad the problem is.");
    }
    if (!Number.isFinite(args.affectedEstimate) || args.affectedEstimate < 1) {
      throw new Error("Say roughly how many people this affects.");
    }

    const severity = Math.round(args.severity);
    const affectedEstimate = Math.round(args.affectedEstimate);

    const problemId = await ctx.db.insert("problems", {
      title: args.title.trim(),
      description: args.description.trim(),
      language: args.language,
      district: args.district,
      block: args.block,
      lat: args.lat,
      lng: args.lng,
      status: "submitted",
      severity,
      affectedEstimate,
      priority: priorityScore(severity, affectedEstimate, 1),
      reporterId: user._id,
      reporterKind: args.reporterKind,
      consentGiven: true,
      photoWaiver: args.photoIds.length === 0 ? waiver : undefined,
      createdAt: Date.now(),
    });

    for (const storageId of args.photoIds) {
      await ctx.db.insert("problemMedia", {
        problemId,
        storageId,
        kind: "photo",
      });
    }

    await ctx.scheduler.runAfter(0, internal.ai.analyseProblem, { problemId });

    await notify(
      ctx,
      user._id,
      "Report received",
      `We have your report about ${args.title.trim()}. You will hear from us as it moves.`,
      "/my-reports",
    );

    return problemId;
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const rows = await ctx.db
      .query("problems")
      .withIndex("by_reporter", (q) => q.eq("reporterId", user._id))
      .order("desc")
      .collect();

    return await Promise.all(
      rows.map(async (problem) => ({
        ...problem,
        photoUrls: await mediaUrls(ctx, problem._id),
        clusterSize: problem.clusterId
          ? ((await ctx.db.get(problem.clusterId))?.memberCount ?? 1)
          : 1,
      })),
    );
  },
});

export const queue = query({
  args: {
    status: v.optional(problemStatus),
  },
  handler: async (ctx, args) => {
    const officer = await requireRole(ctx, "officer");

    const posting = officer.district;
    if (!posting) return [];

    const status = args.status ?? "submitted";
    const rows = await ctx.db
      .query("problems")
      .withIndex("by_district_status_and_priority", (q) =>
        q.eq("district", posting).eq("status", status),
      )
      .order("desc")
      .take(100);

    return await Promise.all(
      rows.map(async (problem) => {
        const cluster = problem.clusterId
          ? await ctx.db.get(problem.clusterId)
          : null;
        const reporter = await ctx.db.get(problem.reporterId);

        const routings = await ctx.db
          .query("routings")
          .withIndex("by_problem", (q) => q.eq("problemId", problem._id))
          .collect();

        const suggestions = await Promise.all(
          routings
            .sort((a, b) => a.rank - b.rank)
            .map(async (row) => {
              const university = await ctx.db.get(row.universityId);
              const department = await ctx.db.get(row.departmentId);
              return {
                _id: row._id,
                matchScore: row.matchScore,
                reason: row.reason,
                status: row.status,
                universityName: university?.shortName ?? "Unknown",
                departmentName: department?.name ?? "Unknown",
              };
            }),
        );

        return {
          ...problem,
          photoUrls: await mediaUrls(ctx, problem._id),
          clusterSize: cluster?.memberCount ?? 1,
          clusterAffected: cluster?.totalAffected ?? problem.affectedEstimate,
          reporterName: reporter?.name ?? "Unknown",
          suggestions,
        };
      }),
    );
  },
});

export const queueCounts = query({
  args: {},
  handler: async (ctx) => {
    const officer = await requireRole(ctx, "officer");
    const posting = officer.district;
    const statuses = [
      "submitted",
      "validated",
      "routed",
      "accepted",
      "rejected",
    ] as const;

    const counts: Record<string, number> = {};
    for (const status of statuses) {
      if (!posting) {
        counts[status] = 0;
        continue;
      }
      const rows = await ctx.db
        .query("problems")
        .withIndex("by_district_status_and_priority", (q) =>
          q.eq("district", posting).eq("status", status),
        )
        .collect();
      counts[status] = rows.length;
    }
    return counts;
  },
});

export const publicView = query({
  args: { problemId: v.id("problems") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const problem = await ctx.db.get(args.problemId);
    if (!problem) return null;

    const fuzzed = fuzzCoordinates(problem.lat, problem.lng, args.problemId);

    return {
      _id: problem._id,
      title: problem.title,
      description: problem.description,
      district: problem.district,
      domain: problem.domain,
      status: problem.status,
      priority: problem.priority,
      affectedEstimate: problem.affectedEstimate,
      createdAt: problem.createdAt,
      lat: fuzzed.lat,
      lng: fuzzed.lng,
      locationPrecision: "approximate",
    };
  },
});

export const validateProblem = mutation({
  args: { problemId: v.id("problems") },
  handler: async (ctx, args) => {
    const officer = await requireRole(ctx, "officer");
    assertCompleteProfile(officer);
    const problem = await ctx.db.get(args.problemId);
    if (!problem) throw new Error("That report no longer exists.");
    assertOwnDistrict(problem.district, officer.district);

    await ctx.db.patch(args.problemId, {
      status: "validated",
      validatedBy: officer._id,
      validatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.routing.routeProblem, {
      problemId: args.problemId,
    });

    await recordAudit(
      ctx,
      officer._id,
      "validate",
      "problems",
      args.problemId,
      problem.title,
    );

    await notify(
      ctx,
      problem.reporterId,
      "Your report was validated",
      `${problem.title} has been checked and is being sent to a university.`,
      "/my-reports",
    );
  },
});

export const retryRouting = mutation({
  args: { problemId: v.id("problems") },
  handler: async (ctx, args) => {
    const officer = await requireRole(ctx, "officer");
    assertCompleteProfile(officer);
    const problem = await ctx.db.get(args.problemId);
    if (!problem) throw new Error("That report no longer exists.");
    assertOwnDistrict(problem.district, officer.district);

    if (problem.status !== "validated") {
      throw new Error("This report has already been sent on.");
    }

    await ctx.scheduler.runAfter(0, internal.routing.routeProblem, {
      problemId: args.problemId,
    });

    await recordAudit(
      ctx,
      officer._id,
      "retry_routing",
      "problems",
      args.problemId,
      problem.title,
    );
  },
});

export const rejectProblem = mutation({
  args: { problemId: v.id("problems"), reason: v.string() },
  handler: async (ctx, args) => {
    const officer = await requireRole(ctx, "officer");
    assertCompleteProfile(officer);
    const problem = await ctx.db.get(args.problemId);
    if (!problem) throw new Error("That report no longer exists.");
    assertOwnDistrict(problem.district, officer.district);

    if (args.reason.trim().length < 5) {
      throw new Error("Give a reason so the person who reported it knows why.");
    }

    await ctx.db.patch(args.problemId, {
      status: "rejected",
      validatedBy: officer._id,
      validatedAt: Date.now(),
      rejectionReason: args.reason.trim(),
    });

    await recordAudit(
      ctx,
      officer._id,
      "reject",
      "problems",
      args.problemId,
      args.reason.trim(),
    );

    await notify(
      ctx,
      problem.reporterId,
      "Your report was not taken forward",
      args.reason.trim(),
      "/my-reports",
    );
  },
});

function assertOwnDistrict(district: string, posting: string | undefined) {
  if (!posting) {
    throw new Error(
      "Your account has no district on it, so you cannot rule on reports. " +
        "Ask an administrator to set one.",
    );
  }
  if (district !== posting) {
    throw new Error("That report is in another district.");
  }
}

async function mediaUrls(ctx: QueryCtx, problemId: Id<"problems">) {
  const media = await ctx.db
    .query("problemMedia")
    .withIndex("by_problem", (q) => q.eq("problemId", problemId))
    .collect();

  const urls: string[] = [];
  for (const item of media) {
    const url = await ctx.storage.getUrl(item.storageId);
    if (url) urls.push(url);
  }
  return urls;
}
