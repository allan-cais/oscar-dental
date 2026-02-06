# **OSCAR PMS**

Phase 1 MVP Acceptance Criteria

Comprehensive Development Team Deliverable Checklist

| Document Version: | 2.0 |
| :---- | :---- |
| **Date:** | January 7, 2026 |
| **Document Owner:** | Canopy Technologies |
| **Reviewed By:** | Greg Elmore |
| **Total Criteria:** | \~212 criteria across 28 categories |
| **Key Features:** | \#1 RCM Core, \#2 Smart Scheduling, \#3 Text-to-Pay, \#4 Reputation Engine |

# **1\. Phase 1 MVP Definition (17 checkpoints)**

| \# | MVP Requirement | Status |
| :---: | ----- | :---: |
| **1** | Parallel operation with legacy PMS without data loss or conflicts | ☐ Pass  ☐ Fail |
| **2** | OSCAR authoritative for Phase 1 features (scheduling, RCM, communications, payments, reputation) | ☐ Pass  ☐ Fail |
| **3** | Client/patient identification mapped between OSCAR and legacy PMS | ☐ Pass  ☐ Fail |
| **4** | Accessible via mobile app (iOS/Android) AND desktop web app | ☐ Pass  ☐ Fail |
| **5** | Database schema defined for ALL THREE PHASES | ☐ Pass  ☐ Fail |
| **6** | All Phase 1 integrations decided, implemented, and verifiable | ☐ Pass  ☐ Fail |
| **7** | UAT completed using real integrated PMS environment | ☐ Pass  ☐ Fail |
| **8** | HIPAA compliant for all built functionality | ☐ Pass  ☐ Fail |
| **9** | PCI DSS compliant for payment functionality | ☐ Pass  ☐ Fail |
| **10** | Immutable audit logging with tamper-evident verification | ☐ Pass  ☐ Fail |
| **11** | Headless RCM verification with \<60 sec response | ☐ Pass  ☐ Fail |
| **12** | Payment reconciliation (integration or AI) with dashboard | ☐ Pass  ☐ Fail |
| **13** | Agentic AI grounding logic documented and implemented | ☐ Pass  ☐ Fail |
| **14** | Automated customer onboarding with best practice defaults | ☐ Pass  ☐ Fail |
| **15** | Health API for system and per-customer monitoring | ☐ Pass  ☐ Fail |
| **16** | Reputation Engine with Google Business integration | ☐ Pass  ☐ Fail |
| **17** | TCPA-compliant communications (SMS opt-out, consent tracking) | ☐ Pass  ☐ Fail |

# **2\. Reputation Engine (REP) \- 12 items \- 100% Required**

**📋 Requirement Note:** *Reputation Engine is Key Feature \#4. Must automate review requests, monitor reviews, and provide AI-powered response management. Google Business is Phase 1 priority.*

| ID | Criterion | Validation | Pass/Fail |
| ----- | ----- | ----- | :---: |
| **REP.01** | Review request triggered automatically after checkout/payment | Complete checkout; verify request sent | ☐ Pass  ☐ Fail |
| **REP.02** | AI satisfaction prediction filters low-score patients | Low-satisfaction patient skipped; routed to internal follow-up | ☐ Pass  ☐ Fail |
| **REP.03** | Google Business Profile API integration functional | Reviews fetched; response posted via API | ☐ Pass  ☐ Fail |
| **REP.04** | Review monitoring with \<15 min alert for new reviews | Post test review; alert received \<15 min | ☐ Pass  ☐ Fail |
| **REP.05** | Priority alert for 1-2 star reviews (SMS \+ email) | 1-star review triggers immediate alert | ☐ Pass  ☐ Fail |
| **REP.06** | Sentiment analysis categorizes reviews (positive/neutral/negative) | Review sentiment auto-tagged correctly | ☐ Pass  ☐ Fail |
| **REP.07** | AI-generated response drafts (HIPAA-compliant, no PHI) | Response generated \<30 sec; no PHI present | ☐ Pass  ☐ Fail |
| **REP.08** | Negative review auto-creates follow-up task with patient match attempt | 1-3 star review creates task; patient linked if found | ☐ Pass  ☐ Fail |
| **REP.09** | FTC compliance: No incentives in review requests | Templates reviewed; no incentive language | ☐ Pass  ☐ Fail |
| **REP.10** | Request filtering: excludes recent complaints, recent requests | Patient with complaint not sent request | ☐ Pass  ☐ Fail |
| **REP.11** | Reputation dashboard: current rating, volume, trends | Dashboard displays accurate metrics | ☐ Pass  ☐ Fail |
| **REP.12** | Review request configurable delay (1-24 hours post-visit) | Delay setting honored; request sent at configured time | ☐ Pass  ☐ Fail |

# **3\. Pre-Determination (PREDET) \- 6 items \- 100% Required**

**📋 Requirement Note:** *Pre-determination must be triggered at scheduling when procedures are added. Patient notification of costs is critical for treatment acceptance.*

| ID | Criterion | Validation | Pass/Fail |
| ----- | ----- | ----- | :---: |
| **PREDET.01** | Auto-prompt to submit pre-det when procedures added to appointment | Add procedures; prompt appears | ☐ Pass  ☐ Fail |
| **PREDET.02** | Insurance-specific expected response time displayed | Prompt shows carrier-specific timeline | ☐ Pass  ☐ Fail |
| **PREDET.03** | Patient SMS notification when pre-det submitted | Submit pre-det; patient receives SMS | ☐ Pass  ☐ Fail |
| **PREDET.04** | Patient SMS notification when pre-det response received with cost breakdown | Pre-det response; SMS with copay/deductible sent | ☐ Pass  ☐ Fail |
| **PREDET.05** | Treatment plan amounts lock after pre-det response (supervisor override required) | Attempt change; blocked without override | ☐ Pass  ☐ Fail |
| **PREDET.06** | Smart Pre-Estimate (AI) available when carrier doesn't support real-time | Non-real-time carrier; AI estimate displayed | ☐ Pass  ☐ Fail |

# **4\. Eligibility Verification (ELIG) \- 7 items \- 100% Required**

**📋 Requirement Note:** *Eligibility must run batch by 6 AM for next-day appointments AND support real-time verification in \<30 seconds. Benefits must translate to patient costs.*

| ID | Criterion | Validation | Pass/Fail |
| ----- | ----- | ----- | :---: |
| **ELIG.01** | Batch eligibility verification runs by 6 AM for next-day appointments | Check batch completion time; all next-day verified | ☐ Pass  ☐ Fail |
| **ELIG.02** | Real-time eligibility verification \<30 seconds at scheduling | Schedule appointment; measure response time | ☐ Pass  ☐ Fail |
| **ELIG.03** | Eligibility results cached for 24 hours | Re-verify same patient; cache hit logged | ☐ Pass  ☐ Fail |
| **ELIG.04** | Benefits breakdown shows deductible, max, copay percentages | Verify all benefit fields populated | ☐ Pass  ☐ Fail |
| **ELIG.05** | Patient cost calculator translates benefits to out-of-pocket estimate | View estimate; shows patient portion accurately | ☐ Pass  ☐ Fail |
| **ELIG.06** | Exception report generated for verification failures | Fail verification; appears on exception report | ☐ Pass  ☐ Fail |
| **ELIG.07** | COB validation prompts when secondary insurance entered | Add secondary; COB prompt appears | ☐ Pass  ☐ Fail |

# **5\. Claims Scrubbing (SCRUB) \- 6 items \- 100% Required**

**📋 Requirement Note:** *Claims scrubbing must achieve 98%+ clean claim rate. Payer-specific rules and attachment requirements must be enforced before submission.*

| ID | Criterion | Validation | Pass/Fail |
| ----- | ----- | ----- | :---: |
| **SCRUB.01** | Auto-claim generation from completed appointments | Complete checkout; claim auto-created | ☐ Pass  ☐ Fail |
| **SCRUB.02** | Payer-specific rules engine validates before submission | Submit to test payer; rules applied | ☐ Pass  ☐ Fail |
| **SCRUB.03** | Missing/invalid data flagged before submission | Submit incomplete claim; errors shown | ☐ Pass  ☐ Fail |
| **SCRUB.04** | Procedure code combination validation | Invalid combo flagged; valid combo passes | ☐ Pass  ☐ Fail |
| **SCRUB.05** | Attachment requirements enforced (e.g., D4341 narratives) | Submit D4341 without narrative; blocked | ☐ Pass  ☐ Fail |
| **SCRUB.06** | Correct fee schedule auto-applied by payer | Verify fees match payer contract | ☐ Pass  ☐ Fail |

# **6\. Denial Management (DENIAL) \- 6 items \- 100% Required**

**📋 Requirement Note:** *AI-powered denial management must categorize denials, suggest actions, and generate appeal letters. Target: 70%+ appeal success rate.*

| ID | Criterion | Validation | Pass/Fail |
| ----- | ----- | ----- | :---: |
| **DENIAL.01** | Denial auto-categorization by reason code | Receive denial; category auto-assigned | ☐ Pass  ☐ Fail |
| **DENIAL.02** | AI determines if denial is appealable vs. write-off | AI recommendation displayed with rationale | ☐ Pass  ☐ Fail |
| **DENIAL.03** | AI-generated appeal letter draft | Appeal letter generated \<60 sec | ☐ Pass  ☐ Fail |
| **DENIAL.04** | Appeal submission and status tracking | Submit appeal; status updates tracked | ☐ Pass  ☐ Fail |
| **DENIAL.05** | Denial response SLA \<24 hours (decision logged) | Denial received; action taken \<24 hr | ☐ Pass  ☐ Fail |
| **DENIAL.06** | Corrective action suggestions for fixable denials | Fixable denial shows correction steps | ☐ Pass  ☐ Fail |

# **7\. A/R Management (AR) \- 5 items \- 100% Required**

**📋 Requirement Note:** *A/R management must provide aging buckets, AI-prioritized worklist, and collection probability scoring. Target: \<30 days average A/R.*

| ID | Criterion | Validation | Pass/Fail |
| ----- | ----- | ----- | :---: |
| **AR.01** | A/R aging report with 30/60/90/120 day buckets | Report shows accurate aging by bucket | ☐ Pass  ☐ Fail |
| **AR.02** | AI-prioritized follow-up worklist by collection probability | Worklist ordered by AI score; rationale shown | ☐ Pass  ☐ Fail |
| **AR.03** | One-click follow-up actions from worklist | Click action; task/call/note created | ☐ Pass  ☐ Fail |
| **AR.04** | Automated reminder sequences for aged A/R | Account ages; automated reminder sent | ☐ Pass  ☐ Fail |
| **AR.05** | Payer behavior pattern analysis and alerts | Slow payer flagged; pattern displayed | ☐ Pass  ☐ Fail |

# **8\. Quick Fill & Gap Management (QUICKFILL) \- 6 items \- 95% Required**

**📋 Requirement Note:** *Intelligent gap-filling must protect production goals. Quick Fill queue manages patients willing to come on short notice.*

| ID | Criterion | Validation | Pass/Fail |
| ----- | ----- | ----- | :---: |
| **QUICKFILL.01** | Quick Fill queue with patient prioritization by value/urgency | Queue displays patients ranked by score | ☐ Pass  ☐ Fail |
| **QUICKFILL.02** | Gap-fill toolbox: overdue hygiene, unscheduled treatment, ASAP list | Each source accessible; patients listed | ☐ Pass  ☐ Fail |
| **QUICKFILL.03** | AI 'Suggest Patient' for open slot with production goal awareness | Open slot; AI suggests patient matching goal | ☐ Pass  ☐ Fail |
| **QUICKFILL.04** | Production goal tracking dashboard (daily/monthly targets) | Dashboard shows current vs. target production | ☐ Pass  ☐ Fail |
| **QUICKFILL.05** | Cancellation triggers automatic gap-fill outreach | Cancel appointment; outreach initiated | ☐ Pass  ☐ Fail |
| **QUICKFILL.06** | Perfect Day template enforcement (schedule balance) | Template configured; scheduling respects balance | ☐ Pass  ☐ Fail |

# **9\. Recall Management (RECALL) \- 5 items \- 95% Required**

**📋 Requirement Note:** *Recall management automates recare scheduling. Patients due for hygiene/periodic exams must be contacted proactively.*

| ID | Criterion | Validation | Pass/Fail |
| ----- | ----- | ----- | :---: |
| **RECALL.01** | Recall due list generated automatically from last visit \+ interval | Patient 6 mo post-prophy appears on recall list | ☐ Pass  ☐ Fail |
| **RECALL.02** | Automated recall outreach sequence (SMS, email, phone) | Patient due; outreach sequence starts | ☐ Pass  ☐ Fail |
| **RECALL.03** | Pre-appointment scheduling at checkout | Checkout prompts next hygiene scheduling | ☐ Pass  ☐ Fail |
| **RECALL.04** | Overdue recall report with aging | Report shows patients overdue 1/2/3+ months | ☐ Pass  ☐ Fail |
| **RECALL.05** | Recall interval configurable by procedure type | Different intervals set; correctly applied | ☐ Pass  ☐ Fail |

# **10\. Collections Sequence (COLLECT) \- 6 items \- 100% Required**

**📋 Requirement Note:** *Collections sequence escalates from friendly reminder to statement to collections. Payment plans must be available for large balances.*

| ID | Criterion | Validation | Pass/Fail |
| ----- | ----- | ----- | :---: |
| **COLLECT.01** | Automated payment reminder sequence (Day 0, 7, 14, 30, 60, 90\) | Balance ages; reminders sent at intervals | ☐ Pass  ☐ Fail |
| **COLLECT.02** | Patient statement generation within 48 hours of insurance payment | ERA posted; statement generated \<48 hr | ☐ Pass  ☐ Fail |
| **COLLECT.03** | Payment plan creation and auto-charge scheduling | Plan created; auto-charges execute on schedule | ☐ Pass  ☐ Fail |
| **COLLECT.04** | Card-on-file auto-charge for outstanding balances (with consent) | Consent recorded; balance charged to card | ☐ Pass  ☐ Fail |
| **COLLECT.05** | Collections escalation thresholds configurable | Thresholds set; escalation follows rules | ☐ Pass  ☐ Fail |
| **COLLECT.06** | Collections worklist with balance aging and contact history | Worklist shows aged balances and attempts | ☐ Pass  ☐ Fail |

# **11\. TCPA Communication Compliance (TCPA) \- 5 items \- 100% Required**

**📋 Requirement Note:** *All SMS communications must be TCPA-compliant. Opt-out must be honored immediately. Consent must be tracked and auditable.*

| ID | Criterion | Validation | Pass/Fail |
| ----- | ----- | ----- | :---: |
| **TCPA.01** | SMS opt-out (STOP keyword) honored immediately | Reply STOP; no further SMS sent | ☐ Pass  ☐ Fail |
| **TCPA.02** | SMS consent tracked with timestamp and source | Consent record shows date/time/method | ☐ Pass  ☐ Fail |
| **TCPA.03** | Communication preferences stored per patient (SMS, email, phone) | Preferences set; honored in outreach | ☐ Pass  ☐ Fail |
| **TCPA.04** | Opt-out list maintained and checked before send | Opted-out patient not contacted via SMS | ☐ Pass  ☐ Fail |
| **TCPA.05** | Message templates include required opt-out instructions | Templates include 'Reply STOP to opt out' | ☐ Pass  ☐ Fail |

# **12\. SLA Performance Targets (SLA) \- 12 items \- 80% Required**

**📋 Requirement Note:** *These operational KPIs must be measurable and reportable. Targets derived from RCM Core, Smart Scheduling, and Reputation Engine documents.*

| ID | Metric | Target | Measurement | Pass/Fail |
| ----- | ----- | ----- | ----- | :---: |
| **SLA.01** | Clean Claim Rate | ≥98% | Accepted / Submitted | ☐ Pass  ☐ Fail |
| **SLA.02** | Days to Submit Claim | \<24 hours | Service → Submission | ☐ Pass  ☐ Fail |
| **SLA.03** | Days in A/R (Insurance) | \<30 days | Average outstanding | ☐ Pass  ☐ Fail |
| **SLA.04** | Denial Rate | \<5% | Denied / Total | ☐ Pass  ☐ Fail |
| **SLA.05** | Appeal Success Rate | ≥70% | Won / Submitted | ☐ Pass  ☐ Fail |
| **SLA.06** | Eligibility Verification Rate | ≥95% | Verified / Appointments | ☐ Pass  ☐ Fail |
| **SLA.07** | Pre-Determination Rate (where required) | ≥90% | Submitted / Required | ☐ Pass  ☐ Fail |
| **SLA.08** | Review Request → Review Conversion | ≥15% | Reviews / Requests | ☐ Pass  ☐ Fail |
| **SLA.09** | Google Star Rating | ≥4.5 stars | Current rating | ☐ Pass  ☐ Fail |
| **SLA.10** | Review Response Time | \<24 hours | Review → Response | ☐ Pass  ☐ Fail |
| **SLA.11** | Payment Collection Rate | ≥85% | Collected / Billed | ☐ Pass  ☐ Fail |
| **SLA.12** | Schedule Fill Rate | ≥90% | Filled / Available slots | ☐ Pass  ☐ Fail |

# **13\. Onboarding (ONBOARD) \- 9 items \- 100% Required**

Practice profile, PMS connection, clearinghouse, templates, scheduling rules, user provisioning, initial sync, health check, best practice defaults.

# **14\. Health API (HEALTH) \- 10 items \- 100% Required**

System health endpoint, per-customer health, integration health, transaction timing with architecture breakdown, per-customer utilization, AI token utilization (total), AI token utilization (per customer), health dashboard, alerting, historical data.

# **15\. Operations (OPS) \- 4 items \- 100% Required**

Backup strategy, disaster recovery (RTO \<4hr, RPO \<1hr), practice admin dashboard, customer support tooling.

# **16\. RCM Validation (RCM.V \+ DET) \- 10 items \- 100% Required**

Headless eligibility, preauth (\<60 sec), claims, ERA, claim status. Carrier capability matrices, clearinghouse selection.

# **17\. Payment Reconciliation (RECON) \- 6 items \- 100% Required**

ERA-to-claim matching (\>95%), patient payment matching (\>90%), bank deposit reconciliation, exception queue, dashboard, implementation approach.

# **18\. Agentic AI (AI \+ UI.AI) \- 13 items \- 100% Required**

Grounding spec, confidence thresholds, action constraints, audit trail, feedback loop, graceful degradation, no hallucination. Dashboard, confidence scores, approve/reject, drill-down, exception queue, bulk approve.

# **19\. Security & Compliance \- 32 items \- 100% Required**

AUTH.01-07 (7), PWD.01-05 (5), AUDIT.01-07 (7), HIPAA.01-07 (7), PCI.01-06 (6). All security criteria mandatory.

# **20\. Database, App, Integration, Monitoring \- 26 items \- 100% Required**

DB.01-06 (6), APP.01-05 (5), INT.01-09 (9), MON.01-06 (6). Schema, mobile/web apps, all integrations, Prometheus/Grafana.

# **21\. Features \- 27 items \- 95% Required**

PAT.01-05, SCHED.01-05, RCM.01-05, COMM.01-04, PAY.01-04, ANLYT.01-04. Core feature functionality.

# **22\. UAT \- 8 items \- 100% Required**

Real PMS, 2-week parallel operation, OSCAR authoritative, patient mapping validated, clinical sign-off.

# **23\. Acceptance Summary**

| Category | Total | Required | Threshold | Pass/Fail |
| ----- | :---: | :---: | :---: | :---: |
| **Reputation Engine (REP)** | 12 | 12 | **100%** | ☐ Pass  ☐ Fail |
| **Pre-Determination (PREDET)** | 6 | 6 | **100%** | ☐ Pass  ☐ Fail |
| **Eligibility (ELIG)** | 7 | 7 | **100%** | ☐ Pass  ☐ Fail |
| **Claims Scrubbing (SCRUB)** | 6 | 6 | **100%** | ☐ Pass  ☐ Fail |
| **Denial Management (DENIAL)** | 6 | 6 | **100%** | ☐ Pass  ☐ Fail |
| **A/R Management (AR)** | 5 | 5 | **100%** | ☐ Pass  ☐ Fail |
| **Quick Fill (QUICKFILL)** | 6 | 6 | **95%** | ☐ Pass  ☐ Fail |
| **Recall Management (RECALL)** | 5 | 5 | **95%** | ☐ Pass  ☐ Fail |
| **Collections (COLLECT)** | 6 | 6 | **100%** | ☐ Pass  ☐ Fail |
| **TCPA Compliance (TCPA)** | 5 | 5 | **100%** | ☐ Pass  ☐ Fail |
| **SLA Targets (SLA)** | 12 | 10 | **80%** | ☐ Pass  ☐ Fail |
| **Onboarding (ONBOARD)** | 9 | 9 | **100%** | ☐ Pass  ☐ Fail |
| **Health API (HEALTH)** | 10 | 10 | **100%** | ☐ Pass  ☐ Fail |
| **Operations (OPS)** | 4 | 4 | **100%** | ☐ Pass  ☐ Fail |
| **RCM Validation (RCM.V \+ DET)** | 10 | 10 | **100%** | ☐ Pass  ☐ Fail |
| **Reconciliation (RECON)** | 6 | 6 | **100%** | ☐ Pass  ☐ Fail |
| **Agentic AI (AI \+ UI.AI)** | 13 | 13 | **100%** | ☐ Pass  ☐ Fail |
| **Security (AUTH+PWD+AUDIT)** | 19 | 19 | **100%** | ☐ Pass  ☐ Fail |
| **Compliance (HIPAA+PCI)** | 13 | 13 | **100%** | ☐ Pass  ☐ Fail |
| **Database (DB)** | 6 | 6 | **100%** | ☐ Pass  ☐ Fail |
| **Application (APP)** | 5 | 5 | **100%** | ☐ Pass  ☐ Fail |
| **Integration (INT)** | 9 | 9 | **100%** | ☐ Pass  ☐ Fail |
| **Monitoring (MON)** | 6 | 5 | **80%** | ☐ Pass  ☐ Fail |
| **Features** | 27 | 26 | **95%** | ☐ Pass  ☐ Fail |
| **UAT** | 8 | 8 | **100%** | ☐ Pass  ☐ Fail |

**Total Criteria: \~212** across 28 categories

## **Sign-Off**

| Role | Name / Signature | Date |
| ----- | ----- | ----- |
| Product Owner (Canopy) |  |  |
| Development Lead |  |  |
| QA Lead |  |  |
| Reviewed By (Greg Elmore) |  |  |
| Clinical Advisor (Natalie) |  |  |

*— End of Document —*