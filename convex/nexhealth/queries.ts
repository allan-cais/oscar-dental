import { query, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * Mask an API key, showing only the last 4 characters.
 * Example: "sk_live_abc123xyz" -> "••••3xyz"
 */
function maskApiKey(key: string): string {
  if (key.length <= 4) {
    return "••••";
  }
  return "••••" + key.slice(-4);
}

/**
 * Get the NexHealth configuration for a specific practice.
 * Returns the config with the apiKey masked for client-side display.
 */
export const getConfig = query({
  args: { practiceId: v.optional(v.id("practices")) },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    let config;
    if (args.practiceId) {
      config = await ctx.db
        .query("nexhealthConfigs")
        .withIndex("by_practice", (q) =>
          q.eq("orgId", orgId).eq("practiceId", args.practiceId!)
        )
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();
    } else {
      // Single-practice fallback: return first active config for the org
      config = await ctx.db
        .query("nexhealthConfigs")
        .filter((q) =>
          q.and(q.eq(q.field("orgId"), orgId), q.eq(q.field("isActive"), true))
        )
        .first();
    }

    if (!config) {
      return null;
    }

    return {
      ...config,
      apiKey: maskApiKey(config.apiKey),
    };
  },
});

/**
 * Internal query to get the full NexHealth config including unmasked apiKey.
 * Used by actions that need the real credentials (e.g., API calls to NexHealth).
 * NOT client-callable.
 */
export const _getConfigInternal = internalQuery({
  args: {
    practiceId: v.id("practices"),
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("nexhealthConfigs")
      .withIndex("by_practice", (q) =>
        q.eq("orgId", args.orgId).eq("practiceId", args.practiceId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    return config ?? null;
  },
});

/**
 * List all active NexHealth configurations for the current organization.
 * API keys are masked in the response.
 */
export const listConfigs = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);

    const configs = await ctx.db
      .query("nexhealthConfigs")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return configs.map((config) => ({
      ...config,
      apiKey: maskApiKey(config.apiKey),
    }));
  },
});

/**
 * Get the connection status for a practice's NexHealth integration.
 * Returns a summary object or null if no config exists.
 */
export const getConnectionStatus = query({
  args: { practiceId: v.id("practices") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const config = await ctx.db
      .query("nexhealthConfigs")
      .withIndex("by_practice", (q) =>
        q.eq("orgId", orgId).eq("practiceId", args.practiceId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!config) {
      return null;
    }

    return {
      isActive: config.isActive,
      connectionStatus: config.connectionStatus,
      lastSyncAt: config.lastSyncAt ?? null,
    };
  },
});

/**
 * Internal query to list all active NexHealth configs across all orgs.
 * Used by the pull sync engine to discover which practices to sync.
 * Returns full config objects including unmasked apiKey.
 * NOT client-callable.
 */
export const _listActiveConfigs = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("nexhealthConfigs")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

/**
 * Internal query to get the last sync timestamp for a NexHealth config.
 * Used by the pull sync engine to request only records changed since last sync.
 * NOT client-callable.
 */
export const _getLastSyncTimestamp = internalQuery({
  args: { configId: v.id("nexhealthConfigs") },
  handler: async (ctx, args) => {
    const config = await ctx.db.get(args.configId);
    return config?.lastSyncAt ?? null;
  },
});

/**
 * Get the webhook secret for a given subdomain.
 * Public query used by the Next.js webhook route for HMAC verification.
 * Returns only the secret — no API keys or sensitive config data exposed.
 */
export const getWebhookSecret = query({
  args: { subdomain: v.string() },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("nexhealthConfigs")
      .withIndex("by_subdomain", (q) => q.eq("subdomain", args.subdomain))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!config) return null;
    return { webhookSecret: config.webhookSecret ?? null };
  },
});

/**
 * Look up a NexHealth config by subdomain.
 * Used by webhook handler to identify which practice an event belongs to.
 */
export const _getConfigBySubdomain = internalQuery({
  args: { subdomain: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("nexhealthConfigs")
      .withIndex("by_subdomain", (q) => q.eq("subdomain", args.subdomain))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
  },
});

/**
 * List all patients with a pmsPatientId for the given org.
 * Used by the per-patient insurance coverage fallback during full sync.
 * NOT client-callable.
 */
export const listPmsPatientIds = internalQuery({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    return patients
      .filter((p) => p.pmsPatientId)
      .map((p) => ({ _id: p._id, pmsPatientId: p.pmsPatientId! }));
  },
});

// ---------------------------------------------------------------------------
// Push Sync — Internal queries for looking up records before pushing to NexHealth
// ---------------------------------------------------------------------------

/**
 * Get an appointment by ID for push sync.
 * NOT client-callable.
 */
export const _getAppointmentInternal = internalQuery({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.appointmentId);
  },
});

/**
 * Get a patient by ID for push sync.
 * NOT client-callable.
 */
export const _getPatientInternal = internalQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.patientId);
  },
});

/**
 * Get a provider by ID for push sync.
 * NOT client-callable.
 */
export const _getProviderInternal = internalQuery({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.providerId);
  },
});

/**
 * Get an appointment type by ID for push sync.
 * NOT client-callable.
 */
export const _getAppointmentTypeInternal = internalQuery({
  args: { appointmentTypeId: v.id("appointmentTypes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.appointmentTypeId);
  },
});

/**
 * List all providers with a pmsProviderId for the given org.
 * Used by seed push to get provider NexHealth IDs.
 * NOT client-callable.
 */
export const _listPmsProviderIds = internalQuery({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const providers = await ctx.db
      .query("providers")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    return providers
      .filter((p) => p.pmsProviderId)
      .map((p) => ({ _id: p._id, pmsProviderId: p.pmsProviderId! }));
  },
});

/**
 * List all appointment types for the given org.
 * Used by seed push to get real appointment type data.
 * NOT client-callable.
 */
export const _listAppointmentTypes = internalQuery({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const types = await ctx.db
      .query("appointmentTypes")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    return types
      .filter((t) => t.isActive && t.pmsAppointmentTypeId)
      .map((t) => ({
        _id: t._id,
        pmsAppointmentTypeId: t.pmsAppointmentTypeId!,
        name: t.name,
        duration: t.duration,
      }));
  },
});

/**
 * List all operatories with PMS IDs for the given org.
 * Used by seed push to get real operatory data.
 */
export const _listPmsOperatoryIds = internalQuery({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const operatories = await ctx.db
      .query("operatories")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    return operatories
      .filter((o) => o.pmsOperatoryId && o.isActive)
      .map((o) => ({
        _id: o._id,
        pmsOperatoryId: o.pmsOperatoryId!,
        name: o.name,
      }));
  },
});

/**
 * Check if a practice has an active NexHealth config.
 * All PMS types (OpenDental, Eaglesoft, Dentrix) have identical read/write
 * capabilities via NexHealth Synchronizer — no PMS-type-based gating.
 * NOT client-callable.
 */
export const _hasActiveNexHealthConfig = internalQuery({
  args: {
    orgId: v.string(),
    practiceId: v.id("practices"),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("nexhealthConfigs")
      .withIndex("by_practice", (q) =>
        q.eq("orgId", args.orgId).eq("practiceId", args.practiceId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!config) {
      return { hasConfig: false, configId: undefined };
    }

    return { hasConfig: true, configId: config._id };
  },
});

/**
 * Get a working hour by ID for push sync.
 * NOT client-callable.
 */
export const _getWorkingHourInternal = internalQuery({
  args: { workingHourId: v.id("workingHours") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.workingHourId);
  },
});

/**
 * Get a patient alert by ID for push sync.
 * NOT client-callable.
 */
export const _getPatientAlertInternal = internalQuery({
  args: { alertId: v.id("patientAlerts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.alertId);
  },
});

/**
 * Get a patient document by ID for push sync.
 * NOT client-callable.
 */
export const _getPatientDocumentInternal = internalQuery({
  args: { documentId: v.id("patientDocuments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.documentId);
  },
});
