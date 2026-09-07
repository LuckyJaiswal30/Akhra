import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { role } from "./schema";

export const setRoleByEmail = internalMutation({
  args: {
    email: v.string(),
    nextRole: role,
    clerkId: v.optional(v.string()),
    district: v.optional(v.string()),
    universityId: v.optional(v.id("universities")),
    partnerId: v.optional(v.id("partners")),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const people = await ctx.db.query("users").collect();
    const matches = people.filter(
      (u) =>
        u.status === "active" &&
        u.email.trim().toLowerCase() === email &&
        (!args.clerkId || u.clerkId === args.clerkId),
    );
    if (matches.length === 0) throw new Error(`No account for ${email}`);

    // Signing up again after an account is removed from the provider leaves a
    // second live row on the same address. Picking one at random would hand
    // the role to whichever came first, so say so instead.
    if (matches.length > 1) {
      throw new Error(
        `${matches.length} active accounts share ${email}: ` +
          `${matches.map((u) => u.clerkId).join(", ")}. Pass clerkId to choose one.`,
      );
    }

    const person = matches[0];

    const district = args.district ?? person.district;
    if (args.nextRole === "officer" && !district) {
      throw new Error(
        "An officer needs a district, or they see an empty queue. Pass one.",
      );
    }

    await ctx.db.patch(person._id, {
      role: args.nextRole,
      district,
      universityId: args.universityId ?? person.universityId,
      partnerId: args.partnerId ?? person.partnerId,
      roleAssignedAt: Date.now(),
    });

    return { name: person.name, email: person.email, role: args.nextRole };
  },
});

export const firstInstitutionAndPartner = internalMutation({
  args: {},
  handler: async (ctx) => {
    const university = await ctx.db.query("universities").first();
    const partner = await ctx.db.query("partners").first();
    return {
      universityId: university?._id ?? null,
      universityName: university?.name ?? null,
      partnerId: partner?._id ?? null,
      partnerName: partner?.name ?? null,
    };
  },
});
