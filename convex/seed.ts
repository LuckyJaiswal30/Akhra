import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { INSTITUTIONS } from "./data/institutions";
import { SEED_PROBLEMS } from "./data/problems";
import { SEED_PARTNERS } from "./data/partners";
import { priorityScore } from "./lib/priority";
import { embedText } from "./lib/gemini";

export const institutions = internalMutation({
  args: {},
  handler: async (ctx) => {
    let created = 0;
    let departments = 0;

    for (const seed of INSTITUTIONS) {
      const existing = await ctx.db
        .query("universities")
        .withIndex("by_district", (q) => q.eq("district", seed.district))
        .collect();

      let universityId = existing.find((u) => u.shortName === seed.shortName)
        ?._id;

      if (!universityId) {
        universityId = await ctx.db.insert("universities", {
          name: seed.name,
          shortName: seed.shortName,
          district: seed.district,
          type: seed.type,
          hasInnovationCentre: seed.hasInnovationCentre,
          hasIncubation: seed.hasIncubation,
        });
        created += 1;
      }

      const present = await ctx.db
        .query("departments")
        .withIndex("by_university", (q) => q.eq("universityId", universityId!))
        .collect();

      for (const dept of seed.departments) {
        if (present.some((d) => d.name === dept.name)) continue;
        await ctx.db.insert("departments", {
          universityId,
          name: dept.name,
          disciplines: dept.disciplines,
          expertise: dept.expertise,
          facultyCount: dept.facultyCount,
        });
        departments += 1;
      }
    }

    return { created, departments };
  },
});

export const departmentsNeedingEmbedding = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("departments").collect();
    return all
      .filter((d) => !d.embedding)
      .map((d) => ({
        _id: d._id,
        name: d.name,
        disciplines: d.disciplines,
        expertise: d.expertise,
      }));
  },
});

export const saveDepartmentEmbedding = internalMutation({
  args: {
    departmentId: v.id("departments"),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.departmentId, { embedding: args.embedding });
  },
});

type PendingDepartment = {
  _id: Id<"departments">;
  name: string;
  disciplines: string[];
  expertise: string[];
};

export const embedDepartments = internalAction({
  args: {},
  handler: async (ctx): Promise<{ embedded: number; remaining: number }> => {
    const pending: PendingDepartment[] = await ctx.runQuery(
      internal.seed.departmentsNeedingEmbedding,
      {},
    );

    let done = 0;
    for (const dept of pending) {
      const text = `${dept.name}. Disciplines: ${dept.disciplines.join(", ")}. Works on: ${dept.expertise.join(", ")}.`;
      try {
        const embedding = await embedText(text);
        await ctx.runMutation(internal.seed.saveDepartmentEmbedding, {
          departmentId: dept._id,
          embedding,
        });
        done += 1;
      } catch (cause) {
        console.error(`could not embed ${dept.name}`, cause);
      }
    }

    return { embedded: done, remaining: pending.length - done };
  },
});

const DISTRICT_POINTS: Record<string, { lat: number; lng: number }> = {
  "Bokaro": { lat: 23.6693, lng: 86.1511 },
  "Chatra": { lat: 24.2064, lng: 84.871 },
  "Deoghar": { lat: 24.4823, lng: 86.6963 },
  "Dhanbad": { lat: 23.7957, lng: 86.4304 },
  "Dumka": { lat: 24.2676, lng: 87.2497 },
  "East Singhbhum": { lat: 22.8046, lng: 86.2029 },
  "Garhwa": { lat: 24.1543, lng: 83.8078 },
  "Giridih": { lat: 24.1913, lng: 86.3095 },
  "Godda": { lat: 24.827, lng: 87.2136 },
  "Gumla": { lat: 23.0444, lng: 84.5387 },
  "Hazaribagh": { lat: 23.9925, lng: 85.3637 },
  "Jamtara": { lat: 23.96, lng: 86.8 },
  "Khunti": { lat: 23.0713, lng: 85.2783 },
  "Koderma": { lat: 24.4675, lng: 85.594 },
  "Latehar": { lat: 23.7444, lng: 84.4998 },
  "Lohardaga": { lat: 23.4333, lng: 84.6833 },
  "Pakur": { lat: 24.6337, lng: 87.842 },
  "Palamu": { lat: 24.0333, lng: 84.0667 },
  "Ramgarh": { lat: 23.63, lng: 85.56 },
  "Ranchi": { lat: 23.3441, lng: 85.3096 },
  "Sahibganj": { lat: 25.25, lng: 87.65 },
  "Seraikela-Kharsawan": { lat: 22.7, lng: 85.9333 },
  "Simdega": { lat: 22.6167, lng: 84.5167 },
  "West Singhbhum": { lat: 22.5667, lng: 85.8167 },
};

const DAY = 24 * 60 * 60 * 1000;

function stageFor(daysAgo: number, index: number) {
  if (daysAgo > 45) return index % 3 === 0 ? "deployed" : "in_progress";
  if (daysAgo > 30) return index % 2 === 0 ? "accepted" : "routed";
  if (daysAgo > 14) return index % 4 === 0 ? "rejected" : "validated";
  return "submitted";
}

export const problems = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("problems").take(1);
    const reporter =
      (
        await ctx.db
          .query("users")
          .withIndex("by_role", (q) => q.eq("role", "citizen"))
          .collect()
      ).find((row) => row.status === "active") ??
      (await ctx.db.get(
        await ctx.db.insert("users", {
          clerkId: "seed-reporter",
          name: "Seeded reports",
          email: "seed@akhra.local",
          status: "active",
          role: "citizen",
          trustScore: 50,
          createdAt: Date.now(),
        }),
      ));

    if (!reporter) throw new Error("Could not create a reporter for seeding.");

    const clusters = new Map<string, Id<"clusters">>();
    let inserted = 0;

    for (let index = 0; index < SEED_PROBLEMS.length; index++) {
      const seed = SEED_PROBLEMS[index];

      const duplicate = await ctx.db
        .query("problems")
        .withIndex("by_district", (q) => q.eq("district", seed.district))
        .collect();
      if (duplicate.some((row) => row.title === seed.title)) continue;

      let clusterId: Id<"clusters"> | undefined;
      if (seed.cluster) {
        clusterId = clusters.get(seed.cluster);
        if (!clusterId) {
          clusterId = await ctx.db.insert("clusters", {
            label: seed.title,
            domain: seed.domain,
            district: seed.district,
            memberCount: 0,
            totalAffected: 0,
            createdAt: Date.now() - seed.daysAgo * DAY,
          });
          clusters.set(seed.cluster, clusterId);
        }
      }

      const clusterSize = seed.cluster
        ? SEED_PROBLEMS.filter((p) => p.cluster === seed.cluster).length
        : 1;

      const district = DISTRICT_POINTS[seed.district] ?? { lat: 23.34, lng: 85.31 };
      const jitter = (n: number) => (((index * 37 + n * 17) % 100) - 50) / 2000;
      const lat = seed.lat ?? Number((district.lat + jitter(1)).toFixed(5));
      const lng = seed.lng ?? Number((district.lng + jitter(2)).toFixed(5));

      await ctx.db.insert("problems", {
        title: seed.title,
        description: seed.description,
        language: "en",
        district: seed.district,
        block: seed.block,
        lat,
        lng,
        domain: seed.domain,
        domainConfidence: 0.9,
        status: stageFor(seed.daysAgo, index) as "submitted",
        severity: seed.severity,
        affectedEstimate: seed.affected,
        priority: priorityScore(seed.severity, seed.affected, clusterSize),
        clusterId,
        reporterId: reporter._id,
        reporterKind: seed.reporter,
        consentGiven: true,
        sourceNote: seed.sourceNote,
        sourceUrl: seed.sourceUrl,
        sourceStatus: seed.sourceStatus,
        createdAt: Date.now() - seed.daysAgo * DAY,
      });

      inserted += 1;
    }

    for (const clusterId of clusters.values()) {
      const members = await ctx.db
        .query("problems")
        .withIndex("by_cluster", (q) => q.eq("clusterId", clusterId))
        .collect();
      if (members.length === 0) continue;

      const primary = members.reduce((best, m) =>
        m.severity > best.severity ? m : best,
      );

      await ctx.db.patch(clusterId, {
        memberCount: members.length,
        totalAffected: members.reduce((sum, m) => sum + m.affectedEstimate, 0),
        primaryProblemId: primary._id,
        label: primary.title,
      });
    }

    return { inserted, clusters: clusters.size, hadDataBefore: existing.length > 0 };
  },
});

export const problemsNeedingEmbedding = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("problems").collect();
    const done = await ctx.db.query("problemEmbeddings").collect();
    const seen = new Set(done.map((row) => row.problemId));
    return all
      .filter((row) => !seen.has(row._id))
      .map((row) => ({
        _id: row._id,
        text: `${row.title}. ${row.description}`,
        district: row.district,
        domain: row.domain,
      }));
  },
});

type PendingProblem = {
  _id: Id<"problems">;
  text: string;
  district: string;
  domain: SeedDomain | undefined;
};

type SeedDomain = NonNullable<
  (typeof SEED_PROBLEMS)[number]["domain"]
>;

export const embedProblems = internalAction({
  args: {},
  handler: async (ctx): Promise<{ embedded: number; failed: number }> => {
    const pending: PendingProblem[] = await ctx.runQuery(
      internal.seed.problemsNeedingEmbedding,
      {},
    );

    let embedded = 0;
    let failed = 0;

    for (const row of pending) {
      try {
        const embedding = await embedText(row.text);
        await ctx.runMutation(internal.seed.saveProblemEmbedding, {
          problemId: row._id,
          district: row.district,
          embedding,
        });
        embedded += 1;
      } catch (cause) {
        console.error(`could not embed ${row._id}`, cause);
        failed += 1;
      }
      await new Promise((r) => setTimeout(r, 700));
    }

    return { embedded, failed };
  },
});

export const saveProblemEmbedding = internalMutation({
  args: {
    problemId: v.id("problems"),
    district: v.string(),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    const problem = await ctx.db.get(args.problemId);
    await ctx.db.insert("problemEmbeddings", {
      problemId: args.problemId,
      district: args.district,
      domain: problem?.domain,
      embedding: args.embedding,
    });
  },
});

export const partners = internalMutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0;
    for (const seed of SEED_PARTNERS) {
      const existing = await ctx.db
        .query("partners")
        .withIndex("by_kind", (q) => q.eq("kind", seed.kind))
        .collect();
      if (existing.some((row) => row.name === seed.name)) continue;

      await ctx.db.insert("partners", {
        name: seed.name,
        kind: seed.kind,
        sector: seed.sector,
        district: seed.district,
      });
      inserted += 1;
    }
    return { inserted };
  },
});
