import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { domain } from "./schema";
import { embedText } from "./lib/gemini";
import { classify } from "./lib/classify";
import { priorityScore } from "./lib/priority";
import { distanceKm } from "./lib/geo";

const DUPLICATE_THRESHOLD = 0.86;
const NEIGHBOUR_LIMIT = 12;
const NEIGHBOUR_RADIUS_KM = 25;

export const loadForAnalysis = internalQuery({
  args: { problemId: v.id("problems") },
  handler: async (ctx, args) => await ctx.db.get(args.problemId),
});

export const applyClassification = internalMutation({
  args: {
    problemId: v.id("problems"),
    domain,
    confidence: v.number(),
    severity: v.number(),
    affectedEstimate: v.number(),
  },
  handler: async (ctx, args) => {
    const problem = await ctx.db.get(args.problemId);
    if (!problem) return;

    const clusterSize = problem.clusterId
      ? ((await ctx.db.get(problem.clusterId))?.memberCount ?? 1)
      : 1;

    const severity = Math.max(problem.severity, args.severity);
    const affectedEstimate = Math.max(
      problem.affectedEstimate,
      args.affectedEstimate,
    );

    await ctx.db.patch(args.problemId, {
      domain: args.domain,
      domainConfidence: args.confidence,
      severity,
      affectedEstimate,
      priority: priorityScore(severity, affectedEstimate, clusterSize),
    });
  },
});

export const storeEmbedding = internalMutation({
  args: {
    problemId: v.id("problems"),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    const problem = await ctx.db.get(args.problemId);
    if (!problem) return;

    const existing = await ctx.db
      .query("problemEmbeddings")
      .withIndex("by_problem", (q) => q.eq("problemId", args.problemId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        embedding: args.embedding,
        domain: problem.domain,
      });
      return;
    }

    await ctx.db.insert("problemEmbeddings", {
      problemId: args.problemId,
      district: problem.district,
      domain: problem.domain,
      embedding: args.embedding,
    });
  },
});

export const mergeIntoCluster = internalMutation({
  args: {
    problemId: v.id("problems"),
    neighbourIds: v.array(v.id("problems")),
  },
  handler: async (ctx, args) => {
    const problem = await ctx.db.get(args.problemId);
    if (!problem) return;

    const neighbours: Doc<"problems">[] = [];
    for (const id of args.neighbourIds) {
      const neighbour = await ctx.db.get(id);
      if (!neighbour || neighbour.status === "rejected") continue;

      const sameArea =
        neighbour.district === problem.district ||
        distanceKm(problem.lat, problem.lng, neighbour.lat, neighbour.lng) <=
          NEIGHBOUR_RADIUS_KM;

      if (sameArea) neighbours.push(neighbour);
    }

    if (neighbours.length === 0) return;

    let clusterId: Id<"clusters"> | undefined = neighbours.find(
      (n) => n.clusterId,
    )?.clusterId;

    if (!clusterId) {
      clusterId = await ctx.db.insert("clusters", {
        label: problem.title,
        domain: problem.domain,
        district: problem.district,
        primaryProblemId: neighbours[0]._id,
        memberCount: 0,
        totalAffected: 0,
        createdAt: Date.now(),
      });
    }

    for (const member of [...neighbours, problem]) {
      if (member.clusterId !== clusterId) {
        await ctx.db.patch(member._id, { clusterId });
      }
    }

    const members = await ctx.db
      .query("problems")
      .withIndex("by_cluster", (q) => q.eq("clusterId", clusterId))
      .collect();

    const totalAffected = members.reduce(
      (sum, member) => sum + member.affectedEstimate,
      0,
    );

    const primary = members.reduce((best, member) =>
      member.severity > best.severity ? member : best,
    );

    await ctx.db.patch(clusterId, {
      memberCount: members.length,
      totalAffected,
      primaryProblemId: primary._id,
      domain: primary.domain,
      label: primary.title,
    });

    for (const member of members) {
      await ctx.db.patch(member._id, {
        priority: priorityScore(
          member.severity,
          member.affectedEstimate,
          members.length,
        ),
      });
    }
  },
});

export const analyseProblem = internalAction({
  args: { problemId: v.id("problems") },
  handler: async (ctx, args) => {
    const problem = await ctx.runQuery(internal.ai.loadForAnalysis, {
      problemId: args.problemId,
    });
    if (!problem) return;

    try {
      const classification = await classify(
        problem.title,
        problem.description,
        problem.district,
      );
      await ctx.runMutation(internal.ai.applyClassification, {
        problemId: args.problemId,
        domain: classification.domain,
        confidence: classification.confidence,
        severity: classification.severity,
        affectedEstimate: classification.affectedEstimate,
      });
    } catch (cause) {
      console.error("classification skipped", cause);
    }

    try {
      const embedding = await embedText(
        `${problem.title}. ${problem.description}`,
      );

      await ctx.runMutation(internal.ai.storeEmbedding, {
        problemId: args.problemId,
        embedding,
      });

      const matches = await ctx.vectorSearch(
        "problemEmbeddings",
        "by_embedding",
        { vector: embedding, limit: NEIGHBOUR_LIMIT },
      );

      const neighbourIds: Id<"problems">[] = [];
      for (const match of matches) {
        if (match._score < DUPLICATE_THRESHOLD) continue;
        const row = await ctx.runQuery(internal.ai.loadEmbeddingRow, {
          embeddingId: match._id,
        });
        if (!row) continue;
        if (row.problemId === args.problemId) continue;
        neighbourIds.push(row.problemId);
      }

      if (neighbourIds.length > 0) {
        await ctx.runMutation(internal.ai.mergeIntoCluster, {
          problemId: args.problemId,
          neighbourIds,
        });
      }
    } catch (cause) {
      console.error("clustering skipped", cause);
    }
  },
});

export const loadEmbeddingRow = internalQuery({
  args: { embeddingId: v.id("problemEmbeddings") },
  handler: async (ctx, args) => await ctx.db.get(args.embeddingId),
});

export const allProblemIds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("problems").collect();
    return rows.map((row) => row._id);
  },
});

export const reanalyseAll = internalAction({
  args: {},
  handler: async (ctx): Promise<{ processed: number }> => {
    const ids: Id<"problems">[] = await ctx.runQuery(
      internal.ai.allProblemIds,
      {},
    );

    for (const problemId of ids) {
      await ctx.runAction(internal.ai.analyseProblem, { problemId });
    }

    return { processed: ids.length };
  },
});

export const checkGemini = internalAction({
  args: {},
  handler: async (): Promise<{ ok: boolean; detail: string }> => {
    try {
      const result = await classify(
        "Handpump water has turned muddy",
        "The handpump near the primary school has been giving brown muddy water for three weeks. Children have started falling sick.",
        "Khunti",
      );
      return { ok: true, detail: JSON.stringify(result) };
    } catch (cause) {
      return {
        ok: false,
        detail: cause instanceof Error ? cause.message : String(cause),
      };
    }
  },
});

export const checkEmbedding = internalAction({
  args: {},
  handler: async (): Promise<{ ok: boolean; detail: string }> => {
    try {
      const vector = await embedText(
        "The handpump near the primary school gives muddy water.",
      );
      return {
        ok: true,
        detail: `dimensions ${vector.length}, first value ${vector[0]?.toFixed(4)}`,
      };
    } catch (cause) {
      return {
        ok: false,
        detail: cause instanceof Error ? cause.message : String(cause),
      };
    }
  },
});
