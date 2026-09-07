import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, notify, recordAudit } from "./lib/auth";
import { verifiedEmail } from "./lib/identity";
import { isDistrict } from "./lib/districts";
import { isProfileComplete, profileGaps } from "./lib/profile";
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx } from "./_generated/server";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return {
      ...user,
      profileComplete: isProfileComplete(user),
      profileGaps: profileGaps(user),
    };
  },
});

/**
 * Applies a pending invitation for this email address, if one exists.
 * This is the only path by which an account gains elevated access —
 * an administrator issues the invitation, the person never asks for it.
 * The address must come from the identity provider, never from the client.
 */
async function applyInvitation(
  ctx: MutationCtx,
  userId: Id<"users">,
  provenEmail: string,
) {
  const pending = await ctx.db
    .query("invitations")
    .withIndex("by_email", (q) => q.eq("email", provenEmail))
    .order("desc")
    .collect();

  const invitation = pending.find((row) => row.status === "pending");
  if (!invitation) return;

  await ctx.db.patch(userId, {
    role: invitation.role,
    universityId: invitation.universityId,
    partnerId: invitation.partnerId,
    district: invitation.district,
    designation: invitation.designation,
    roleAssignedBy: invitation.invitedBy,
    roleAssignedAt: Date.now(),
  });

  await ctx.db.patch(invitation._id, {
    status: "accepted",
    acceptedAt: Date.now(),
    acceptedBy: userId,
  });

  await recordAudit(
    ctx,
    invitation.invitedBy,
    "accept_invite",
    "invitations",
    invitation._id,
    `${invitation.role} · ${invitation.email}`,
  );

  await notify(
    ctx,
    userId,
    "Your access is ready",
    `An administrator has given you ${invitation.role} access.`,
    "/home",
  );
}

/**
 * Fills district and designation only where the account does not already
 * carry better information. An invitation is better information: it is what
 * an administrator vouched for, so it always wins over what someone typed
 * about themselves during sign-up.
 */
async function fillProfileGaps(
  ctx: MutationCtx,
  userId: Id<"users">,
  district?: string,
  designation?: string,
) {
  const user = await ctx.db.get(userId);
  if (!user) return;

  const patch: Partial<Doc<"users">> = {};
  const wantedDistrict = district?.trim();
  const wantedDesignation = designation?.trim();

  if (!user.district && wantedDistrict && isDistrict(wantedDistrict)) {
    patch.district = wantedDistrict;
  }
  if (
    !user.designation &&
    wantedDesignation &&
    wantedDesignation.length >= 2 &&
    wantedDesignation.length <= 80
  ) {
    patch.designation = wantedDesignation;
  }

  if (Object.keys(patch).length === 0) return;

  await ctx.db.patch(userId, patch);

  const filled = await ctx.db.get(userId);
  if (filled && isProfileComplete(filled) && !filled.profileCompletedAt) {
    await ctx.db.patch(userId, { profileCompletedAt: Date.now() });
  }
}

/**
 * Idempotent. Called on every portal mount, so it has to be safe to run
 * repeatedly, safe to run concurrently with itself, and safe to run against
 * a clerkId whose previous row was deleted.
 */
export const ensureUser = mutation({
  args: {
    name: v.string(),
    district: v.optional(v.string()),
    designation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("You need to be signed in to do that.");

    const proven = await verifiedEmail(ctx);
    const email = proven ?? "";
    const name = identity.name?.trim() || args.name.trim() || "Unnamed";

    const existing: Doc<"users"> | null = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    // A deleted row is a tombstone. Signing in again with the same Clerk
    // account starts a fresh person rather than reviving the old one.
    if (existing && existing.status === "deleted") {
      const userId = await ctx.db.insert("users", {
        clerkId: identity.subject,
        name,
        email,
        emailVerified: Boolean(proven),
        status: "active",
        role: "citizen",
        trustScore: 50,
        createdAt: Date.now(),
      });
      await ctx.db.patch(existing._id, { clerkId: `deleted:${existing._id}` });
      if (proven) await applyInvitation(ctx, userId, proven);
      await fillProfileGaps(ctx, userId, args.district, args.designation);
      return { emailVerified: Boolean(proven) };
    }

    if (!existing) {
      const userId = await ctx.db.insert("users", {
        clerkId: identity.subject,
        name,
        email,
        emailVerified: Boolean(proven),
        status: "active",
        role: "citizen",
        trustScore: 50,
        createdAt: Date.now(),
      });
      if (proven) await applyInvitation(ctx, userId, proven);
      await fillProfileGaps(ctx, userId, args.district, args.designation);
      return { emailVerified: Boolean(proven) };
    }

    if (
      existing.name !== name ||
      existing.email !== email ||
      existing.emailVerified !== Boolean(proven)
    ) {
      await ctx.db.patch(existing._id, {
        name,
        email,
        emailVerified: Boolean(proven),
      });
    }

    if (proven) await applyInvitation(ctx, existing._id, proven);
    await fillProfileGaps(ctx, existing._id, args.district, args.designation);
    return { emailVerified: Boolean(proven) };
  },
});

export const completeProfile = mutation({
  args: {
    district: v.string(),
    designation: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Your account is still being set up. Try again shortly.");
    }

    const district = args.district.trim();
    const designation = args.designation.trim();

    if (!isDistrict(district)) {
      throw new Error("Choose one of the 24 districts of Jharkhand.");
    }
    if (designation.length < 2) {
      throw new Error("Say what you do, in a couple of words at least.");
    }
    if (designation.length > 80) {
      throw new Error("Keep the designation under eighty characters.");
    }

    // An officer's district is their posting and only an administrator sets
    // it. Everyone else is describing where they live.
    if (user.role === "officer" && user.district && user.district !== district) {
      throw new Error(
        "An administrator sets the district an officer is posted in. Ask them to change it.",
      );
    }

    await ctx.db.patch(user._id, {
      district,
      designation,
      profileCompletedAt: user.profileCompletedAt ?? Date.now(),
    });

    return { district, designation };
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
