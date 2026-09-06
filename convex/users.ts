import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { role } from "./schema";
import { getCurrentUser, requireUser } from "./lib/auth";

export const current = query({
  args: {},
  handler: async (ctx) => getCurrentUser(ctx),
});

export const ensureUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("You need to be signed in to do that.");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existing) {
      if (existing.name !== args.name || existing.email !== args.email) {
        await ctx.db.patch(existing._id, {
          name: args.name,
          email: args.email,
        });
      }
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      name: args.name,
      email: args.email,
      role: "citizen",
      trustScore: 50,
      createdAt: Date.now(),
    });
  },
});

export const setRole = mutation({
  args: { role },
  handler: async (ctx, args) => {
    if (process.env.DEMO_MODE !== "true") {
      throw new Error(
        "Roles are assigned by an administrator. Self-service role changes are disabled.",
      );
    }
    const user = await requireUser(ctx);
    await ctx.db.patch(user._id, { role: args.role });
    return args.role;
  },
});

export const unreadNotificationCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read", (q) =>
        q.eq("userId", user._id).eq("read", false),
      )
      .collect();
    return rows.length;
  },
});
