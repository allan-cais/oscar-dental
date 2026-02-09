import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

export const approve = mutation({
  args: { aiActionId: v.id("aiActions") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const action = (await ctx.db.get(args.aiActionId)) as any;
    if (!action || action.orgId !== orgId) throw new Error("Not found");
    if (action.status !== "pending") throw new Error("Action is not pending");
    await ctx.db.patch(args.aiActionId, {
      status: "approved",
      approvedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const reject = mutation({
  args: {
    aiActionId: v.id("aiActions"),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const action = (await ctx.db.get(args.aiActionId)) as any;
    if (!action || action.orgId !== orgId) throw new Error("Not found");
    if (action.status !== "pending") throw new Error("Action is not pending");
    await ctx.db.patch(args.aiActionId, {
      status: "rejected",
      rejectedAt: Date.now(),
      rejectionReason: args.rejectionReason,
      updatedAt: Date.now(),
    } as any);
  },
});
