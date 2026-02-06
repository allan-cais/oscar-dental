# PMS CORE

**CORE PMS FUNCTIONS OF OSCAR:** 

## **1\) Patient records (patient profile / chart access)**

**OSCAR phase(s):** Phase 1 (Core platform \+ PMS integration layer), Phase 3 (Oscar Scribe \+ Clinical Compliance / FMX \+ Treatment Opportunity Mining)

**What OSCAR does (functional):**  
Operates as an overlay on Dentrix/Eaglesoft/OpenDental: sync & match patient identities so OSCAR can attach automation/insights to the correct patient. Adds clinical documentation capture (scribe) \+ clinical intelligence, but does not replace the underlying PMS chart as the source of truth.

**What it looks like in-product:**

* A Patient Hub with unified view: demographics, appointment history, insurance, balances, messages, tasks, compliance flags, opportunities.  
* A “linked PMS record” indicator \+ last-sync timestamps.

**Dev requirements:**

* **Master Patient Index (MPI):** `oscar_patient_id` ↔ `pms_patient_id` mapping (support multi-location, multi-PMS if needed).  
* **Identity matching engine:** deterministic \+ fuzzy matching; duplicate detection & a **human resolution queue**.  
* **Sync subsystem:** scheduled sync \+ delta updates, conflict resolution, “source-of-truth” rules.  
* **Audit logging:** immutable logs for PHI access \+ changes.  
* **Security & tenancy:** tenant isolation, RBAC, encrypted storage.

---

## **2\) Scheduling**

**OSCAR phase(s):** Phase 1 (Smart Scheduling)

**What OSCAR does (functional):**  
Optimizes schedule (gap fill / quick-fill) and aligns decisions with **production goals**, not just first-available slots.

**What it looks like in-product:**

* Calendar \+ a Recommendations panel: “Fill these holes,” “Move these blocks,” “Call these patients.”  
* “Quick-fill” list of patients who can come in sooner.

**Dev requirements:**

* **Data ingestion:** providers, operatories, appointment types, procedure durations, cancellation history.  
* **Optimization/scoring service:** production value \+ constraints (provider/op availability, duration, patient preferences).  
* **Write-back or tasking:** either directly book into PMS or create tasks for staff to confirm.  
* **Event triggers:** cancellations/no-shows trigger refill workflows.

---

## **3\) Clinical charting / documentation**

**OSCAR phase(s):** Phase 3 (Oscar Scribe; plus Clinical Compliance / FMX support)

**What OSCAR does (functional):**  
Voice charting / scribing to produce structured notes quickly and consistently; supports compliance workflows dependent on documentation.

**What it looks like in-product:**

* Record/upload audio → draft note → clinician edits → signs → exported/attached.  
* Templates by procedure/provider (provided by Oscar Dental).

**Dev requirements:**

* **Audio pipeline:** secure upload, storage, retention.  
* **Transcription \+ generation orchestration:** job queues, retries, idempotency, versioning.  
* **Template system:** structured fields \+ reusable templates.  
* **Review/sign workflow:** draft → reviewed → signed → locked, with audit trail.  
* **Export/attachment integration:** link back into PMS doc system where possible.

---

## **4\) Imaging integration / imaging workflows (specific to FMX)**

**OSCAR phase(s):** Phase 3 (Clinical Compliance / FMX tracking) \+ Phase 1 (integration layer as connector)

**What OSCAR does (functional):**  
Not a full imaging system; focuses on FMX compliance tracking—ensuring imaging is completed/tracked—enabled by the integration layer.

**What it looks like in-product:**

* Compliance timeline per patient: last FMX date, “FMX due,” “missing imaging” alerts.  
* Team queue: “Patients needing FMX before treatment.”

**Dev requirements:**

* **Imaging evidence model:** store metadata/proof-of-completion, not necessarily images.  
* **Compliance rules engine:** due/overdue logic \+ exceptions.  
* **Task routing:** auto-create tasks when imaging compliance is missing.  
* **Integration hooks:** read procedure codes / imaging events from PMS or imaging source.

---

## **5\) Treatment planning**

**OSCAR phase(s):** Phase 3 (Treatment Opportunity Mining)

**What OSCAR does (functional):**  
Surfaces treatment opportunities from clinical/operational signals so teams can close care gaps (mining is the core).

**What it looks like in-product:**

* “Opportunities” cards: unscheduled diagnosed treatment, overdue recalls/perio, incomplete plans.  
* Funnel tracking: identified → contacted → scheduled → completed.

**Dev requirements:**

* **Opportunity engine:** rules/heuristics (and/or AI extraction) that generates structured opportunities.  
* **Opportunity object model:** type, severity, evidence links, status, assignment, next action.  
* **Human-in-loop gating:** approval before clinical suggestions become patient-facing actions.  
* **Workflow integrations:** link opportunities to scheduling, tasks, and messaging.

---

## **6\) Insurance verification / eligibility \+ claims support**

**OSCAR phase(s):** Phase 1 (RCM Core)

**What OSCAR does (functional):**  
Automates insurance-to-cash starting with **eligibility/benefits**, then **claims workflows**.

**What it looks like in-product:**

* Eligibility queue: “verify these patients.”  
* Benefits summary cards \+ flags (missing info, conflicts).  
* Claims tracker: draft → submitted → paid/denied.

**Dev requirements:**

* **Insurance data model:** payers, plans, subscriber, coverage/limitations.  
* **Eligibility workflow:** request/response parsing, normalization, exceptions queue.  
* **Claims workflow:** validation/scrubbing, attachments list, status tracking.  
* **Work queues:** eligibility, claims missing info, denials, AR follow-up.  
* **Integration dependency:** via PMS-mediated workflows or clearinghouse connectivity.

---

## **7\) Billing \+ collections & payment processing**

**OSCAR phase(s):** Phase 1 (RCM Core \+ Text-to-Pay)

**What OSCAR does (functional):**  
Runs downstream revenue ops: denials \+ AR (RCM core) and patient collections/payment capture via text (Text-to-Pay).

**What it looks like in-product:**

* AR aging dashboard \+ “who to work today.”  
* Text payment campaigns with secure links, receipts, and reconciliation views.

**Dev requirements:**

* **Ledger ingestion:** balances, aging buckets, last payment, responsible party.  
* **Payment workflow:** secure link generation, payment capture, receipts, retries.  
* **Posting:** write-back to PMS ledger or “posting task” with proof.  
* **Compliance:** minimize PCI scope, tokenize, don’t store card data.  
* **Dunning rules:** cadence, suppressions, Do-Not-Text, dispute workflows.

---

## **8\) Patient engagement / communication (texts, reminders, etc.)**

**OSCAR phase(s):** Phase 1 (Text-to-Pay \+ Reputation Engine)

**What OSCAR does (functional):**  
Uses patient messaging for payments/collections \+ review/reputation workflows. Scope doesn’t explicitly claim broad reminders beyond scheduling automation implications.

**What it looks like in-product:**

* Messaging timeline per patient.  
* Automated review request sequences post-visit.  
* Text-to-pay sequences segmented by balance/aging.

**Dev requirements:**

* **Messaging service:** templates, variables, throttling, retries, delivery callbacks.  
* **Consent management:** opt-in/out tracking, quiet hours, stop keywords.  
* **Campaign engine:** segments \+ triggers (visit complete, balance threshold).  
* **Reputation workflows:** triggers, link generation, suppression rules, escalation.

---

## **9\) Reporting / business intelligence & analytics**

**OSCAR phase(s):** Phase 2 (AI Daily Huddle \+ KPI Board)

**What OSCAR does (functional):**  
Provides KPI board \+ AI daily huddle that turns practice metrics into prioritized actions.

**What it looks like in-product:**

* KPI dashboard (production, collections, schedule utilization, AR, cancellations, etc.).  
* Daily huddle: “Top 5 items to address today” with drilldowns.

**Dev requirements:**

* **Metrics layer:** canonical KPI definitions \+ formula versioning.  
* **Data pipeline:** ETL from PMS \+ OSCAR modules to analytics store.  
* **Drilldown views:** every KPI links to underlying patient/claim/task lists.  
* **Correctness & reconciliation:** tests to ensure KPIs match PMS totals within tolerances.  
* **Role-based visibility:** doctor vs OM vs front desk permissioning.

---

## **10\) Security / compliance expectations**

**OSCAR phase(s):** Phase 1 (integration foundation \+ compliance/audit logging), Phase 2 (HR Compliance Tracker), Phase 3 (Clinical Compliance / FMX)

**What OSCAR does (functional):**  
Establishes compliance/audit logging foundation, adds staff-side compliance tracking, and adds clinical compliance workflows (FMX).

**What it looks like in-product:**

* Admin security console: roles, access, audit log viewer.  
* HR compliance tracker: expirations, reminders, tasks.  
* Clinical compliance queue: FMX due/overdue and resolution tasks.

**Dev requirements:**

* **RBAC/ABAC:** granular permissions per workflow/action.  
* **Immutable audit logs:** PHI reads/writes \+ financial actions \+ integrations.  
* **Tenant isolation:** enforced at DB/API/cache/queues/logging.  
* **Encryption \+ secrets:** key mgmt, credential rotation, per-tenant config.  
* **Compliance workflows:** HR credential objects \+ reminders \+ task routing.

# PHASE 1

# **PHASE 1: Revenue Collection Module**

## **1.1 Phase 1 Key Features**

| \# | Feature | Description |
| :---: | ----- | ----- |
| **1** | **RCM Core** | Auto-claims, eligibility verification, pre-determination, ERA processing, denial management, A/R optimization.  |
| **2** | **Smart Scheduling** | Intelligent gap-filling, Quick Fill queue, recall management, production goal tracking, Perfect Day templates, no-show prediction. |
| **3** | **Text-to-Pay** | Payment links via SMS, card-on-file, payment plans, automated collections sequence, statement generation. |
| **4** | **Reputation Engine** | Automated review requests, Google Business monitoring, AI sentiment analysis, response management.  |

## **1.2 Phase 1 MVP Definition** 

1. Parallel operation with legacy PMS  
2. OSCAR authoritative for Phase 1 features  
3. Patient ID mapping between OSCAR and PMS  
4. Mobile app (iOS/Android) and desktop web app tested on a finite number of browsers version, IOS versions, and Android OS  
5. ~~Database schema for all three phases~~ Database schema for Phase 1, draft for Phase 2-3  
6. All Phase 1 integrations implemented and verifiable outlined further in Section Integration Mapping below limited to NexHealth Synchronizer’s connections  
7. UAT with Oscar PMS and companion PMS  
8. HIPAA compliant  
9. PCI DSS compliant \- Scoped specifically to PCI Level 1 using Stripe as a service provider. We will architect the solution to be PCI DSS but the cost of annual PCI validation / initial compliance will be Oscar Dental’s responsibility.  
10. Immutable audit logging with tamper-evident verification  
11. Headless RCM verification \<60 seconds \- Scope clarification: \<60 second turnaround is for Oscar submitting transaction / query and receiving actionable response from claim integration and store / log it. Out of scope will be ERA arrival and prior authorization determination within 60 seconds  
12. Payment reconciliation with dashboard  
13. Agentic AI grounding logic documented  
14. Automated customer onboarding \- Scope clarification: Automated onboarding between cloud based legacy PMS and what NexHealth will allow integration with. Full data migration is not covered in this phase.  
15. Health API for system monitoring  
16. Reputation Engine with Google Business integration  
17. TCPA-compliant communications.

# 

# **1.3 Integration Mapping**

### **A) PMS Integration through NexHealth Synchronizer**

#### **NexHealth Synchronizer | PMS Integration to Dentrix, Eaglesoft, Open Dental**

* **Functionality within Phase 1**  
  * Primary PMS synchronization \+ scheduling \+ patient communications data layer for Phase 1—used to keep OSCAR in sync with the legacy PMS for appointments, patients, locations/operatories, and messaging, and to read financial/clinical ledger data needed by RCM workflows.  
* **How we connect**  
  * NexHealth REST API (OpenAPI v2), authenticated via POST /authenticates to obtain a bearer token.  
  * Most endpoints are scoped by subdomain (institution) and often location\_id.  
  * Supports an event layer via Webhook Endpoints / Webhook Subscriptions (configurable webhooks).  
* **What’s possible (by Phase 1 Module):**   
* **Smart Scheduling**  
* **Read schedule \+ openings:** GET **`/appointments`** and GET **`/appointment_slots`**.  
* **Create appointments:** POST **`/appointments`** (includes `notify_patient` option).   
* **Manage availability rules:** Create/Read/Edit/Delete **`/availabilities`**.   
* **Configure appointment types:** supported via appointment type schemas and operations in the spec.

* **RCM CORE**  
  * **Read ledger/financial context:**  
    * GET **`/charges`** (what’s owed)   
    * GET **`/payments`** (what’s been paid)  
    * GET **`/adjustments`** (adjustments)   
  * **Read clinical line items:** procedure objects exist and procedures are exposed in the API.  
  * **Read insurance plans:** GET **`/insurance_plans`**. 

* **Text-to-Pay**  
  * **Patient texting/workflows:** Conversations exist as “a group of text messages between a Practice and a Patient,” with conversation resources exposed.   
  * **Read payment context:** GET **`/payments`** and GET **`/payment_plans`**.  
  * **Create Payment:** POST / payment. 

* **Reputation Engine**  
  * NexHealth can support outbound messaging flows (e.g., “request a review” link via SMS), since conversations/messaging exist.

* **Limitations**  
  * NexHealth’s published OpenAPI spec is primarily a PMS synchronizer \+ ledger surface, and it does not expose endpoints for claim submission/claim status/ERA/EOB/denials/appeals. Phase 1 features like “real-time eligibility,” “benefits breakdown,” and automated claim lifecycle steps can’t be guaranteed via NexHealth alone and typically require a dedicated eligibility/clearinghouse layer (or HITL fallback).   
  * **IMPORTANT NOTE**: Developer’s implementation is based on Developer’s current understanding of NexHealth Synchronizer API documentation and vendor representations available as of this Effective Date. Oscar Dental acknowledges that NexHealth is a third-party system outside Developer’s control and assumes the risk that NexHealth’s API may not support all scoped functionality, may be restricted by plan level, or may change without notice. To the extent any scoped functionality cannot be delivered due to NexHealth limitations or changes, Developer will have no liability for such nonperformance, and Oscar Dental agrees that required modifications, alternative integrations, or manual workflows will be handled via change order at Oscar Dental’s expense.  
* **Financial Cost & Responsibility:**    
  * NexHealth also publishes an API per-call pricing schedule (example tiers shown: Standard/Pro/Premium/Enterprise priced per API call). This cost will be the responsibility of Oscar Dental up to a threshold of testing that they approve.  
* **Solution / Mitigation (Phase 1\)**  
  * Treat NexHealth as the PMS sync \+ scheduling \+ messaging layer, not the clearinghouse. Pair with Vyne (or equivalent) for claim/eligibility/ERA automation.  
  * For Text-to-Pay: Use Stripe for payment capture, then handle ledger posting via (a) staff workflow (“payment posting pack”) or (b) PMS-native posting routes. 

### **B) Clearinghouse / Claim Submission**

#### **Vyne Dental | Claim Submission / Clearinghouse**

* **Functionality within Phase 1**  
  * Primary clearinghouse for Phase 1 RCM workflows; Phase 1 requires a headless API clearinghouse for RCM automation.  
* **How we connect**  
  * Vyne API (per Vyne’s API docs).  
* **What’s possible (Phase 1\)**  
  * “Full API functionality” to support claim submission and related RCM lifecycle steps  
* **Clear limitations (from provided notes only)**  
  * **Commercial:** \~$40k-$80k/year. The cost is the responsibility of Oscar Dental.  
* **Financial Cost & Responsibility:**    
  * Vyne API costs between $2.5k-$5k/Month on an annual contract basis. This will be Oscar Dental’s cost exclusively.   
* **Solution / Mitigation (Phase 1\)**  
  * Make OSCAR the claim lifecycle system-of-record (status timeline, follow-ups, denials, appeals).  
  * Add **HITL approvals** for high-stakes claim actions (appeals, write-offs, large adjustments).  
  * If PMS mirroring is required, generate daily Claim Update Packs for staff (mirroring is tracked \+ audited).

### **C) Payments \+ Communications (Text-to-Pay)**

#### **Stripe | Payment Provider (Phase 1 \+ Text-to-Pay)**

* **Functionality within Phase 1**  
  * Processes payments for Text-to-Pay flows (payment link → pay → confirmation → post to OSCAR \+ PMS when possible).  
* **How we connect**  
  * Stripe API (plus webhook/event handling in OSCAR).  
* **What’s possible (Phase 1\)**  
  * Full payment processing \+ event-driven workflows (e.g., on success, trigger confirmations and downstream posting).  
* **Clear limitations (from provided notes only)**  
  * **No built-in compliance layer:** CAIS must build HIPAA/SOC2 controls around implementation.  
  * **Stripe \= transaction rail only:** OSCAR must build the ledger layer (partial payments, refunds, adjustments, etc.).  
  * **SMS not included:** requires Twilio (or similar) \+ secure link orchestration (reminders, retries, link security).  
  * **Auto-post dependency:** if the PMS integration is READ-only (Dentrix/Eaglesoft via Koalla), OSCAR cannot automate payment posting back into the PMS → manual posting required.  
* **Financial Cost & Responsibility:**    
  * None upfront, only a transaction fee per transaction.   
* **Solution / Mitigation (Phase 1\)**  
  * **Commit to “Level 2” Text-to-Pay for read-only PMS:** Stripe processes payment; OSCAR notifies \+ queues posting; staff posts in PMS; OSCAR reconciles via readback.  
  * Build an **OSCAR Ledger Layer** (the “why”): allocation rules, partial payments, refunds, adjustments, and balance explanations.  
  * Implement **Reconciliation Dashboard**:  
    * Paid in Stripe but not posted in PMS (needs staff)  
    * Posted in PMS but no Stripe match (exception)  
    * Split/partial/refund exceptions (HITL review)  
  * Security/compliance controls in OSCAR around Stripe usage (access controls, audit logs, secure link handling).

#### **D) Twilio | SMS Provider**

* **What it does for Phase 1**  
  * Delivers SMS for **Text-to-Pay** and other Phase 1 outreach workflows.  
* **How we connect**  
  * **Twilio Messaging API**.  
* **What’s possible (Phase 1\)**  
  * SMS delivery with delivery/open/click tracking patterns (as designed in workflows).  
* **Clear limitations (from provided notes only)**  
  * No critical functional limitations noted; cost can add up at scale.  
* **Solution / Mitigation (Phase 1\)**  
  * Build **SMS orchestration** as a first-class service:  
    * consent \+ opt-out enforcement, quiet hours, retries, templates, escalation rules  
    * secure payment link generation \+ expiry \+ throttling  
  * Cost control via batching rules, smart retry logic, and message minimization.

### **E) Reputation (Phase 1 completeness)**

#### **Google Business Profile API | Reputation Engine Platform Integration**

* **What it does for Phase 1**  
  * Required for the Reputation Engine to fetch reviews and post responses.  
* **How we connect**  
  * **Google Business Profile API** (shown as the external platform in the Reputation Engine architecture).  
* **What’s possible (Phase 1\)**  
  * Review monitoring \+ response posting via API (per REP.03).  
* **Clear limitations**  
  * **Not specified** in your provided limitation notes.  
* **Solution / Mitigation (Phase 1\)**  
  * **Human-in-the-loop response approvals** for negative/critical reviews (AI drafts → staff approves → post).  
  * Auto-post only for safe, pre-approved templates (e.g., “Thanks for your feedback…”) with guardrails.

# 

# **2\. RCM Core Requirements (Key Feature \#1)**

**📋 Requirement Note:** *RCM Core automates the entire revenue cycle from eligibility through payment posting. Hybrid architecture: 85% deterministic workflows \+ 15% agentic AI for denials and A/R prioritization.*

## **2.1 Eligibility Verification (ELIG)**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **ELIG.01** | Batch eligibility by 6 AM for next-day appointments | All next-day appointments verified by 6 AM |
| **ELIG.02** | ~~Real-time eligibility \<30 seconds at scheduling~~ When a user verifies eligibility during scheduling, OSCAR should return an eligibility result quickly for supported payers, and clearly show “Pending” if the payer doesn’t respond in time | ~~Response time measured \<30 sec~~For supported payers during normal operations, the median response time from “Verify Eligibility” click → result displayed is ≤ 30 seconds; if no response by 90 seconds, OSCAR shows Pending, uses any valid cached result if available, and logs the event |
| **ELIG.03** | 24-hour result caching | Cache hit logged on re-verification |
| **ELIG.04** | Benefits breakdown (deductible, max, copay) for all available data provided by the carriers as some carriers return incomplete / ambiguous  fields for non-standard formats | All benefit fields populated if provided by the carriers in clear format and required fields mapped from Oscar Dental |
| **ELIG.05** | Patient cost calculator  | Out-of-pocket estimate accurate  |
| **ELIG.06** | Exception report for failures | Failed verifications on report |
| **ELIG.07** | COB validation prompt for secondary insurance | Prompt appears when secondary added |

## **2.2 Pre-Determination (PREDET)**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **PREDET.01** | Auto-prompt when procedures added to appointment  | Prompt appears after procedures added  |
| **PREDET.02** | Insurance-specific response time displayed | Carrier timeline shown |
| **PREDET.03** | Patient SMS when pre-det submitted | SMS sent on submission |
| **PREDET.04** | Patient SMS when response received with costs | SMS with cost breakdown sent |
| **PREDET.05** | Treatment plan locks after response | Changes require override |
| **PREDET.06** | Smart Pre-Estimate (AI) for non-real-time carriers for selected procedures using available plan data and/or historical outcomes, and requires staff approval before it can be sent to the patient. | ~~AI estimate displayed~~ For the configured set of payers/procedure codes, OSCAR displays a coverage band (e.g., “Likely patient portion: $X–$Y”) when sufficient data exists, and logs who approved/edited/sent the estimate. If data is insufficient, OSCAR shows “Unable to estimate” and creates a manual verification / pre-auth task  |

## **2.3 Claims Scrubbing (SCRUB)**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **SCRUB.01** | Auto-claim generation from checkout | Claim created automatically |
| **SCRUB.02** | Payer-specific rules engine | ~~Rules applied by payer~~ Phase 1 supports payer-specific rules for a defined list of payers (e.g., top 20 defined by Oscar) |
| **SCRUB.03** | Missing/invalid data flagged | Errors shown before submit |
| **SCRUB.04** | Procedure code combination validation | Invalid combos blocked |
| **SCRUB.05** | Attachment requirements enforced | D4341 blocked without narrative |
| **SCRUB.06** | Correct fee schedule by payer | Fees match contract |
| **SCRUB.07** | Clinical notes ↔ account ↔ claim cross-validation | Mismatch flagged (procedure, tooth\#, surfaces) |

## **2.4 Denial Management (DENIAL)**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **DENIAL.01** | Auto-categorization by reason code | Category assigned automatically |
| **DENIAL.02** | AI appealable vs. write-off; write-offs flagged for team review (no auto-write-off) | Write-off queued for approval |
| **DENIAL.03** | AI appeal letter generation | Letter generated \<60 sec |
| **DENIAL.04** | Appeal submission and tracking | Status updates tracked |
| **DENIAL.05** | Response SLA \<24 hours | Action logged within 24 hr, system escalates within 24 business hours and requires acknowledgement from HIL  |
| **DENIAL.06** | Corrective action suggestions | Fix steps for fixable denials |

## 

## **2.5 A/R Management (AR)**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **AR.01** | Aging report with 30/60/90/120 day buckets | Accurate aging by bucket |
| **AR.02** | AI-prioritized worklist by collection probability, , Oscar Dental to provide methodology / ranking system for AI scores | Worklist ranked by AI score |
| **AR.03** | One-click follow-up actions | Action creates task/call/note |
| **AR.04** | Automated reminder sequences | Reminders sent on schedule |
| **AR.05** | Payer behavior pattern alerts | Slow payers flagged |

# **3\. Smart Scheduling Requirements (Key Feature \#2)**

**📋 Requirement Note:** *Smart Scheduling maximizes practice revenue by ensuring chair time is filled with the RIGHT appointments. 80% deterministic \+ 20% agentic AI for patient prioritization.*

## **3.1 Quick Fill & Gap Management (QUICKFILL)**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **QUICKFILL.01** | Quick Fill queue with prioritization \- Oscar Dental to provide ranking methodology / calculations | Patients ranked by score,  |
| **QUICKFILL.02** | Gap-fill toolbox (overdue hygiene, unscheduled tx, ASAP) | Each source accessible,  |
| **QUICKFILL.03** | ~~AI 'Suggest Patient' with production awareness~~ For any open slot, OSCAR generates a ranked list of up to 3 suggested patients from defined sources (Sooner-If-Possible, Recall, Quick Fill queue, Treatment Plan Pending) using a scoring model that includes production fit, availability fit, and no-show risk, and shows the rationale \+ lets staff override | ~~AI suggests goal-matching patient~~ In UAT, selecting an open slot produces a ranked recommendation list with reasons, and two test scenarios (day under goal vs day at/over goal) result in different top suggestions. The system logs the suggested candidates, score inputs used (e.g., procedure codes/duration/preferences), and which suggestion was accepted/overridden |
| **QUICKFILL.04** | Production goal tracking dashboard | Current vs. target displayed |
| **QUICKFILL.05** | Cancellation triggers auto gap-fill outreach | Outreach initiated on cancel |
| **QUICKFILL.06** | Perfect Day template enforcement | Schedule respects balance |

## 

## **3.2 Recall Management (RECALL)**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **RECALL.01** | Auto-generated recall due list (supports 3/4/6 mo intervals) | 3-mo patient at 3 mo; 6-mo at 6 mo |
| **RECALL.02** | Automated recall outreach sequence | Sequence starts when due |
| **RECALL.03** | Pre-appointment scheduling at checkout | Checkout prompts next appt |
| **RECALL.04** | Overdue recall report | Aging by 1/2/3+ months |
| **RECALL.05** | Recall interval configurable per patient (3/4/6 mo by perio status) | Different intervals per patient work |

# **4\. Text-to-Pay & Collections (Key Feature \#3)**

**📋 Requirement Note:** *Text-to-Pay removes friction from patient payments. Collections sequence escalates systematically. 90% deterministic \+ 10% AI for payment plan recommendations.*

## **4.1 Collections Sequence (COLLECT)**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **COLLECT.01** | Automated reminder sequence (Day 0,7,14,30,60,90) | Reminders sent at intervals |
| **COLLECT.02** | Statement generation \<48 hr after insurance payment within \<48 hours of ERA ingestion, otherwise flagged  | Statement generated on time |
| **COLLECT.03** | Payment plan creation with auto-charge | ~~Auto-charges execute~~ OSCAR can create a payment plan (amount, cadence, start date, end conditions) and, for patients who opt in, executes scheduled charges via Stripe; ≥95% of scheduled charges run within 24 hours of due time, with failed charges creating a task \+ retry schedule. |
| **COLLECT.04** | Card-on-file auto-charge (with consent) | ~~Balance charged with consent~~ If consent is on file, OSCAR can trigger an auto-charge up to configured limits; every auto-charge requires a stored consent record, sends a receipt notification, and logs charge outcome; any exception (failed/partial/refund) is added to a review queue |
| **COLLECT.05** | Configurable escalation thresholds | Thresholds honored |
| **COLLECT.06** | Collections worklist with contact history | History visible on worklist |
| **COLLECT.07** | Overdue balance alert for upcoming appointments (no-show risk flag) | Patient with balance \+ appt flagged at check-in |

# **5\. Reputation Engine (Key Feature \#4)**

**📋 Requirement Note:** *Reputation Engine turns reactive review management into proactive reputation building. Google Business is Phase 1 priority. AI search optimization prepares for ChatGPT/AI assistant discovery.*

## **5.1 Reputation Management (REP)**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **REP.01** | Review request after checkout/payment | Request sent after checkout |
| **REP.02** | AI satisfaction prediction filters requests, Oscar Dental to provide risk-score methodology | Low-satisfaction skipped |
| **REP.03** | Google Business Profile API integration | Reviews fetched/responses posted |
| **REP.04** | Review monitoring \<15 min alert | Alert received \<15 min |
| **REP.05** | Priority alert for 1-2 star reviews | Immediate alert for low stars |
| **REP.06** | Sentiment analysis categorization | Sentiment auto-tagged |
| **REP.07** | AI response drafts (HIPAA-compliant), Oscar Dental to provide non-PHI templates for responses | Draft \<30 sec, no PHI |
| **REP.08** | Negative review creates follow-up task | Task created, patient linked |
| **REP.09** | FTC compliance (no incentives) | Templates reviewed |
| **REP.10** | Request filtering (exclude complaints) | Complaint patients skipped |
| **REP.11** | Reputation dashboard | Metrics displayed accurately |
| **REP.12** | Configurable request delay (1-24 hr) | Delay setting honored |
| **REP.13** | AI search optimization: structured data markup for AI discovery (ChatGPT, Bing AI) | Schema.org markup; practice in AI search |

# **6\. Communication Compliance (TCPA)**

**📋 Requirement Note:** *All SMS communications must be TCPA-compliant. Granular opt-out allows patients to control message types: Forms/Consents, Appt Reminders, Scheduling Reminders, or STOP ALL.*

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **TCPA.01** | STOP keyword honored immediately \- stops ALL messages | No further SMS of any type after STOP |
| **TCPA.02** | Consent tracked with timestamp/source | Consent record auditable |
| **TCPA.03** | Communication preferences per patient | Preferences honored |
| **TCPA.04** | Opt-out list checked before send | Opted-out not contacted |
| **TCPA.05** | Templates include opt-out instructions | STOP text included |
| **TCPA.06** | Granular opt-out by message type: Forms/Consents, Appt Reminders, Scheduling Reminders, or STOP ALL | Opt out of reminders only; still receive forms |
| **TCPA.07** | Patient self-service SMS preference management (link in messages) | Link opens preference page; changes saved |

# **7\. SLA Performance Targets**

**📋 Requirement Note:** *These operational KPIs must be measurable and reportable. Targets are derived from feature specification documents.*

| Metric | Target | Source | Measurement |
| ----- | ----- | ----- | ----- |
| Clean Claim Rate | **≥98%** | RCM Core | Accepted / Submitted |
| Days to Submit Claim | **\<24 hours** | RCM Core | Service → Submission |
| Days in A/R | **\<30 days** | RCM Core | Average outstanding |
| Denial Rate | **\<5%** | RCM Core | Denied / Total |
| Appeal Success Rate | **≥70%** | RCM Core | Won / Submitted |
| Eligibility Verification | **≥95%** | RCM Core | Verified / Appts |
| Pre-Det Rate (where req) | **≥90%** | RCM Core | Submitted / Required |
| Review Conversion | **≥15%** | Reputation Engine | Reviews / Requests |
| Google Star Rating | **≥4.5 stars** | Reputation Engine | Current rating |
| Review Response Time | **\<24 hours** | Reputation Engine | Review → Response |
| Payment Collection | **≥85%** | Text-to-Pay | Collected / Billed |
| Schedule Fill Rate | **≥90%** | Smart Scheduling | Filled / Available |

| Metric | Target | Success Criteria | Measurement |
| ----- | :---: | :---: | :---: |
| Clean Claim Rate | ≥98% | Scrubber blocks submission on configured “blocking errors”; payer rules configured for top payers covering ≥80% of claim volume | % claims passing scrubs; rule coverage; blocked vs overridden counts |
| Days to Submit Claim | \<24 hours | Claim draft created within 15 min of checkout event; “Ready-to-submit” queue with SLA timer \+ escalation at 24h | Event timestamps: checkout → draft; draft → ready; exception queue reasons |
| Days in A/R | \<30 days | A/R dashboard refresh daily; worklist generation \+ escalation rules run on schedule; outreach sequences execute as configured | Aging buckets accuracy check; sequence send logs; worklist completeness |
| Denial Rate | \<5% | Denials ingested and categorized within 15 min of import; corrective playbooks shown for configured categories | Import timestamp → queue timestamp; % auto-categorized; playbook coverage |
| Appeal Success Rate | ≥70% | Appeal packet generated on demand; 95% letter draft \<60s; approval required \+ logged; status tracking via tasks/workflow | Draft latency; approval/audit logs; task status timeline |
| Eligibility Verification | ≥95% | Batch run completes by 6:00 AM for next-day appts with exception list by 6:05 AM; real-time median tracked with fallback | Batch completion logs; exception queue; latency dashboards |
| Pre-Det Rate (where required) | ≥90% | Prompt/flag triggered when pre-det rules apply; submission \+ response ingestion logged; exceptions queued with reasons | % flagged when rules match; submission events; exception counts |
| Review Conversion | ≥15% | ≥95% of eligible visits get request queued; configurable delay honored; delivery failures surfaced within 15 min | Eligibility count vs queued count; delay settings audit; send/delivery logs |
| Google Star Rating | ≥4.5 stars | Reviews fetched and displayed on schedule; response workflow available; negative review tasking \+ escalation works | Review ingest success; alert latency; response workflow audit |
| Review Response Time | \<24 hours | New review alerts with 95% \<15 min; 1–2 star alerts escalate \<2 min after detection; 95% draft generation \<30s (HITL gating for negatives) | Detection → alert timestamps; draft latency; task SLA tracking |
| Payment Collection | ≥85% | Reminder sequences execute on schedule; payment events captured; reconciliation dashboard shows posted/unposted/mismatches; exceptions queued | Sequence logs; Stripe events; reconciliation match rates \+ exception aging |
| Schedule Fill Rate | ≥90% | Cancellation detection triggers outreach within 5 min of detection; Quick Fill list refreshes and ranks; booking packet \+ HITL task tracked to completion | Cancel → outreach timestamps; queue refresh logs; task completion \+ readback |

# 

# **8\. Infrastructure Requirements**

* Onboarding (ONBOARD.01-09): Practice setup, PMS connection, defaults, health check  
* Health API (HEALTH.01-10): System health, per-customer health, transaction timing, AI token utilization, alerting  
* Operations (OPS.01-04): Backup, DR, admin dashboard, support tooling  
* RCM Validation (RCM.V01-05, DET.01-05): Headless verification, carrier determination  
* Reconciliation (RECON.01-06): ERA matching, patient payment matching, dashboard  
* Agentic AI (AI.01-07, UI.AI.01-06): Grounding, constraints, audit, interface  
* Security (AUTH.01-07, PWD.01-05, AUDIT.01-07): Authentication, passwords, audit logs  
* Compliance (HIPAA.01-07, PCI.01-06): PHI protection, payment security  
* Database (DB.01-06): Schema, ID mapping, multi-tenant isolation  
* Application (APP.01-05): Web, iOS, Android, tablet, performance  
* Integration (INT.01-09): PMS, NexHealth, clearinghouse, Stripe, Twilio, SendGrid  
* Monitoring (MON.01-06): Prometheus, Grafana, metrics, alerting

# Phase 2

# **PHASE 2: Automated Office Manager (Q2)**

## **Key Features**

| \# | Feature | Description |
| :---: | ----- | ----- |
| **1** | **AI Daily Huddle & KPI Board** | Daily huddle pack delivered by 6:00 AM with production vs goal, scheduled vs capacity, same-day gaps, plus rolling 7/30-day metrics (production/collections/adjustments), case acceptance by provider and office, a mid-month forecast view (Day 15+), and optional AI “Oscar’s Take” commentary that never blocks delivery. |
| **2** | **Staff Task Automation** | Event-driven task creation (e.g., denied claim, unscheduled treatment, negative review) with role-based routing (Front Desk/Billing/Clinical), SLA timers with at-risk/overdue states and manager alerts, AI call-list prioritization using Oscar Dental scoring, morning recurring checklists, deep links into source records, and manager oversight KPIs (Task Completion Rate) visible on the Huddle Board. |
| **3** | **HR & Compliance Tracker** | Centralized staff compliance hub including license tracking, automated expiration alerts, CE tracking, OSHA/HIPAA renewal tracking with artifacts \+ audit logs, time-off requests with approval routing \+ schedule impact, on-demand compliance reporting, and compliance gap alerts surfaced into the daily huddle. |
| **4** | **Automated Inventory Tracking** | Procedure-complete driven inventory decrementing with FIFO lot selection, prevention of negative quantities (creates alert/task), reorder thresholds that generate alerts \+ tasks (and can surface in huddle), and lot-level expiration tracking with scheduled reporting and alerts. |
| **5** | **DSO Network Operations Support** | Network dashboard aggregating all Oscar-enabled practices with a network snapshot card (MTD production vs goal), ranked office tiles (production/collections/case acceptance), \>10% variance alerts with drill-down drivers, and shared playbooks showing which OSCAR actions correlate with improvement per office (explicitly labeled as correlational). |

###  **Phase 2 MVP Definition** 

1. ## Daily Huddle Delivery (Workflow-first): By 6:00 AM local time on ≥95% of business days, OSCAR delivers a huddle pack per location with production vs goal, scheduled vs capacity, and same-day gaps; missing inputs show “Data unavailable” with timestamps. 

2. ## Rolling Metrics \+ Trends: OSCAR displays rolling 7/30-day totals for production, collections, adjustments with trend visualization, refreshed at least daily and matching stored snapshot totals. *(HUDDLE.02)*

3. ## Case Acceptance Views: OSCAR shows case acceptance by provider and office for a selectable range (default 30 days) with drill-down to underlying cases. *(HUDDLE.03)*

4. ## Mid-Month Forecast View (Day 15+): On/after the 15th, OSCAR displays a forecast page with projected month-end totals, variance vs goal, and a timestamp plus confidence band/assumptions note. *(HUDDLE.04)*

5. ## Agentic Commentary (Non-blocking): “Oscar’s Take” lists 3–7 prioritized issues with links to supporting data; if AI fails/disabled, huddle still ships with “AI unavailable—metrics only.” *(HUDDLE.05)*

6. ## Task Auto-Creation from Events: For supported triggers, OSCAR creates a task within 60 seconds with correct type, linked source record, SLA/due date, dedupe behavior, and audit log of event→task mapping. *(TASK.01)*

7. ## Role-Based Queues \+ Routing: Tasks route automatically to Front Desk (Scheduling), Billing (RCM), or Clinical (Sterilization/Lab); UAT target ≥95% correct routing, exceptions logged to “Unassigned.” *(TASK.02)*

8. ## Task SLA Engine \+ Manager Alerts: Every task has a due-by timer with “At Risk/Overdue” visual states; overdue tasks trigger a manager alert (Office Manager). *(TASK.03)*

9. ## Call List Smart Prioritization (AI, Oscar-provided scoring): Using Oscar Dental’s provided scoring/weights, OSCAR computes Patient Value and No-Show Risk scores, reorders the call list within 60 seconds, logs inputs/version, and supports manual override with audit history. *(TASK.04)*

10. ## Morning Checklist Automation: Recurring daily checklist tasks appear automatically at 7:00 AM and reset each day. *(TASK.05)*

11. ## Deep Link Navigation: Clicking a task (e.g., denied claim) opens the exact underlying detail page with no searching. *(TASK.06)*

12. ## Manager Oversight KPI: Huddle Board shows Task Completion Rate (Completed ÷ Created; default last 7 days) with drill-down and filters by role/queue; values match timestamps and refresh daily. *(TASK.07)*

13. ## HR Compliance Core: Licenses/credentials tracked with Active/Expiring/Expired \+ days-to-expiration; expiration alerts generated at 90/60/30/14/0 days (configurable). *(HR.01–HR.02)*

14. ## HR Training & Reporting: CE requirements/completions tracked per cycle; OSHA/HIPAA compliance tracked with renewal dates \+ artifacts and audit logs; on-demand compliance reporting by staff/location/date range. *(HR.03–HR.04, HR.07)*

15. ## Time-Off Requests \+ Impact: Time-off requests support single-click approve/deny with audit trail and display schedule impact (appointments impacted \+ estimated production at risk). *(HR.05–HR.06)*

16. ## Compliance → Huddle Integration: Compliance gaps surface into the Daily Huddle with links to underlying records. *(HR.08)*

17. ## Inventory Decrementing (FIFO \+ no negatives): Procedure-complete decrements mapped supplies using FIFO lots; negative quantities are blocked and generate an alert/task with transaction logging. *(INV.01)*

18. ## Reorder & Expiration Alerts: Crossing reorder thresholds generates an alert \+ task \+ huddle-eligible entry; lot expirations are tracked with scheduled reporting and alerts. *(INV.02–INV.03)*

19. ## DSO Network View \+ Variance Alerts: Network snapshot aggregates MTD production vs goal, ranked office tiles, \>10% below baseline variance alerts with drill-down drivers, and playbooks labeled as correlational. *(DSO.01–DSO.05)*

# **Integration Mapping**

### **A)** **PMS Sync & Event Layer**

NexHealth | PMS Synchronization & Event Layer (Inventory Management)

What it does for Phase 2  
Provides the PMS synchronization and event foundation Phase 2 needs to:

* Pull procedure/appointment/provider signals that drive inventory usage and staff task automation triggers.  
* Write back where needed to support Phase 2 workflows that depend on creating/updating underlying PMS-linked records (when applicable).

How we connect  
NexHealth API (PMS Synchronizer \+ event/webhook layer) to read and write PMS-linked data and ingest change events into OSCAR.

What’s possible (Phase 2\)

* Use PMS events and clinical/operational context to infer inventory consumption patterns (e.g., procedures performed → expected item usage).  
* Generate inventory tasks (restock alerts, reorder recommendations) and operational tasks (follow-ups, prep tasks, exception handling) based on PMS schedule/procedure changes.  
* If PMS supports appropriate write actions, OSCAR can support tighter closed-loop workflows (e.g., confirm tasks, attach notes/statuses where relevant to the PMS-linked record types).

Clear limitations (from provided notes only)

* NexHealth’s usefulness here depends on PMS READ/WRITE capabilities.  
* If the PMS is not both READ \+ WRITE, NexHealth will not work “how we want it to” for Phase 2 inventory management.

Solution / Mitigation (Phase 2\)

* Two-tier capability model by PMS integration mode:  
  1. READ/WRITE PMS (preferred): “Closed-loop Inventory”  
     * OSCAR can rely on NexHealth for both ingestion and action completion flows where writing is required.  
     * Inventory workflows can be more automated (fewer manual checkpoints).  
  2. READ-only PMS: “Inventory Overlay \+ HITL”  
     * OSCAR still runs inventory and task intelligence using read signals, but execution becomes task-driven: staff confirms usage/reorders inside OSCAR.  
     * Introduce Inventory Reconciliation Queue: OSCAR proposes usage/reorder; staff approves and records completion; OSCAR maintains audit trail.  
* Design guardrail: build Phase 2 inventory as an OSCAR-native ledger (items, par levels, locations, vendors, usage events) so workflow integrity does not collapse if PMS writes are limited.  
* Verification loop: even in READ/WRITE mode, keep a “readback verification” pattern (OSCAR verifies state changes via NexHealth events) to prevent silent failures.

## **Key Feature 1: AI Daily Huddle & KPI Board** 

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **HUDDLE.01** | Auto-Generated Morning Huddle Pack: OSCAR generates a daily huddle pack showing production vs goal, scheduled vs capacity, and same-day gaps. | By 6:00 AM local time on ≥95% of business days, the huddle pack is available and displays all three sections for each location; if any input feed is missing, OSCAR shows the section as “Data unavailable” with a last-updated timestamp (and still delivers the pack). |
| **HUDDLE.02** | Rolling 7/30-Day Metrics: OSCAR calculates and displays rolling 7-day and 30-day metrics for production, collections, and adjustments with trend visualization. | For each metric, the UI shows 7-day and 30-day totals plus a trend chart, and values match the underlying daily snapshot data (±0 tolerance on totals); metrics refresh at least daily. |
| **HUDDLE.03** | Case Acceptance Tracking: OSCAR tracks case acceptance metrics by provider and by office. | For a selectable date range (default last 30 days), the dashboard shows case acceptance by provider and by office, including numerator/denominator definitions (e.g., accepted ÷ presented); drill-down lists the underlying cases contributing to each metric. |
| **HUDDLE.04** | Month-End Forecast (mid-month view): OSCAR provides a forecast view on the 15th of the month to project month-end performance (production/collections) so the team can intervene early. | On or after the 15th, the forecast page displays projected month-end totals and variance vs goal using the available month-to-date data; the forecast output includes a “last refreshed” timestamp and a visible confidence band or “assumptions used” note. |
| **HUDDLE.05** | Agentic Commentary: AI highlights the top issues for the day and recommended focus areas, without blocking delivery of the huddle pack. | The huddle includes an “Oscar’s Take” section listing 3–7 prioritized issues with links to supporting data (e.g., gaps list, KPI cards, task queues); if AI fails or is disabled, the huddle still ships and the commentary section shows “AI unavailable—metrics only.” |

## **Key Feature 2: Staff Task Automation**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **TASK.01** | Auto-Creation Trigger: Workflow Engine creates tasks based on events (e.g., Claim Denied, Unscheduled Treatment, Negative Review). | For each supported trigger event (e.g., Claim Denied, Unscheduled Treatment, Negative Review), OSCAR automatically creates a task within 60 seconds with the correct task type, queue/owner role, linked source record, due date/SLA, and an audit log entry showing the event → task mapping; duplicate events do not create duplicate tasks. |
| **TASK.02** | Role-Based Routing: Tasks route to queues: Front Desk (Scheduling), Billing (RCM), Clinical (Sterilization/Lab). | When a task is created, OSCAR automatically assigns it to the correct role queue based on task type—Front Desk (Scheduling), Billing (RCM), or Clinical (Sterilization/Lab)—and this routing is visible on the task record (queue, owner role, SLA/due date); in UAT, ≥95% of test tasks across the defined task types route to the expected queue, and any exceptions are logged with a reason (e.g., missing data) and placed in a default “Unassigned” queue for manager review. |
| **TASK.03** | SLA Tracking: Every task type has a "Due By" timer. Visual flags for "At Risk" and "Overdue." | Overdue tasks turn red and alert the Office Manager. |
| **TASK.04** | Smart Prioritization (AI): Agentic AI re-orders the "Call List" based on Patient Value ($) and No-Show Risk. This criteria and scoring will be provided by Oscar Dental.  | Using Oscar Dental’s provided scoring rules/weights, OSCAR computes a Patient Value score and No-Show Risk score for each eligible patient, applies the defined ranking formula to re-order the Call List, and displays both scores (and key drivers, if specified) in the UI; the system logs the score inputs, rule/version used, and produces the ranked list within 60 seconds, with staff able to manually override/reorder without losing audit history. |
| **TASK.05** | Morning Checklist: Recurring "Daily Tasks" (e.g., "Turn on Compressor," "Print Route Slips") appear automatically at 7 AM. | Checklist resets daily. |
| **TASK.06** | Context Deep Link: Clicking a "Denied Claim" task opens the specific Claim Detail page in Oscar. | No searching required; direct navigation. |
| **TASK.07** | Manager Oversight: "Task Completion Rate" KPI visible on the Huddle Board. | The Huddle Board displays a Task Completion Rate KPI (Completed ÷ Created for the selected time window, default last 7 days) with a drill-down list of open vs completed tasks, filterable by role/queue, and the KPI value matches the underlying task timestamps in system logs (created\_at, completed\_at) with data refreshed at least daily. |

## **Key Feature 3: HR & Compliance Tracker**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **HR.01** | License Tracking: Centralize all staff license/credential records with expiration dates and status. | Each staff member has a credential profile showing Active / Expiring / Expired status and days-to-expiration for every tracked license. |
| **HR.02** | Expiration Alerts: Run a daily scan and generate alerts before credentials expire. | Alerts are automatically created at 90/60/30/14/0 days (configurable) and are visible in an alerts list with timestamp \+ recipient/role routing. |
| **HR.03** | CE Credit Management: Track CE requirements and completions by license type and renewal cycle. | For each staff member and cycle, OSCAR shows Required hours / Earned hours / Remaining hours, and each CE entry includes course name, hours, completion date, and optional certificate upload. |
| **HR.04** | OSHA & HIPAA Compliance Tracking: Track practice-specific OSHA/HIPAA requirements with renewal dates.  | OSHA/HIPAA items show Compliant / Due Soon / Overdue and store linked documents; changes are audit-logged (who/what/when). |
| **HR.05** | Time-Off Requests: Enable time-off submission with single-click approve/deny and routing to an approver. | Submitting a request creates an approver task; approver can Approve or Deny in one click, and the decision is recorded with timestamp \+ actor. |
| **HR.06** | Schedule Impact Visibility: Show the operational impact of a time-off request before approval. | The request view shows (at minimum) \# appointments impacted and estimated production at risk for the requested dates (or “No impact detected”). |
| **HR.07** | Compliance Reporting: Provide on-demand compliance reports by staff/location/date range. | Users can generate a report that lists credentials \+ expirations, CE status, OSHA/HIPAA status, and linked artifacts; report generation is logged (requester \+ time \+ filters). |
| **HR.08** | Operations Huddle Integration: Surface compliance gaps into the Daily Huddle with actionable links. | The Daily Huddle displays compliance gap alerts (e.g., expiring/expired items) with severity and a link to the underlying staff/credential record. |

## **Key Feature 4: Automated Inventory Tracking**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **INV.01** | When a procedure completes, OSCAR decrements mapped supplies using FIFO lot selection and blocks negative quantities (creating an adjustment-needed alert). | For a procedure-complete event, inventory transactions are recorded (lot chosen, qty decremented) and invalid decrements are blocked with a system-generated alert/task. |
| **INV.02** | Inventory thresholds (reorder point / safety stock) trigger alerts, push notifications, and create reorder tasks routed into Staff Task Automation; alerts can appear in the Daily Huddle. | When quantity crosses a threshold, the system generates (1) an alert, (2) a task, and (3) an entry eligible for the huddle feed. |
| **INV.03** | OSCAR tracks lot-level expirations and runs a daily job (by 6 AM) to generate “use-first” guidance and expiration alerts. | A weekly expiration report exists, and items nearing expiration generate alerts visible in inventory \+ optionally surfaced to huddle/tasking. |

## 

## **DSO Value: Network Operations Snapshot**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| DSO.01 | Network Snapshot Card: Provide a network-level snapshot showing Production vs Goal across all Oscar-enabled practices. | The Network Snapshot Card displays total MTD production, total MTD goal, and % of goal aggregated across included offices, and the totals equal the sum of the included office values for the same “as of” date/time. |
| DSO.02 | Office Comparison Tiles: Show ranked office tiles for Production, Collections, and Case Acceptance. | A network view shows office tiles with production, collections, case acceptance, and a rank per metric; users can sort by any metric and the displayed ranks match the selected sort order for the selected time window. |
| DSO.03 | Variance Alerts: Automatically flag offices that are \>10% down from baseline. | For each office, OSCAR computes a baseline (admin-configurable, e.g., trailing 30-day average) and generates a variance alert when current performance is \>10% below baseline; the alert appears on the network view with the metric impacted and the % delta. |
| DSO.04 | Variance Alert Detail: Variance alerts include a short reason and link to underlying drivers. | Each variance alert includes (a) office, (b) metric impacted, (c) baseline vs current values (or % delta), and (d) a drill-down link to supporting drivers available in OSCAR (e.g., schedule gaps, task backlog, at-risk appointments). |
| DSO.05 | Shared Playbooks: Show which Oscar-driven actions work best per office (as guidance, not guaranteed outcomes). | For each office, OSCAR displays a “Playbooks” section listing the top OSCAR actions executed (counts over the selected period) and a before/after metric context label (e.g., “Production \+X% vs prior period”); the UI labels results as correlational and allows users to filter by office and time window. |

# Phase 3

# **PHASE 3: Precision Clinical Assistant (Q3)**

## **Key Features**

| \# | Feature | Description |
| :---: | ----- | ----- |
| 1 | **Voice Perio & Restorative Charting (Scribe)** | Hands-free voice charting for 6-site perio and a surface-level odontogram, designed to reduce/replace “second person scribing”; converts voice input into structured chart data with human review/edit as needed. |
| 2 | **Treatment Mining** | Runs a scheduled (at least daily) discovery scan to identify diagnosed-but-unscheduled treatment and recall gaps, creates opportunity records with timestamps \+ source references, and presents a single Opportunities worklist with filters and lifecycle tracking. Opportunities are deterministically ranked (risk \+ value) using Canopy-provided scoring logic with explainers, and approved items feed scheduling/outreach via a Smart Scheduling Feed plus a booking packet (and conditional PMS appointment creation where supported, otherwise staff task for manual booking). Deduplication prevents duplicates and preserves status/notes across re-scans. |
| 3 | **Clinical Compliance & FMX Tracking** | Computes FMX due status and protocol compliance and generates chart flags/alerts/follow-up tasks (e.g., “FMX overdue,” “perio due soon”), including pre-visit compliance checks surfaced in workflow. |
| 4 | **Computer Vision Imaging Analysis (Roboflow Hosted Inference; Segmentation Overlays)** | Integrates with Roboflow hosted inference endpoints to run CV on Periapical, Bitewing, and Panoramic X-rays, storing raw responses plus normalized findings (confidence, timestamps, model project/name/version, and segmentation geometry when provided). Displays findings in the imaging viewer with overlay toggle \+ findings list and supports segmentation overlays for the in-scope finding set: Enamel, Pulp, Incipient Decay, Decay past the DEJ, PARL, Bone levels, Fillings. All CV findings flow through a Clinical Review Queue (HITL) before any patient-impacting output; conversion to chart flags/alerts/opportunities occurs only per Canopy dentist-approved mapping spec. Includes async inference jobs with status \+ retry, and exportable clinician feedback for Canopy-owned model iteration. |
| 5 | **AI Clinical Notes** | Auto-drafts SOAP notes from structured charting \+ voice input (and optionally references imaging/treatment context), requires human review before finalization, and maintains an auditable history of drafts/edits/approvals. |
| 6 | **DSO Network Clinical Snapshot** | Network-level dashboard with compliance coverage (FMX/perio protocols), opportunity roll-ups (uncompleted treatment value), risk flags, treatment acceptance trending, and drill-down views. |

###  **Phase 3 MVP Definition**

1. **Voice Charting MVP (Perio \+ Restorative)**: Clinicians can start a voice session (e.g., “Oscar, Scribe Perio”) and complete 6-site perio plus a full-surface digital odontogram with structured chart data captured in real time (with review/edit before final save as needed).  
2. **Clinical Compliance MVP (FMX \+ Perio)**: Overnight sync computes FMX due dates and runs protocol rules; when overdue/critical, OSCAR generates chart flags \+ alerts and creates a follow-up task.  
3. **Computer Vision Imaging Analysis MVP** (Roboflow; Segmentation Only):  
   1. In-scope studies: Periapical, Bitewing, Panoramic.  
   2. In-scope findings: Enamel, Pulp, Incipient Decay, Decay past the DEJ, PARL, Bone levels, Fillings (as returned by the model).  
   3. Core workflow: submit image/study → receive response → store raw payload \+ normalized findings (confidence, timestamps, model project/name/version, segmentation geometry when provided).  
   4. Viewer: findings list \+ overlay toggle; overlays render when segmentation geometry is provided; otherwise show “location unavailable” (no fabricated overlays).  
   5. HITL: clinicians approve/reject findings before any chart flags/alerts/opportunities can be created.  
   6. Actions: post-approval conversion occurs only per Canopy dentist-approved Mapping Spec; unmapped findings are labeled and do not block workflow.  
   7. Reliability: async inference with Pending/Completed/Failed \+ retry; failures logged.  
   8. Evaluation loop (Canopy-owned): OSCAR captures/export clinician feedback (approve/reject/tags/notes) with model version metadata.  
4. **Treatment Opportunity Mining MVP** (Worklist \+ Ranking \+ Feed \+ Booking Packet):  
   1. Scheduled scan (daily): identifies diagnosed-but-unscheduled treatment \+ recall gaps and creates opportunities with timestamps \+ evidence/source references.  
   2. Opportunities worklist: filters, lifecycle/status updates with notes; dedupe prevents duplicates and preserves notes/status across re-scans.  
   3. Ranking: deterministic scoring (risk \+ value) with “why” explainers; scoring logic provided by Canopy.  
   4. Smart Scheduling Feed: pulls prioritized opportunities with patient contact info \+ recommended next action.  
   5. Booking Packet: for an approved opportunity, OSCAR generates a booking packet; if PMS appointment write-back is supported, create the appointment and store the reference; otherwise create a staff task to book manually.  
5. **AI Clinical Notes MVP (Draft \+ Review \+ Audit)**: OSCAR drafts SOAP notes from structured charting \+ voice input, supports human review before finalization, and maintains an audit trail.  
6. **DSO Network Clinical Snapshot MVP**: Network roll-up view for FMX/perio compliance coverage and uncompleted treatment roll-ups by office, with drill-down (network → office → provider at minimum).  
7. **PMS Standalone:** Complete the 10 core PMS functionalities outlined in the PMS CORE document by end of Phase 3\.  
     
     
8. **Voice Charting MVP (Perio \+ Restorative):** Clinicians can start a voice session (e.g., “Oscar, Scribe Perio”) and complete 6-site perio plus a full-surface digital odontogram, with structured chart data captured in real time.  
2. **Clinical Compliance MVP (FMX \+ Perio):** Overnight sync computes FMX due dates and runs protocol rules; when overdue/critical, OSCAR generates chart flags \+ alerts and creates a follow-up task.  
3. **AI Imaging Analysis MVP:** OSCAR integrates with Roboflow hosted inference endpoints (within Roboflow’s ecosystem) to run CV analysis for defined Phase 3 workflows (e.g., FMX/compliance detection and image-based signals for Treatment Mining). MVP includes:  
* **Inference run \+ ingestion** (request/response or webhook) and persistence of finding metadata (confidence, model version, timestamps, tooth/reference mapping where available).  
* **Overlay annotations with a toggle** \+ findings list in the imaging viewer.  
* **Clinical Review Queue (HITL):** clinicians approve/reject CV findings before they create chart flags/opportunities.  
* **Evaluation loop owned by Oscar Dental:** Oscar supplies clinicians to label/validate outputs; OSCAR tracks model performance metrics by model version.  
* **Model Provider Abstraction:** UI/workflows stay stable whether inference comes from Roboflow now or a production CV stack later.  
* **Decision Gate:** if Roboflow-hosted inference meets acceptance thresholds operationally, ship with it; if not, plan a production-grade CV pipeline outside Roboflow without changing product workflow.  
4. **Treatment Opportunity Mining MVP (Worklist \+ Feed):** OSCAR identifies diagnosed-but-unscheduled treatment and recall gaps, then ranks opportunities by clinical risk and financial impact, with a smart scheduling feed output.  
5. **AI Clinical Notes MVP (Draft \+ Review \+ Audit):** OSCAR drafts SOAP notes from structured charting \+ voice input, can include imaging context \+ treatment plan context, and requires human-in-the-loop review before finalization.  
6. **DSO Network Clinical Snapshot MVP (Roll-up visibility):** Provide a network view showing FMX/perio compliance coverage and uncompleted treatment roll-ups by office, with drill-down (network → office → provider at minimum).  
7. **PMS Standalone**: Complete the 10 core functionalities of the PMS core as outlined in the SOW. 

# **x.x Integration Mapping**

### **A) Clinical AI / Computer Vision**

**Roboflow | Computer Vision Platform**

**What it does for Phase 3**  
Enables rapid prototyping and experimentation for Phase 3 computer-vision workflows (e.g., FMX/compliance detection, image-based clinical signals that feed Treatment Opportunity Mining).

**How we connect**  
Roboflow platform APIs / hosted inference endpoints (within Roboflow’s ecosystem) for model iteration and testing.

**What’s possible (Phase 3\)**

* Prototype CV models quickly (dataset iteration, evaluation, controlled rollouts).  
* Validate whether CV can meet Phase 3 accuracy targets for compliance checks and opportunity detection before committing to a production ML stack.

**Clear limitations (from provided notes only)**

* Roboflow does not provide support for downloaded model weights used outside of its ecosystem.  
* Use Roboflow for prototyping/experimentation only due to export limitations, unless it immediately meets accuracy requirements.

**Solution / Mitigation (Phase 3\)**

* **Two-track approach:**  
  1. **Prototype Track (Roboflow):** iterate datasets/models and measure accuracy against Phase 3 acceptance thresholds.  
  2. **Production Track (Decision Gate):** if accuracy and operational constraints are met inside Roboflow, ship with hosted inference; if not, plan a production-grade CV pipeline outside Roboflow (separate training/inference stack), while keeping the product workflow unchanged.  
* **Architecture guardrail:** build a Model Provider Abstraction in OSCAR so the UI/workflows don’t care whether inference comes from Roboflow now or a production model later.  
* **Human-in-the-loop (HITL):** all compliance flags/opportunities route to a Clinical Review Queue before they become patient-impacting actions.

### **B) Speech-to-Text / Transcription**

**Whisper | Transcription (Voice Perio)**

**What it does for Phase 3**  
Provides transcription for Oscar Scribe and Voice Perio-style charting workflows to reduce manual entry time and accelerate note creation.

**How we connect**  
Whisper (or similar) transcription service integrated into OSCAR’s capture flow; outputs are surfaced in-product for review/edit.

**What’s possible (Phase 3\)**

* Draft clinical notes and perio/clinical findings from voice.  
* Speed up documentation while preserving clinician control via review-before-finalize.

**Clear limitations (from provided notes only)**

* Transcription can have errors → requires manual entry fallback.  
* Must include easy review of transcription output before finalizing.

**Solution / Mitigation (Phase 3\)**

* **Review-first workflow:** transcription is always a draft; the user must review/confirm before it becomes a signed note or structured chart entry.  
* **Error-tolerant UX:** highlight low-confidence segments, provide one-tap “edit” and “replace” controls, and allow manual entry fallback at any step.  
* **Auditability:** store original transcript \+ edits \+ final output so Phase 3 clinical documentation remains traceable.

## **Key Feature 1: Voice Perio & Restorative Charting (Scribe)** In

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **SCRIBE.01** | Start/stop a voice charting session for Perio or Restorative from the patient chart. | In UAT, a user can start a Perio or Restorative session, see an “active session” indicator, and end/cancel the session without losing saved entries. |
| **SCRIBE.02** | Support voice capture and structured field mapping for periodontal charting, including 6-site Probing Depth (PD, mm), 6-site Gingival Margin (GM, mm), and 6-site Mucogingival Junction (MGJ, mm); Mobility and Furcation entries where clinically applicable; site-level flags for Bleeding, Suppuration, Plaque, and Calculus; and Attached Gingiva stored and/or calculated from available inputs (e.g., MGJ–GM). Also support voice capture for surface-level odontogram updates with structured field mapping. | In UAT, a user can, by voice, enter PD+GM+MGJ for ≥10 teeth (including ≥2 molars), record Mobility for ≥5 teeth, record Furcation for ≥2 molars where applicable, toggle ≥10 site-level flags across Bleeding/Suppuration/Plaque/Calculus, and OSCAR stores and displays all entries in the correct structured fields; additionally, the user can update ≥10 odontogram surfaces by voice and OSCAR maps each update to the correct tooth \+ surface(s).  |
| **SCRIBE.03** | Provide an in-workflow review \+ correction UI before committing chart data. | Every voice entry appears in a review panel with “edit / confirm / undo”; corrected values are what gets saved to the chart. |
| **SCRIBE.04** | Voice errors must not block care: provide a manual entry fallback at any point. | If transcription fails or is unclear, the user can enter/edit the same fields manually and still complete/save the chart. |
| **SCRIBE.05** | Record an audit trail for chart changes made via voice. | OSCAR logs who changed what, when, and whether the entry came from voice vs manual (audit visible to admins). |

## **Key Feature 2: Treatment Mining**

## **UPDATED**

| ID | Updated Requirement | Updated Success Criteria |
| ----- | ----- | ----- |
| **MINING.01** | Scheduled discovery scan: Run a scheduled scan to identify diagnosed-but-unscheduled treatment and recall gaps from available PMS/OSCAR data sources; scanning does not create or post treatment plans back into the PMS. | For the pilot location, the scan runs at least daily and creates opportunity records that include: (a) timestamp, (b) opportunity type, and (c) evidence/source reference (e.g., PMS diagnosis/procedure reference \+ date). If a required upstream feed is unavailable, OSCAR logs “Data unavailable” for that scan and records an exception entry (without failing the job). |
| **MINING.02** | Single Opportunities worklist \+ HITL gate: Provide a single “Opportunities” worklist with filters (office/provider/type/priority/status) and explicit lifecycle states including Draft/New → Needs Review → Approved (Ready to Schedule) → In Progress → Resolved (Scheduled/Completed/Dismissed). | Worklist displays opportunities, supports filtering, and supports status changes with notes. No opportunity may generate a scheduling packet, outreach action, or downstream “schedule” workflow until marked “Approved” by an authorized user (HITL). |
| **MINING.03** | Deterministic ranking with explainers (Canopy-defined): Rank opportunities using a baseline deterministic scoring model (risk \+ value) with explainers; Canopy provides scoring logic/weights and any value banding rules. | Each item shows a rank score and a short “Why high priority” explanation (e.g., overdue duration, value band, clinical urgency tag). The UI displays the score and explanation for each opportunity and logs the score version used. |
| **MINING.04** | Smart Scheduling Feed outputs “booking-ready” items (not treatment plan write-back): Output a Smart Scheduling Feed for approved opportunities, including patient contact info and recommended next action, and sufficient information to generate a booking packet. | Scheduling/outreach view can pull the top approved opportunities and display patient contact information, recommended next action, and evidence links. Items not Approved are either excluded from the feed or clearly labeled “Needs Review.” |
| **MINING.05** | Deduplication \+ lifecycle persistence across scans: Prevent duplicates and support lifecycle state persistence across re-scans, including recognition of “scheduled” outcomes via PMS appointment presence where available. | Re-running the scan does not create duplicate opportunities for the same underlying clinical item (same evidence reference). Status/notes persist across runs. If a corresponding PMS appointment is detected for the same opportunity (where matching signals exist), OSCAR updates the opportunity to Scheduled/Resolved and stores the appointment reference/link when available. |
| **MINING.06** | Booking Packet \+ conditional PMS appointment creation: From an Approved opportunity, OSCAR generates a Booking Packet (procedure codes, duration assumptions, preferred provider/op if available, notes, patient contact, and source evidence). OSCAR will not POST a treatment plan back to the PMS; instead, OSCAR either (a) creates the appointment in the PMS if appointment write-back is supported, or (b) creates a staff task containing the full booking packet for manual booking. | In UAT for the pilot location, selecting an Approved opportunity generates a Booking Packet that includes the required fields (codes, duration assumptions, contact, notes, evidence links) and is viewable/exportable from the opportunity. If PMS appointment write-back is supported in the pilot environment, OSCAR can create at least one appointment from an approved item and store the resulting PMS appointment reference; if write-back is not supported or fails, OSCAR creates a booking task that includes the full packet and logs the reason (e.g., “write-back unavailable” / “API error”). |

## **UPDATED**

| ID | Updated Requirement | Updated Success Criteria |
| ----- | ----- | ----- |
| **IMG.RF.01** | Model Provider Integration: OSCAR integrates with Roboflow via API and/or hosted inference endpoint(s) to submit an imaging study and receive predictions for the following in-scope study types only: Periapical X-ray, Bitewing X-ray, Panoramic X-ray. CAIS does not train, tune, or label models. | In UAT, OSCAR can (a) submit a Periapical/Bitewing/Panoramic image/study to a configured Roboflow endpoint, (b) receive a response, and (c) store the raw response plus a normalized “findings” record tied to the correct patient/study (including model identifier/version as returned). |
| **IMG.RF.02** | Configuration \+ Environment Separation: Admins can configure Roboflow endpoint URL, API key/secret, project/model identifier, and environment (dev/stage/prod) without code changes. | Admin UI (or config file \+ documented steps) supports updating endpoint \+ credentials; changes take effect without redeploying core application logic. |
| **IMG.RF.03** | Findings Normalization: OSCAR converts Roboflow output into a standard internal schema that supports: finding type/category, confidence score, model version, timestamps, and segmentation geometry (e.g., mask/polygon/polyline), if provided. In-scope CV task is semantic segmentation only; object detection (bounding boxes) is not a required/accepted output for this scope. OSCAR stores findings as provided and does not fabricate missing location/tooth/procedure mappings. | For any valid Roboflow response, OSCAR stores a normalized findings set with required fields (confidence, timestamps, model ID/version, pointer to original payload). For UAT images where the model returns segmentation geometry, the normalized finding includes the segmentation geometry reference/data sufficient to render an overlay. If segmentation geometry is not present in the response, OSCAR stores the finding but it is marked/location-tagged as “Location unavailable” for overlay rendering (no fabricated geometry). |
| **IMG.RF.04** | Imaging Viewer Presentation: OSCAR displays findings in the imaging viewer with (1) an overlay toggle (on/off) and (2) a findings list view for Periapical, Bitewing, and Panoramic studies. Viewer supports overlays (semantic segmentation) for the following in-scope finding set only (as provided by the model): Anatomical: Enamel, Pulp. Pathological: Incipient Decay, Decay past the DEJ, PARL. Periodontal: Bone levels. Existing Restorations: Fillings. | UAT (Pass/Fail): Using Oscar-provided test images and Roboflow responses that include at least one segmentation-based finding for each in-scope study type (Periapical, Bitewing, Panoramic), a user can: (a) open the image, (b) toggle overlays on/off, and (c) view a findings list that shows each finding’s type (from the in-scope list above), confidence, and any available location mapping. When a finding includes segmentation geometry, the overlay renders accordingly. If a finding type outside the in-scope list is returned, it is displayed as “Unmapped/Out of scope finding type” and does not block workflow. |
| **IMG.RF.05** | Clinical Review Queue (HITL Gate): All Roboflow-derived findings must be reviewed and approved by a clinician before creating patient-impacting outputs (chart flags, compliance alerts, or treatment opportunities). | No CV finding creates a chart flag/alert/opportunity until a clinician marks it “Approved.” Rejected findings remain logged but do not generate downstream actions. |
| **IMG.RF.06** | Conversion to Actions (Post-Approval Only; Client-Provided Mapping Spec): Approved findings can be converted into (a) chart flag, (b) compliance alert, and/or (c) opportunity item using configurable mapping rules. Canopy provides and dentist-approves the “Finding → Action/Opportunity Mapping Spec” (including which of the in-scope findings map to which action types). CAIS implements the configurable mapping mechanism and UI/workflows, but does not author/validate clinical/procedure mappings. | Given a Mapping Spec is provided, approving a finding enables “Create Flag/Opportunity,” which generates the mapped downstream item with links back to the image, finding, and reviewer. If no mapping exists for a returned finding type, OSCAR does not generate an action and displays/logs “No mapping configured” (or equivalent). |
| **IMG.RF.07** | Audit Trail \+ Attribution: OSCAR logs who reviewed what, when, and what action was taken (approve/reject \+ outputs created), including the mapping rule identifier/version used (when applicable). | Admin can view/export a log showing: reviewer, timestamp, image/study ID, finding ID, decision, downstream objects created, and mapping rule identifier/version (if applicable). |
| **IMG.RF.08** | Performance & Reliability (Workflow-Level, Not Model-Level): OSCAR must not block the UI; inference runs asynchronously with statuses: Pending → Completed/Failed. | In UAT, inference requests create a job record; users see status and can continue work. Completed jobs render findings; failed jobs show an error state and retry option. |
| **IMG.RF.09** | Failure Handling \+ Retry: Transient Roboflow failures (e.g., timeouts) trigger retries and produce a visible error log; persistent failures create an internal exception task/alert. | Errors are logged with reason codes. A failed job can be retried manually. After 5 failures (configurable), OSCAR creates an exception task for ops/admin review. |
| **IMG.RF.10** | Data Integrity \+ Patient Matching: Findings must be attached to the correct patient and imaging study with clear traceability. | UAT includes test cases with multiple patients/images where findings reliably attach to the correct record; each finding links to its source image/study and original response payload. |
| **IMG.RF.11** | Model Version Tracking (No Training Responsibility): OSCAR stores model identifiers and versions exactly as provided by Roboflow for reporting and comparisons. | Each inference result includes stored model project/name/version and inference timestamp; admin report can filter results by model version. |
| **IMG.RF.12** | Evaluation Workflow Support: OSCAR provides tooling to record clinician feedback (approve/reject \+ optional tags/notes) and to export that feedback for downstream model iteration. Canopy is responsible for (a) defining the feedback taxonomy (tags/labels), (b) providing clinicians to perform reviews at agreed volumes. and (c) using exported feedback to retrain/tune/iterate Roboflow models (outside CAIS scope). | Review UI supports a decision plus optional notes/tags. Exports (CSV/JSON) include image ID, finding ID, decision, notes, and model version. In UAT, Canopy provides test tags/taxonomy and completes a sample review set (e.g., ≥25 findings) and successfully exports the dataset. |
| **IMG.RF.13** | Security & Access Control: Roboflow credentials are stored securely; only authorized roles can run inference, view findings, or access logs/exports. | Secrets are not exposed client-side; permissions enforce role-based access (e.g., clinician vs admin). Audit logs record access to inference outputs. |
| **IMG.RF.14** | Explicit Non-Responsibility \+ Canopy Responsibilities: CAIS is responsible for Roboflow integration, workflow orchestration, UI, logging/audit, HITL gating, secure configuration, storage/normalization of returned outputs, and rendering segmentation overlays as provided by the model. Canopy is solely responsible for: (a) providing clinician resources for review/approval and defining review SOPs; (b) providing and dentist-approving the Finding → Action/Opportunity Mapping Spec (including any thresholds, taxonomy, and procedure/opportunity definitions); (c) providing the finding taxonomy/tag definitions used for evaluation; (d) supplying test images and expected UAT scenarios; and (g) any model training, tuning, labeling, retraining, model performance/accuracy, and clinical correctness. | Acceptance is based only on CAIS delivering: (1) working integration to Canopy-provided Roboflow endpoints, (2) secure credential handling and audit/logging, (3) storage of raw responses plus normalized findings tied to the correct patient/study, (4) asynchronous inference with visible status (Pending/Completed/Failed) and retry, (5) imaging viewer findings list \+ overlay toggle with segmentation overlays rendered when geometry is provided, (6) enforced HITL gating (no downstream actions before clinician approval), and (7) downstream flags/alerts/opportunities created only per the Canopy-approved Mapping Spec. UAT Inputs (Canopy): test images \+ scenarios, clinician reviewers/SOP execution, approved Mapping Spec, and evaluation taxonomy/tags. Excluded from acceptance: model accuracy/clinical correctness, model output completeness, and any model training/tuning/retraining. If Canopy inputs are not provided, related acceptance items are blocked pending Client inputs and handled via change control. |

## **Key Feature 4: AI Clinical Notes**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **NOTES.01** | Generate a SOAP draft from structured charting \+ voice input and optionally imaging context. | A provider can click “Generate Draft” and receive a SOAP-formatted draft linked to the encounter with cited inputs (perio/odo/tx plan). |
| **NOTES.02** | Require human review before finalization; final note is locked. | Draft status ≠ Final; finalization requires a provider action (approve/sign), and final notes become read-only (edits create an addendum). |
| **NOTES.03** | Maintain full version history and audit trail for drafts/edits/approvals. | OSCAR shows note versions with who/when/what changed; admins can export the audit log for the encounter. |
| **NOTES.04** | Export/store finalized notes in the patient record (and PMS if connected). | Final notes are available in the patient record as structured text and as a downloadable/printable artifact; if PMS export is enabled, export status is tracked. |
| **NOTES.05** | Clearly label drafts as AI-assisted and protect PHI in logs. | Draft UI includes “AI Draft—Review Required”; system logs do not store raw prompts containing PHI beyond permitted audit requirements. |

## **Key Feature 5: DSO Network Clinical Snapshot** 

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **DSO.01** | Provide a network view of FMX/perio compliance coverage by office. | Dashboard shows compliance coverage per office with last-updated timestamps and drill-down to office level. |
| **DSO.02** | Provide roll-ups of uncompleted treatment value/opportunities by office. | Dashboard shows opportunity counts and value bands by office; clicking an office shows provider-level breakdown. |
| **DSO.03** | Minimum drill-down path: network → office → provider. | Users can drill from network to office and provider views with consistent filtering and export. |
| **DSO.04** | Enforce tenant-based access controls for network data. | Only authorized DSO users can see multi-office rollups; office users only see their own location’s data. |
| **DSO.05** | Data freshness and failure visibility. | Each card shows last refresh time; if data is stale or unavailable, UI shows “Data unavailable” and logs an exception. |

# 

## **Key Feature 3: AI Imaging Analysis**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **IMG.RF.01** | Model Provider Integration (Roboflow Hosted Inference Only): OSCAR integrates with Roboflow via API and/or hosted inference endpoint(s) to submit an imaging study and receive predictions. CAIS does not train, tune, or label models. | In UAT, OSCAR can (a) send an image/study to a configured Roboflow endpoint, (b) receive a response, and (c) store the raw response \+ a normalized “findings” record tied to the correct patient/study. |
| **IMG.RF.02** | Configuration \+ Environment Separation: Admins can configure Roboflow endpoint URL, API key/secret, project/model identifier, and environment (dev/stage/prod) without code changes. | Admin UI (or config file \+ documented steps) supports updating endpoint \+ credentials; changes take effect without redeploying core application logic. |
| **IMG.RF.03** | Findings Normalization: OSCAR converts Roboflow output into a standard internal schema that supports: finding type, tooth region reference (if provided), bounding/segmentation coordinates (if provided), confidence score, model version, and timestamps. | For any valid Roboflow response, OSCAR stores a normalized findings set with required fields (confidence, timestamps, model ID/version, and a pointer to the original payload). |
| **IMG.RF.04** | Imaging Viewer Presentation: OSCAR displays findings in the imaging viewer with (1) overlay toggle and (2) a findings list view. | In UAT, a user can open an image, toggle overlay on/off, and view a list of findings with confidence and any available location mapping. |
| **IMG.RF.05** | Clinical Review Queue (HITL Gate): All Roboflow-derived findings must be reviewed and approved by a clinician before creating patient-impacting outputs (chart flags, compliance alerts, or treatment opportunities). | No CV finding creates a chart flag/opportunity until a clinician marks it “Approved.” Rejected findings remain logged but do not generate downstream actions. |
| **IMG.RF.06** | Conversion to Actions (Post-Approval Only): Approved findings can be converted into (a) chart flag, (b) compliance alert, and/or (c) opportunity item using configurable mapping rules. | In UAT, approving a finding enables “Create Flag/Opportunity,” which generates the correct downstream item with links back to the image, finding, and reviewer. |
| **IMG.RF.07** | Audit Trail \+ Attribution: OSCAR logs who reviewed what, when, and what action was taken (approve/reject \+ created outputs). | Admin can view/export a log showing: reviewer, timestamp, image/study ID, finding ID, decision, and downstream objects created. |
| **IMG.RF.08** | Performance & Reliability (Workflow-Level, Not Model-Level): OSCAR must not block the UI; inference runs asynchronously with statuses: Pending → Completed/Failed. | In UAT, inference requests create a job record; users see status and can continue work. Completed jobs render findings; failed jobs show an error state and retry option. |
| **IMG.RF.09**  | Failure Handling \+ Retry: Transient Roboflow failures (timeouts) trigger retries and produce a visible error log; persistent failures create an internal exception task/alert. | Errors are logged with reason codes. A failed job can be retried manually. After 5 failures (configurable), OSCAR creates an exception task for ops/admin review. |
| **IMG.RF.10** | Data Integrity \+ Patient Matching: Findings must be attached to the correct patient and imaging study with clear traceability. | UAT includes test cases with multiple patients/images where findings reliably attach to the correct record; each finding links to its source image/study and original response payload. |
| **IMG.RF.11** | Model Version Tracking (No Training Responsibility): OSCAR stores model identifiers and versions exactly as provided by Roboflow for reporting and comparisons. | Each inference result includes stored model project/name/version and inference timestamp; admin report can filter results by model version. |
| **IMG.RF.12** | **Evaluation Workflow Support (Oscar-Owned): Provide tooling to record clinician feedback (approve/reject \+ optional tags/notes) for later model iteration by Oscar Dental.** | **Review UI supports a decision plus optional notes/tags. Exports (CSV/JSON) include image ID, finding ID, decision, notes, and model version—enabling Oscar Dental’s model improvement loop outside CAIS scope.** |
| **IMG.RF.13** | Security & Access Control: Roboflow credentials are stored securely; only authorized roles can run inference, view findings, or access logs/exports. | Secrets are not exposed client-side; permissions enforce role-based access (e.g., clinician vs admin). Audit logs record access to inference outputs. |
| **IMG.RF.14** | **Explicit Non-Responsibility Statement (Scope Guardrail): CAIS is responsible for integration, workflow, UI, logging, and HITL gating—not model training, labeling, accuracy, or clinical correctness.** | **Statement appears in the SOW/acceptance criteria: acceptance is based on functional integration \+ workflow controls, not diagnostic accuracy metrics.** |

## 

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **MINING.01** | Run a scheduled scan to identify diagnosed-but-unscheduled treatment and recall gaps. | For a pilot location, the scan runs at least daily and generates opportunities with timestamps and source references (diagnosis/procedure/date). |
| **MINING.02** | Create a single “Opportunities” worklist with filters (office/provider/type/priority/status). | Worklist displays opportunities, supports filtering, and can mark items as contacted/ scheduled/dismissed with notes. |
| **MINING.03** | Rank opportunities using a baseline deterministic scoring model (risk \+ value) with explainers. Oscar Dental to provide scoring logic.  | Each item shows a rank score plus “Why this is high priority” (e.g., time overdue, procedure value band, clinical urgency tag). |
| **MINING.04** | Output a “Smart Scheduling Feed” for outreach/scheduling workflows. | Scheduling/outreach view can pull the top opportunities with patient contact info and recommended next action. |
| **MINING.05** | Prevent duplicates and support lifecycle states (new → in progress → resolved). | Re-running the scan does not create duplicate opportunities for the same underlying clinical item; status and notes persist. |
| **MINING.06** | From an approved opportunity/treatment item, OSCAR generates a booking packet (procedure codes, duration assumptions, preferred provider/op, notes, patient contact) and (if PMS appointment write-back is supported) creates the corresponding appointment in the PMS; otherwise creates a task for staff to book manually. | From an approved opportunity/treatment item, OSCAR generates a booking packet (procedure codes, duration assumptions, preferred provider/op, notes, patient contact) and (if PMS appointment write-back is supported) creates the corresponding appointment in the PMS; otherwise creates a task for staff to book manually. |

## 

| 1 | Voice Perio & Restorative Charting (Scribe) | Hands-free voice charting for 6-site perio and a surface-level odontogram, designed to replace the “second person scribing” workflow; supports voice-driven clinical documentation with real-time conversion into structured chart data. |
| :---: | :---- | :---- |
| **2** | **Treatment Mining** | Continuously scans records to surface unscheduled treatment, recall gaps, and other opportunity types, then ranks by clinical risk \+ financial impact and feeds prioritized opportunities into scheduling/outreach workflows. |
| **3** | **Clinical Compliance & FMX Tracking** | Computes FMX due status and protocol compliance, then generates chart flags \+ alerts \+ follow-up tasks (e.g., “FMX overdue” and “perio due soon”), including pre-visit compliance checks surfaced in workflow. |
| **4** | **Computer Vision Imaging Analysis** | Uses Roboflow for rapid CV prototyping and experimentation (e.g., FMX/compliance detection, image-based clinical signals feeding Treatment Mining). OSCAR connects to Roboflow hosted inference endpoints for model iteration/testing, stores findings (confidence \+ model version), and displays overlay annotations with a toggle. All CV-derived flags/opportunities route through a Clinical Review Queue (HITL) before becoming patient-impacting actions. Includes a Model Provider Abstraction so workflows don’t change if inference later moves off Roboflow. |
| **5** | **AI Clinical Notes** | Auto-drafts SOAP notes from structured charting \+ voice input, can incorporate imaging \+ treatment context, and requires human review before finalization with a complete, auditable history of drafts/edits/approvals. |
| **6** | **Standalone Patient Management System** | Outlined in the PMS CORE document.  |
| **7** | **DSO Network Clinical Snapshot**  | Network-level clinical dashboard with compliance coverage (FMX/perio protocols), opportunity roll-ups (uncompleted treatment value), clinical risk flags, treatment acceptance trending, and drill-downs. |

### 

# Tab 5

## **OSCAR PMS Transition by End of Phase 3**

### **Overview**

By the end of Phase 3, OSCAR will function as a **first-class “PMS workspace”** for the workflows delivered in-scope across Phases 1–3. OSCAR is designed to operate as an **overlay** on top of an incumbent PMS during implementation, while progressively becoming the primary interface for revenue operations, scheduling optimization, operational tasking, analytics, and targeted clinical workflows (scribe, compliance, and opportunity mining).

This SOW does **not** commit CAIS to delivering a complete replacement for all legacy PMS capabilities (e.g., full ledger, full clinical chart, imaging archive) by Month 9\. Instead, OSCAR will deliver a **cohesive, daily-usable operating layer** with a clear system boundary: OSCAR is **authoritative** for OSCAR-created objects and workflows (tasks, opportunities, scribe artifacts, compliance flags, outreach actions), and the incumbent PMS remains authoritative for non-scoped domains unless explicitly stated.

---

## **Core PMS Functionality and Phase Alignment**

| Core PMS Capability | Phase 1 (Months 1–3) | Phase 2 (Months 4–6) | Phase 3 (Months 7–9) |
| ----- | ----- | ----- | ----- |
| 1\) Patient Records (Patient Hub \+ Identity) | **MPI \+ Patient Hub foundation** (linked PMS record, last sync, core surfaces) | Expanded cross-module surfaces (tasks/KPIs) | Expanded clinical surfaces (scribe, compliance, opportunities) |
| 2\) Scheduling | Smart Scheduling \+ calendar overlay \+ quick-fill workflows | Task automation \+ KPI reinforcement | Opportunity-driven scheduling feeds (HITL gating) |
| 3\) Clinical Charting / Documentation | — | — | **Oscar Scribe** (voice charting \+ review/sign/export) |
| 4\) Imaging workflows (FMX-specific) | Integration layer hooks (as available) | — | **FMX due/compliance tracking** \+ tasks; optional Roboflow prototype track |
| 5\) Treatment Planning | — | — | **Treatment Opportunity Mining** (identify → rank → workflow) |
| 6\) Insurance / Eligibility \+ Claims Support | **RCM Core** workflows and worklists | Expanded analytics and automation | Continued optimization; inputs to clinical opportunity mining where relevant |
| 7\) Billing \+ Collections \+ Payments | **Text-to-Pay \+ reconciliation** \+ A/R workflow surfaces | KPI rollups and office execution automation | Continued optimization; opportunity workflows may generate outreach tasks |
| 8\) Patient Engagement / Communication | Text-to-Pay \+ Reputation messaging workflows | Event-driven comms via task automation | Clinician-approved outreach for opportunities (HITL) |
| 9\) Reporting / BI \+ Analytics | Foundational instrumentation | **Daily Huddle \+ KPI Board** | Expand drilldowns across clinical and opportunity workflows |
| 10\) Security / Compliance Expectations | RBAC \+ audit logging foundation | HR compliance tracker | Clinical compliance workflows (FMX) |

---

## **Attainable Requirements and Success Criteria (Pass/Fail UAT)**

The following define the **minimum viable “OSCAR PMS workspace”** by phase. All criteria are evaluated in a pilot environment with real integration enabled (where available).

### **Phase 1 — PMS Workspace Foundation (Revenue \+ Scheduling Overlay)**

**PMS.01 — Master Patient Index (MPI) \+ Patient Hub**

* **Requirement:** OSCAR maintains an oscar\_patient\_id ↔ pms\_patient\_id mapping with a user-facing Patient Hub that displays: demographics, appointment history, insurance snapshot, balance snapshot, messages, and OSCAR work items (tasks/worklists) with a **linked PMS record indicator** and **last-sync timestamp**.  
* **Success (UAT Pass):** For a pilot site, staff can search and open **25 test patients**; each record shows the linked PMS identifier and last-sync timestamp; mismatches/duplicates can be routed to a **human resolution queue**; access events are audit logged.

**PMS.02 — Scheduling Overlay \+ Quick Fill**

* **Requirement:** OSCAR displays a schedule view and produces a “Quick Fill” list and gap-fill recommendations based on cancellations/no-shows and available chair time.  
* **Success (UAT Pass):** For **5 schedule gaps** in a test week, OSCAR generates a Quick Fill list with candidate patients and supporting rationale (e.g., due recall, flexible availability, production fit).

**PMS.03 — Scheduling Execution Path (Write-back or Tasking)**

* **Requirement:** For schedule actions, OSCAR supports one of two execution modes per PMS capability:  
  (a) **Write-back** to create/modify appointments where supported, or  
  (b) **Staff task creation** with all details required to complete the action in the PMS.  
* **Success (UAT Pass):** In **10 scheduling actions** (create/reschedule/cancel), OSCAR either successfully writes back **or** generates a complete staff task with patient, provider, appointment type, duration, and target time window.

**PMS.04 — RCM Workspace (Eligibility \+ Claims/AR Tracking Surfaces)**

* **Requirement:** OSCAR provides user workspaces for eligibility, claims tracking, denials, and A/R follow-up, with clear exception states when upstream data is missing.  
* **Success (UAT Pass):** Eligibility can be run for a defined test set (batch and/or real-time as scoped), results are displayed or marked “Pending/Data unavailable,” and exceptions generate tasks. Claims and A/R items are viewable as structured worklists.

**PMS.05 — Patient Payments (Text-to-Pay) \+ Reconciliation**

* **Requirement:** OSCAR can issue payment links and track payment status, with reconciliation visibility and an exception queue for unmatched items.  
* **Success (UAT Pass):** For **10 test payments**, OSCAR shows payment initiation → completion status, generates receipts, and lists any unmatched transactions in an exception queue. If ledger posting is not available, OSCAR generates a “posting task” with proof.

**PMS.06 — Messaging Foundation (Consent \+ Templates \+ Auditability)**

* **Requirement:** OSCAR supports messaging templates and consent controls needed for Text-to-Pay and Reputation Engine workflows.  
* **Success (UAT Pass):** STOP/opt-out is honored; message events are logged; staff can view a per-patient messaging timeline for OSCAR-originated messages.

---

### **Phase 2 — Office Manager Layer (Automation \+ KPI Operating System)**

**PMS.07 — Staff Task Automation (Role Queues \+ SLAs)**

* **Requirement:** OSCAR creates tasks from defined triggers (e.g., denial received, unpaid balance threshold, negative review) and routes them into role-based queues with status tracking.  
* **Success (UAT Pass):** For **10 trigger events**, OSCAR creates the correct task type, assigns the correct role/queue, and supports status updates (open → in progress → complete) with audit logging.

**PMS.08 — Daily Huddle \+ KPI Board with Drilldowns**

* **Requirement:** OSCAR produces a daily operational view and KPI board with drilldowns to underlying lists (patients/claims/tasks).  
* **Success (UAT Pass):** On **5 consecutive business days**, the huddle is generated by the agreed time window and KPIs link to drilldowns; missing inputs display “Data unavailable” with timestamps rather than failing silently.

**PMS.09 — HR Compliance \+ Inventory Tracking (Workflow-Level)**

* **Requirement:** OSCAR tracks HR compliance items and inventory thresholds and generates alerts/tasks for exceptions.  
* **Success (UAT Pass):** HR credential expiration and low-stock thresholds create tasks/alerts for **a defined test set** (minimum: 5 HR items, 5 inventory items).

---

### **Phase 3 — Clinical Workspace (Scribe \+ Compliance \+ Opportunity Mining)**

**PMS.10 — Oscar Scribe (Draft → Review → Sign → Lock)**

* **Requirement:** OSCAR supports secure audio capture, transcription, structured output, clinician review/edit, and sign/lock workflow with audit trail; export/attachment back to PMS where supported.  
* **Success (UAT Pass):** For **10 clinical notes**, OSCAR produces a draft, supports edits, captures signature/attestation, locks the final note, and exports/attaches (or provides a stored artifact \+ posting task if attachment is not supported).

**PMS.11 — Clinical Compliance & FMX Tracking (Workflow, Not Full Imaging)**

* **Requirement:** OSCAR computes FMX due/overdue status using agreed rules and creates flags and follow-up tasks.  
* **Success (UAT Pass):** For **30 test patients** with known last-FMX evidence (from PMS data or provided metadata), OSCAR correctly shows FMX due status and creates tasks for overdue/missing cases.

**PMS.12 — Treatment Opportunity Mining (Identify → Rank → Route)**

* **Requirement:** OSCAR runs scheduled scans (at least daily for a pilot) to identify diagnosed-but-unscheduled treatment and recall gaps, ranks opportunities using a deterministic baseline scoring model provided/approved by Canopy, and routes items into scheduling/outreach workflows with HITL gating.  
* **Success (UAT Pass):** A daily scan generates **≥20 opportunities** with timestamps and source references; each item shows rank \+ “why” explainers; staff can approve/reject and move an item through statuses (identified → approved → contacted/scheduled).

**PMS.13 — Imaging Analysis Prototype Track (Roboflow)**

* **Requirement:** If included, OSCAR integrates with Roboflow-hosted inference endpoints for prototype imaging signals and surfaces outputs for clinician review.  
* **Success (UAT Pass):** For a provided test set, OSCAR can submit images to the endpoint, receive outputs with model version \+ confidence, and capture clinician verification. **No clinical accuracy warranty** is implied.

---

## **Clear Exclusions (PMS Replacement Boundaries)**

The following are **explicitly out of scope** unless added by change order:

1. **Full legacy PMS replacement** by Phase 3, including complete parity with incumbent PMS workflows not described in Phases 1–3.  
2. **Full clinical chart system** (complete periodontal chart history management, full odontogram history, full treatment plan authoring/editing parity, complete clinical note library management) beyond the scoped Phase 3 scribe \+ compliance \+ mining workflows.  
3. **Full imaging system** (image acquisition, storage/archive, DICOM viewers, device integrations); Phase 3 is limited to FMX compliance evidence and optional prototype analysis.  
4. **Model training / dataset labeling / clinical validation work** for imaging AI (Roboflow): Canopy provides clinician input, labels/ground truth, and performance sign-off; CAIS implements workflows and integration only unless separately scoped.  
5. **Data migration** of historical patient/ledger/clinical data into OSCAR as a full cutover migration.  
6. **On-prem deployment** of any OSCAR components or NexHealth Synchronizer (cloud-hosted delivery only under this SOW).  
7. **Regulatory/FDA clearance** strategy, filings, approvals, and costs (owned by Canopy).  
8. Any functionality blocked by **third-party API limitations** (PMS/NexHealth/Vyne/etc.). CAIS will implement resilience patterns and fallback tasking, but cannot guarantee capabilities not supported by third parties.

---

If you want, I can convert the requirements above into the exact **Phase 1-style UAT checklist format** (IDs, step-by-step tester actions, expected results) so it can plug directly into your acceptance section.

