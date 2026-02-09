import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Batch eligibility - daily at 5:30 AM CT (11:30 UTC)
crons.daily(
  "batch eligibility verification",
  { hourUTC: 11, minuteUTC: 30 },
  internal.eligibility.actions.runBatchVerification
);

// Denial SLA check - every 15 minutes
// Escalates denials with status "new" past their 24-hour SLA deadline
crons.interval(
  "denial SLA check",
  { minutes: 15 },
  internal.denials.mutations.escalateOverdue
);

// Production goals daily update - daily at 11:00 PM CT (05:00 UTC)
crons.daily(
  "production goals daily update",
  { hourUTC: 5, minuteUTC: 0 },
  internal.production.mutations.updateDailyActuals
);

// Recall due list generation - daily at 6:00 AM CT (12:00 UTC)
crons.daily(
  "recall due list generation",
  { hourUTC: 12, minuteUTC: 0 },
  internal.recall.mutations.generateDueList
);

// Payment plan installment charge - daily at 8:00 AM CT (14:00 UTC)
crons.daily(
  "payment plan installment charge",
  { hourUTC: 14, minuteUTC: 0 },
  internal.paymentPlans.mutations.chargeInstallment
);

// Collection sequence advance - hourly
// Advances active collection sequences through steps (statement -> SMS -> email -> call -> final notice -> agency)
crons.interval(
  "collection sequence advance",
  { minutes: 60 },
  internal.collections.mutations.advanceStep
);

// Fetch Google reviews - every 15 minutes
// Pulls new reviews from Google Business Profile (via mock adapter)
// and ingests them into the reviews table with AI sentiment analysis
crons.interval(
  "fetch Google reviews",
  { minutes: 15 },
  internal.reputation.actions.fetchReviews
);

// Process pending review requests - every 15 minutes
// Sends scheduled review request SMS after delay period, with AI
// satisfaction prediction gating (low score = internal follow-up instead)
crons.interval(
  "process pending review requests",
  { minutes: 15 },
  internal.reviewRequests.mutations.processPending
);

// NexHealth incremental sync - every 5 minutes
// Pulls changed patients/appointments from NexHealth for all active configs
crons.interval(
  "nexhealth incremental sync",
  { minutes: 5 },
  internal.nexhealth.actions.runIncrementalSync
);

// NexHealth health check - every 5 minutes
// Authenticates and pings NexHealth API for each active config, records status
crons.interval(
  "nexhealth health check",
  { minutes: 5 },
  internal.nexhealth.actions.runHealthCheck
);

export default crons;
