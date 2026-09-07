import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { role } from "./schema";
import {
  activeUserByEmail,
  notify,
  recordAudit,
  requireRole,
  requireUser,
} from "./lib/auth";
import { normaliseEmail as normalise, requireVerifiedEmail } from "./lib/identity";

const INVITABLE = [
  "officer",
  "faculty",
  "student",
  "industry",
  "admin",
] as const;

export const invite = mutation({
  args: {
    email: v.string(),
    invitedRole: role,
    universityId: v.optional(v.id("universities")),
    partnerId: v.optional(v.id("partners")),
    district: v.optional(v.string()),
    designation: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");

    if (!INVITABLE.includes(args.invitedRole as (typeof INVITABLE)[number])) {
      throw new Error("That role cannot be invited.");
    }

    const email = normalise(args.email);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new Error("Enter a valid email address.");
    }
    if (args.invitedRole === "officer" && !args.district) {
      throw new Error("Choose the district this officer is posted in.");
    }
    if (
      (args.invitedRole === "faculty" || args.invitedRole === "student") &&
      !args.universityId
    ) {
      throw new Error("Choose the institution.");
    }
    if (args.invitedRole === "industry" && !args.partnerId) {
      throw new Error("Choose the organisation.");
    }

    // Replace any invitation still outstanding for this address.
    const existing = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    for (const row of existing) {
      if (row.status === "pending") await ctx.db.delete(row._id);
    }

    const invitationId = await ctx.db.insert("invitations", {
      email,
      role: args.invitedRole,
      universityId: args.universityId,
      partnerId: args.partnerId,
      district: args.district,
      designation: args.designation?.trim() || undefined,
      note: args.note?.trim() || undefined,
      status: "pending",
      invitedBy: admin._id,
      createdAt: Date.now(),
    });

    await recordAudit(
      ctx,
      admin._id,
      "invite_role",
      "invitations",
      invitationId,
      `${args.invitedRole} · ${email}`,
    );

    // If they already have accounts, apply it now rather than waiting. One
    // address can have more than one account behind it, and the invitation is
    // for the address.
    const people = await activeUserByEmail(ctx, email);

    for (const person of people) {
      await ctx.db.patch(person._id, {
        role: args.invitedRole,
        universityId: args.universityId ?? person.universityId,
        partnerId: args.partnerId ?? person.partnerId,
        district: args.district ?? person.district,
        designation: args.designation?.trim() ?? person.designation,
        roleAssignedBy: admin._id,
        roleAssignedAt: Date.now(),
      });
      await notify(
        ctx,
        person._id,
        "Your access has changed",
        `An administrator gave you ${args.invitedRole} access. Reload the page to see your new sections.`,
        "/home",
      );
    }

    if (people.length > 0) {
      await ctx.db.patch(invitationId, {
        status: "accepted",
        acceptedAt: Date.now(),
        acceptedBy: people[0]._id,
      });
    }

    return { applied: people.length > 0 };
  },
});

export const invitations = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const rows = await ctx.db
      .query("invitations")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();

    return await Promise.all(
      rows.map(async (row) => {
        const university = row.universityId
          ? await ctx.db.get(row.universityId)
          : null;
        const partner = row.partnerId ? await ctx.db.get(row.partnerId) : null;
        const invitedBy = await ctx.db.get(row.invitedBy);
        return {
          _id: row._id,
          email: row.email,
          role: row.role,
          district: row.district,
          designation: row.designation,
          note: row.note,
          createdAt: row.createdAt,
          organisation: university?.shortName ?? partner?.name ?? null,
          invitedByName: invitedBy?.name ?? "—",
        };
      }),
    );
  },
});

export const revokeInvitation = mutation({
  args: { invitationId: v.id("invitations") },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    const row = await ctx.db.get(args.invitationId);
    if (!row) throw new Error("That invitation no longer exists.");
    if (row.status !== "pending") {
      throw new Error("That invitation has already been used.");
    }
    await ctx.db.patch(args.invitationId, { status: "revoked" });
    await recordAudit(
      ctx,
      admin._id,
      "revoke_invite",
      "invitations",
      args.invitationId,
      row.email,
    );
  },
});

export const directory = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const users = (await ctx.db.query("users").order("desc").take(400))
      .filter((u) => u.status === "active" && u.clerkId.startsWith("user_"))
      .slice(0, 200);

    return await Promise.all(
      users.map(async (u) => {
        const university = u.universityId
          ? await ctx.db.get(u.universityId)
          : null;
        const partner = u.partnerId ? await ctx.db.get(u.partnerId) : null;
        return {
          _id: u._id,
          name: u.name,
          email: u.email,
          emailVerified: u.emailVerified ?? false,
          role: u.role,
          designation: u.designation,
          organisation: university?.shortName ?? partner?.name ?? null,
          district: u.district,
          createdAt: u.createdAt,
        };
      }),
    );
  },
});

export const assignRole = mutation({
  args: { userId: v.id("users"), nextRole: role },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    const target = await ctx.db.get(args.userId);
    if (!target || target.status !== "active") {
      throw new Error("That person no longer exists.");
    }

    if (target._id === admin._id && args.nextRole !== "admin") {
      throw new Error("You cannot remove your own administrator access.");
    }

    if (args.nextRole === "officer" && !target.district) {
      throw new Error(
        "An officer needs a district. Use the invite form, which asks for one.",
      );
    }
    if (
      (args.nextRole === "faculty" || args.nextRole === "student") &&
      !target.universityId
    ) {
      throw new Error(
        "This person has no institution on their account. Use the invite form, which asks for one.",
      );
    }
    if (args.nextRole === "industry" && !target.partnerId) {
      throw new Error(
        "This person has no organisation on their account. Use the invite form, which asks for one.",
      );
    }

    await ctx.db.patch(args.userId, {
      role: args.nextRole,
      roleAssignedBy: admin._id,
      roleAssignedAt: Date.now(),
    });

    await recordAudit(
      ctx,
      admin._id,
      "assign_role",
      "users",
      args.userId,
      args.nextRole,
    );

    await notify(
      ctx,
      args.userId,
      "Your access has changed",
      `An administrator set your role to ${args.nextRole}.`,
      "/home",
    );
  },
});

export const claimFirstAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const proven = await requireVerifiedEmail(ctx);

    const admins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .collect();
    if (admins.some((row) => row.status === "active")) {
      throw new Error("An administrator already exists.");
    }

    const allowed = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? "")
      .split(",")
      .map((e) => normalise(e))
      .filter(Boolean);

    if (allowed.length === 0) {
      throw new Error(
        "BOOTSTRAP_ADMIN_EMAIL is not set on this Convex deployment, so " +
          "nobody can claim the first administrator.",
      );
    }

    if (!allowed.includes(proven)) {
      throw new Error(
        "This account is not listed as the bootstrap administrator.",
      );
    }

    await ctx.db.patch(user._id, {
      role: "admin",
      roleAssignedAt: Date.now(),
    });

    await recordAudit(ctx, user._id, "bootstrap_admin", "users", user._id);
  },
});

export const adminExists = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const admins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .collect();
    return admins.some((row) => row.status === "active");
  },
});
