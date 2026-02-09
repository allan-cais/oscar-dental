import { Doc } from "../_generated/dataModel";

/**
 * All actions in the Oscar platform that can be permission-gated.
 * Grouped by domain for clarity.
 */
export type Action =
  // User management
  | "users:create"
  | "users:read"
  | "users:update"
  | "users:delete"
  // Practice settings
  | "practices:read"
  | "practices:update"
  | "practices:manage_settings"
  // Patient records
  | "patients:create"
  | "patients:read"
  | "patients:update"
  | "patients:delete"
  | "patients:resolve_match"
  // Scheduling
  | "appointments:create"
  | "appointments:read"
  | "appointments:update"
  | "appointments:cancel"
  | "appointments:check_in"
  | "quickfill:manage"
  | "recall:manage"
  | "production_goals:manage"
  | "perfect_day:manage"
  // Claims / RCM
  | "claims:create"
  | "claims:read"
  | "claims:update"
  | "claims:submit"
  | "eligibility:verify"
  | "fee_schedules:manage"
  | "payer_rules:manage"
  // Denials & appeals
  | "denials:read"
  | "denials:manage"
  | "appeals:create"
  | "appeals:submit"
  // Payments & collections
  | "payments:read"
  | "payments:create"
  | "payments:refund"
  | "payment_plans:manage"
  | "collections:manage"
  | "card_on_file:manage"
  // Reputation
  | "reviews:read"
  | "reviews:respond"
  | "review_requests:manage"
  // Tasks
  | "tasks:read"
  | "tasks:create"
  | "tasks:update"
  | "tasks:assign"
  // Communication
  | "notifications:read"
  | "consents:manage"
  // AI actions
  | "ai_actions:read"
  | "ai_actions:approve"
  // Chat
  | "chat:read"
  | "chat:send"
  | "chat:execute_action"
  // Audit & compliance
  | "audit_logs:read"
  | "health_checks:read"
  | "sync_jobs:manage";

type Role = Doc<"users">["role"];

/**
 * Permission matrix mapping each role to its allowed actions.
 */
const ROLE_PERMISSIONS: Record<Role, Set<Action>> = {
  admin: new Set<Action>([
    // Admin has all permissions
    "users:create",
    "users:read",
    "users:update",
    "users:delete",
    "practices:read",
    "practices:update",
    "practices:manage_settings",
    "patients:create",
    "patients:read",
    "patients:update",
    "patients:delete",
    "patients:resolve_match",
    "appointments:create",
    "appointments:read",
    "appointments:update",
    "appointments:cancel",
    "appointments:check_in",
    "quickfill:manage",
    "recall:manage",
    "production_goals:manage",
    "perfect_day:manage",
    "claims:create",
    "claims:read",
    "claims:update",
    "claims:submit",
    "eligibility:verify",
    "fee_schedules:manage",
    "payer_rules:manage",
    "denials:read",
    "denials:manage",
    "appeals:create",
    "appeals:submit",
    "payments:read",
    "payments:create",
    "payments:refund",
    "payment_plans:manage",
    "collections:manage",
    "card_on_file:manage",
    "reviews:read",
    "reviews:respond",
    "review_requests:manage",
    "tasks:read",
    "tasks:create",
    "tasks:update",
    "tasks:assign",
    "notifications:read",
    "consents:manage",
    "ai_actions:read",
    "ai_actions:approve",
    "chat:read",
    "chat:send",
    "chat:execute_action",
    "audit_logs:read",
    "health_checks:read",
    "sync_jobs:manage",
  ]),

  office_manager: new Set<Action>([
    // Everything except user management and audit logs
    "practices:read",
    "practices:update",
    "practices:manage_settings",
    "patients:create",
    "patients:read",
    "patients:update",
    "patients:delete",
    "patients:resolve_match",
    "appointments:create",
    "appointments:read",
    "appointments:update",
    "appointments:cancel",
    "appointments:check_in",
    "quickfill:manage",
    "recall:manage",
    "production_goals:manage",
    "perfect_day:manage",
    "claims:create",
    "claims:read",
    "claims:update",
    "claims:submit",
    "eligibility:verify",
    "fee_schedules:manage",
    "payer_rules:manage",
    "denials:read",
    "denials:manage",
    "appeals:create",
    "appeals:submit",
    "payments:read",
    "payments:create",
    "payments:refund",
    "payment_plans:manage",
    "collections:manage",
    "card_on_file:manage",
    "reviews:read",
    "reviews:respond",
    "review_requests:manage",
    "tasks:read",
    "tasks:create",
    "tasks:update",
    "tasks:assign",
    "notifications:read",
    "consents:manage",
    "ai_actions:read",
    "ai_actions:approve",
    "chat:read",
    "chat:send",
    "chat:execute_action",
    "health_checks:read",
    "sync_jobs:manage",
  ]),

  billing: new Set<Action>([
    "practices:read",
    "patients:read",
    "patients:update",
    "appointments:read",
    "claims:create",
    "claims:read",
    "claims:update",
    "claims:submit",
    "eligibility:verify",
    "fee_schedules:manage",
    "payer_rules:manage",
    "denials:read",
    "denials:manage",
    "appeals:create",
    "appeals:submit",
    "payments:read",
    "payments:create",
    "payments:refund",
    "payment_plans:manage",
    "collections:manage",
    "card_on_file:manage",
    "tasks:read",
    "tasks:create",
    "tasks:update",
    "notifications:read",
    "ai_actions:read",
    "ai_actions:approve",
    "chat:read",
    "chat:send",
  ]),

  clinical: new Set<Action>([
    "practices:read",
    "patients:create",
    "patients:read",
    "patients:update",
    "appointments:create",
    "appointments:read",
    "appointments:update",
    "appointments:cancel",
    "quickfill:manage",
    "recall:manage",
    "claims:read",
    "eligibility:verify",
    "denials:read",
    "payments:read",
    "reviews:read",
    "tasks:read",
    "tasks:create",
    "tasks:update",
    "notifications:read",
    "ai_actions:read",
    "chat:read",
    "chat:send",
  ]),

  front_desk: new Set<Action>([
    "practices:read",
    "patients:create",
    "patients:read",
    "patients:update",
    "appointments:create",
    "appointments:read",
    "appointments:update",
    "appointments:cancel",
    "appointments:check_in",
    "quickfill:manage",
    "recall:manage",
    "eligibility:verify",
    "payments:read",
    "payments:create",
    "card_on_file:manage",
    "reviews:read",
    "review_requests:manage",
    "tasks:read",
    "tasks:create",
    "tasks:update",
    "notifications:read",
    "consents:manage",
    "chat:read",
    "chat:send",
  ]),

  provider: new Set<Action>([
    "practices:read",
    "patients:read",
    "patients:update",
    "appointments:create",
    "appointments:read",
    "appointments:update",
    "quickfill:manage",
    "recall:manage",
    "claims:read",
    "eligibility:verify",
    "denials:read",
    "payments:read",
    "reviews:read",
    "tasks:read",
    "tasks:create",
    "tasks:update",
    "notifications:read",
    "ai_actions:read",
    "chat:read",
    "chat:send",
  ]),
};

/**
 * Check if a role is allowed to perform a specific action.
 */
export function canPerform(role: Role, action: Action): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) {
    return false;
  }
  return permissions.has(action);
}

/**
 * Assert that a role can perform an action. Throws if not allowed.
 */
export function assertCanPerform(role: Role, action: Action): void {
  if (!canPerform(role, action)) {
    throw new Error(
      `Role "${role}" is not authorized to perform "${action}"`
    );
  }
}

/**
 * Get all actions a role is allowed to perform.
 */
export function getPermissions(role: Role): ReadonlySet<Action> {
  return ROLE_PERMISSIONS[role] ?? new Set();
}
