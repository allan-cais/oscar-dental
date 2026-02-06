/* eslint-disable */
/**
 * Generated server types stub.
 *
 * THIS FILE IS A STUB. Replaced by `npx convex dev` with real types.
 */

export {
  actionGeneric as action,
  httpActionGeneric as httpAction,
  queryGeneric as query,
  mutationGeneric as mutation,
  internalActionGeneric as internalAction,
  internalMutationGeneric as internalMutation,
  internalQueryGeneric as internalQuery,
} from "convex/server";

// In real generated code, these are typed with the DataModel.
// For stub purposes, re-export generic versions.
import type { GenericQueryCtx, GenericMutationCtx, GenericActionCtx, GenericDataModel } from "convex/server";

export type QueryCtx = GenericQueryCtx<GenericDataModel>;
export type MutationCtx = GenericMutationCtx<GenericDataModel>;
export type ActionCtx = GenericActionCtx<GenericDataModel>;
