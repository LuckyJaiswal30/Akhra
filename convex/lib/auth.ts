import { Doc } from "../_generated/dataModel";
import { QueryCtx, MutationCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;
export type Role = Doc<"users">["role"];

/**
 * The row for whoever is calling, or null. A deleted account is nobody:
 * its row is only kept so that audit entries and reports still resolve.
 */
export async function getCurrentUser(ctx: Ctx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const byToken = await ctx.db
    .query("users")
    .withIndex("by_token_identifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique();
  const user =
    byToken ??
    (await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique());
  return user && user.status === "active" ? user : null;
}

export async function activeUserByEmail(
  ctx: Ctx,
  email: string,
): Promise<Doc<"users">[]> {
  const rows = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .collect();
  return rows.filter((row) => row.status === "active");
}

export async function requireUser(ctx: Ctx): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("You need to be signed in to do that.");
  return user;
}

export async function requireRole(
  ctx: Ctx,
  ...allowed: Role[]
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (!allowed.includes(user.role)) {
    throw new Error("Your account does not have access to this action.");
  }
  return user;
}

export async function recordAudit(
  ctx: MutationCtx,
  actorId: Doc<"users">["_id"],
  action: string,
  entity: string,
  entityId: string,
  detail?: string,
) {
  await ctx.db.insert("auditLog", {
    actorId,
    action,
    entity,
    entityId,
    detail,
    createdAt: Date.now(),
  });
}

export async function notify(
  ctx: MutationCtx,
  userId: Doc<"users">["_id"],
  title: string,
  body: string,
  link?: string,
) {
  await ctx.db.insert("notifications", {
    userId,
    title,
    body,
    link,
    read: false,
    createdAt: Date.now(),
  });
}
