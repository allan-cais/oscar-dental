import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { createAuditLog } from "../lib/audit";

// ---------------------------------------------------------------------------
// Audit Log — Mutations
// APPEND-ONLY: Only insert operations. No update or delete mutations.
// ---------------------------------------------------------------------------

/**
 * Internal mutation to create an audit log entry.
 *
 * This is exposed as an `internalMutation` so it can be called from other
 * mutations, actions, and scheduled functions — but NOT directly from the
 * client. All audit writes flow through `createAuditLog` which handles
 * identity resolution and hash chain computation.
 *
 * Usage from another mutation:
 *   await ctx.runMutation(internal.audit.mutations.log, {
 *     action: "patient.view",
 *     resourceType: "patient",
 *     resourceId: patientId,
 *     phiAccessed: true,
 *   });
 *
 * Usage from an action (via scheduler or ctx.runMutation):
 *   await ctx.runMutation(internal.audit.mutations.log, { ... });
 */
export const log = internalMutation({
  args: {
    action: v.string(),
    resourceType: v.string(),
    resourceId: v.optional(v.string()),
    details: v.optional(v.any()),
    phiAccessed: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await createAuditLog(ctx, {
      action: args.action,
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      details: args.details as Record<string, unknown> | undefined,
      phiAccessed: args.phiAccessed,
    });
  },
});
