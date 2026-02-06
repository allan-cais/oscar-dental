import { QueryCtx, MutationCtx } from "../_generated/server";
import { getOrgId } from "./auth";

/**
 * Get the current tenant's orgId for use in queries.
 * Every tenant-scoped query MUST filter by orgId to enforce data isolation.
 *
 * Usage:
 *   const orgId = await withOrg(ctx);
 *   const patients = await ctx.db
 *     .query("patients")
 *     .withIndex("by_org", (q) => q.eq("orgId", orgId))
 *     .collect();
 */
export async function withOrg(ctx: QueryCtx | MutationCtx): Promise<string> {
  return getOrgId(ctx);
}

/**
 * Query a tenant-scoped table filtered by the current org.
 * All tenant-scoped tables have a `by_org` index on `orgId`.
 *
 * Usage:
 *   const claims = await queryByOrg(ctx, "claims").collect();
 *   const activeClaims = await queryByOrg(ctx, "claims")
 *     .filter((q) => q.eq(q.field("status"), "submitted"))
 *     .collect();
 */
export async function queryByOrg<
  T extends keyof typeof import("../schema").default["tables"],
>(ctx: QueryCtx | MutationCtx, table: T) {
  const orgId = await withOrg(ctx);
  return ctx.db
    .query(table as string as any)
    .withIndex("by_org", (q: any) => q.eq("orgId", orgId));
}

/**
 * Validate that a document belongs to the current tenant.
 * Use this when receiving a document ID as input to verify ownership
 * before performing operations.
 *
 * Returns the document if it belongs to the current org, throws otherwise.
 */
export async function validateOrgOwnership<
  T extends { orgId: string },
>(
  ctx: QueryCtx | MutationCtx,
  document: T | null,
  resourceName: string
): Promise<T> {
  if (!document) {
    throw new Error(`${resourceName} not found`);
  }
  const orgId = await withOrg(ctx);
  if (document.orgId !== orgId) {
    throw new Error(`${resourceName} not found`);
  }
  return document;
}
