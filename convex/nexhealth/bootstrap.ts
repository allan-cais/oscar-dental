/**
 * Bootstrap utilities for development/testing.
 * Creates initial practice + NexHealth config from environment variables,
 * then triggers a full sync. Bypasses Clerk auth.
 *
 * Usage: Call `triggerFullSync` from the Convex dashboard "Run function" UI.
 */

import { action, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

// Cast to any because this file may not be in generated api.d.ts yet
const internalAny = internal as any;

const DEV_ORG_ID = "org_canopy_dev";

/**
 * Internal mutation: ensure a practice + nexhealthConfig exist.
 * Idempotent — if records already exist, returns existing IDs.
 */
export const _ensureBootstrapData = internalMutation({
  args: {
    apiKey: v.string(),
    subdomain: v.string(),
    locationId: v.string(),
    environment: v.union(v.literal("sandbox"), v.literal("production")),
  },
  handler: async (ctx, args) => {
    const orgId = DEV_ORG_ID;
    const now = Date.now();

    // 1. Find or create practice
    let practice = await ctx.db
      .query("practices")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .first();

    let practiceId;
    if (practice) {
      practiceId = practice._id;
    } else {
      practiceId = await ctx.db.insert("practices", {
        orgId,
        name: "Canopy Dental (Dev)",
        address: {
          street: "123 Main St",
          city: "Austin",
          state: "TX",
          zip: "78701",
        },
        phone: "512-555-0100",
        email: "dev@canopydental.com",
        timezone: "America/Chicago",
        pmsType: "opendental",
        createdAt: now,
        updatedAt: now,
      });
    }

    // 2. Find or create nexhealthConfig
    let config = await ctx.db
      .query("nexhealthConfigs")
      .withIndex("by_practice", (q: any) =>
        q.eq("orgId", orgId).eq("practiceId", practiceId)
      )
      .first();

    let configId;
    if (config) {
      // Update credentials in case they changed
      await ctx.db.patch(config._id, {
        apiKey: args.apiKey,
        subdomain: args.subdomain,
        locationId: args.locationId,
        environment: args.environment,
        isActive: true,
        updatedAt: now,
      });
      configId = config._id;
    } else {
      configId = await ctx.db.insert("nexhealthConfigs", {
        orgId,
        practiceId,
        apiKey: args.apiKey,
        subdomain: args.subdomain,
        locationId: args.locationId,
        environment: args.environment,
        isActive: true,
        connectionStatus: "disconnected",
        createdAt: now,
        updatedAt: now,
      });
    }

    return { orgId, practiceId, configId };
  },
});

/**
 * Public action: bootstrap data from env vars and run a full NexHealth sync.
 *
 * Call this from the Convex dashboard → Functions → nexhealth/bootstrap:triggerFullSync → Run
 */
export const triggerFullSync = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; processed?: number; failed?: number; error?: string }> => {
    // Read NexHealth credentials from environment
    const apiKey = process.env.NEXHEALTH_API_KEY;
    const subdomain = process.env.NEXHEALTH_SUBDOMAIN;
    const locationId = process.env.NEXHEALTH_LOCATION_ID;
    const environment = process.env.NEXHEALTH_ENVIRONMENT ?? "sandbox";

    if (!apiKey || !subdomain || !locationId) {
      return {
        success: false,
        error:
          "Missing NexHealth env vars. Set NEXHEALTH_API_KEY, NEXHEALTH_SUBDOMAIN, NEXHEALTH_LOCATION_ID in Convex environment.",
      };
    }

    console.log("Bootstrapping NexHealth config...");

    // 1. Ensure practice + config exist
    const { orgId, practiceId, configId } = await ctx.runMutation(
      internalAny.nexhealth.bootstrap._ensureBootstrapData,
      {
        apiKey,
        subdomain,
        locationId,
        environment: environment as "sandbox" | "production",
      }
    );

    console.log(
      `Bootstrap complete: orgId=${orgId}, practiceId=${practiceId}, configId=${configId}`
    );

    // 2. Run full sync
    console.log("Starting full sync...");
    const result: { success: boolean; processed?: number; failed?: number; error?: string } = await ctx.runAction(
      internalAny.nexhealth.actions.runFullSync,
      {
        configId,
        orgId,
        practiceId,
      }
    );

    console.log("Full sync result:", JSON.stringify(result));
    return result;
  },
});

