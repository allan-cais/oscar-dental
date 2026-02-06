import { MutationCtx } from "../_generated/server";

// ---------------------------------------------------------------------------
// Audit Log — Core Helper
// Creates tamper-evident, append-only audit log entries with a hash chain.
// ---------------------------------------------------------------------------

interface AuditLogParams {
  action: string; // e.g., "patient.view", "claim.submit", "payment.create"
  resourceType: string; // e.g., "patient", "claim", "payment"
  resourceId?: string;
  details?: Record<string, unknown>;
  phiAccessed: boolean;
}

/**
 * FNV-1a 64-bit-style hash (returns hex string).
 *
 * This is a deterministic, non-cryptographic hash used for the prototype
 * hash chain. It runs in the Convex V8 isolate where Node `crypto` and
 * `crypto.subtle` are not available.
 *
 * NOTE — Production should replace this with a proper SHA-256 hash
 * computed inside a Convex **action** (Node.js runtime) that calls back
 * into a mutation to persist the entry. The chain verification logic in
 * queries.ts is hash-algorithm-agnostic and will work with either.
 */
function fnv1aHash(input: string): string {
  // FNV-1a parameters (using JavaScript safe integers — 32-bit variant
  // doubled to two rounds for wider distribution).
  const FNV_OFFSET = 0x811c9dc5;
  const FNV_PRIME = 0x01000193;

  let h1 = FNV_OFFSET;
  let h2 = FNV_OFFSET;

  for (let i = 0; i < input.length; i++) {
    const byte = input.charCodeAt(i) & 0xff;
    // First 32-bit round
    h1 ^= byte;
    h1 = Math.imul(h1, FNV_PRIME) >>> 0;
    // Second 32-bit round (seed with upper byte)
    h2 ^= (input.charCodeAt(i) >> 8) & 0xff;
    h2 = Math.imul(h2, FNV_PRIME) >>> 0;
  }

  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

/**
 * Build the canonical string that gets hashed for a given entry.
 * Keeping this public so `verifyChain` in queries can recompute hashes.
 */
export function buildHashInput(
  previousHash: string,
  timestamp: number,
  action: string,
  resourceType: string,
  resourceId: string,
  userId: string,
): string {
  return [previousHash, timestamp, action, resourceType, resourceId, userId].join("|");
}

/**
 * Compute the entry hash for an audit log record.
 * Exported so the verification query can use the same algorithm.
 */
export function computeEntryHash(
  previousHash: string,
  timestamp: number,
  action: string,
  resourceType: string,
  resourceId: string,
  userId: string,
): string {
  const input = buildHashInput(previousHash, timestamp, action, resourceType, resourceId, userId);
  return fnv1aHash(input);
}

/**
 * Creates a tamper-evident audit log entry with a hash chain.
 *
 * 1. Resolves current user identity (falls back to "system" for crons).
 * 2. Resolves orgId from the user record or the identity token.
 * 3. Fetches the most recent audit log entry to obtain `previousHash`.
 * 4. Computes a deterministic hash of the concatenated fields.
 * 5. Inserts the new entry — append-only.
 */
export async function createAuditLog(
  ctx: MutationCtx,
  params: AuditLogParams,
) {
  // --- 1. Resolve identity ---------------------------------------------------
  const identity = await ctx.auth.getUserIdentity();

  const userId = identity?.subject ?? "system";
  const userEmail = identity?.email ?? undefined;

  // --- 2. Resolve orgId ------------------------------------------------------
  // Try the Clerk org claim first; fall back to a lookup on the users table.
  let orgId: string | undefined;

  if (identity) {
    // Clerk tokens typically include `org_id` in custom claims.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokenOrgId = (identity as any).org_id ?? (identity as any).orgId;
    if (typeof tokenOrgId === "string" && tokenOrgId.length > 0) {
      orgId = tokenOrgId;
    }

    // Fallback — look up the user row by Clerk subject.
    if (!orgId) {
      const userRow = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
        .first();
      orgId = userRow?.orgId;
    }
  }

  if (!orgId) {
    // System-level operations (crons, internal mutations) may not have an org
    // context. Use a sentinel value so the entry is still recorded.
    orgId = "system";
  }

  // --- 3. Get previous hash --------------------------------------------------
  const lastEntry = await ctx.db
    .query("auditLogs")
    .withIndex("by_org_time", (q) => q.eq("orgId", orgId as string))
    .order("desc")
    .first();

  const previousHash = lastEntry?.entryHash ?? "genesis";

  // --- 4. Compute entry hash -------------------------------------------------
  const timestamp = Date.now();
  const entryHash = computeEntryHash(
    previousHash,
    timestamp,
    params.action,
    params.resourceType,
    params.resourceId ?? "",
    userId,
  );

  // --- 5. Insert audit log entry (append-only) --------------------------------
  const entryId = await ctx.db.insert("auditLogs", {
    orgId,
    userId,
    userEmail,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    details: params.details ? JSON.stringify(params.details) : undefined,
    phiAccessed: params.phiAccessed,
    previousHash,
    entryHash,
    timestamp,
  });

  return { entryId, entryHash, timestamp };
}
