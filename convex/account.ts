import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { MutationCtx } from "./_generated/server";
import { getCurrentUser, recordAudit } from "./lib/auth";

/**
 * Deleting an account has to leave the app in a state where that person no
 * longer exists anywhere it matters — no role, no access, no listing, no
 * personal data — while keeping the row itself so that officer decisions and
 * reports still resolve to something rather than to a dangling id.
 */
async function tombstone(
  ctx: MutationCtx,
  user: Doc<"users">,
  reason: "self" | "provider",
) {
  const notifications = await ctx.db
    .query("notifications")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .collect();
  for (const row of notifications) await ctx.db.delete(row._id);

  const members = await ctx.db
    .query("projectMembers")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .collect();
  for (const row of members) await ctx.db.delete(row._id);

  await ctx.db.patch(user._id, {
    status: "deleted",
    deletedAt: Date.now(),
    name: "Deleted account",
    email: "",
    emailVerified: false,
    role: "citizen",
    phone: undefined,
    district: undefined,
    designation: undefined,
    universityId: undefined,
    partnerId: undefined,
    departmentId: undefined,
    profileCompletedAt: undefined,
    roleAssignedBy: undefined,
    roleAssignedAt: undefined,
    clerkId: `deleted:${user._id}`,
  });

  await recordAudit(
    ctx,
    user._id,
    reason === "self" ? "delete_account" : "delete_account_provider",
    "users",
    user._id,
  );

  return {
    notificationsRemoved: notifications.length,
    projectMembershipsRemoved: members.length,
  };
}

async function lastAdminGuard(ctx: MutationCtx, user: Doc<"users">) {
  if (user.role !== "admin") return;
  const admins = await ctx.db
    .query("users")
    .withIndex("by_role", (q) => q.eq("role", "admin"))
    .collect();
  const others = admins.filter(
    (row) => row.status === "active" && row._id !== user._id,
  );
  if (others.length === 0) {
    throw new Error(
      "You are the only administrator. Give someone else administrator access before deleting your account.",
    );
  }
}

export const deleteMyAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("You need to be signed in to do that.");
    await lastAdminGuard(ctx, user);
    return await tombstone(ctx, user, "self");
  },
});

/**
 * Runs when the identity provider says the account is gone — the person
 * deleted it from another device, or an administrator removed it in Clerk.
 */
export const purgeByClerkId = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user || user.status === "deleted") return { purged: false as const };

    await tombstone(ctx, user, "provider");
    return { purged: true as const };
  },
});

/**
 * Reconciles against the identity provider's list of live accounts. Only
 * rows that came from Clerk are considered, so seeded and already-tombstoned
 * rows are left alone. The caller supplies the list, which keeps the Clerk
 * credentials out of this deployment.
 */
export const purgeMissingClerkIds = internalMutation({
  args: { liveClerkIds: v.array(v.string()), dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const live = new Set(args.liveClerkIds);
    const users = await ctx.db.query("users").collect();

    const orphaned = users.filter(
      (user) =>
        user.status === "active" &&
        user.clerkId.startsWith("user_") &&
        !live.has(user.clerkId),
    );

    if (!args.dryRun) {
      for (const user of orphaned) await tombstone(ctx, user, "provider");
    }

    return {
      dryRun: Boolean(args.dryRun),
      checked: users.length,
      purged: orphaned.map((user) => ({
        email: user.email,
        role: user.role,
        clerkId: user.clerkId,
      })),
    };
  },
});

/**
 * The identity provider is the source of truth for name and email, so a
 * change there is mirrored here rather than waiting for the next sign-in.
 */
export const syncFromProvider = internalMutation({
  args: {
    clerkId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user || user.status !== "active") return { synced: false as const };

    const patch: Partial<Doc<"users">> = {};
    const name = args.name?.trim();
    const email = args.email?.trim().toLowerCase();
    if (name && name !== user.name) patch.name = name;
    if (email && email !== user.email) {
      patch.email = email;
      patch.emailVerified = true;
    }

    if (Object.keys(patch).length === 0) return { synced: false as const };

    await ctx.db.patch(user._id, patch);
    return { synced: true as const };
  },
});
