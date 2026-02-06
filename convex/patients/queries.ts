import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";
import { createAuditLog } from "../lib/audit";

/**
 * List patients for the current organization.
 * Supports optional status filter and pagination via limit/cursor.
 */
export const list = query({
  args: {
    status: v.optional(
      v.union(v.literal("active"), v.literal("inactive"), v.literal("all"))
    ),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const limit = args.limit ?? 50;
    const status = args.status ?? "active";

    let q = ctx.db
      .query("patients")
      .withIndex("by_org", (qi: any) => qi.eq("orgId", orgId));

    const allPatients = await q.collect();

    // Filter by active status
    let filtered = allPatients;
    if (status === "active") {
      filtered = allPatients.filter((p: any) => p.isActive === true);
    } else if (status === "inactive") {
      filtered = allPatients.filter((p: any) => p.isActive === false);
    }
    // "all" returns everything

    // Sort by lastName, firstName
    filtered.sort((a: any, b: any) =>
      a.lastName.localeCompare(b.lastName) ||
      a.firstName.localeCompare(b.firstName)
    );

    // Cursor-based pagination: cursor is the _id of the last item from previous page
    let startIdx = 0;
    if (args.cursor) {
      const cursorIdx = filtered.findIndex((p: any) => p._id === args.cursor);
      if (cursorIdx >= 0) {
        startIdx = cursorIdx + 1;
      }
    }

    const page = filtered.slice(startIdx, startIdx + limit);
    const nextCursor =
      page.length === limit && startIdx + limit < filtered.length
        ? page[page.length - 1]._id
        : null;

    return {
      patients: page,
      nextCursor,
      totalCount: filtered.length,
    };
  },
});

/**
 * Get a single patient by ID. Verifies orgId matches.
 * Logs PHI access via audit log.
 *
 * Uses mutation instead of query to enable audit logging (createAuditLog
 * requires MutationCtx for the write to auditLogs table).
 */
export const getById = mutation({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.orgId !== orgId) {
      throw new Error("Patient not found");
    }

    // Log PHI access
    await createAuditLog(ctx, {
      action: "patient.view",
      resourceType: "patient",
      resourceId: args.patientId,
      phiAccessed: true,
    });

    return patient;
  },
});

/**
 * Search patients by name using the search index on lastName.
 * Client-side filters on firstName if the search term might match first names.
 * Returns top 20 results.
 *
 * Uses mutation for audit logging of PHI search access.
 */
export const search = mutation({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const term = args.searchTerm.trim();

    if (term.length === 0) {
      return [];
    }

    // Use the search index on lastName, filtered by orgId
    const results = await ctx.db
      .query("patients")
      .withSearchIndex("search_patients", (q: any) =>
        q.search("lastName", term).eq("orgId", orgId)
      )
      .take(50);

    // Also do a client-side firstName filter for broader matching
    // (search index only covers lastName)
    const termLower = term.toLowerCase();
    const filtered = results.filter(
      (p: any) =>
        p.lastName.toLowerCase().includes(termLower) ||
        p.firstName.toLowerCase().includes(termLower)
    );

    const top20 = filtered.slice(0, 20);

    // Log PHI search access
    await createAuditLog(ctx, {
      action: "patient.search",
      resourceType: "patient",
      details: { searchTerm: term, resultCount: top20.length },
      phiAccessed: true,
    });

    return top20;
  },
});

/**
 * Look up a patient by their PMS patient ID within the current org.
 */
export const getByPmsId = query({
  args: { pmsPatientId: v.string() },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const patient = await ctx.db
      .query("patients")
      .withIndex("by_pms_id", (q: any) =>
        q.eq("orgId", orgId).eq("pmsPatientId", args.pmsPatientId)
      )
      .first();

    if (!patient) {
      return null;
    }

    return patient;
  },
});

/**
 * Get insurance details for a patient (primary and secondary insurance fields).
 */
export const getInsurance = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.orgId !== orgId) {
      throw new Error("Patient not found");
    }

    return {
      primaryInsurance: patient.primaryInsurance ?? null,
      secondaryInsurance: patient.secondaryInsurance ?? null,
    };
  },
});

/**
 * Get patient balance summary (patientBalance + insuranceBalance).
 */
export const getBalance = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.orgId !== orgId) {
      throw new Error("Patient not found");
    }

    return {
      patientBalance: patient.patientBalance ?? 0,
      insuranceBalance: patient.insuranceBalance ?? 0,
      totalBalance: (patient.patientBalance ?? 0) + (patient.insuranceBalance ?? 0),
    };
  },
});
