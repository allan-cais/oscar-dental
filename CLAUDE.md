# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Oscar** is a hybrid-intelligence dental practice management platform built by Custom AI Studio (CAIS) for Canopy Dental. It operates as an overlay on existing PMS systems (OpenDental, Eaglesoft, Dentrix), progressively replacing legacy workflows without a rip-and-replace migration. The platform combines workflow automation with clinically grounded AI, targeting measurable operational outcomes across revenue cycle management, scheduling, payments, and reputation.

**Client:** Canopy Dental (John Salter, Greg Elmore)
**Development Team:** Custom AI Studio (Devin Kearns, Allan Crawford, Andrew Lewis)
**Project Start:** January 2026

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| UI | shadcn/ui + Tailwind CSS 4 |
| Backend/DB | Convex (real-time database + serverless functions) |
| Auth | Clerk (org-based multi-tenancy, RBAC, MFA) |
| Integrations | All mocked via adapter pattern (Stripe, Twilio, Google Business, OpenAI, Vyne, PMS) |

## Build & Run Commands

```bash
npm run dev          # Start Next.js dev server (Turbopack)
npm run build        # Production build — ALWAYS run after changes to verify
npm run lint         # ESLint
npx convex dev       # Start Convex dev server (requires real deployment keys)
```

**Current build status:** `npm run build` passes cleanly — 41 routes. All 8 sprints complete.

**Important:** No real Convex or Clerk deployment exists yet. The app uses placeholder keys in `.env.local`. The `ConvexClientProvider` detects placeholders and renders a setup screen. Middleware bypasses Clerk when keys are placeholders. All UI pages include inline demo data so they render without a live backend.

## Repository Structure

```
Oscar/
├── convex/                     # Convex backend (serverless functions + schema)
│   ├── _generated/             # STUB files (api.ts, server.ts, dataModel.ts)
│   ├── lib/                    # Shared helpers
│   │   ├── auth.ts             # getCurrentUser, getOrgId, requireRole
│   │   ├── tenancy.ts          # Multi-tenant query helpers
│   │   ├── audit.ts            # SHA-256 hash chain audit logging
│   │   └── permissions.ts      # Role → action permission map
│   ├── integrations/           # Mock adapter layer
│   │   ├── pms/                # PMS read/write (OpenDental/Eaglesoft/Dentrix)
│   │   ├── clearinghouse/      # Eligibility, claims, ERA
│   │   ├── payments/           # Stripe mock
│   │   ├── sms/                # Twilio mock
│   │   ├── reviews/            # Google Business mock
│   │   ├── ai/                 # OpenAI mock
│   │   └── factory.ts          # Adapter factory (mock/real swap point)
│   ├── patients/               # Patient CRUD + search
│   ├── scheduling/             # Appointment CRUD + status workflow
│   ├── claims/                 # Claims + scrubbing engine
│   ├── eligibility/            # Eligibility verification (real-time + batch)
│   ├── users/                  # User management
│   ├── practices/              # Practice settings
│   ├── providers/              # Provider CRUD
│   ├── operatories/            # Operatory CRUD
│   ├── appointmentTypes/       # Appointment type CRUD
│   ├── denials/                # Denial management + AI categorization + SLA cron
│   ├── appeals/                # Appeal lifecycle + AI letter generation
│   ├── ar/                     # A/R aging report, AI-prioritized worklist, payer behavior
│   ├── predet/                 # Pre-determination workflow
│   ├── quickfill/              # Quick Fill queue + gap-fill + AI suggest patient
│   ├── recall/                 # Recall due list generation + outreach tracking
│   ├── production/             # Production goal tracking (daily/monthly)
│   ├── perfectday/             # Perfect Day schedule templates
│   ├── textToPay/              # Payment link generation + SMS send
│   ├── cardOnFile/             # Card-on-file consent + mock tokenization
│   ├── paymentPlans/           # Payment plan CRUD + installment scheduling
│   ├── collections/            # Collection sequence workflow (Day 0→90)
│   ├── era/                    # ERA-to-claim matching + reconciliation
│   ├── reputation/             # Review dashboard + ingest + response posting
│   ├── reviewRequests/         # Review request lifecycle (create, send, batch, cron)
│   ├── sentiment/              # Sentiment analysis + reviewer-to-patient matching
│   ├── reviewResponses/        # AI response draft generation + approval workflow
│   ├── compliance/             # FTC compliance checks + request filtering
│   ├── tcpa/                   # TCPA consent management + STOP keyword processing
│   ├── notifications/          # Notification CRUD (list, mark read, dismiss, bulk create)
│   ├── health/                 # System/integration health monitoring + alerts
│   ├── feeSchedules/           # Fee schedule CRUD
│   ├── audit/                  # Audit log queries/mutations
│   ├── sync/                   # PMS sync subsystem
│   ├── schema.ts               # Full schema (~30 tables)
│   ├── seed.ts                 # Seed data (200 patients, 500 appts, etc.)
│   ├── crons.ts                # Scheduled jobs (eligibility, denial SLA, recall, production, payments, collections, review fetch, review requests)
│   └── auth.config.ts          # Clerk JWT config
├── src/
│   ├── app/
│   │   ├── (auth)/             # Clerk sign-in/sign-up pages
│   │   ├── (dashboard)/        # Main app (protected by auth)
│   │   │   ├── layout.tsx      # Dashboard shell (sidebar + topbar)
│   │   │   ├── dashboard/      # Home dashboard
│   │   │   ├── patients/       # Patient list, hub ([patientId]), match queue
│   │   │   ├── scheduling/     # Calendar view with provider columns
│   │   │   ├── rcm/            # Eligibility, claims (pipeline), denials, A/R
│   │   │   ├── payments/       # Text-to-pay, payment plans, collections, reconciliation
│   │   │   ├── reputation/     # Review monitoring + responses + requests management
│   │   │   ├── tasks/          # HITL task board (SLA timers, role-based, escalation)
│   │   │   ├── ai/             # AI actions dashboard (approve/reject, explainability, performance)
│   │   │   ├── settings/       # Practice, users, providers, operatories, appt types, fee schedules, audit log, TCPA
│   │   │   └── health/         # System health dashboard (integration status, token utilization, alerts)
│   │   ├── (onboarding)/       # 9-step onboarding wizard (no sidebar layout)
│   │   ├── layout.tsx          # Root layout (Convex + Clerk providers)
│   │   ├── page.tsx            # Landing page
│   │   └── globals.css         # Tailwind + shadcn CSS variables
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components (button, card, table, dialog, etc.)
│   │   ├── dashboard/          # Sidebar, topbar
│   │   ├── patients/           # Patient header, tabs
│   │   ├── scheduling/         # Calendar view, appointment blocks, dialogs
│   │   └── rcm/                # Eligibility card, claims pipeline, claim detail, COB prompt
│   ├── lib/
│   │   └── utils.ts            # cn() utility
│   └── middleware.ts           # Clerk auth middleware (bypasses with placeholder keys)
├── docs/                       # Planning & requirements documentation
├── .env.local                  # Environment variables (placeholder keys)
├── .env.example                # Template for env vars
└── package.json
```

## Key Architecture Decisions

### Convex Stubs (No Deployment)
- `convex/_generated/` contains STUB files since no Convex deployment exists
- `api.ts` exports `api` and `internal` as `any` objects
- `server.ts` re-exports generic Convex function builders
- `dataModel.ts` exports generic Id/Doc types
- `tsconfig.json` excludes `convex/**/*` except `convex/_generated/**/*` to avoid type errors

### Multi-Tenancy
- Clerk `org_id` = tenant identifier on every Convex table
- Every query begins with `orgId` index filter
- `getOrgId()` helper extracts from Clerk JWT; throws if missing

### Mock Integration Adapter Pattern
All integrations: `interface.ts` (contract) → `mock.ts` (prototype) → `real.ts` (future). Factory returns mock or real based on config. Business logic never references mocks directly.

### Audit Logging
- Hash chain: each entry stores `previousHash` + `entryHash`
- Append-only: no update/delete mutations on `auditLogs`
- Every PHI access logs via `createAuditLog()` helper

### HITL Task System
- Generic `tasks` table links to any resource (claim, denial, review, payment, patient)
- Role-based routing: front_desk, billing, clinical, office_manager
- SLA timers with at-risk/overdue states
- Used as fallback when PMS write-back unavailable

### Convex Crons (convex/crons.ts)
| Job | Schedule |
|-----|----------|
| Batch eligibility | Daily 5:30 AM CT |
| Denial SLA check | Every 15 min |
| Recall due list generation | Daily 6:00 AM CT |
| Production goals update | Daily 11:00 PM CT |
| Payment plan installment charge | Daily 8:00 AM CT |
| Collection sequence advance | Hourly |
| Fetch Google reviews | Every 15 min |
| Process pending review requests | Every 15 min |

## Sprint Progress

| Sprint | Status | Routes | What Was Built |
|--------|--------|--------|----------------|
| 0 | DONE | 4 | Next.js + Convex + Clerk + shadcn/ui bootstrap |
| 1 | DONE | 26 | Schema (~30 tables), auth/RBAC, audit logging, dashboard shell, mock integrations (6 adapters), user/practice settings, seed data |
| 2 | DONE | 30 | Patient CRUD + search + hub (6 tabs), match queue, appointments + calendar view, sync subsystem, admin CRUD (providers, operatories, appt types) |
| 3 | DONE | 31 | Eligibility verification (real-time + batch + 24hr cache), claims scrubbing engine (payer rules, fee schedule), claims pipeline tracker, fee schedule management, eligibility exceptions, COB prompt |
| 4 | DONE | 34 | Denial management (AI auto-categorization, SLA tracking, escalation), appeal workspace (AI letter generation, editor, lifecycle), A/R aging report (insurance/patient buckets, bar chart), AI-prioritized worklist (scoring algorithm), payer behavior analysis (flags for slow/high-denial), pre-determination workflow, one-click follow-up tasks, write-off with audit trail |
| 5 | DONE | 38 | Quick Fill queue (priority scoring, contact tracking), gap-fill toolbox (overdue hygiene, unscheduled treatment, ASAP list), AI "Suggest Patient" (ranked candidates with rationale), recall management (due list, outreach tracking, batch outreach), production goal tracking (daily/monthly gauges, provider breakdown, weekly trend, calendar heatmap), Perfect Day templates (schedule grid, balance comparison, template CRUD) |
| 6 | DONE | 38 | Text-to-Pay (payment link generation, SMS send, status tracking), card-on-file (consent recording, mock tokenization, auto-charge with limits), payment plans (creator, installment scheduling, auto-charge cron), collections sequence (Day 0→7→14→30→60→90 workflow, configurable thresholds, step history), ERA-to-claim matching (auto-match, exception queue, bulk resolve), reconciliation dashboard (matched/unmatched/exceptions tabs), overdue balance alerts |
| 7 | DONE | 39 | Reputation dashboard (Google rating, star distribution, priority alerts, recent reviews, monthly trend, AI response workflow), review requests management (eligible patients, excluded patients, request history, AI satisfaction prediction, FTC compliance checker, configurable delay settings), sentiment analysis (keyword extraction, monthly trends, reviewer-to-patient matching), AI response drafts (HIPAA PHI check, approve/edit/post workflow), review monitoring cron (every 15 min), review request processing cron (every 15 min) |
| 8 | DONE | 41 | 9-step onboarding wizard (practice profile, PMS connection, clearinghouse, templates, scheduling rules, team invite, initial sync, health check, review & launch), AI actions dashboard (pending review with explainability, action history, performance metrics, bulk approve), health dashboard (integration status grid, token utilization gauges, alert feed), TCPA compliance (consent management, STOP keyword processing, granular opt-out settings), task board (3-column board, SLA timers, role-based routing, task detail dialog), audit log viewer (search/filter, expandable details, chain integrity verification), notification center (bell icon + sheet in topbar, unread badges, mixed notification types) |

## Common Build Issues

- **Convex `_generated` stubs** must export actual values (not `declare`), or Turbopack fails
- **shadcn toast** component is deprecated → use `sonner` instead
- **Next.js 16** warns about middleware → proxy migration (non-blocking warning)
- **Node modules corruption** after package installs → `rm -rf node_modules && npm install` fixes it
- **Clerk key validation** — Clerk validates publishable key format at build time; provider detects placeholders and shows setup screen instead

## Phase Roadmap

### Phase 1 (Months 1-2): Revenue Engine
- **RCM Core:** Eligibility verification (<30s real-time, batch by 6AM), claims scrubbing (98%+ clean rate), denial management (70%+ appeal success), A/R worklists
- **Smart Scheduling:** Gap-fill, Quick Fill queue, recall management, production goal tracking, Perfect Day templates
- **Text-to-Pay:** Payment links via SMS (Stripe), card-on-file, payment plans, automated collections sequence
- **Reputation Engine:** Automated review requests, Google Business monitoring, AI sentiment analysis, AI response drafts
- **Platform Foundations:** Master Patient Index (MPI), data sync subsystem, audit logging, RBAC, tenant isolation

### Phase 2 (Months 3-5): Automated Office Manager
- AI Daily Huddle & KPI Board (delivered by 6AM daily)
- Staff Task Automation (event-driven, role-based routing, SLA tracking)
- HR & Compliance Tracker
- Inventory Tracking (FIFO lot management)
- DSO/Network Views (multi-practice rollup)

### Phase 3 (Future): Clinical Intelligence
- Oscar Scribe (voice-to-documentation)
- FMX Imaging compliance tracking
- Treatment Opportunity Mining

## Third-Party Integrations

| Service | Provider | Phase | Constraints |
|---------|----------|-------|-------------|
| PMS (OpenDental) | OpenDental API | 1 | Full read/write |
| PMS (Eaglesoft) | Koalla API | 1 | **READ-ONLY** — no scheduling, payment posting, or claim updates |
| PMS (Dentrix) | Koalla API | 1 | **READ-ONLY** — same limitations as Eaglesoft |
| PMS Sync Layer | NexHealth Synchronizer | 1-2 | Read/pull by default; write only for explicitly scoped objects |
| Payments | Stripe | 1 | No built-in HIPAA/PCI compliance layer — must be built |
| Claims | Vyne Dental | 1 | $40K/year; claim submission only |
| SMS | Twilio | 1 | Cost scales with volume |
| Reviews | Google Business Profile API | 1 | Review fetch + response posting |
| LLM | OpenAI | 1-2 | AI responses, commentary, denial analysis |
| Computer Vision | Roboflow | 3 | Prototype only — export model restrictions |
| Transcription | Whisper | 3 | Voice-to-text for clinical scribe |

**Critical constraint:** Eaglesoft and Dentrix are read-only via Koalla. Smart Scheduling write-back, Text-to-Pay reconciliation, and claim status updates cannot be automated for these PMS systems. Oscar provides HITL (human-in-the-loop) fallback workflows with work packets/tasks instead.

## Compliance Requirements

- **HIPAA:** Required for all PHI handling, audit logging, encrypted storage
- **PCI-DSS:** Required for payment processing (Level 1 via Stripe as service provider; validation costs are client responsibility)
- **TCPA:** SMS opt-out (STOP keyword) honored immediately; consent tracked with timestamp/source; granular opt-out by message type
- **FTC:** No incentives in review requests
- **Audit Logging:** Immutable, tamper-evident logs for all PHI access and patient-impacting actions

## SLA Targets

| Metric | Target |
|--------|--------|
| Clean Claim Rate | >= 98% |
| Days to Submit Claim | < 24 hours |
| A/R (Insurance) | < 30 days |
| Denial Rate | < 5% |
| Appeal Success Rate | >= 70% |
| Eligibility Verification | >= 95% verified |
| Real-time Eligibility | < 30 seconds |
| Review Conversion | >= 15% |
| Google Rating | >= 4.5 stars |
| Review Response Time | < 24 hours |
| Payment Collection | >= 85% |
| Schedule Fill Rate | >= 90% |

## Acceptance Criteria Summary

Phase 1 has ~212 criteria across 28 categories. Key category prefixes:
- `REP.*` — Reputation Engine (12 items, 100% required)
- `ELIG.*` — Eligibility Verification (7 items, 100% required)
- `SCRUB.*` — Claims Scrubbing (7 items, 100% required)
- `DENIAL.*` — Denial Management (6 items, 100% required)
- `AR.*` — A/R Management (5 items, 100% required)
- `QUICKFILL.*` — Quick Fill & Gap Management (6 items, 95% required)
- `RECALL.*` — Recall Management (5 items, 95% required)
- `COLLECT.*` — Collections (7 items, 100% required)
- `TCPA.*` — Communication Compliance (7 items, 100% required)
- `SLA.*` — Performance Targets (12 items, 80% required)
- `AUTH/PWD/AUDIT/HIPAA/PCI.*` — Security & Compliance (32 items, 100% required)
- `PMS.*` — Standalone PMS Requirements (12 items, across Phase 1-2)

## Scope Exclusions

- Full historical data migration (forward-looking sync only)
- On-prem infrastructure management (client/NexHealth responsibility)
- FDA regulatory filings
- Phase 2/3 modules during Phase 1
- Payer-outcome guarantees (CAIS delivers workflow/tracking; payer behavior is outside control)
- PCI annual validation costs (client responsibility)
