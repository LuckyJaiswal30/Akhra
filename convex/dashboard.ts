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

    /**
     * District-wise register, in the shape a government monitoring report
     * uses: receipts, what is still open, what has been disposed of, and
     * how long the first decision takes.
     */
    const DAY = 24 * 60 * 60 * 1000;
    const now = Date.now();

    type Row = {
      district: string;
      receipts: number;
      awaitingVerification: number;
      underExamination: number;
      resolved: number;
      closed: number;
      pendency: number;
      affected: number;
      decisionDays: number[];
    };

    const rows = new Map<string, Row>();
    const blank = (district: string): Row => ({
      district,
      receipts: 0,
      awaitingVerification: 0,
      underExamination: 0,
      resolved: 0,
      closed: 0,
      pendency: 0,
      affected: 0,
      decisionDays: [],
    });

    // Age of everything still awaiting a first decision.
    const ageBuckets = [
      { label: "0 to 7 days", max: 7, count: 0 },
      { label: "8 to 21 days", max: 21, count: 0 },
      { label: "22 to 60 days", max: 60, count: 0 },
      { label: "Over 60 days", max: Infinity, count: 0 },
    ];

    for (const p of problems) {
      const row = rows.get(p.district) ?? blank(p.district);
      row.receipts += 1;
      row.affected += p.affectedEstimate;

      if (p.status === "submitted") {
        row.awaitingVerification += 1;
        const age = Math.floor((now - p.createdAt) / DAY);
        const bucket = ageBuckets.find((b) => age <= b.max) ?? ageBuckets[3];
        bucket.count += 1;
      } else if (p.status === "deployed") {
        row.resolved += 1;
      } else if (p.status === "closed" || p.status === "rejected") {
        row.closed += 1;
      } else {
        row.underExamination += 1;
      }

      if (p.validatedAt) {
        row.decisionDays.push(Math.max(0, (p.validatedAt - p.createdAt) / DAY));
      }

      row.pendency = row.receipts - row.resolved - row.closed;
      rows.set(p.district, row);
    }

    const register = [...rows.values()]
      .map((r) => ({
        district: r.district,
        receipts: r.receipts,
        awaitingVerification: r.awaitingVerification,
        underExamination: r.underExamination,
        resolved: r.resolved,
        closed: r.closed,
        pendency: r.pendency,
        affected: r.affected,
        avgDecisionDays:
          r.decisionDays.length === 0
            ? null
            : Math.round(
                (r.decisionDays.reduce((a, b) => a + b, 0) /
                  r.decisionDays.length) *
                  10,
              ) / 10,
      }))
      .sort((a, b) => b.receipts - a.receipts);

    const allDecisionDays = [...rows.values()].flatMap((r) => r.decisionDays);

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
      register,
      ageBuckets: ageBuckets.map((b) => ({ label: b.label, count: b.count })),
      avgDecisionDays:
        allDecisionDays.length === 0
          ? null
          : Math.round(
              (allDecisionDays.reduce((a, b) => a + b, 0) /
                allDecisionDays.length) *
                10,
            ) / 10,
      totalPendency: register.reduce((sum, r) => sum + r.pendency, 0),
      totalDisposed: register.reduce((sum, r) => sum + r.resolved + r.closed, 0),
    };
  },
});
