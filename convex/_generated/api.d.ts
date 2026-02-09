/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adjustments_queries from "../adjustments/queries.js";
import type * as aiActions_mutations from "../aiActions/mutations.js";
import type * as aiActions_queries from "../aiActions/queries.js";
import type * as appeals_mutations from "../appeals/mutations.js";
import type * as appeals_queries from "../appeals/queries.js";
import type * as appointmentTypes_mutations from "../appointmentTypes/mutations.js";
import type * as appointmentTypes_queries from "../appointmentTypes/queries.js";
import type * as ar_mutations from "../ar/mutations.js";
import type * as ar_queries from "../ar/queries.js";
import type * as audit_mutations from "../audit/mutations.js";
import type * as audit_queries from "../audit/queries.js";
import type * as cardOnFile_mutations from "../cardOnFile/mutations.js";
import type * as cardOnFile_queries from "../cardOnFile/queries.js";
import type * as charges_queries from "../charges/queries.js";
import type * as chat_mutations from "../chat/mutations.js";
import type * as chat_queries from "../chat/queries.js";
import type * as claims_actions from "../claims/actions.js";
import type * as claims_mutations from "../claims/mutations.js";
import type * as claims_queries from "../claims/queries.js";
import type * as collections_mutations from "../collections/mutations.js";
import type * as collections_queries from "../collections/queries.js";
import type * as compliance_mutations from "../compliance/mutations.js";
import type * as compliance_queries from "../compliance/queries.js";
import type * as crons from "../crons.js";
import type * as denials_mutations from "../denials/mutations.js";
import type * as denials_queries from "../denials/queries.js";
import type * as eligibility_actions from "../eligibility/actions.js";
import type * as eligibility_mutations from "../eligibility/mutations.js";
import type * as eligibility_queries from "../eligibility/queries.js";
import type * as era_mutations from "../era/mutations.js";
import type * as era_queries from "../era/queries.js";
import type * as feeSchedules_mutations from "../feeSchedules/mutations.js";
import type * as feeSchedules_queries from "../feeSchedules/queries.js";
import type * as guarantorBalances_queries from "../guarantorBalances/queries.js";
import type * as health_mutations from "../health/mutations.js";
import type * as health_queries from "../health/queries.js";
import type * as insuranceBalances_queries from "../insuranceBalances/queries.js";
import type * as insurancePlans_queries from "../insurancePlans/queries.js";
import type * as integrations_ai_interface from "../integrations/ai/interface.js";
import type * as integrations_ai_mock from "../integrations/ai/mock.js";
import type * as integrations_clearinghouse_interface from "../integrations/clearinghouse/interface.js";
import type * as integrations_clearinghouse_mock from "../integrations/clearinghouse/mock.js";
import type * as integrations_factory from "../integrations/factory.js";
import type * as integrations_nexhealth_client from "../integrations/nexhealth/client.js";
import type * as integrations_nexhealth_mappers from "../integrations/nexhealth/mappers.js";
import type * as integrations_nexhealth_types from "../integrations/nexhealth/types.js";
import type * as integrations_payments_interface from "../integrations/payments/interface.js";
import type * as integrations_payments_mock from "../integrations/payments/mock.js";
import type * as integrations_pms_interface from "../integrations/pms/interface.js";
import type * as integrations_pms_mock from "../integrations/pms/mock.js";
import type * as integrations_pms_nexhealth from "../integrations/pms/nexhealth.js";
import type * as integrations_reviews_interface from "../integrations/reviews/interface.js";
import type * as integrations_reviews_mock from "../integrations/reviews/mock.js";
import type * as integrations_sms_interface from "../integrations/sms/interface.js";
import type * as integrations_sms_mock from "../integrations/sms/mock.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as lib_tenancy from "../lib/tenancy.js";
import type * as nexhealth_actions from "../nexhealth/actions.js";
import type * as nexhealth_bootstrap from "../nexhealth/bootstrap.js";
import type * as nexhealth_mutations from "../nexhealth/mutations.js";
import type * as nexhealth_queries from "../nexhealth/queries.js";
import type * as nexhealth_seedPush from "../nexhealth/seedPush.js";
import type * as notifications_mutations from "../notifications/mutations.js";
import type * as notifications_queries from "../notifications/queries.js";
import type * as operatories_mutations from "../operatories/mutations.js";
import type * as operatories_queries from "../operatories/queries.js";
import type * as patientAlerts_mutations from "../patientAlerts/mutations.js";
import type * as patientAlerts_queries from "../patientAlerts/queries.js";
import type * as patientDocuments_mutations from "../patientDocuments/mutations.js";
import type * as patientDocuments_queries from "../patientDocuments/queries.js";
import type * as patients_mutations from "../patients/mutations.js";
import type * as patients_queries from "../patients/queries.js";
import type * as paymentPlans_mutations from "../paymentPlans/mutations.js";
import type * as paymentPlans_queries from "../paymentPlans/queries.js";
import type * as perfectday_mutations from "../perfectday/mutations.js";
import type * as perfectday_queries from "../perfectday/queries.js";
import type * as pmsClaims_queries from "../pmsClaims/queries.js";
import type * as pmsPayments_queries from "../pmsPayments/queries.js";
import type * as practices_mutations from "../practices/mutations.js";
import type * as practices_queries from "../practices/queries.js";
import type * as predet_mutations from "../predet/mutations.js";
import type * as predet_queries from "../predet/queries.js";
import type * as procedures_queries from "../procedures/queries.js";
import type * as production_mutations from "../production/mutations.js";
import type * as production_queries from "../production/queries.js";
import type * as providers_mutations from "../providers/mutations.js";
import type * as providers_queries from "../providers/queries.js";
import type * as quickfill_mutations from "../quickfill/mutations.js";
import type * as quickfill_queries from "../quickfill/queries.js";
import type * as recall_mutations from "../recall/mutations.js";
import type * as recall_queries from "../recall/queries.js";
import type * as reputation_actions from "../reputation/actions.js";
import type * as reputation_mutations from "../reputation/mutations.js";
import type * as reputation_queries from "../reputation/queries.js";
import type * as reviewRequests_mutations from "../reviewRequests/mutations.js";
import type * as reviewRequests_queries from "../reviewRequests/queries.js";
import type * as reviewResponses_mutations from "../reviewResponses/mutations.js";
import type * as reviewResponses_queries from "../reviewResponses/queries.js";
import type * as scheduling_mutations from "../scheduling/mutations.js";
import type * as scheduling_queries from "../scheduling/queries.js";
import type * as seed from "../seed.js";
import type * as seedAllMockData from "../seedAllMockData.js";
import type * as seedV2 from "../seedV2.js";
import type * as sentiment_mutations from "../sentiment/mutations.js";
import type * as sentiment_queries from "../sentiment/queries.js";
import type * as sync_mutations from "../sync/mutations.js";
import type * as sync_queries from "../sync/queries.js";
import type * as tasks_mutations from "../tasks/mutations.js";
import type * as tasks_queries from "../tasks/queries.js";
import type * as tcpa_mutations from "../tcpa/mutations.js";
import type * as tcpa_queries from "../tcpa/queries.js";
import type * as textToPay_mutations from "../textToPay/mutations.js";
import type * as textToPay_queries from "../textToPay/queries.js";
import type * as treatmentPlans_queries from "../treatmentPlans/queries.js";
import type * as users_mutations from "../users/mutations.js";
import type * as users_queries from "../users/queries.js";
import type * as workingHours_mutations from "../workingHours/mutations.js";
import type * as workingHours_queries from "../workingHours/queries.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "adjustments/queries": typeof adjustments_queries;
  "aiActions/mutations": typeof aiActions_mutations;
  "aiActions/queries": typeof aiActions_queries;
  "appeals/mutations": typeof appeals_mutations;
  "appeals/queries": typeof appeals_queries;
  "appointmentTypes/mutations": typeof appointmentTypes_mutations;
  "appointmentTypes/queries": typeof appointmentTypes_queries;
  "ar/mutations": typeof ar_mutations;
  "ar/queries": typeof ar_queries;
  "audit/mutations": typeof audit_mutations;
  "audit/queries": typeof audit_queries;
  "cardOnFile/mutations": typeof cardOnFile_mutations;
  "cardOnFile/queries": typeof cardOnFile_queries;
  "charges/queries": typeof charges_queries;
  "chat/mutations": typeof chat_mutations;
  "chat/queries": typeof chat_queries;
  "claims/actions": typeof claims_actions;
  "claims/mutations": typeof claims_mutations;
  "claims/queries": typeof claims_queries;
  "collections/mutations": typeof collections_mutations;
  "collections/queries": typeof collections_queries;
  "compliance/mutations": typeof compliance_mutations;
  "compliance/queries": typeof compliance_queries;
  crons: typeof crons;
  "denials/mutations": typeof denials_mutations;
  "denials/queries": typeof denials_queries;
  "eligibility/actions": typeof eligibility_actions;
  "eligibility/mutations": typeof eligibility_mutations;
  "eligibility/queries": typeof eligibility_queries;
  "era/mutations": typeof era_mutations;
  "era/queries": typeof era_queries;
  "feeSchedules/mutations": typeof feeSchedules_mutations;
  "feeSchedules/queries": typeof feeSchedules_queries;
  "guarantorBalances/queries": typeof guarantorBalances_queries;
  "health/mutations": typeof health_mutations;
  "health/queries": typeof health_queries;
  "insuranceBalances/queries": typeof insuranceBalances_queries;
  "insurancePlans/queries": typeof insurancePlans_queries;
  "integrations/ai/interface": typeof integrations_ai_interface;
  "integrations/ai/mock": typeof integrations_ai_mock;
  "integrations/clearinghouse/interface": typeof integrations_clearinghouse_interface;
  "integrations/clearinghouse/mock": typeof integrations_clearinghouse_mock;
  "integrations/factory": typeof integrations_factory;
  "integrations/nexhealth/client": typeof integrations_nexhealth_client;
  "integrations/nexhealth/mappers": typeof integrations_nexhealth_mappers;
  "integrations/nexhealth/types": typeof integrations_nexhealth_types;
  "integrations/payments/interface": typeof integrations_payments_interface;
  "integrations/payments/mock": typeof integrations_payments_mock;
  "integrations/pms/interface": typeof integrations_pms_interface;
  "integrations/pms/mock": typeof integrations_pms_mock;
  "integrations/pms/nexhealth": typeof integrations_pms_nexhealth;
  "integrations/reviews/interface": typeof integrations_reviews_interface;
  "integrations/reviews/mock": typeof integrations_reviews_mock;
  "integrations/sms/interface": typeof integrations_sms_interface;
  "integrations/sms/mock": typeof integrations_sms_mock;
  "lib/audit": typeof lib_audit;
  "lib/auth": typeof lib_auth;
  "lib/permissions": typeof lib_permissions;
  "lib/tenancy": typeof lib_tenancy;
  "nexhealth/actions": typeof nexhealth_actions;
  "nexhealth/bootstrap": typeof nexhealth_bootstrap;
  "nexhealth/mutations": typeof nexhealth_mutations;
  "nexhealth/queries": typeof nexhealth_queries;
  "nexhealth/seedPush": typeof nexhealth_seedPush;
  "notifications/mutations": typeof notifications_mutations;
  "notifications/queries": typeof notifications_queries;
  "operatories/mutations": typeof operatories_mutations;
  "operatories/queries": typeof operatories_queries;
  "patientAlerts/mutations": typeof patientAlerts_mutations;
  "patientAlerts/queries": typeof patientAlerts_queries;
  "patientDocuments/mutations": typeof patientDocuments_mutations;
  "patientDocuments/queries": typeof patientDocuments_queries;
  "patients/mutations": typeof patients_mutations;
  "patients/queries": typeof patients_queries;
  "paymentPlans/mutations": typeof paymentPlans_mutations;
  "paymentPlans/queries": typeof paymentPlans_queries;
  "perfectday/mutations": typeof perfectday_mutations;
  "perfectday/queries": typeof perfectday_queries;
  "pmsClaims/queries": typeof pmsClaims_queries;
  "pmsPayments/queries": typeof pmsPayments_queries;
  "practices/mutations": typeof practices_mutations;
  "practices/queries": typeof practices_queries;
  "predet/mutations": typeof predet_mutations;
  "predet/queries": typeof predet_queries;
  "procedures/queries": typeof procedures_queries;
  "production/mutations": typeof production_mutations;
  "production/queries": typeof production_queries;
  "providers/mutations": typeof providers_mutations;
  "providers/queries": typeof providers_queries;
  "quickfill/mutations": typeof quickfill_mutations;
  "quickfill/queries": typeof quickfill_queries;
  "recall/mutations": typeof recall_mutations;
  "recall/queries": typeof recall_queries;
  "reputation/actions": typeof reputation_actions;
  "reputation/mutations": typeof reputation_mutations;
  "reputation/queries": typeof reputation_queries;
  "reviewRequests/mutations": typeof reviewRequests_mutations;
  "reviewRequests/queries": typeof reviewRequests_queries;
  "reviewResponses/mutations": typeof reviewResponses_mutations;
  "reviewResponses/queries": typeof reviewResponses_queries;
  "scheduling/mutations": typeof scheduling_mutations;
  "scheduling/queries": typeof scheduling_queries;
  seed: typeof seed;
  seedAllMockData: typeof seedAllMockData;
  seedV2: typeof seedV2;
  "sentiment/mutations": typeof sentiment_mutations;
  "sentiment/queries": typeof sentiment_queries;
  "sync/mutations": typeof sync_mutations;
  "sync/queries": typeof sync_queries;
  "tasks/mutations": typeof tasks_mutations;
  "tasks/queries": typeof tasks_queries;
  "tcpa/mutations": typeof tcpa_mutations;
  "tcpa/queries": typeof tcpa_queries;
  "textToPay/mutations": typeof textToPay_mutations;
  "textToPay/queries": typeof textToPay_queries;
  "treatmentPlans/queries": typeof treatmentPlans_queries;
  "users/mutations": typeof users_mutations;
  "users/queries": typeof users_queries;
  "workingHours/mutations": typeof workingHours_mutations;
  "workingHours/queries": typeof workingHours_queries;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
