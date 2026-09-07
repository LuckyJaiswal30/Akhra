import { api, internal } from "./_generated/api";
import { internalAction, internalQuery } from "./_generated/server";
import { classify } from "./lib/classify";
import { embedText } from "./lib/gemini";
import { priorityScore } from "./lib/priority";
import { isDistrict } from "./lib/districts";

type Check = { name: string; pass: boolean; detail: string };

export const snapshot = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const universities = await ctx.db.query("universities").collect();
    const departments = await ctx.db.query("departments").collect();
    const problems = await ctx.db.query("problems").collect();
    const clusters = await ctx.db.query("clusters").collect();
    const embeddings = await ctx.db.query("problemEmbeddings").collect();
    const partners = await ctx.db.query("partners").collect();
    const routings = await ctx.db.query("routings").collect();

    return {
      universities: universities.length,
      departments: departments.length,
      departmentsEmbedded: departments.filter((d) => d.embedding).length,
      partners: partners.length,
      routings: routings.length,
      problems: problems.map((p) => ({
        _id: p._id,
        title: p.title,
        district: p.district,
        domain: p.domain,
        severity: p.severity,
        affected: p.affectedEstimate,
        priority: p.priority,
        clusterId: p.clusterId,
        status: p.status,
        sourceUrl: p.sourceUrl,
        lat: p.lat,
        lng: p.lng,
      })),
      clusters: await Promise.all(
        clusters.map(async (c) => {
          const members = await ctx.db
            .query("problems")
            .withIndex("by_cluster", (q) => q.eq("clusterId", c._id))
            .collect();
          return {
            _id: c._id,
            label: c.label,
            district: c.district,
            memberCount: c.memberCount,
            totalAffected: c.totalAffected,
            actualMembers: members.length,
            actualAffected: members.reduce((s, m) => s + m.affectedEstimate, 0),
            districts: [...new Set(members.map((m) => m.district))],
          };
        }),
      ),
      embeddedProblemIds: embeddings.map((e) => e.problemId),
      officersWithoutDistrict: users.filter(
        (u) => u.status === "active" && u.role === "officer" && !u.district,
      ).length,
      deletedHoldingRole: users.filter(
        (u) => u.status === "deleted" && u.role !== "citizen",
      ).length,
      deletedKeepingIdentity: users.filter(
        (u) =>
          u.status === "deleted" &&
          (u.email !== "" || u.clerkId.startsWith("user_")),
      ).length,
      activeWithInvalidDistrict: users.filter(
        (u) => u.status === "active" && u.district && !isDistrict(u.district),
      ).length,
      duplicateActiveEmails: (() => {
        const seen = new Map<string, number>();
        for (const u of users) {
          if (u.status !== "active" || !u.email) continue;
          seen.set(u.email, (seen.get(u.email) ?? 0) + 1);
        }
        return [...seen.entries()].filter(([, count]) => count > 1).length;
      })(),
      orphanInvitations: (
        await Promise.all(
          (await ctx.db.query("invitations").collect()).map(async (row) =>
            (await ctx.db.get(row.invitedBy)) ? null : row.email,
          ),
        )
      ).filter(Boolean).length,
    };
  },
});

export const runAll = internalAction({
  args: {},
  handler: async (ctx): Promise<{ passed: number; failed: number; checks: Check[] }> => {
    const checks: Check[] = [];
    const add = (name: string, pass: boolean, detail: string) =>
      checks.push({ name, pass, detail });

    const s = await ctx.runQuery(internal.selftest.snapshot, {});

    add("institutions seeded", s.universities >= 15,
      `${s.universities} universities, ${s.departments} departments`);
    add("department embeddings", s.departmentsEmbedded === s.departments,
      `${s.departmentsEmbedded}/${s.departments} embedded`);
    add("partners seeded", s.partners >= 12, `${s.partners} partners`);
    add("problems seeded", s.problems.length >= 100, `${s.problems.length} problems`);

    const DOMAINS = ["education","agriculture","healthcare","water","environment","energy","urban","accessibility","governance","livelihoods"];
    const badDomain = s.problems.filter((p) => p.domain && !DOMAINS.includes(p.domain));
    add("all domains valid", badDomain.length === 0,
      badDomain.length ? `bad: ${badDomain.slice(0,3).map(p=>p.domain).join(", ")}` : "all 10 domains valid");

    const noSource = s.problems.filter((p) => !p.sourceUrl);
    add("every problem has a source", noSource.length === 0,
      noSource.length ? `${noSource.length} missing` : `${s.problems.length} sourced`);

    const noCoords = s.problems.filter((p) => !p.lat || !p.lng);
    add("every problem has coordinates", noCoords.length === 0,
      noCoords.length ? `${noCoords.length} missing` : "all located");

    const embedded = new Set(s.embeddedProblemIds.map(String));
    const unembedded = s.problems.filter((p) => !embedded.has(String(p._id)));
    add("every problem embedded", unembedded.length === 0,
      unembedded.length ? `${unembedded.length} unembedded` : `${s.problems.length} embedded`);

    const badCount = s.clusters.filter((c) => c.memberCount !== c.actualMembers);
    add("cluster counts accurate", badCount.length === 0,
      badCount.length ? `${badCount.length} clusters mismatched` : `${s.clusters.length} clusters consistent`);

    const badAffected = s.clusters.filter((c) => c.totalAffected !== c.actualAffected);
    add("cluster affected totals accurate", badAffected.length === 0,
      badAffected.length ? `${badAffected.length} mismatched` : "totals match members");

    const spanning = s.clusters.filter((c) => c.districts.length > 1);
    add("no cluster spans districts", spanning.length === 0,
      spanning.length ? `${spanning.map(c=>c.label).slice(0,2).join("; ")}` : "all single-district");

    const drift = s.problems.filter((p) => {
      const size = p.clusterId
        ? (s.clusters.find((c) => String(c._id) === String(p.clusterId))?.actualMembers ?? 1)
        : 1;
      return Math.abs(priorityScore(p.severity, p.affected, size) - p.priority) > 0.011;
    });
    add("priority scores match formula", drift.length === 0,
      drift.length ? `${drift.length} drifted, e.g. ${drift[0].title.slice(0,40)}` : "all recomputed correctly");

    const sev5 = s.problems.filter((p) => p.severity === 5);
    const lowSev5 = sev5.filter((p) => p.priority < 7.5);
    add("severity-5 floor applied", lowSev5.length === 0,
      `${sev5.length} severity-5 problems, ${lowSev5.length} below floor`);

    try {
      const result = await classify(
        "Handpump water has turned muddy",
        "The handpump near the primary school has given brown water for three weeks. Children have started falling sick.",
        "Khunti",
      );
      add("classification returns a valid domain", DOMAINS.includes(result.domain),
        `${result.domain} via ${result.source}, severity ${result.severity}`);
    } catch (cause) {
      add("classification returns a valid domain", false, String(cause).slice(0, 120));
    }

    let probe: number[] = [];
    try {
      probe = await embedText("Village borewell is giving dirty smelly water and children are unwell.");
      const norm = Math.sqrt(probe.reduce((s, v) => s + v * v, 0));
      add("embeddings are 768-dim and normalised",
        probe.length === 768 && Math.abs(norm - 1) < 0.01,
        `${probe.length} dims, norm ${norm.toFixed(4)}`);
    } catch (cause) {
      add("embeddings are 768-dim and normalised", false, String(cause).slice(0, 120));
    }

    if (probe.length === 768) {
      const matches = await ctx.vectorSearch("problemEmbeddings", "by_embedding", {
        vector: probe, limit: 5,
      });
      const top = matches[0]?._score ?? 0;
      add("vector search finds similar problems", matches.length > 0 && top > 0.6,
        `top score ${top.toFixed(3)} across ${matches.length} matches`);

      const deptMatches = await ctx.vectorSearch("departments", "by_embedding", {
        vector: probe, limit: 3,
      });
      add("routing finds relevant departments", deptMatches.length >= 3,
        `${deptMatches.length} departments, top ${deptMatches[0]?._score.toFixed(3) ?? "n/a"}`);
    }

    add("every officer has a district", s.officersWithoutDistrict === 0,
      s.officersWithoutDistrict
        ? `${s.officersWithoutDistrict} officers can see no queue at all`
        : "every officer account is posted somewhere");

    add("no invitation points at a deleted account", s.orphanInvitations === 0,
      s.orphanInvitations ? `${s.orphanInvitations} orphaned` : "all resolvable");

    add("deleted accounts hold no role", s.deletedHoldingRole === 0,
      s.deletedHoldingRole
        ? `SECURITY: ${s.deletedHoldingRole} deleted accounts still hold a role`
        : "every deleted account is back to citizen");

    add("deleted accounts keep no identity", s.deletedKeepingIdentity === 0,
      s.deletedKeepingIdentity
        ? `${s.deletedKeepingIdentity} still carry an email or a live clerk id`
        : "email and clerk id scrubbed");

    add("one live account per email address", s.duplicateActiveEmails === 0,
      s.duplicateActiveEmails
        ? `${s.duplicateActiveEmails} addresses have more than one live account`
        : "no duplicates");

    add("every district on file is a real one", s.activeWithInvalidDistrict === 0,
      s.activeWithInvalidDistrict
        ? `${s.activeWithInvalidDistrict} accounts sit outside the 24 districts`
        : "all inside Jharkhand");

    const guarded: [string, () => Promise<unknown>][] = [
      ["problems.queue", () => ctx.runQuery(api.problems.queue, {})],
      ["access.adminExists", () => ctx.runQuery(api.access.adminExists, {})],
      ["access.directory", () => ctx.runQuery(api.access.directory, {})],
      ["institutions.list", () => ctx.runQuery(api.institutions.list, {})],
      ["account.deleteMyAccount", () => ctx.runMutation(api.account.deleteMyAccount, {})],
      [
        "users.completeProfile",
        () =>
          ctx.runMutation(api.users.completeProfile, {
            district: "Ranchi",
            designation: "Anonymous",
          }),
      ],
      [
        "users.ensureUser",
        () => ctx.runMutation(api.users.ensureUser, { name: "x" }),
      ],
    ];

    const answered: string[] = [];
    for (const [name, call] of guarded) {
      try {
        await call();
        answered.push(name);
      } catch {
        // refusing an anonymous caller is the expected outcome
      }
    }

    add("public functions refuse unauthenticated callers", answered.length === 0,
      answered.length
        ? `SECURITY: ${answered.join(", ")} answered without auth`
        : `${guarded.length} functions rejected anonymous calls`);

    const passed = checks.filter((c) => c.pass).length;
    return { passed, failed: checks.length - passed, checks };
  },
});
