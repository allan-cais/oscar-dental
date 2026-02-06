import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";

/**
 * Get the current authenticated user identity from Clerk JWT.
 * Throws if not authenticated.
 */
export async function getCurrentIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity;
}

/**
 * Extract org_id from Clerk JWT - this is the tenant identifier.
 * Throws if no organization is selected.
 */
export async function getOrgId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await getCurrentIdentity(ctx);
  // Clerk custom claims include org_id when user has selected an organization
  const orgId = (identity as Record<string, unknown>).org_id as
    | string
    | undefined;
  if (!orgId) {
    throw new Error("No organization selected");
  }
  return orgId;
}

/**
 * Get the current user record from the users table.
 * Looks up the user by their Clerk subject ID.
 * Returns null if no matching user record exists yet.
 */
export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users"> | null> {
  const identity = await getCurrentIdentity(ctx);
  const orgId = (identity as Record<string, unknown>).org_id as
    | string
    | undefined;
  if (!orgId) {
    throw new Error("No organization selected");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
    .first();

  return user;
}

/**
 * Require the current user to have one of the specified roles.
 * Throws if:
 * - User is not authenticated
 * - User record doesn't exist in users table
 * - User's role is not in the allowed list
 *
 * Returns the user document on success.
 */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  ...roles: Array<Doc<"users">["role"]>
): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("User not found");
  }
  if (!roles.includes(user.role)) {
    throw new Error(
      `Insufficient permissions. Required: ${roles.join(", ")}`
    );
  }
  return user;
}
