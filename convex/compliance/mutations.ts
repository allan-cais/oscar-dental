import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

// ---------------------------------------------------------------------------
// FTC incentive language patterns (same as queries.ts)
// ---------------------------------------------------------------------------
const INCENTIVE_WORDS = [
  "discount", "free", "reward", "gift", "coupon", "prize", "raffle",
  "drawing", "enter to win", "giveaway", "sweepstakes", "bonus",
  "promotion", "promo", "deal", "offer", "percent off", "% off",
  "credit", "cashback", "cash back", "loyalty",
];

/**
 * Audit a review request template for FTC compliance.
 * Runs the compliance check and stores the result in the audit log.
 */
export const auditTemplate = mutation({
  args: {
    templateText: v.string(),
    templateName: v.string(),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Run FTC compliance check
    const lower = args.templateText.toLowerCase();
    const violations: string[] = [];

    for (const word of INCENTIVE_WORDS) {
      if (lower.includes(word)) {
        violations.push(`Contains incentive language: "${word}"`);
      }
    }

    const compliant = violations.length === 0;

    // Store audit result in audit log
    const details = JSON.stringify({
      templateName: args.templateName,
      compliant,
      violations,
      templateLength: args.templateText.length,
    });

    // Compute simple hash for audit trail
    const hashInput = `${orgId}:ftc_audit:${args.templateName}:${Date.now()}:${details}`;
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    const entryHash = Math.abs(hash).toString(36);

    await ctx.db.insert("auditLogs", {
      orgId,
      action: "ftc_compliance_audit",
      resourceType: "template",
      resourceId: args.templateName,
      details,
      phiAccessed: false,
      entryHash,
      timestamp: Date.now(),
    });

    return {
      compliant,
      violations,
      templateName: args.templateName,
      auditedAt: Date.now(),
    };
  },
});
