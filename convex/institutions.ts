import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireRole, requireUser } from "./lib/auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const universities = await ctx.db.query("universities").collect();
    return universities
      .map((u) => ({
        _id: u._id,
        shortName: u.shortName,
        name: u.name,
        district: u.district,
      }))
      .sort((a, b) => a.shortName.localeCompare(b.shortName));
  },
});

export const setMyUniversity = mutation({
  args: { universityId: v.id("universities") },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "faculty", "student");
    const university = await ctx.db.get(args.universityId);
    if (!university) throw new Error("That institution does not exist.");
    await ctx.db.patch(user._id, { universityId: args.universityId });
  },
});

export const myUniversity = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "faculty" && user.role !== "student")) {
      return null;
    }
    if (!user.universityId) return null;
    return await ctx.db.get(user.universityId);
  },
});
