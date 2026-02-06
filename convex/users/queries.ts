import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId, getCurrentIdentity } from "../lib/auth";

/**
 * List all users for the current organization, sorted by lastName.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);

    const users = await ctx.db
      .query("users")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();

    return users.sort((a, b) =>
      a.lastName.localeCompare(b.lastName) ||
      a.firstName.localeCompare(b.firstName)
    );
  },
});

/**
 * Get a single user by ID. Verifies the user belongs to the current org.
 */
export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user || user.orgId !== orgId) {
      throw new Error("User not found");
    }

    return user;
  },
});

/**
 * Get the current authenticated user by their Clerk ID.
 */
export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const identity = await getCurrentIdentity(ctx);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    return user;
  },
});
