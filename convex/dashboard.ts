import { query } from "./_generated/server";
import { requireUser } from "./lib/auth";

const PIPELINE = [
  "submitted",
  "validated",
  "routed",
  "accepted",
  "in_progress",
  "solution_proposed",
  "industry_backed",
  "deployed",
] as const;

export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);

    const problems = await ctx.db.query("problems").collect();
    const clusters = await ctx.db.query("clusters").collect();
    const universities = await ctx.db.query("universities").collect();
    const projects = await ctx.db.query("projects").collect();
    const pledges = await ctx.db.query("pledges").collect();
    const partners = await ctx.db.query("partners").collect();

    const live = problems.filter((p) => p.status !== "rejected");

    const byDomain = new Map<string, number>();
    const byDistrict = new Map<string, { count: number; affected: number }>();
    const byStatus = new Map<string, number>();

    for (const p of live) {
      if (p.domain) byDomain.set(p.domain, (byDomain.get(p.domain) ?? 0) + 1);
      byStatus.set(p.status, (byStatus.get(p.status) ?? 0) + 1);
      const d = byDistrict.get(p.district) ?? { count: 0, affected: 0 };
      d.count += 1;
      d.affected += p.affectedEstimate;
      byDistrict.set(p.district, d);
    }

    const engagedUniversities = new Set(
      projects.map((p) => String(p.universityId)),
    );

    const clustered = clusters
      .filter((c) => c.memberCount > 1)
      .sort((a, b) => b.memberCount - a.memberCount)
      .slice(0, 6)
      .map((c) => ({
        label: c.label,
        district: c.district,
        memberCount: c.memberCount,
        totalAffected: c.totalAffected,
      }));

    const mergedReports = clusters.reduce(
      (sum, c) => sum + Math.max(0, c.memberCount - 1),
      0,
    );

    return {
      totals: {
        reports: live.length,
        peopleAffected: live.reduce((s, p) => s + p.affectedEstimate, 0),
        districts: byDistrict.size,
        universitiesEngaged: engagedUniversities.size,
        universitiesTotal: universities.length,
        projects: projects.length,
        deployed: projects.filter((p) => p.stage === "deployed").length,
        partners: partners.length,
        pledges: pledges.length,
        mergedReports,
        clusters: clusters.filter((c) => c.memberCount > 1).length,
      },
      domains: [...byDomain.entries()]
        .map(([domain, count]) => ({ domain, count }))
        .sort((a, b) => b.count - a.count),
      districts: [...byDistrict.entries()]
        .map(([district, v]) => ({ district, ...v }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      pipeline: PIPELINE.map((stage) => ({
        stage,
        count: byStatus.get(stage) ?? 0,
      })),
      rejected: problems.length - live.length,
      clustered,
    };
  },
});
