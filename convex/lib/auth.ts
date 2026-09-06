import { Doc } from "../_generated/dataModel";
import { QueryCtx, MutationCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;
export type Role = Doc<"users">["role"];

export async function getCurrentUser(ctx: Ctx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
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
