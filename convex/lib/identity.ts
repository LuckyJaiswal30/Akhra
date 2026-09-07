import { QueryCtx, MutationCtx } from "../_generated/server";

export const MISSING_EMAIL_CLAIM =
  "This deployment's Clerk JWT template does not include an email claim, " +
  "so the server cannot tell which address you signed in with. Add " +
  '"email": "{{user.primary_email_address}}" to the "convex" JWT template ' +
  "in Clerk and sign in again.";

export function normaliseEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function verifiedEmail(
  ctx: QueryCtx | MutationCtx,
): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.email) return null;
  return normaliseEmail(identity.email);
}

export async function requireVerifiedEmail(
  ctx: QueryCtx | MutationCtx,
): Promise<string> {
  const email = await verifiedEmail(ctx);
  if (!email) throw new Error(MISSING_EMAIL_CLAIM);
  return email;
}
