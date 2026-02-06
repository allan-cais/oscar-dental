#  Oscar AI Platform Project Proposal

## 

## **Overview**

This Statement of Work (“SOW”) outlines the platform proposal between **Canopy Dental (“Canopy” or “Client”)** and **Custom AI Studio (“CAIS”)** to create **OSCAR,** a hybrid intelligence dental practice management platform designed to progressively replace legacy Dental Practice Management Systems (“PMS”) while supporting both individual practices and DSO networks.

The goal of the platform is to deploy OSCAR in a real integrated PMS environment, validate end-to-end data synchronization and workflow execution for the scoped modules, and complete acceptance testing against the defined phase criteria to support scalable rollout. In doing so, OSCAR is intended to set a first-class standard in the dental market by combining an overlay-based architecture (working alongside existing PMS systems) with workflow-native automation and clinically grounded AI—delivering measurable operational outcomes without requiring a rip-and-replace conversion.

---

**PREPARED FOR:**

John Salter and Greg Elmore  
Canopy Dental

**PREPARED BY:**

Devin Kearns, Allan Crawford, and Andrew Lewis  
Custom AI Studio

**Date:** January 19th, 2026

## **Table of Contents** 

1. Project Overview  
2. Scope & Deliverables  
3. Infrastructure / 3rd Party Requirements & Cost-Sharing  
4. Platform Budget

## **Platform Overview**

### **Objective**

CAIS will design and build OSCAR, a hybrid-intelligence dental practice management platform delivered in two phase releases over five (5) months. OSCAR will operate as an overlay alongside the Client’s existing Practice Management System (“PMS”) during Phases 1–2, enabling measurable workflow automation and reporting without a rip-and-replace conversion, while establishing the technical foundation for deeper PMS replacement capability over time.

Across all phases, OSCAR is designed as an execution-first system: it not only identifies operational and clinical opportunities, but drives closure through worklists, tasks, alerts, scheduling/outreach workflows, dashboards, and auditability, with human-in-the-loop (HITL) controls for higher-risk actions.

### **Delivery Model**

* **Agile delivery** in iterative increments (planned sprints), with weekly status reporting and a maintained backlog.  
* **Real environment validation**: each phase includes integration testing and UAT in a live, integrated PMS environment prior to acceptance.  
* **Clear system boundaries**: legacy PMS remains the source of truth for non-OSCAR workflows; OSCAR becomes authoritative for the workflows/modules delivered in-scope for the phase.  
* **Security and compliance by design**: role-based access, audit logging, and required controls implemented as part of the platform foundation.

### **Phase Roadmap and Scope**

#### **Phase 1 (Months 1–2): Revenue Engine**

**Goal:** Deploy the revenue collection foundation and core automations that impact cash flow and schedule utilization.

**In-scope modules:**

* **RCM Core:** eligibility/benefits workflows, claims visibility and processing support, denials/appeals workflow support, A/R worklists, and operational dashboards.  
* **Smart Scheduling:** gap identification and fill workflows, recall management, scheduling recommendations/queues, and related reporting.  
* **Text-to-Pay:** patient balance communications, payment links, payment status tracking, and reconciliation visibility.  
* **Reputation Engine:** review request workflows, response workflows/queues, and reputation tracking.  
* **Phase 1 also establishes platform foundations** required for later phases (identity mapping, data synchronization patterns, audit logging, baseline dashboards, and integration scaffolding).

#### **Phase 2 (Months 3–5): Automated Office Manager**

**Goal:** Standardize daily operations and execution across single practices and DSOs through automation and KPI visibility.

**In-Scope Modules:**

* **AI Daily Huddle & KPI Board:** automated daily delivery of key operational metrics, exceptions, and actionable callouts; non-blocking AI commentary where enabled.  
* **Staff Task Automation:** event-driven task creation and assignment with role-based queues, SLA tracking, and escalation/visibility.  
* **HR & Compliance Tracker:** staff compliance workflows (policy acknowledgements, expirations, checklists) and reporting.  
* **Inventory Tracking:** inventory visibility and exception workflows (e.g., low stock, reorder prompts), subject to PMS/integration capabilities.  
* **DSO/Network views:** roll-up dashboards and variance alerts across locations (read-only network intelligence that expands over time).

### **5-Month Timeline**

The parties intend to execute the program over five (5) months, consisting of two phases. .

**Each phase generally follows the same delivery arc:**

* **Month A (Plan/Design):** confirm requirements, integration mapping, UX flows, data model updates, and test plan.  
* **Month B (Build/Integrate):** implement features, integrations, instrumentation/logging, and internal QA.  
* **Month C (Stabilize/UAT/Launch):** end-to-end testing, UAT execution, defect remediation, and pilot rollout.

*Schedule note:* The timeline is a **target plan** and may shift based on third-party integration constraints, client readiness (SME availability, test data), and scope changes managed through change control.

### 

### **Key Assumptions and Dependencies**

* Client will provide timely access to: PMS environments, integration credentials, pilot site workflows, test patients/claims (as permitted), and subject-matter experts for UAT.  
* Integration capabilities (read/write constraints) may vary by PMS and connector; where write-back is restricted, OSCAR will provide HITL workflows and clear operational fallbacks.  
* Acceptance is based on defined phase acceptance criteria/UAT pass-fail tests, not on downstream business outcomes that depend on staff execution, payer behavior, or patient response.

### **Summary of Overall Scope Exclusions (“Scope Exclusions”)**

1. **Third-Party Platforms and APIs (e.g., NexHealth Synchronizer, Vyne, Stedi, PMS vendors)**

   1. CAIS is not responsible for third-party availability, uptime, latency, rate limits, schema/behavior changes, data quality issues originating upstream, write-permission restrictions, or any third-party defects/outages.   
   2. CAIS responsibilities are limited to implementing the integration per documented capabilities and providing commercially reasonable resilience patterns (e.g., retries, queuing, idempotency, logging/monitoring, and clear “Data unavailable / Pending” states) and documenting discovered limitations.   
   3. No guarantee is made that third-party systems will support required functions beyond what the third-party provider enables in production environments.

2. **On-Prem Deployment Limitations (“On-Prem Limitations”)**

   1. **On-Prem Components.** Canopy (and/or Canopy’s Customer’s IT provider) and/or NexHealth are solely responsible for provisioning, installing, configuring, hosting, securing, maintaining, monitoring, patching, and operating any on-premises infrastructure and any on-prem NexHealth Synchronizer/Agent required to access an on-prem PMS, including networking/VPN, firewall/allowlisting, server/endpoint access, security hardening, OS/agent patching, logging/monitoring, backups, and credential/access controls. CAIS will not install, administer, access, or operate Client’s on-prem environment or the NexHealth Synchronizer/Agent.  
   2. **Limited Integration.** For up to the first twenty (20) Customers enabled on OSCAR and only through completion/acceptance of Phase 2, CAIS will provide commercially reasonable integration-level troubleshooting assistance only (and not OSCAR onboarding, implementation/project management, end-user training, workflow adoption, or go-live support), including: (i) providing OSCAR integration requirements and recommended configuration parameters (including, as applicable, required endpoints, ports/allowlisting guidance, and credential/connection parameter formats), (ii) participating in up to two (2) remote working sessions per Customer, up to sixty (60) minutes each, to review setup and troubleshoot integration-level connectivity/data-flow issues, (iii) reviewing relevant logs and configuration artifacts as provided by Canopy/Customer IT and/or NexHealth/vendor, (iv) validating OSCAR-side connectivity and data flow once the on-prem components are installed and operational, and (v) identifying and documenting suspected root causes and the actions required for Client/Vendor to execute. Any support beyond these limits is out of scope unless agreed in writing via change order and may be billed at CAIS’s then-current rates. Root-cause analysis and remediation of on-prem infrastructure, network/VPN, security tooling, or third-party agent failures remain Client/Vendor responsibilities unless added via change order, and OSCAR remains cloud-hosted under this SOW unless otherwise agreed in writing.

3. **Data Migration**

   1. Full historical data migration is excluded, including bulk transfer/normalization of legacy clinical charts, imaging archives, ledger history, notes, documents, or longitudinal records for OSCAR clients.  
   2. CAIS may support limited pilot/test data imports only if explicitly stated in the phase scope; otherwise, OSCAR will rely on live sync/integration and forward-looking data capture.

4. **FDA Clearance / Regulatory Authorizations**

   1. Regulatory strategy, filings, approvals, submissions, fees, and ongoing compliance obligations (including any determination of whether OSCAR or components are regulated) are the sole responsibility of Canopy Dental.  
   2. CAIS may provide technical documentation support only if separately scoped and approved via change order.

# **Scope & Deliverables**

**Overall Phase Scope, Deliverables, Acceptance, Testing, and Defect Remediation**

CAIS’s obligations under this SOW are limited to designing, developing, and delivering the functionality expressly described in the applicable Phase Key Features and Phase MVP Definition, as further detailed in the Requirements and Success Criteria for that Phase (collectively, the “Scope”). The parties agree that the Scope constitutes the entire agreement as to what is included for the applicable Phase; any functionality, integrations, environments, reports, performance commitments, or services not expressly stated in the Scope are excluded unless added via a written change order.

Phase acceptance shall be determined solely by commercially reasonable testing against the applicable Requirements and Success Criteria during the agreed UAT/acceptance period. Client shall provide CAIS timely access to all required systems, environments, credentials, and representative test data, and shall conduct testing in good faith in accordance with the agreed test procedures. If Client identifies a material failure to meet a Success Criterion (a “Defect”) and provides written notice with sufficient detail to reproduce the issue (including steps, environment, and expected vs. actual results), CAIS shall use commercially reasonable efforts to correct the Defect.

For Defects that are reproducible and attributable to CAIS’s deliverables (excluding third-party systems and Client-provided inputs), CAIS will provide a remediation plan within five (5) business days of notice and will remediate within a commercially reasonable timeframe thereafter based on severity and complexity (e.g., Critical/Blocking defects targeted within five (5) business days, Major defects within ten (10) business days, and Minor defects in the next scheduled release), provided that the foregoing timelines may be extended where the Defect is dependent on third-party performance, requires Client access/approvals, or reasonably requires additional investigation. Acceptance shall not be unreasonably withheld for minor, cosmetic, or non-material issues that do not materially impair the applicable Success Criteria. Any items identified during testing that constitute scope expansion, third-party limitations (including API constraints, outages, rate limits, or breaking changes), or changes in assumptions/dependencies shall be handled exclusively through the parties’ change control process, including equitable adjustments to fees, timeline, and acceptance criteria, as applicable.

# **1\. OSCAR Standalone Practice Management Software (“OSCAR PMS”) (Phase 1-2)**

The goal of the OSCAR PMS deliverable is to provide a standalone operational user experience for day-to-day practice workflows by the end of Phase 2, while maintaining connectivity to incumbent PMS platforms through NexHealth Synchronizer (multi-PMS read; write where expressly required and supported).

**Standalone Definition:** pilot users can complete the in-scope workflows in OSCAR without needing to use the incumbent PMS user interface, except for (i) explicitly excluded workflows and (ii) transitional activities (e.g., remediation of upstream data issues, vendor outages, or manual posting where write-back is unsupported). This definition constitutes the Standalone PMS. 

**System of Record Boundaries:**

* The incumbent PMS remains the system of record for clinical charting, imaging artifacts, and any clinical modules not expressly included herein.

* The incumbent PMS remains the system of record for the financial ledger except to the extent a specific write-back object type is expressly required and successfully supported in the pilot environment (e.g., appointment write-back; optional payment/claim write-back where available).

* OSCAR is authoritative for OSCAR-native objects (e.g., tasks, work packets, exception logs, KPI views, audit logs, messaging delivery logs) and for the workflow state it manages.

**Acceptance Basis.** Acceptance for this section is based on completion of the defined workflows, correct data linkage (patient/appointment/encounter), required controls (RBAC/audit/tenant isolation), and the Phase 2 walkthrough. Acceptance is not based on third-party performance, payer behavior, or vendor API changes/outages, which must be logged with timestamps and reason codes.

### **1.2 Summary of the 8 Core OSCAR PMS Functions**

By the end of Phase 2, OSCAR will provide a Standalone PMS user experience across the 10 core functions below, backed by NexHealth Synchronizer for multi-PMS connectivity (read/write) and data synchronization.

| \# | Core PMS Function | Functionality Description | Product Experience |
| ----- | ----- | ----- | ----- |
| 1 | Patient Records | Unifies patient context across systems; maintains identity mapping to connected PMS per location/provider. | Patient Hub: demographics, appt history, insurance, balances, tasks, workflow flags; linked PMS record \+ last sync. |
| 2 | Scheduling | Scheduling workflows executed in OSCAR, including required appointment create/update write-back to PMS where supported. | Calendar \+ recommendations \+ Quick Fill; create/update with confirmations/errors, retries, exception tasks.. |
| 3 | Insurance / Eligibility \+ Claims Support | Eligibility and claims support workflows per Phase 1 scope; claim submission write-back is capability-dependent with HITL fallback. | Eligibility queue \+ benefits cards; claim tracker \+ work queues tied to patient/encounter. |
| 4 | Billing \+ Collections \+ Payments | A/R worklists and patient payment capture; payment posting write-back is capability-dependent with HITL fallback. | “Work Today” A/R queues; text-to-pay campaigns; reconciliation view \+ reason-coded exceptions. |
| 5 | Patient Engagement / Communication | Communications limited to Text-to-Pay and Reputation workflows as defined in scope. | Patient messaging timeline; campaigns; consent controls. |
| 6 | Operational Reporting / Business Intelligence | KPI board \+ AI Daily Huddle \+ drilldowns using synced PMS \+ OSCAR module data. | KPI board; huddle pack delivery with timestamps; drilldowns to lists where available. |
| 7 | Staff Tasking / Exception Handling | Work packets \+ exception queues for items requiring HITL processing or where write-back is unavailable. | Exception queue with reason codes; role-based task assignment; proof/metadata capture. |
| 8 | Security / Compliance Controls | Tenant isolation, RBAC, audit logging, secure secret storage, and admin controls. | Admin console: roles, access policies, audit log viewer; immutable logs for PHI \+ patient-impacting actions. |

### **1.3 OSCAR PMS Delivery Schedule**

* **Phase 1 (Months 1–2):** PMS integration foundation (NexHealth), location configuration, MPI/resolution queue, sync \+ last-sync visibility, scheduling \+ required appointment write-back, Phase 1 revenue workflows (eligibility/claims support, A/R, Text-to-Pay, in-scope communications), exception handling, security baseline (RBAC/audit).  
* **Phase 2 (Months 3–5):** BI/reporting layer (KPI board \+ AI Daily Huddle \+ drilldowns) and completion of the Standalone PMSrequirements for operational usage (workflow hardening, admin controls, exception handling maturity)

### **1.4 MVP Definition (By End of Phase 2\)**

By the end of Phase 2 acceptance, OSCAR provides a standalone operational user experience for the in-scope core functions above such that pilot users can:

* Manage scheduling and appointment workflows in OSCAR, including required PMS appointment write-back where supported;  
* Execute Phase 1 revenue workflows (eligibility/claims support, A/R worklists, Text-to-Pay) in OSCAR;  
* Use Phase 2 KPI/huddle reporting in OSCAR; and  
* Rely on OSCAR’s exception handling and tasking where upstream systems restrict automation or write-back.

Where an upstream system restricts write-back, OSCAR provides a human-in-the-loop (HITL) fallback (task/work packet/exception queue) unless a write-back is expressly identified as “Required” in the Success Criteria.

### **1.5 OSCAR PMS Requirements & Success Criteria**

| ID | Requirement | Success Criteria | Delivery Phase |
| ----- | ----- | ----- | :---: |
| **PMS.FND.01** | OSCAR supports connecting Client locations to one or more PMS instances via NexHealth Synchronizer for read-only PMS connectivity and maintains per-location configuration within OSCAR (including PMS instance mapping and workflow settings), with tenant isolation preserved. OSCAR will not write or synchronize location configuration back to the PMS via NexHealth. | In UAT, an OSCAR admin can configure ≥2 locations, each mapped to a PMS instance via NexHealth Synchronizer, and OSCAR displays the active PMS connection per location (e.g., PMS name/instance ID \+ connection status). | **1** |
| **PMS.FND.02** | Master Patient Index (MPI) \+ Resolution Queue: OSCAR maintains mapping supporting multi-location; provides duplicate/mismatch detection with a human resolution queue. | In UAT, OSCAR creates/maintains patient linkages for a test set and routes at least one ambiguous match into a resolution queue; authorized users can resolve it and the decision is persisted and auditable. | **1** |
| **PMS.FND.03** | Sync Subsystem \+ Source-of-Truth Rules: Scheduled sync \+ delta updates with conflict handling; OSCAR shows “last synced” timestamps and “data unavailable” states when upstream feeds fail. | In UAT, OSCAR shows last-sync timestamps on Patient Hub and logs “data unavailable” for a simulated upstream failure without breaking core workflows (jobs complete with exception logging). | **1** |
| **PMS.ADM.01** | Minimum administrative master data in OSCAR: location/provider/operatories/appointment types mappings required to run scheduling workflows. | In UAT, admin configures provider \+ operatory \+ appointment type mappings for a pilot location; scheduling workflows use configured values without manual back-end intervention. | **1** |
| **PMS.SCH.01** | Scheduling \+ Appointment Write-Back (Required): OSCAR supports schedule workflows and can create appointments in the PMS via NexHealth (write-back is required for pilot). | In UAT, a user creates at least one appointment in OSCAR (patient, provider, operatory, date/time, appointment type/procedures as applicable) and the appointment is confirmed as created in the PMS via NexHealth-backed verification. Failure states are visible and logged, with an exception task created if write-back fails. | **1** |
| **PMS.RCM.01** | OSCAR will deliver insurance eligibility and claims support workflows per the Phase 1 RCM scope, integrated to PMS context via NexHealth. Eligibility and claim context linking (patient/appointment/encounter) are in-scope. Claim creation/submission write-back (POST/CREATE) is conditional on the pilot PMS \+ NexHealth supported capabilities; where claim POST/CREATE is unsupported or unavailable, OSCAR will provide a HITL (staff) submission workflow rather than automated claim posting. | In UAT, OSCAR runs eligibility for pilot patients/appointments, displays the result (or “Pending/Unavailable” with timestamp), and links it to the correct patient \+ appointment. OSCAR creates a claim draft for pilot encounters with the available PMS/NexHealth inputs and links it to the correct patient \+ encounter; if claim POST/CREATE is supported, OSCAR creates the claim and stores the claim ID/status, and if not, OSCAR generates a submission package, creates a staff “Submit Claim” task, and logs the exception. OSCAR tracks and displays claim status using available read signals and/or staff-updated status, always tied to the correct patient/encounter. | **1** |
| **PMS.PAY.01** | Billing/Collections \+ Payments \+ Posting Behavior: Deliver AR workflows and Text-to-Pay; posting back to PMS is performed where available; otherwise OSCAR produces a posting task with proof. | In UAT, a payment capture results in an OSCAR record with reconciliation visibility; if posting is supported in the pilot environment, posting is reflected in PMS; if not, OSCAR generates a posting task and logs the reason. | **1** |
| **PMS.COMM.01** | Patient Messaging: Messaging features are limited to Text-to-Pay and Reputation workflows as defined; broader reminder/marketing capabilities are excluded unless explicitly added. | In UAT, in-scope messaging workflows execute with consent controls and delivery logging; any out-of-scope messaging requests are not presented as supported functionality. | **1** |
| **PMS.BI.01** | KPI Board \+ AI Daily Huddle: Deliver Phase 2 BI layer (KPIs, huddle delivery, drilldowns) using synced PMS \+ OSCAR module data dependent on NexHealth Synchronizer’s READ/POST abilities. | In UAT, KPI board and daily huddle generate per Phase 2 acceptance criteria; drilldowns resolve to underlying lists (patients/claims/tasks) where applicable. | **2** |
| **PMS.EXC.01** | Exception handling maturity: retries \+ reason-coded exception queue for upstream failures and unsupported write-backs. | For a simulated write-back failure and a simulated upstream read failure, OSCAR logs reason codes, shows “data unavailable/pending” states, and creates/assigns an exception task visible in a work queue. | **2** |
| **PMS.SEC.01** | Security, RBAC, Audit Logging: Tenant isolation, RBAC, encrypted secrets, and immutable audit logs across PHI access and patient-impacting actions. | In UAT, role-based permissions prevent unauthorized access/actions; audit logs show user/time/action for PHI access and key workflow events (review/approve/create appointment/create opportunity). | **1–2** |
| **PMS.STD.01** | Standalone PMS Gate (End of Phase 2): OSCAR provides a standalone PMS operational interface for the 8 core functions, using NexHealth multi-PMS synchronization and required write-backs (notably scheduling). | Scripted UAT walkthrough demonstrates: (i) patient lookup \+ identity confirmation, (ii) appointment creation with confirmed write-back or exception path, (iii) eligibility run \+ linked result, (iv) claim draft/package \+ task, (v) A/R worklist action \+ Text-to-Pay send \+ logged delivery, (vi) payment capture \+ reconciliation (and posting path or task), (vii) KPI/huddle view, (viii) RBAC/audit evidence for above actions. | **2** |

### **1.5 OSCAR PMS Exclusions and Limitations (“OSCAR PMS Limitations”)** 

1) **Third-Party Dependency:** NexHealth Synchronizer and connected PMS systems are third parties; OSCAR must be resilient (retries, logging, “data unavailable” states), but CAIS is not responsible for third-party outages, rate limits, schema changes, or upstream data quality issues.  
2) **Write-Back Requirements (NexHealth / PMS Capability-Dependent)**: NexHealth is read/pull by default; OSCAR will perform PMS write-back only for the specific object types and UAT Success Criteria expressly stated in this SOW and only where the pilot PMS/NexHealth supports the required write endpoints and permissions. Appointment write-back is required for the pilot: OSCAR will create/update appointments in the PMS via NexHealth and store the returned PMS appointment reference, with retry/exception handling and reason-coded logging for failures. All other write-backs (including without limitation payment posting, document attachment/export, and ledger updates) are pilot-conditional; where unsupported or a write fails, OSCAR will provide a human-in-the-loop work packet/task (what to do, where, and proof/metadata) and record exception logs with timestamps and reason codes, rather than guaranteeing POST/CREATE into the PMS.  
3) **No Implied Data Migration:** This scope assumes ongoing synchronization and forward-looking capture; full historical chart/ledger/document migration remains excluded unless explicitly added.  
4) **On-Prem Components.** Canopy (and/or Canopy’s Customer’s IT provider) and/or NexHealth are solely responsible for provisioning, installing, configuring, hosting, securing, maintaining, monitoring, patching, and operating any on-premises infrastructure and any on-prem NexHealth Synchronizer required to access an on-prem PMS, including networking/VPN, firewall/allowlisting, server/endpoint access, security hardening, OS/agent patching, logging/monitoring, backups, and credential/access controls. CAIS will not install, administer, access, or operate Client’s on-prem environment or the NexHealth Synchronizer/Agent.  
   1) **Limited Integration.** For up to the first twenty (20) Customers enabled on OSCAR and only through completion/acceptance of Phase 2, CAIS will provide commercially reasonable integration-level troubleshooting assistance only (and not OSCAR onboarding, implementation/project management, end-user training, workflow adoption, or go-live support), including: (i) providing OSCAR integration requirements and recommended configuration parameters (including, as applicable, required endpoints, ports/allowlisting guidance, and credential/connection parameter formats), (ii) participating in up to two (2) remote working sessions per Customer, up to sixty (60) minutes each, to review setup and troubleshoot integration-level connectivity/data-flow issues, (iii) reviewing relevant logs and configuration artifacts as provided by Canopy/Customer IT and/or NexHealth/vendor, (iv) validating OSCAR-side connectivity and data flow once the on-prem components are installed and operational, and (v) identifying and documenting suspected root causes and the actions required for Client/Vendor to execute. Any support beyond these limits is out of scope unless agreed in writing via change order and may be billed at CAIS’s then-current rates. Root-cause analysis and remediation of on-prem infrastructure, network/VPN, security tooling, or third-party agent failures remain Client/Vendor responsibilities unless added via change order, and OSCAR remains cloud-hosted under this SOW unless otherwise agreed in writing.

# 

# **2\. Phase 1: Revenue Collection Module**

## **2.1 Phase 1 Schedule**

| Phase | Duration | Key Milestones | Phase Exit / Acceptance Gate |
| :---: | :---: | :---: | :---: |
| Phase 1 – Revenue Collection Module | 2 months | (1) Requirements & Solution Design, (2) Build & Integration, (3) Stabilization & UAT | Phase 1 UAT pass \+ acceptance sign-off |

## **2.2 Phase 1 Key Features**

| \# | Feature | Description |
| :---: | ----- | ----- |
| **1** | **RCM Core** | Auto-claims, eligibility verification, pre-determination, ERA processing, denial management, A/R optimization.  |
| **2** | **Smart Scheduling** | Intelligent gap-filling, Quick Fill queue, recall management, production goal tracking, Perfect Day templates, no-show prediction. |
| **3** | **Text-to-Pay** | Payment links via SMS, card-on-file, payment plans, automated collections sequence, statement generation. |
| **4** | **Reputation Engine** | Automated review requests, Google Business monitoring, AI sentiment analysis, response management.  |

## **2.3 Phase 1 MVP Definition**

1. Parallel operation with legacy PMS.  
2. OSCAR authoritative for Phase 1 features.  
3. Patient ID mapping between OSCAR and PMS.  
4. Mobile app (iOS/Android) and desktop web app tested on a finite number of browsers, IOS versions, and Android OS. Canopy Requirement: Setting up an Apple Developer Account will require Canopy personnel information as Apple require personal information to get a DUNS number and get approved.   
5. Database schema for Phase 1, draft for Phase 2\.  
6. All Phase 1 integrations implemented and verifiable limited to NexHealth Synchronizer limitations outlined in Phase 1 Limitations.   
7. UAT with Oscar PMS and companion PMS.  
8. HIPAA compliant.  
9. PCI DSS compliant: Scoped specifically to PCI Level 1 using Stripe as a service provider. We will architect the solution to be PCI DSS but the cost of annual PCI validation / initial compliance will be Oscar Dental’s responsibility.  
10. Immutable audit logging with tamper-evident verification.  
11. Headless RCM verification \<60 seconds \- Scope clarification: \<60 second turnaround is for Oscar submitting transaction / query and receiving actionable response from claim integration and store / log it. Out of scope will be ERA arrival and prior authorization determination within 60 seconds.  
12. Payment reconciliation with dashboard.  
13. Agentic AI grounding logic documented.  
14. Automated customer onboarding: Scope clarification: Automated onboarding between cloud based legacy PMS and what NexHealth will allow integration with. Full data migration is not covered in this phase.  
15. Health API for system monitoring  
16. Reputation Engine with Google Business integration  
17. TCPA-compliant communications.

## **2.4 Phase 1: Core Module Requirement & Success Criteria**

## **2.4.1: RCM Core Requirements (Key Feature \#1)**  **Eligibility Verification**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **ELIG.01** | Batch eligibility by 6 AM for next-day appointments (regardless of using Stedi or Vyne)  | All next-day appointments verified by 6 AM |
| **ELIG.02** | When a user verifies eligibility during scheduling, OSCAR should return an eligibility result quickly for supported payers, and clearly show “Pending” if the payer doesn’t respond in time | For supported payers during normal operations, the median response time from “Verify Eligibility” click → result displayed is ≤ 30 seconds; if no response by 90 seconds, OSCAR shows Pending, uses any valid cached result if available, and logs the event |
| **ELIG.03** | 24-hour result caching | Cache hit logged on re-verification |
| **ELIG.04** | Benefits breakdown (deductible, max, copay) for all available data provided by the carriers as some carriers return incomplete / ambiguous  fields for non-standard formats | All benefit fields populated if provided by the carriers in clear format and required fields mapped from Oscar Dental |
| **ELIG.05** | OSCAR displays an estimated patient out-of-pocket amount using available eligibility benefits \+ fee data and labels it as an estimate. | In UAT for 20 test cases, OSCAR either shows an estimate that matches the agreed calculation rules within ±$10 or shows “Unable to estimate” and creates a manual verification task when required inputs are missing. |
| **ELIG.06** | Exception report for failures | Failed verifications on report |
| **ELIG.07** | COB validation prompt for secondary insurance | Prompt appears when secondary added |

## **Pre-Determination**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **PREDET.01** | Auto-prompt when procedures added to appointment  | Prompt appears after procedures added  |
| **PREDET.02** | Insurance-specific response time displayed | Carrier timeline shown |
| **PREDET.03** | Patient SMS when pre-det submitted | SMS sent on submission |
| **PREDET.04** | Patient SMS when response received with costs | SMS with cost breakdown sent |
| **PREDET.05** | Treatment plan locks after response | Changes require override |
| **PREDET.06** | Smart Pre-Estimate (AI) for non-real-time carriers for selected procedures using available plan data and/or historical outcomes, and requires staff approval before it can be sent to the patient. | For the configured set of payers/procedure codes, OSCAR displays a coverage band (e.g., “Likely patient portion: $X–$Y”) when sufficient data exists, and logs who approved/edited/sent the estimate. If data is insufficient, OSCAR shows “Unable to estimate” and creates a manual verification / pre-auth task. |

## **Claims Scrubbing**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **SCRUB.01** | Auto-claim generation from checkout | Claim created automatically |
| **SCRUB.02** | Payer-specific rules engine | Phase 1 supports payer-specific rules for a defined list of payers (e.g., top 20 defined by Oscar) |
| **SCRUB.03** | Missing/invalid data flagged | Errors shown before submit |
| **SCRUB.04** | Procedure code combination validation | Invalid combos blocked |
| **SCRUB.05** | Attachment requirements enforced | D4341 blocked without narrative |
| **SCRUB.06** | Correct fee schedule by payer | Fees match contract |
| **SCRUB.07** | Clinical notes ↔ account ↔ claim cross-validation | Mismatch flagged (procedure, tooth\#, surfaces) |

## **Denial Management**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **DENIAL.01** | Auto-categorization by reason code | Category assigned automatically |
| **DENIAL.02** | AI appealable vs. write-off; write-offs flagged for team review (no auto-write-off) | Write-off queued for approval |
| **DENIAL.03** | AI appeal letter generation | Letter generated \<60 sec |
| **DENIAL.04** | Appeal submission and tracking | Status updates tracked |
| **DENIAL.05** | Response SLA \<24 hours | Action logged within 24 hr, system escalates within 24 business hours and requires acknowledgement from HIL  |
| **DENIAL.06** | Corrective action suggestions | Fix steps for fixable denials |

## **A/R Management**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **AR.01** | Aging report with 30/60/90/120 day buckets. Canopy to provide example aging reports and templates.  | Accurate aging by bucket |
| **AR.02** | AI-prioritized worklist by collection probability, , Oscar Dental to provide methodology / ranking system for AI scores | Worklist ranked by AI score |
| **AR.03** | One-click follow-up actions | Action creates task/call/note |
| **AR.04** | Automated reminder sequences | Reminders sent on schedule |
| **AR.05** | Payer behavior pattern alerts | Slow payers flagged |

## **2.4.2: Smart Scheduling Requirements (Key Feature \#2)**

## **Quick Fill & Gap Management**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **QUICKFILL.01** | Quick Fill queue with prioritization \- Oscar Dental to provide ranking methodology / calculations | Patients ranked by score,  |
| **QUICKFILL.02** | Gap-fill toolbox (overdue hygiene, unscheduled tx, ASAP) | Each source accessible,  |
| **QUICKFILL.03** | For any open slot, OSCAR generates a ranked list of up to 3 suggested patients from defined sources (Sooner-If-Possible, Recall, Quick Fill queue, Treatment Plan Pending) using a scoring model that includes production fit, availability fit, and no-show risk, and shows the rationale \+ lets staff override | In UAT, selecting an open slot produces a ranked recommendation list with reasons, and two test scenarios (day under goal vs day at/over goal) result in different top suggestions. The system logs the suggested candidates, score inputs used (e.g., procedure codes/duration/preferences), and which suggestion was accepted/overridden |
| **QUICKFILL.04** | Production goal tracking dashboard | Current vs. target displayed |
| **QUICKFILL.05** | Cancellation triggers auto gap-fill outreach | Outreach initiated on cancel |
| **QUICKFILL.06** | Perfect Day template enforcement | Schedule respects balance |

## **Recall Management**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **RECALL.01** | Auto-generated recall due list (supports 3/4/6 mo intervals) | 3-mo patient at 3 mo; 6-mo at 6 mo |
| **RECALL.02** | Automated recall outreach sequence | Sequence starts when due |
| **RECALL.03** | Pre-appointment scheduling at checkout | Checkout prompts next appt |
| **RECALL.04** | Overdue recall report | Aging by 1/2/3+ months |
| **RECALL.05** | Recall interval configurable per patient (3/4/6 mo by perio status) | Different intervals per patient work |

## **2.4.3: Text-to-Pay & Collections (Key Feature \#3)**

## **Collections Sequence**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **COLLECT.01** | Automated reminder sequence (Day 0,7,14,30,60,90) | Reminders sent at intervals |
| **COLLECT.02** | Statement generation \<48 hr after insurance payment within \<48 hours of ERA ingestion, otherwise flagged  | Statement generated on time |
| **COLLECT.03** | Payment plan creation with auto-charge | OSCAR can create a payment plan (amount, cadence, start date, end conditions) and, for patients who opt in, executes scheduled charges via Stripe; ≥95% of scheduled charges run within 24 hours of due time, with failed charges ,creating a task \+ retry schedule. |
| **COLLECT.04** | Card-on-file auto-charge (with consent) | If consent is on file, OSCAR can trigger an auto-charge up to configured limits; every auto-charge requires a stored consent record, sends a receipt notification, and logs charge outcome; any exception (failed/partial/refund) is added to a review queue |
| **COLLECT.05** | Configurable escalation thresholds | Thresholds honored |
| **COLLECT.06** | Collections worklist with contact history | History visible on worklist |
| **COLLECT.07** | Overdue balance alert for upcoming appointments (no-show risk flag) | Patient with balance \+ appt flagged at check-in |

## 

## **2.4.4: Reputation Engine (Key Feature \#4)**

## **Reputation Management**

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

## 

## 

## 

## **Communication Compliance (TCPA)**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **TCPA.01** | STOP keyword honored immediately \- stops ALL messages | No further SMS of any type after STOP |
| **TCPA.02** | Consent tracked with timestamp/source | Consent record auditable |
| **TCPA.03** | Communication preferences per patient | Preferences honored |
| **TCPA.04** | Opt-out list checked before send | Opted-out not contacted |
| **TCPA.05** | Templates include opt-out instructions | STOP text included |
| **TCPA.06** | Granular opt-out by message type: Forms/Consents, Appt Reminders, Scheduling Reminders, or STOP ALL | Opt out of reminders only; still receive forms |
| **TCPA.07** | Patient self-service SMS preference management (link in messages) | Link opens preference page; changes saved |

## **2.4.5: SLA Performance Targets**

| Metric | Target | Success Criteria | Measurement |
| ----- | :---: | :---: | :---: |
| Clean Claim Rate | ≥98% | Scrubber blocks submission on configured “blocking errors”; payer rules configured for top payers covering ≥80% of claim volume | % claims passing scrubs; rule coverage; blocked vs overridden counts |
| Days to Submit Claim | \<24 hours | Claim draft created within 15 min of checkout event; “Ready-to-submit” queue with SLA timer \+ escalation at 24h | Event timestamps: checkout → draft; draft → ready; exception queue reasons |
| Days in A/R | \<30 days | A/R dashboard refresh daily; worklist generation \+ escalation rules run on schedule; outreach sequences execute as configured | Aging buckets accuracy check; sequence send logs; worklist completeness |
| Denial Rate | \<5% | Denials ingested and categorized within 15 min of import; corrective playbooks shown for configured categories | Import timestamp → queue timestamp; % auto-categorized; playbook coverage |
| Appeal Success Rate | ≥70% | Appeal packet generated on demand; 95% letter draft \<60s; approval required \+ logged; status tracking via tasks/workflow | Draft latency; approval/audit logs; task status timeline |
| Eligibility Verification (Vyne or Stedi Integration) | ≥95% | If Vyne is used: Batch run completes by 6:00 AM for next-day appts with exception list by 6:10 AM; real-time median tracked with fallback. If Stedi is used: Real-time eligibility verification.  | Batch completion logs; exception queue; latency dashboards |
| Pre-Det Rate (where required) | ≥90% | Prompt/flag triggered when pre-det rules apply; submission \+ response ingestion logged; exceptions queued with reasons | % flagged when rules match; submission events; exception counts |
| Review Conversion | ≥15% | ≥95% of eligible visits get request queued; configurable delay honored; delivery failures surfaced within 15 min | Eligibility count vs queued count; delay settings audit; send/delivery logs |
| Google Star Rating | ≥4.5 stars | Reviews fetched and displayed on schedule; response workflow available; negative review tasking \+ escalation works | Review ingest success; alert latency; response workflow audit |
| Review Response Time | \<24 hours | New review alerts with 95% \<15 min; 1–2 star alerts escalate \<2 min after detection; 95% draft generation \<30s (HITL gating for negatives) | Detection → alert timestamps; draft latency; task SLA tracking |
| Payment Collection | ≥85% | Reminder sequences execute on schedule; payment events captured; reconciliation dashboard shows posted/unposted/mismatches; exceptions queued | Sequence logs; Stripe events; reconciliation match rates \+ exception aging |
| Schedule Fill Rate | ≥90% | Cancellation detection triggers outreach within 5 min of detection; Quick Fill list refreshes and ranks; booking packet \+ HITL task tracked to completion | Cancel → outreach timestamps; queue refresh logs; task completion \+ readback |

## **2.4.6: Phase 1 Scope Exclusions and Limitations (“Phase 1 Limitations”)**

The following exclusions/limitations apply to Phase 1\. The intent is to fairly allocate risk: CAIS is accountable for implementing the Phase 1 workflows, UI, routing, and instrumentation, while Canopy is accountable for definitions/methodologies, timely inputs, and outcomes dependent on operational execution and third parties. Any expansion beyond these boundaries will be handled via written change control.

#### **A) Client Readiness, Environments, and Third-Party Access (Schedule Dependency):**

* #### **Timeline dependency (Phase 1\)**: The Phase 1 target timeline (including the stated 2-month duration) is dependent on Client providing required environments, hosting, and third-party access within the first week of Phase 1 kickoff. Specifically, within five (5) business days after kickoff, Client will provide: (i) access to agreed testing/UAT environments for the legacy PMS and integration path (e.g., NexHealth Synchronizer) with representative test data; (ii) provisioned cloud hosting environments and required network/security access (e.g., allowlisting/VPN/SSO, credentials/permissions) as applicable; and (iii) active third-party accounts and API credentials/permissions required for Phase 1 integrations, including NexHealth and, as applicable, Vyne and/or Stedi (plus Stripe and any messaging/review platform credentials required for in-scope workflows).This will be further defined before the first development week by CAIS and provided to Canopy. 

* #### **CAIS responsibility (in-scope)**: Provide a documented access/prerequisites checklist, validate connectivity once access is provisioned, and implement/integrate Phase 1 functionality using the provided environments and credentials; where access is temporarily unavailable, CAIS may use reasonable stubs/mocks for isolated development while deferring end-to-end validation until access is restored.

* #### **Canopy responsibility / limitation**: Provision and maintain the required environments, cloud hosting prerequisites, vendor accounts, contracts/BAAs (if required), credentials, and permissions in a timely manner; delays in providing or maintaining access will delay development, integration testing, and UAT.

* #### **Phase 1 limitation (schedule impact)**: If Client does not provide the required environments/access within five (5) business days after kickoff (or if access is later revoked/unavailable), the Phase 1 schedule and any dependent milestones/acceptance dates will be extended by the length of the delay (plus any commercially reasonable remobilization time). CAIS will not be responsible for schedule slippage to the extent caused by such Client readiness delays.

#### **B) Third-Party Integrations and PMS Write Capabilities (e.g., NexHealth, PMS APIs)**

* **NexHealth boundary (Phase 1\)**: Phase 1 depends on third-party systems (NexHealth Synchronizer, Stedi, Vyne) that may impose READ-only areas, limited endpoints, quotas, outages, or behavior changes; NexHealth is read/pull by default and OSCAR will write back only for the specific object types and UAT success criteria explicitly stated in this SOW (e.g., appointment create/update; optionally patient create/update), with all other write-back pilot-conditional and, if unsupported, delivered via a work packet \+ staff task \+ exception logging rather than guaranteed POST/CREATE into the PMS.  
* **CAIS responsibility (in-scope)**: Implement the integration per available capabilities, including mapping, retries/queuing where appropriate, observability/logging, and clear user-facing states (“Verified,” “Pending,” “Data unavailable,” “Exception”) plus exception workflows.  
* **Canopy responsibility / limitation:** Provide timely access/credentials, maintain vendor relationships and contracts, and accept that features requiring unsupported write-back may be delivered via staff tasking instead of automation.  
* **Phase 1 limitation:** Where write-back is not available or not reliable in production, OSCAR will provide a complete work packet/task (what to do, where, and why) rather than guaranteeing automated posting/booking.

#### **C) Parallel Operation and System-of-Record Boundary (Phase 1\)**

* **Phase 1 posture:** OSCAR operates in parallel with the legacy PMS and is authoritative only for Phase 1-created objects (e.g., OSCAR tasks, worklists, outreach events, eligibility request logs, reconciliation status).  
* **PMS r**emains authoritative for clinical charting, final ledger of record, and any non-Phase 1 workflows.  
* **CAIS responsibility:** Provide clear links/indicators to the source PMS record and maintain sync status visibility.  
* **Canopy responsibility:** Maintain PMS configuration and workflows required for day-to-day operations outside Phase 1 scope.

#### **D) Eligibility / Claims / ERA and Payer-Controlled Dependencies (Phase 1\)**

* **No payer-outcome guarantees:** The parties acknowledge that payer response times, adjudication outcomes, ERA arrival timing, and authorization decisions are outside CAIS control.  
* **CAIS responsibility (in-scope):** Provide the workflow, tracking, exception handling, and dashboards needed to execute the process (queues, timestamps, alerts, and escalation rules).  
* **Canopy responsibility:** Operational execution (e.g., staff follow-up on exceptions), payer enrollment/setup, and clearinghouse/payer connectivity prerequisites.  
* **Clarification:** Any “\<60 seconds” performance targets apply to OSCAR system processing and logging (request → actionable system state), not payer adjudication, ERA arrival, or pre-auth determinations.

#### **E) Text-to-Pay / Payment Capture / Posting (Phase 1\)**

* **CAIS responsibility (in-scope):** Deliver payment link generation, Stripe integration, receipts, reconciliation views, exception handling, and audit logs.  
* **Phase 1 limitation:** Automatic posting back into the PMS ledger is contingent on PMS/NexHealth write capability. If posting is not supported, OSCAR will provide a posting task with payment proof and required metadata.  
* **Shared compliance posture:** CAIS will architect to minimize PCI scope using Stripe as the payment service provider; ongoing PCI validation costs and external audits, if required by Canopy’s policies or acquirers, are Canopy’s responsibility.

#### 

#### 

#### **F) Explicit Out-of-Scope Items for Phase 1 (unless change order)**

* Phase 2 and Phase 3 modules (Daily Huddle/KPI Board, Staff Task Automation beyond Phase 1 triggers, HR Compliance, Inventory, Oscar Scribe, FMX tracking, Treatment Mining, imaging model work).  
* Full historical data migration beyond any limited onboarding steps explicitly defined in Phase 1\.  
* On-Prem Components**.** Canopy (and/or Canopy’s Customer’s IT provider) and/or NexHealth are responsible for provisioning, installing, configuring, hosting, securing, maintaining, monitoring, patching, and operating any on-premises infrastructure and any on-prem NexHealth Synchronizer/Agent required to access an on-prem PMS, including without limitation networking/VPN, firewall/allowlisting rules, server/endpoint access, security hardening, OS and agent patching, logging/monitoring, backups, and credential/access controls. CAIS will not administer or operate Client’s on-prem environment or the NexHealth Synchronizer/Agent.  
  * CAIS Integration Assistance**.** As part of the Phase scope, CAIS will provide commercially reasonable assistance to support Canopy’s Customer’s on-prem deployment efforts, including: (i) providing OSCAR integration requirements and recommended configuration parameters (including, as applicable, required endpoints, ports/allowlisting guidance, and credential/connection parameter formats), (ii) participating in up to two (2) remote working sessions per Customer, up to sixty (60) minutes each, to review the setup and troubleshoot integration-level issues, (iii) reviewing relevant logs and configuration artifacts as provided by Canopy/Customer IT and/or NexHealth/vendor, (iv) validating OSCAR-side connectivity and data flow once the on-prem components are installed and operational, and (v) identifying and documenting suspected root causes and the actions required for Client/Vendor to execute. Additional sessions or time are available upon mutual written agreement and may be billed at CAIS’s then-current rates or handled via change order. For clarity, root-cause analysis and remediation of on-prem infrastructure, network/VPN, security tooling, or third-party agent failures remain Client/Vendor responsibilities unless added via change order, and OSCAR remains cloud-hosted under this SOW unless otherwise agreed in writing.

# 

# **3\. Phase 2: Automated Office Manager**  **3.1 Phase 2: Schedule** 

| Phase | Duration | Key Milestones | Phase Acceptance |
| :---: | :---: | :---: | :---: |
| Phase 2 – Automated Office Manager | 3 months | (1) Requirements & Solution Design, (2) Build & Integration, (3) Stabilization & UAT | Phase 2 UAT pass \+ acceptance sign-off |

## **3.2 Phase 2: Key Features**

| \# | Feature | Description |
| :---: | ----- | ----- |
| **1** | **AI Daily Huddle & KPI Board** | Daily huddle pack delivered by 6:00 AM with production vs goal, scheduled vs capacity, same-day gaps, plus rolling 7/30-day metrics (production/collections/adjustments), case acceptance by provider and office, a mid-month forecast view (Day 15+), and optional AI “Oscar’s Take” commentary that never blocks delivery. |
| **2** | **Staff Task Automation** | Event-driven task creation (e.g., denied claim, unscheduled treatment, negative review) with role-based routing (Front Desk/Billing/Clinical), SLA timers with at-risk/overdue states and manager alerts, AI call-list prioritization using Oscar Dental scoring, morning recurring checklists, deep links into source records, and manager oversight KPIs (Task Completion Rate) visible on the Huddle Board. |
| **3** | **HR & Compliance Tracker** | Centralized staff compliance hub including license tracking, automated expiration alerts, CE tracking, OSHA/HIPAA renewal tracking with artifacts \+ audit logs, time-off requests with approval routing \+ schedule impact, on-demand compliance reporting, and compliance gap alerts surfaced into the daily huddle. |
| **4** | **Automated Inventory Tracking** | Procedure-complete driven inventory decrementing with FIFO lot selection, prevention of negative quantities (creates alert/task), reorder thresholds that generate alerts \+ tasks (and can surface in huddle), and lot-level expiration tracking with scheduled reporting and alerts. |
| **5** | **DSO Network Operations Support** | Network dashboard aggregating all Oscar-enabled practices with a network snapshot card (MTD production vs goal), ranked office tiles (production/collections/case acceptance), \>10% variance alerts with drill-down drivers, and shared playbooks showing which OSCAR actions correlate with improvement per office (explicitly labeled as correlational). |

### 

## **3.3 Phase 2: MVP Definition**

1. Daily Huddle Delivery (Workflow-first): By 6:00 AM local time on ≥95% of business days, OSCAR delivers a huddle pack per location with production vs goal, scheduled vs capacity, and same-day gaps; missing inputs show “Data unavailable” with timestamps.   
2. Rolling Metrics \+ Trends: OSCAR displays rolling 7/30-day totals for production, collections, adjustments with trend visualization, refreshed at least daily and matching stored snapshot totals.  
3. Case Acceptance Views: OSCAR shows case acceptance by provider and office for a selectable range (default 30 days) with drill-down to underlying cases.  
4. Mid-Month Forecast View (Day 15+): On/after the 15th, OSCAR displays a forecast page with projected month-end totals, variance vs goal, and a timestamp plus confidence band/assumptions note.   
5. Agentic Commentary (Non-blocking): “Oscar’s Take” lists 3–7 prioritized issues with links to supporting data; if AI fails/disabled, huddle still ships with “AI unavailable—metrics only.”  
6. Task Auto-Creation from Events: For supported triggers, OSCAR creates a task within 60 seconds with correct type, linked source record, SLA/due date, dedupe behavior, and audit log of event→task mapping.  
7. Role-Based Queues \+ Routing: Tasks route automatically to Front Desk (Scheduling), Billing (RCM), or Clinical (Sterilization/Lab); UAT target ≥95% correct routing, exceptions logged to “Unassigned.”  
8. Task SLA Engine \+ Manager Alerts: Every task has a due-by timer with “At Risk/Overdue” visual states; overdue tasks trigger a manager alert (Office Manager).  
9. Call List Smart Prioritization (AI, Oscar-provided scoring): Using Oscar Dental’s provided scoring/weights, OSCAR computes Patient Value and No-Show Risk scores, reorders the call list within 60 seconds, logs inputs/version, and supports manual override with audit history.  
10. Morning Checklist Automation: Recurring daily checklist tasks appear automatically at 7:00 AM and reset each day.  
11. Deep Link Navigation: Clicking a task (e.g., denied claim) opens the exact underlying detail page with no searching.  
12. Manager Oversight KPI: Huddle Board shows Task Completion Rate (Completed ÷ Created; default last 7 days) with drill-down and filters by role/queue; values match timestamps and refresh daily.   
13. HR Compliance Core: Licenses/credentials tracked with Active/Expiring/Expired \+ days-to-expiration; expiration alerts generated at 90/60/30/14/0 days (configurable).  
14. HR Training & Reporting: CE requirements/completions tracked per cycle; OSHA/HIPAA compliance tracked with renewal dates \+ artifacts and audit logs; on-demand compliance reporting by staff/location/date range.  
15. Time-Off Requests \+ Impact: Time-off requests support single-click approve/deny with audit trail and display schedule impact (appointments impacted \+ estimated production at risk).  
16. Compliance → Huddle Integration: Compliance gaps surface into the Daily Huddle with links to underlying records.  
17. Inventory Decrementing (FIFO \+ no negatives): Procedure-complete decrements mapped supplies using FIFO lots; negative quantities are blocked and generate an alert/task with transaction logging.  
18. Reorder & Expiration Alerts: Crossing reorder thresholds generates an alert \+ task \+ huddle-eligible entry; lot expirations are tracked with scheduled reporting and alerts.  
19. DSO Network View \+ Variance Alerts: Network snapshot aggregates MTD production vs goal, ranked office tiles, \>10% below baseline variance alerts with drill-down drivers, and playbooks labeled as correlational.

**3.3 Phase 2: Core Module Requirement & Success Criteria**

## **3.3.1: AI Daily Huddle & KPI Board (Key Feature \#1)**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **HUDDLE.01** | Auto-Generated Morning Huddle Pack: OSCAR generates a daily huddle pack showing production vs goal, scheduled vs capacity, and same-day gaps. | By 6:00 AM local time on business days, the huddle pack is available and displays all three sections for each location; if any input feed is missing, OSCAR shows the section as “Data unavailable” with a last-updated timestamp (and still delivers the pack). |
| **HUDDLE.02** | Rolling 7/30-Day Metrics: OSCAR calculates and displays rolling 7-day and 30-day metrics for production, collections, and adjustments with trend visualization. Canopy to provide calculation methodology for rolling metrics. | For each metric, the UI shows 7-day and 30-day totals plus a trend chart, and values match the underlying daily snapshot data; metrics refresh at least daily. |
| **HUDDLE.03** | Case Acceptance Tracking: OSCAR tracks case acceptance metrics by provider and by office.Canopy to provide methodology behind acceptance metrics.  | For a selectable date range (default last 30 days), the dashboard shows case acceptance by provider and by office, including numerator/denominator definitions (e.g., accepted ÷ presented); drill-down lists the underlying cases contributing to each metric. |
| **HUDDLE.04** | Month-End Forecast (mid-month view): OSCAR provides a forecast view on the 15th of the month to project month-end performance (production/collections) so the team can intervene early. Canopy to provide methodology behind performance metrics / calculations.  | On or after the 15th, the forecast page displays projected month-end totals and variance vs goal using the available month-to-date data; the forecast output includes a “last refreshed” timestamp and a visible confidence band or “assumptions used” note. |
| **HUDDLE.05** | Agentic Commentary: AI highlights the top issues for the day and recommended focus areas, without blocking delivery of the huddle pack. | The huddle includes an “Oscar’s Take” section listing 3–7 prioritized issues with links to supporting data (e.g., gaps list, KPI cards, task queues); if AI fails or is disabled, the huddle still ships and the commentary section shows “AI unavailable—metrics only.” |

## **3.3.2: Staff Task Automation (Key Feature \#2)**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **TASK.01** | Auto-Creation Trigger: Workflow Engine creates tasks based on events (e.g., Claim Denied, Unscheduled Treatment, Negative Review). | For each supported trigger event (e.g., Claim Denied, Unscheduled Treatment, Negative Review), OSCAR automatically creates a task within 60 seconds with the correct task type, queue/owner role, linked source record, due date/SLA, and an audit log entry showing the event → task mapping; duplicate events do not create duplicate tasks. |
| **TASK.02** | Role-Based Routing: Tasks route to queues: Front Desk (Scheduling), Billing (RCM), Clinical (Sterilization/Lab). | When a task is created, OSCAR assigns it to the correct role queue based on task type—Front Desk (Scheduling), Billing (RCM), or Clinical (Sterilization/Lab)—and this routing is visible on the task record (queue, owner role, SLA/due date); in UAT, ≥95% of test tasks across the defined task types route to the expected queue, and any exceptions are logged with a reason (e.g., missing data) and placed in a default “Unassigned” queue for manager review. |
| **TASK.03** | SLA Tracking: Every task type has a "Due By" timer. Visual flags for "At Risk" and "Overdue." | Overdue tasks turn red and alert the Office Manager. |
| **TASK.04** | Smart Prioritization (AI): Agentic AI re-orders the "Call List" based on Patient Value ($) and No-Show Risk. This criteria and scoring methodology will be provided by Canopy.  | Using Oscar Dental’s provided scoring rules/weights, OSCAR computes a Patient Value score and No-Show Risk score for each eligible patient, applies the defined ranking formula to re-order the Call List, and displays both scores (and key drivers, if specified) in the UI; the system logs the score inputs, rule/version used, and produces the ranked list within 60 seconds, with staff able to manually override/reorder without losing audit history. |
| **TASK.05** | Morning Checklist: Recurring "Daily Tasks" (e.g., "Turn on Compressor," "Print Route Slips") appear automatically at 7 AM. | For the pilot location, OSCAR auto-creates the configured recurring checklist at 7:00 AM local time each business day; each item is a new daily instance and prior-day completion state does not carry forward. |
| **TASK.06** | Context Deep Link: Clicking a "Denied Claim" task opens the specific Claim Detail page in Oscar. | From the task list, selecting a ‘Denied Claim’ task navigates directly to the corresponding Claim Detail view for that claim (if the claim record exists and the user has permission), without requiring manual search. |
| **TASK.07** | Manager Oversight: "Task Completion Rate" KPI visible on the Huddle Board. | The Huddle Board displays a Task Completion Rate KPI (Completed ÷ Created for the selected time window, default last 7 days) with a drill-down list of open vs completed tasks, filterable by role/queue, and the KPI value matches the underlying task timestamps in system logs (created\_at, completed\_at) with data refreshed at least daily. |

## **3.3.3: HR & Compliance Tracker (Key Feature \#3)**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **HR.01** | License Tracking: Centralize all staff license/credential records with expiration dates and status. | Each staff member has a credential profile showing Active / Expiring / Expired status and days-to-expiration for every tracked license. |
| **HR.02** | Expiration Alerts: Run a daily scan and generate alerts before credentials expire. | Alerts are automatically created at 90/60/30/14/0 days (configurable) and are visible in an alerts list with timestamp \+ recipient/role routing. |
| **HR.03** | CE Credit Management: Track CE requirements and completions by license type and renewal cycle. Canopy to provide initial CE forms and requirements.  | For each staff member and cycle, OSCAR shows Required hours / Earned hours / Remaining hours, and each CE entry includes course name, hours, completion date, and optional certificate upload. |
| **HR.04** | OSHA & HIPAA Compliance Tracking: Track practice-specific OSHA/HIPAA requirements with renewal dates.  | OSHA/HIPAA items show Compliant / Due Soon / Overdue and store linked documents; changes are audit-logged (who/what/when). |
| **HR.05** | Time-Off Requests: Enable time-off submission with single-click approve/deny and routing to an approver. | Submitting a request creates an approver task; approver can Approve or Deny in one click, and the decision is recorded with timestamp \+ actor. |
| **HR.06** | Schedule Impact Visibility: Show the operational impact of a time-off request before approval. | The request view shows (at minimum) \# appointments impacted and estimated production at risk for the requested dates (or “No impact detected”). |
| **HR.07** | Compliance Reporting: Provide on-demand compliance reports by staff/location/date range. Canopy to provide initial reporting templates and methodology.  | Users can generate a report that lists credentials \+ expirations, CE status, OSHA/HIPAA status, and linked artifacts; report generation is logged (requester \+ time \+ filters). |
| **HR.08** | Operations Huddle Integration: Surface compliance gaps into the Daily Huddle with actionable links. | The Daily Huddle displays compliance gap alerts (e.g., expiring/expired items) with severity and a link to the underlying staff/credential record. |

## 

## **3.3.4: Automated Inventory Tracking (Key Feature \#4)**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **INV.01** | When a procedure completes, OSCAR decrements mapped supplies using FIFO lot selection and blocks negative quantities (creating an adjustment-needed alert). Canopy will provide (i) a supply master list with item IDs, units of measure, and reorder thresholds, (ii) a procedure-to-supply mapping table with per-procedure quantities and units, (iii) initial on-hand inventory by location including lots (lot ID, received date, expiration date if applicable, starting quantity), and (iv) a test set of procedure-complete events (or ability to generate them) for UAT. | Using the Canopy-provided mapping and lot/on-hand dataset, for 10 test procedure-complete events in the pilot location OSCAR: (a) records an inventory transaction with the selected FIFO lot, item ID, quantity decremented, timestamp, and resulting on-hand; and (b) for at least 2 negative-on-hand test cases, blocks the decrement and generates an alert/task showing the item, required quantity, available quantity, and the procedure/event reference. |
| **INV.02** | Inventory thresholds (reorder point / safety stock) trigger alerts, push notifications, and create reorder tasks routed into Staff Task Automation; alerts can appear in the Daily Huddle. Canopy to provide methodology around Inventory Thresholds.  | When quantity crosses a threshold, the system generates (1) an alert, (2) a task, and (3) an entry eligible for the huddle feed. |
| **INV.03** | OSCAR tracks lot-level expirations and runs a daily job (by 6 AM) to generate “use-first” guidance and expiration alerts. Canopy will provide (i) the inventory item master list (item IDs, names, units), (ii) lot records per location including lot ID, item ID, received date, expiration date, and on-hand quantity, (iii) the practice’s alert thresholds (e.g., “expiring in 30/60/90 days”), (iv) any location-specific rules (e.g., exclude non-expiring items, handling for unknown expiration), and (v) designated roles/queues for alert routing (inventory, huddle, tasking). | Using Canopy-provided lot data and thresholds, OSCAR produces (a) a daily “use-first” list by 6:00 AM local time and (b) a weekly expiration report for the pilot location, and for a UAT dataset containing at least 20 lots with at least 5 lots inside the configured “expiring soon” window, OSCAR generates expiration alerts that display item, lot, days-to-expire, and on-hand quantity, and routes each alert to the configured inventory view and (if enabled) to huddle/tasking. |

## **3.3.5: DSO Value \- Network Operations Snapshot (Key Feature \#5)**

| ID | Requirement | Success Criteria |
| ----- | ----- | ----- |
| **DSO.01** | Network Snapshot Card provides a network-level snapshot showing Production vs Goal across all OSCAR-enabled practices; Canopy provides (i) Production definition, (ii) goal-setting methodology and effective dates, (iii) office inclusion rules, and (iv) timezone/cutoff (“as of”) rules. | The card displays total MTD production, total MTD goal, and % of goal for included offices, and totals equal the sum of included office values for the same cutoff (to the cent); offices with missing data are listed as excluded and shown as “Data unavailable” with last-updated timestamps |
| **DSO.02** | Office Comparison Tiles show ranked office tiles for Production, Collections, and Case Acceptance; Canopy provides (i) metric definitions/exclusions, (ii) case acceptance formula and what qualifies as “accepted,” (iii) time windows and cutoff rules, and (iv) optional normalization rules. | The DSO view displays office tiles with the three metrics and a rank per selected metric; users can sort by any metric and the displayed ranks match the selected sort order for the selected time window, with ties handled deterministically (ties allowed or name-based tie-break) and offices with missing data shown as “Data unavailable” and excluded from ranking for that metric. |
| **DSO.03** | OSCAR automatically flags offices that are \>10% below a defined baseline; Canopy provides (i) baseline methodology, (ii) the “down 10%” rule definition, (iii) eligible metrics and the current-period window (e.g., MTD or rolling 7), and (iv) suppression rules (closures, partial data days, known events), including timezone/cutoff alignment. | For each office, OSCAR computes the baseline per the configured methodology and generates a variance alert when the current-period value is \>10% below baseline; the alert appears on the network view with the impacted metric and % delta, and if baseline data is insufficient the system displays “Baseline unavailable” and does not generate an alert. |
| **DSO.04** | Variance alerts include a short reason and a drill-down link to underlying drivers; Canopy provides (i) the allowed driver taxonomy, (ii) driver-to-metric mapping rules, (iii) priority ordering logic, and (iv) exclusions for sensitive content, and CAIS limits reasons to drivers that are available in OSCAR for the pilot environment. | Each variance alert displays (a) office, (b) metric impacted, (c) baseline vs current values (and/or % delta), and (d) a drill-down link to one or more supporting driver views available in OSCAR (e.g., schedule gaps list, cancellations list, task backlog), and if no qualifying driver is detected or data is unavailable OSCAR displays “No driver detected” (or “Data unavailable”) rather than failing the alert. |
| **DSO.05** | OSCAR provides a “Playbooks” view per office showing the most frequently executed OSCAR actions and associated metric context; Canopy provides (i) the action list to track, (ii) the definition of “executed” and attribution rules, (iii) the before/after comparison window rules, and (iv) required disclaimer language (correlation only). | For each office, OSCAR displays a Playbooks section listing the top OSCAR actions executed (counts for the selected time window) and a before/after metric context label (e.g., “Production \+X% vs prior period” calculated per Canopy methodology), supports filtering by office and time window, and labels results as correlational (no causal attribution); if required metric inputs are unavailable, OSCAR displays “Data unavailable” for the context label while still displaying action counts. |

## **3.4.6: Phase 2 Scope Exclusions and Limitations (“Phase 2 Limitations”)**

The following exclusions/limitations apply to Phase 2\. The intent is to fairly allocate risk: CAIS is accountable for implementing the Phase 2 workflows, UI, routing, and instrumentation, while Canopy is accountable for definitions/methodologies, timely inputs, and outcomes dependent on operational execution and third parties. Any expansion beyond these boundaries will be handled via written change control.

#### **A) Data Feeds, Third-Party Systems, and Source-of-Truth Boundaries (Phase 2\)**

* **Shared reality:** Phase 2 relies on underlying data feeds from the incumbent PMS/integration layer and Phase 1 systems (production/collections/adjustments, appointments, claims, tasks/events). These feeds may be incomplete, delayed, rate-limited, or unavailable.  
* **CAIS responsibility (in-scope):** Implement ingestion/ETL, job scheduling, retries/queuing where appropriate, and clear user-facing states (**“**Data unavailable” \+ last-updated timestamp) plus exception logging/monitoring.  
* **Canopy responsibility / limitation:** Provide timely access/credentials, maintain vendor relationships/contracts, and ensure required upstream configurations/data availability.  
* **Phase 2 limitation:** Phase 2 deliverables do not guarantee completeness, latency, or correctness of third-party data; CAIS will surface missing/late inputs and continue to deliver the huddle pack in degraded mode where possible.

#### **B)  Parallel Operation and System-of-Record Boundary (Phase 2\)**

* **Phase 2 posture:** OSCAR operates in parallel with the legacy PMS and consumes PMS data via NexHealth READ/GET (pull) only; OSCAR is authoritative only for Phase 2-created objects (e.g., KPI/huddle outputs, tasks, internal statuses) and does not write BI/task data back to the PMS via NexHealth.  
* **PMS remains authoritative** for clinical charting, final ledger of record, and any workflows outside Phase 1–2 scope.  
* **CAIS responsibility:** Provide clear links/indicators to the source PMS record (where available) and maintain sync status visibility (e.g., last successful pull timestamp, data freshness notices).

* **Canopy responsibility:** Maintain PMS configuration and workflows required for day-to-day operations outside Phase 1–2 scope and ensure NexHealth access/permissions needed for read/pull operations.

#### **C) HR & Compliance Tracker (Phase 2\)**

* **CAIS responsibility (in-scope):** Provide tracking workflows, alerts, document/artifact attachment, audit logs, and reporting per configured requirements (licenses/CE/OSHA/HIPAA/time-off).  
* **Canopy responsibility / limitation:** Provide the compliance requirements to track (license types, renewal cycles, CE rules, OSHA/HIPAA items), templates, and ensure the practice’s operational processes populate accurate staff data and artifacts.  
* **Phase 2 limitation:** This module provides administrative tracking and reminders only and does not constitute legal advice, guarantee regulatory compliance, or replace formal HR/compliance programs.

#### **D) Inventory Tracking Boundaries (Phase 2\)**

* **CAIS responsibility (in-scope):** Implement inventory decrementing (FIFO lots, block negative quantities), threshold alerts/tasking/huddle-eligibility, and expiration tracking/alerts per the Phase 2 requirements.  
* **Canopy responsibility / limitation:** Provide the supply master, procedure-to-supply mappings, initial on-hand/lot data (including expirations), threshold methodology, and UAT event set.  
* **Phase 2 limitation (explicit):** Phase 2 inventory scope is limited to the defined decrementing/alerting/expiration workflows.Vendor purchasing integrations, automatic purchase order submission, vendor price optimization, and broader procurement/accounting functions are excluded unless explicitly added.

#### **E) DSO Network Views, Variance Alerts, and Playbooks (Phase 2\)**

* **CAIS responsibility (in-scope):** Implement aggregation, ranking, variance alerts, drilldowns to available drivers, and playbooks display with correlation disclaimers.  
* **Canopy responsibility / limitation:** Provide goal methodology, baseline methodology, suppression rules, driver taxonomy/mapping, and attribution rules.  
* **Phase 2 limitation:** Variance “reasons” are limited to drivers available in OSCAR for the pilot environment; playbooks are correlational guidance only (no causal attribution, no guaranteed outcomes), and network views include only “OSCAR-enabled” offices as defined by Canopy.

#### **F) Explicit Out-of-Scope Items for Phase 2 (unless change order)**

* Phase 3 clinical modules (Oscar Scribe, FMX/Clinical Compliance, Treatment Opportunity Mining, Roboflow imaging workflows).  
* Full data migration beyond any limited onboarding steps explicitly defined.  
* Any functionality requiring third-party capabilities not available in the client’s production environment subject to change order.   
* On-Prem Components**.** Canopy (and/or Canopy’s Customer’s IT provider) and/or NexHealth are solely responsible for provisioning, installing, configuring, hosting, securing, maintaining, monitoring, patching, and operating any on-premises infrastructure and any on-prem NexHealth Synchronizer required to access an on-prem PMS, including networking/VPN, firewall/allowlisting, server/endpoint access, security hardening, OS/agent patching, logging/monitoring, backups, and credential/access controls. CAIS will not install, administer, access, or operate Client’s on-prem environment or the NexHealth Synchronizer/Agent.  
  * For up to the first twenty (20) Customers enabled on OSCAR and only through completion/acceptance of Phase 2, CAIS will provide commercially reasonable integration-level troubleshooting assistance only (and not OSCAR onboarding, implementation/project management, end-user training, workflow adoption, or go-live support), including: (i) providing OSCAR integration requirements and recommended configuration parameters (including, as applicable, required endpoints, ports/allowlisting guidance, and credential/connection parameter formats), (ii) participating in up to two (2) remote working sessions per Customer, up to sixty (60) minutes each, to review setup and troubleshoot integration-level connectivity/data-flow issues, (iii) reviewing relevant logs and configuration artifacts as provided by Canopy/Customer IT and/or NexHealth/vendor, (iv) validating OSCAR-side connectivity and data flow once the on-prem components are installed and operational, and (v) identifying and documenting suspected root causes and the actions required for Client/Vendor to execute. Any support beyond these limits is out of scope unless agreed in writing via change order and may be billed at CAIS’s then-current rates. Root-cause analysis and remediation of on-prem infrastructure, network/VPN, security tooling, or third-party agent failures remain Client/Vendor responsibilities unless added via change order, and OSCAR remains cloud-hosted under this SOW unless otherwise agreed in writing.

# 

# **4\. Infrastructure Requirements & On-Going Cost Responsibility**

### **4.1 Definitions: Application Environments**

For purposes of this SOW, the parties agree the following environment definitions, (“Application Environments”):

* **Development (“Dev”)**: CAIS engineering environment used for active development and automated testing; not used for Client acceptance.  
* **Staging**: Pre-release environment used for integration testing, QA, and stabilization; may be used for limited Client preview.  
* **UAT**: Client acceptance environment used primarily for Client-led test execution against agreed UAT scripts and Success Criteria.  
* **Production**: Live operational environment used by end users for day-to-day practice/DSO workflows.

### **4.2 Hosting Model and Cloud Infrastructure**

* **Hosting model:** OSCAR will be cloud-hosted under this SOW. CAIS will deploy and administer OSCAR Application Environments (Dev/Staging/UAT/Production) as required for SOW scope (Phase 1-2).  
* **Cost responsibility:** Client is responsible for all hosting and cloud infrastructure charges in all environments (including compute, storage, databases, logging/monitoring, backups, and security tooling), unless such charges are expressly included in an agreed Platform Budget or otherwise agreed in writing.  
* **Account model:** Hosting may be provided either (i) in Client’s cloud account, or (ii) in a CAIS-controlled cloud account and billed to Client as a pass-through expense subject to Section 4.4 (Provisioning and Pass-Through Expenses) and Section 4.5 (Spend Controls and Pre-Approval).

### **4.3 Third-Party Services and Cost Responsibility**

**Rule (environment-based):**

* **UAT \+ Production:** Client pays all third-party vendor costs and usage (including usage-based fees, subscriptions, minimum commits, and enterprise agreements), unless expressly included in a Platform Budget or otherwise agreed in writing.  
* **Dev \+ Staging:** Client pays all third-party vendor costs and usage except the limited CAIS-paid services in Section 4.3(a) when CAIS uses CAIS-owned accounts/keys.

To avoid commingled spend and ensure billing clarity, the parties will use separate vendor accounts/workspaces and environment-specific API keys where technically feasible.

#### 

#### **(a) CAIS-Paid Services (Dev/Staging Only; CAIS-Controlled Accounts Only)**

CAIS is responsible only for the following usage-based services, and only for Dev/Staging usage that is reasonably necessary for CAIS engineering, QA, and stabilization when CAIS provisions and uses CAIS-owned accounts/keys:

* **LLM usage** for Dev/Staging testing of AI generation features  
* **Twilio (or equivalent messaging provider)** usage for Dev/Staging testing

If Client requires use of Client-owned accounts/keys for any of the above services in Dev/Staging, Section 4.6 applies.

#### **(b) Client-Paid Services (All Other Services; All Environments Unless Included in Platform Budget)**

Client is responsible for all other third-party services and major platform expenses in all environments (excluding only the limited CAIS-paid services in Section 4.3(a) when CAIS uses CAIS-owned accounts/keys), including without limitation:

* **PMS integration / sync layer:** NexHealth Synchronizer, including Dev/Staging API calls subject to a monthly NTE as set forth in Section 4.5.  
* **Eligibility / EDI / RCM connectivity:** e.g., Vyne and/or Stedi; clearinghouse fees and related connectivity.  
* **Payments and merchant processing:** e.g., Stripe processing fees and merchant account fees.  
* **Any service with subscriptions/commits:** annual contracts, minimum commits, platform fees, add-ons, or enterprise agreements.  
* **Any additional vendor tools** requested by Client for production operations, compliance programs, analytics, or reporting beyond the Phase scope.

**Vendor contracting:** Unless explicitly stated otherwise, Client contracts directly with third-party service providers and is responsible for vendor fees, terms, renewals, and account administration.

#### **(c) UAT and Production Usage**

Unless otherwise agreed in writing, Client bears the cost of UAT and Production usage for all services, including LLM/Twilio/NexHealth, because such usage is driven by Client acceptance testing and/or operational usage.

### 

### 

### **4.4 Provisioning and Pass-Through Expenses**

If Client requests CAIS to procure, enable, upgrade, or administer any paid service on Client’s behalf (including any subscription, plan upgrade, add-on, or paid vendor workspace), it will be treated as a pass-through expense. CAIS has no obligation to front or carry recurring vendor costs unless expressly stated in this SOW.

* **Invoicing timing:** Pass-through expenses are invoiced monthly in arrears (or per vendor billing cycle) with itemized documentation reasonably available to CAIS.

### **4.5 Spend Controls and Pre-Approval (Including NexHealth Dev/Staging NTE)**

* **No unapproved spend:** CAIS will not incur any new pass-through expense or enable any new paid third-party service on Client’s behalf without Client’s prior written approval (email sufficient) identifying: (i) vendor/service, (ii) purpose, (iii) environment(s), (iv) expected one-time costs, and (v) expected recurring/usage costs.  
* **Budgets / Not-To-Exceed (“NTE”):** For material usage-based services paid by Client, the parties may set a monthly NTE by environment, including without limitation:  
  * **NexHealth Synchronizer API calls in Dev/Staging** (explicitly subject to an NTE), and  
  * UAT/Production usage for LLM/Twilio/NexHealth (as applicable).  
    If forecasted spend is expected to exceed the applicable NTE by the greater of 10% or $500.00 on a monthly basis, CAIS will notify Client and obtain written approval before continuing work that is reasonably expected to cause the overage.  
* **Optional hard caps:** Where vendors support spend caps/limits, Client may request caps. If a cap is reached, OSCAR may enter degraded mode (e.g., “AI unavailable,” “Data unavailable,” “Pending”) rather than incurring additional charges.

### **4.6 CAIS Testing Usage When Client Requires Client Accounts**

If Client requires that Client-owned accounts/keys/cards be used for Dev/Staging services (including LLM/Twilio), then:

* CAIS will use commercially reasonable efforts to segregate Dev/Staging usage (e.g., separate keys/projects) and provide usage evidence; and  
* CAIS will reimburse or credit Client for Dev/Staging usage attributable primarily to CAIS engineering/QA for LLM/Twilio, up to the agreed Dev/Staging budget/NTE, and will not continue spend above that budget/NTE without Client approval.

**Exclusions:** CAIS is not responsible for costs driven by: (i) Client-requested load testing or expanded test volumes, (ii) Client-operated campaigns or production-like usage, (iii) vendor price changes, or (iv) usage that continues after CAIS recommends pausing to control spend.

### **4.7 Reporting, Attribution, and Disputes**

* **Usage reporting:** Where practicable and within CAIS visibility, CAIS will provide a monthly usage summary for material usage-based services, including environment, date range, and key spend drivers.  
* **Attribution controls:** The parties will use separate accounts/keys per environment where practical to reduce commingling and improve charge attribution.  
* **Disputes:** Client may dispute pass-through charges within 30 days of receipt of itemized documentation. Undisputed amounts remain payable per the payment terms.

### **4.8 Vendor Changes; Third-Party Limitations**

Third-party services are outside CAIS control. CAIS is not responsible for third-party outages, rate limits, latency, schema changes, or upstream data quality issues. If vendor pricing changes or capability constraints materially affect the solution, the parties will address resulting impacts through change control.

# **5\. Platform Budget**

**5.1 Total Budget.** The total fixed professional services fee payable to CAIS for Phases 1–2 (the “Platform Budget”) is **$220,000**.

**5.2 Payment Schedule (Milestone-Based).** The Platform Budget is payable in three (3) installments:

(a) **$72,500** invoiced upon execution of this SOW and payable per Section 5.4.  
(b) **$73,750** due upon **Phase 1 Acceptance** (per Section 5.8).  
(c) **$73,750** due upon **Phase 2 Acceptance** (per Section 5.8).

**5.3 Infrastructure, Third-Party, and Ongoing Costs Excluded.** The Platform Budget covers CAIS development/delivery services only and excludes hosting/cloud infrastructure, third-party vendor fees, usage-based charges, subscriptions, minimum commits, pass-through expenses, and ongoing operating costs, except as expressly stated in Section 4 (Infrastructure Requirements & On-Going Cost Responsibility). All such costs are allocated and paid per Section 4\.

**5.4 Invoicing and Payment Terms.** CAIS will invoice at each milestone above. Net fifteen (15) days from invoice date.

**5.5 Sales/Use Taxes.** Fees are exclusive of all applicable sales, use, VAT, gross receipts, excise, or similar transaction taxes (“Transaction Taxes”). Client is responsible for Transaction Taxes associated with the Services, excluding taxes based on CAIS’s net income, property, or payroll. If CAIS is required to collect/remit Transaction Taxes, CAIS may invoice them and Client will pay per Section 5.4. If Client claims exemption, Client must provide valid exemption documentation in advance; otherwise, taxes will be charged. Client remains responsible for penalties/interest arising from missing or invalid exemption documentation.

**5.6 Administrative Access.** Upon receipt of cleared funds for the applicable milestone invoice, CAIS will provide/enable administrative access and credentials appropriate to the deliverables for that phase, consistent with the hosting/account model in Section 4\. CAIS may withhold such access and/or suspend work for overdue undisputed amounts as set forth in Section 5.11.

**5.7 Invoice Disputes.** Client must notify CAIS of any good-faith invoice dispute within ten (10) days of the invoice date and provide reasonable detail. Client will timely pay all undisputed amounts in accordance with Section 5.4. The parties will work in good faith to resolve disputed amounts promptly.

**5.8 Acceptance Package.** For each Phase, CAIS will deliver an “Acceptance Package” consisting of: (i) access to the applicable UAT/Production deliverable (as applicable), and (ii) release notes and/or a summary mapping deliverables to the applicable Requirements/Success Criteria. The acceptance period begins upon delivery of the Acceptance Package and Client’s receipt of required access/credentials and prerequisites for testing. Client will have ten (10) business days to either: (a) provide written acceptance, or (b) provide a written rejection identifying Defects with sufficient detail to reproduce and referencing the applicable Success Criteria. If Client does not respond within the acceptance period, the Phase will be deemed accepted. The acceptance period is tolled during any period Client has not provided required prerequisites for testing. Acceptance (including deemed acceptance) does not waive CAIS’s obligation to remedy Defects in accordance with the SOW.

**5.9 Punch List (Non-Blocking Items).** “Non-Blocking Punch List Items” are issues identified during UAT that do not materially impact the applicable Phase Requirements/Success Criteria and do not prevent Client from completing the applicable UAT test cases. An item qualifies as Non-Blocking only if it: (a) is cosmetic or a minor usability/formatting issue; (b) has a reasonable workaround (including “known limitation” handling expressly permitted by the SOW, such as exception logging and HITL fallback where applicable); and (c) does not involve (i) security/privacy/PHI risk, (ii) data loss/corruption, (iii) incorrect financial calculations or ledger outcomes, (iv) incorrect appointment create/update behavior where write-back is a stated requirement, (v) systemic sync failures that break core workflows, or (vi) sustained availability/performance failures that materially block normal use.

**Illustrative Examples (non-blocking, if Success Criteria are still met):**

* **UI/UX cosmetics:** layout/alignment, copy/text, label naming, minor styling inconsistencies, non-critical tooltip/help text.  
* **Reporting/export formatting:** column order, date/number formatting, CSV/PDF formatting, non-material rounding/display (not underlying calculations).  
* **Non-critical workflow polish:** default sort/filter preferences, non-blocking pagination/scroll quirks, minor notification/template wording.  
* **Edge-case handling:** isolated edge cases affecting a small subset of records/users that do not block the Phase’s required end-to-end workflows and have a workaround.  
* **Optional/nice-to-have behaviors:** enhancements not explicitly required by the Success Criteria (e.g., additional filters/views, convenience UI shortcuts).

**Not Eligible for Punch List (blocking defects):**

* Failure to meet any Success Criterion; inability to complete a required UAT test case.  
* **Data integrity** issues (mis-matched patients, duplicate creation without safe handling, missing required objects, lost updates).  
* **RCM correctness** issues (incorrect balances, charge/payment posting outcomes where in-scope, materially wrong AR/metrics).  
* **Scheduling correctness** issues (appointment create/update/write-back failures where required).  
* **Security/PHI** issues, privilege/access control issues, audit/logging gaps where required.  
* Repeated crashes, sustained timeouts, or availability/performance that materially disrupts normal operation.

**Punch List Process.** The parties will document Non-Blocking Punch List Items in writing at acceptance (including severity/priority and target fix release). CAIS will address Punch List Items in a commercially reasonable manner as part of normal remediation cadence without delaying acceptance or milestone payment; items that require new scope, changed assumptions, or third-party/vendor changes will be handled via change order.

**5.10 Third-Party / Client Readiness.** Acceptance and milestone payment are based solely on the applicable Requirements/Success Criteria. Third-party outages/limitations/behavior changes or Client/Customer environment readiness issues will not delay acceptance where OSCAR meets the SOW-defined behaviors for such conditions (e.g., logging, exception handling, workflow fallback), and any related scope/timeline impacts will be handled via change control.

**5.11 Late Payments; Suspension.** Late payments accrue interest at the lesser of 1.5% per month (18% per annum) or the maximum rate permitted by law. If any undisputed amount is more than ten (10) days past due, CAIS may suspend Services and access upon written notice until paid; resulting schedule impacts are treated as schedule extensions and remobilization effort, if any, is billable.

**IN WITNESS WHEREOF**, the Parties have caused their duly authorized representatives to execute this  Agreement as of the Effective Date:

**Canopy Dental**

Name:  
Title:   
Date:   
Signature: 

**Custom AI Studio**

Name:  
Title:   
Date:   
Signature: 

