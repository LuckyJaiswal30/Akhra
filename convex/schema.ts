import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const role = v.union(
  v.literal("citizen"),
  v.literal("officer"),
  v.literal("faculty"),
  v.literal("student"),
  v.literal("industry"),
);

export const domain = v.union(
  v.literal("education"),
  v.literal("agriculture"),
  v.literal("healthcare"),
  v.literal("water"),
  v.literal("environment"),
  v.literal("energy"),
  v.literal("urban"),
  v.literal("accessibility"),
  v.literal("governance"),
  v.literal("livelihoods"),
);

export const problemStatus = v.union(
  v.literal("submitted"),
  v.literal("validated"),
  v.literal("rejected"),
  v.literal("routed"),
  v.literal("accepted"),
  v.literal("in_progress"),
  v.literal("solution_proposed"),
  v.literal("industry_backed"),
  v.literal("deployed"),
  v.literal("closed"),
);

export const reporterKind = v.union(
  v.literal("citizen"),
  v.literal("community_group"),
  v.literal("panchayat"),
  v.literal("urban_local_body"),
  v.literal("department"),
);

export const projectStage = v.union(
  v.literal("team_forming"),
  v.literal("proposal_draft"),
  v.literal("proposal_submitted"),
  v.literal("prototyping"),
  v.literal("field_testing"),
  v.literal("deployed"),
);

export const pledgeKind = v.union(
  v.literal("mentoring"),
  v.literal("funding"),
  v.literal("prototyping"),
  v.literal("testing"),
  v.literal("deployment"),
  v.literal("technology_transfer"),
);

export const partnerKind = v.union(
  v.literal("industry"),
  v.literal("startup"),
  v.literal("msme"),
  v.literal("csr"),
  v.literal("research_lab"),
  v.literal("innovation_hub"),
);

const EMBEDDING_DIMENSIONS = 768;

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    role,
    phone: v.optional(v.string()),
    district: v.optional(v.string()),
    universityId: v.optional(v.id("universities")),
    departmentId: v.optional(v.id("departments")),
    partnerId: v.optional(v.id("partners")),
    trustScore: v.number(),
    createdAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_role", ["role"])
    .index("by_university", ["universityId"])
    .index("by_partner", ["partnerId"]),

  problems: defineTable({
    title: v.string(),
    description: v.string(),
    language: v.string(),
    district: v.string(),
    block: v.optional(v.string()),
    lat: v.number(),
    lng: v.number(),
    domain: v.optional(domain),
    domainConfidence: v.optional(v.number()),
    status: problemStatus,
    severity: v.number(),
    affectedEstimate: v.number(),
    priority: v.number(),
    clusterId: v.optional(v.id("clusters")),
    reporterId: v.id("users"),
    reporterKind,
    consentGiven: v.boolean(),
    sourceNote: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    sourceStatus: v.optional(
      v.union(
        v.literal("verified"),
        v.literal("partial"),
        v.literal("corrected"),
        v.literal("unverified"),
      ),
    ),
    createdAt: v.number(),
    validatedBy: v.optional(v.id("users")),
    validatedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_status_and_priority", ["status", "priority"])
    .index("by_district", ["district"])
    .index("by_domain", ["domain"])
    .index("by_cluster", ["clusterId"])
    .index("by_reporter", ["reporterId"])
    .searchIndex("search_text", {
      searchField: "description",
      filterFields: ["district", "status"],
    }),

  problemMedia: defineTable({
    problemId: v.id("problems"),
    storageId: v.id("_storage"),
    kind: v.union(v.literal("photo"), v.literal("video"), v.literal("document")),
    caption: v.optional(v.string()),
  }).index("by_problem", ["problemId"]),

  clusters: defineTable({
    label: v.string(),
    domain: v.optional(domain),
    district: v.string(),
    primaryProblemId: v.optional(v.id("problems")),
    memberCount: v.number(),
    totalAffected: v.number(),
    createdAt: v.number(),
  })
    .index("by_district", ["district"])
    .index("by_domain_and_district", ["domain", "district"]),

  problemEmbeddings: defineTable({
    problemId: v.id("problems"),
    district: v.string(),
    domain: v.optional(domain),
    embedding: v.array(v.float64()),
  })
    .index("by_problem", ["problemId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: EMBEDDING_DIMENSIONS,
      filterFields: ["district", "domain"],
    }),

  universities: defineTable({
    name: v.string(),
    shortName: v.string(),
    district: v.string(),
    type: v.string(),
    hasInnovationCentre: v.boolean(),
    hasIncubation: v.boolean(),
    website: v.optional(v.string()),
  }).index("by_district", ["district"]),

  departments: defineTable({
    universityId: v.id("universities"),
    name: v.string(),
    disciplines: v.array(v.string()),
    expertise: v.array(v.string()),
    facultyCount: v.number(),
    embedding: v.optional(v.array(v.float64())),
  })
    .index("by_university", ["universityId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: EMBEDDING_DIMENSIONS,
    }),

  routings: defineTable({
    problemId: v.id("problems"),
    universityId: v.id("universities"),
    departmentId: v.id("departments"),
    matchScore: v.number(),
    reason: v.string(),
    rank: v.number(),
    status: v.union(
      v.literal("suggested"),
      v.literal("assigned"),
      v.literal("accepted"),
      v.literal("declined"),
    ),
    createdAt: v.number(),
  })
    .index("by_problem", ["problemId"])
    .index("by_university_and_status", ["universityId", "status"]),

  projects: defineTable({
    problemId: v.id("problems"),
    universityId: v.id("universities"),
    departmentId: v.id("departments"),
    title: v.string(),
    stage: projectStage,
    proposalSummary: v.optional(v.string()),
    startedAt: v.number(),
    deployedAt: v.optional(v.number()),
  })
    .index("by_problem", ["problemId"])
    .index("by_university", ["universityId"])
    .index("by_stage", ["stage"]),

  projectMembers: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    position: v.union(
      v.literal("student"),
      v.literal("faculty_mentor"),
      v.literal("industry_mentor"),
    ),
  })
    .index("by_project", ["projectId"])
    .index("by_user", ["userId"]),

  milestones: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    detail: v.optional(v.string()),
    order: v.number(),
    dueDate: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("submitted"),
      v.literal("approved"),
    ),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
  }).index("by_project", ["projectId"]),

  partners: defineTable({
    name: v.string(),
    kind: partnerKind,
    sector: v.string(),
    district: v.string(),
    website: v.optional(v.string()),
  }).index("by_kind", ["kind"]),

  pledges: defineTable({
    projectId: v.id("projects"),
    partnerId: v.id("partners"),
    kind: pledgeKind,
    detail: v.string(),
    amount: v.optional(v.number()),
    status: v.union(
      v.literal("offered"),
      v.literal("accepted"),
      v.literal("delivered"),
    ),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_partner", ["partnerId"]),

  notifications: defineTable({
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    link: v.optional(v.string()),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_read", ["userId", "read"]),

  auditLog: defineTable({
    actorId: v.id("users"),
    action: v.string(),
    entity: v.string(),
    entityId: v.string(),
    detail: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_actor", ["actorId"])
    .index("by_entity", ["entity", "entityId"]),
});
