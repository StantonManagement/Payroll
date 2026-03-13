# Payroll & Invoicing System
Replaces Stanton Management's spreadsheet-driven weekly payroll and property billing with an auditable, approval-gated system that preserves history, surfaces management fees as explicit line items, and scales across portfolios without manual rebuilds.

## Features

### Workyard Time Card Ingestion
- **Status:** partial
- **Description:** Pulls approved time cards from the Workyard API with CSV fallback, performs S-code matching, and routes flagged entries to the correction queue.
- **Blockers:** Reliability depends on fallback/manual correction workflows; full API-first ingestion not yet stable.
- **Dependencies:** none
- **Unlocks:** Timesheet Adjustment Workbench, Cost Allocation Engine, end-to-end payroll run
- **Effort:** medium
- **Priority:** P1

### Timesheet Adjustment Workbench
- **Status:** partial
- **Description:** Week-grid-first interface for reassign/add/spread/remove operations with pending state handling, carry-forward for locked prior weeks, and a throughput target of <30 seconds per unallocated block.
- **Blockers:** none
- **Dependencies:** none
- **Unlocks:** Cost Allocation Engine, Approval Gates
- **Effort:** large
- **Priority:** P1

### Employee / Rate / Department Split Management
- **Status:** partial
- **Description:** Master employee records with effective-dated rates, compensation flags, and salaried department split defaults with audited overrides.
- **Blockers:** none
- **Dependencies:** none
- **Unlocks:** Cost Allocation Engine, ADP Export
- **Effort:** medium
- **Priority:** P2

### Cost Allocation Engine
- **Status:** planned
- **Description:** Direct labor, unit-weighted portfolio spread, and explicit management fee calculation per billing entity — replicates and replaces the 1,359-row Excel Summary sheet.
- **Blockers:** none
- **Dependencies:** none
- **Unlocks:** Invoice Generator, Statement Generator, Pre-Fund Cash Estimate
- **Effort:** large
- **Priority:** P1

### Approval Gates + Immutable Weekly Locking
- **Status:** planned
- **Description:** Enforced sequential approval chain (timesheet → payroll → invoices → statement → ADP export) with audit trail and post-approval lock preventing silent edits.
- **Blockers:** none
- **Dependencies:** none
- **Unlocks:** History Store, full end-to-end payroll run
- **Effort:** large
- **Priority:** P1

### Invoice Generator
- **Status:** planned
- **Description:** Per-LLC invoice generation with explicit management fee line items — Park Portfolio sub-LLCs get individual invoices.
- **Blockers:** none
- **Dependencies:** none
- **Unlocks:** Statement Generator
- **Effort:** medium
- **Priority:** P1

### Statement Generator
- **Status:** planned
- **Description:** Consolidated weekly statement rolling up all LLC invoices with error-check logic and release gates.
- **Blockers:** none
- **Dependencies:** none
- **Unlocks:** ADP Export, bank transfer readiness
- **Effort:** medium
- **Priority:** P2

### ADP Export + Inbound Reconciliation
- **Status:** planned
- **Description:** Outbound gross pay summary for Kathleen to submit to ADP, plus inbound ADP report upload with automatic variance detection and tracking.
- **Blockers:** none
- **Dependencies:** none
- **Unlocks:** Full payroll loop closure, variance auditing
- **Effort:** medium
- **Priority:** P2

### Expense & Reimbursement Submission
- **Status:** planned
- **Description:** Receipt-required, mobile-first expense submission with two paths (employee self-submit and in-office proxy), payment method routing, batch submission with signature attestation, and gas auto-allocation by property visit pattern.
- **Blockers:** none
- **Dependencies:** none
- **Unlocks:** Complete reimbursement tracking, Kathleen bookkeeping queue
- **Effort:** large
- **Priority:** P2

### Management Fee Configuration
- **Status:** planned
- **Description:** Per-portfolio configurable management fee rates with effective dating, visible in admin UI.
- **Blockers:** Rate values for existing portfolios need management input at setup time.
- **Dependencies:** none
- **Unlocks:** Invoice Generator explicit fee line items
- **Effort:** small
- **Priority:** P1

### History Store + Excel Export
- **Status:** planned
- **Description:** Immutable approved-week records that are queryable and exportable as Excel for downstream workflows.
- **Blockers:** none
- **Dependencies:** none
- **Unlocks:** Cost-Per-Unit Intelligence Layer, historical payroll queries
- **Effort:** medium
- **Priority:** P1

### Cost-Per-Unit Intelligence Layer
- **Status:** planned
- **Description:** Per-property and portfolio cost trend dashboard with rolling averages, comparisons, sparklines, and budget-threshold alerts.
- **Blockers:** Insufficient approved historical week volume; budget threshold amounts pending management input.
- **Dependencies:** none
- **Unlocks:** Proactive cost management, portfolio performance visibility
- **Effort:** large
- **Priority:** P3

### Workyard Reliability Tracking
- **Status:** planned
- **Description:** Surfaces employee-level dependency on manual entry vs Workyard to focus operational coaching.
- **Blockers:** none
- **Dependencies:** none
- **Unlocks:** Operational coaching insights, import quality improvement
- **Effort:** small
- **Priority:** P3

### Portfolio Expansion Onboarding
- **Status:** planned
- **Description:** Admin-driven flows for adding new portfolios, external projects, and divergent invoice structures without dev work.
- **Blockers:** none
- **Dependencies:** none
- **Unlocks:** Business scalability without engineering bottleneck
- **Effort:** medium
- **Priority:** P3

### Mileage + SMS Confirmation Paths
- **Status:** planned
- **Description:** Schema-ready placeholders for future mileage reimbursement (via Workyard mileage data) and SMS employee hour confirmation.
- **Blockers:** none
- **Dependencies:** none
- **Unlocks:** Future automation without schema rework
- **Effort:** small
- **Priority:** P3

## Recent Changes
- Prioritize publishable Supabase keys over legacy revoked keys
- Recover login when legacy Supabase API key is revoked
- Harden Supabase auth env handling and upgrade ESLint
- Consolidate planning into PLAN.md as single operational source of truth
- Harden Supabase client auth init for missing Vercel env vars
- Harden payroll middleware against env/auth edge failures
- Fix payroll prerender by wrapping useSearchParams pages in Suspense
- Add admin property creation flow with owner and unit fields
- Fix Workyard timecards API filter format; enable Turbopack
- Implement workflow audit fixes: navigation, ADP export, dept splits, locks, history, per-week context links

## Known Debt
- RLS policies are permissive `USING (true)` for authenticated users — must be tightened to portfolio-level filtering before multi-portfolio deployment.
- Workyard ingestion still depends on fallback/manual correction rather than reliable API-first path.
- No immutable locking or approval enforcement yet — data can be silently edited post-review.
- Budget threshold alerts require management-provided values that have not been supplied.
- Legacy docs (PAYROLL_PRD.md, TIMESHEET_ADJUSTMENT_PRD.md, etc.) still exist alongside consolidated PLAN.md — candidates for cleanup.

## Next Milestone
Complete Phase 1 — run one full weekly payroll and billing cycle end-to-end with zero Excel dependency.

## Triage Flags
- **RLS posture:** Current permissive policies are a known gap; must be resolved before any multi-portfolio rollout.
- **Cost allocation engine:** Not yet built — this is the most complex module and blocks invoice/statement generation.
- **Approval gates:** No enforcement exists yet; managers can edit data at any stage without audit trail.

---

## Source Consolidation
This file consolidates planning content formerly maintained in:
- PAYROLL_PRD.md
- TIMESHEET_ADJUSTMENT_PRD.md
- TIMESHEET_ADJUSTMENT_UI_SPEC.md
- EXPENSE_REIMBURSEMENT_PRD.md
- DATABASE_ARCHITECTURE.md
- ADVANCED_DATA_TABLE_SPECIFICATION.md

## Core Operating Modules (Consolidated)
1. Workyard ingestion (approved cards only) plus CSV fallback, including S-code matching and flagged-entry routing.
2. Timesheet adjustment workflow for reassign/add/spread/remove, pending state handling, and carry-forward for locked prior weeks.
3. Employee/rate management with effective-dated records, compensation flags, and salaried department split defaults/overrides.
4. Adjustment manager for phone/tool/advance/deduction flows and payroll-impact logic.
5. Cost allocation engine for direct labor, unit-weighted spread, management fee calculation, and pre-fund estimate.
6. Invoice generation by legal billing entity with explicit fee line items.
7. Statement generation with release checks.
8. ADP outbound export and inbound reconciliation.
9. History store for immutable approved weeks and exports.
10. Intelligence layer (cost-per-unit trends, portfolio comparisons, alerts) after history accrues.

## Timesheet Adjustment UX Direction (Consolidated)
- Week-grid-first interface (rows: properties, columns: days + total) instead of modal-first workflow.
- Unallocated row is always prominent; unresolved/pending counts visible in header.
- Inline action drawer per selected cell with Quick Assign, Split, Spread to Portfolio, Mark Pending, and Edit/Remove as context allows.
- Separate Manual Add panel and Carry-Forward panel.
- Collapsible adjustment log with operation/user/timestamp/reason traceability.
- Throughput target: resolve common unallocated block in <30 seconds.

## Expense & Reimbursement Flow (Consolidated)
- Two submission paths: employee self-submit (mobile) and in-office proxy submission.
- Non-negotiable receipt enforcement (no receipt, no submission).
- Payment method routing distinguishes reimbursement vs bookkeeping-only handling.
- Batch submission with single signature attestation.
- Configurable weekly cutoff messaging before final signature.
- Approver routing by property/portfolio and bookkeeping visibility for Kathleen.
- Gas reimbursement includes allocation logic by recent property visit pattern, with approver override + required note.
- Mileage remains future scope but schema placeholder retained.

## Data and Architecture Rules (Consolidated)
- Department tables must be prefixed (`payroll_` for this app).
- Canonical shared tables are read via snake_case canonical layer, not AF_ staging tables.
- No hard deletes; use deactivation/status patterns.
- Money columns use NUMERIC(10,2); status fields use constrained lowercase values.
- RLS required on all payroll-owned tables.
- Department-specific requirements should use department-owned tables with canonical FKs, avoiding direct mutation of AF-authoritative canonical data.

## Data Model Snapshot (Consolidated)
Payroll-owned domains include employees/rates/splits, weeks, time entries, corrections, adjustments, fee config, invoices + line items, weekly property costs, reconciliation, approvals, spread events, travel premiums, and expense submissions/items/approval audit records.

Key extension points retained:
- `source` semantics for `workyard`, correction/manual variants, and future `sms_employee` / `mileage_workyard`.
- Pending-resolution fields on time entries.
- Carry-forward references on adjustments/expense items.

## Implementation Phases

### Phase 1 — Core Weekly Operations (Excel Replacement)
- Finalize payroll-prefixed schema with RLS and auditing conventions.
- Ship employee/rate management.
- Ship Workyard ingest + fallback import path.
- Ship timesheet adjustment workbench with pending handling and approval blocking.
- Ship adjustment manager and cost allocation engine.
- Ship per-entity invoice generation and consolidated statement generation.
- Ship ADP outbound export + inbound reconciliation.
- Ship explicit approval gates and immutable lock semantics.
- Ship management fee configuration and pre-fund estimate.
- Ship external project/entity admin support.
- Ship immutable history store + exports.

Phase 1 exit criteria: complete one full weekly payroll and billing cycle with no spreadsheet dependency.

### Phase 2 — Intelligence Layer
- Cost-per-unit dashboard and portfolio comparison.
- Historical payroll query experience.
- Trend visualizations.
- Budget-threshold alerts once threshold values are provided.

### Phase 3 — Expansion and Scalability
- Portfolio onboarding workflow through admin operations.
- External client onboarding improvements.
- Support divergent invoice structures when contract terms differ.

## Deferred / Parked Items
- Budget thresholds pending management-provided values.
- Mileage reimbursement execution (placeholder retained, not implemented).
- SMS employee confirmation path (source model reserved, not implemented).
- Employee self-service field-hour entry.
- Additional contract variants for portfolio-specific invoice structures pending business direction.

## UI Component Standard: Advanced Data Table
Use a reusable advanced table pattern with:
- drag reorder + resize + visibility controls
- sorting/filter support in wrapper components
- density controls and local preference persistence
- sticky headers, selected row states, loading/empty states
- keyboard and accessibility support
- optional bulk actions and CSV export

The table standard is the default interaction primitive for manager operations that involve high-throughput review/correction work.

## Operational Standards
- Keep payroll logic in domain hooks/services rather than view components.
- Explicitly handle loading/error/empty states for operational screens.
- Enforce auditability of all manager overrides, approvals, and correction actions.
- Prefer additive, effective-dated configuration over hard-coded constants.

## Implementation Notes
- Existing rates and constants (management fee, payroll tax, workers comp, phone reimbursement) must remain configurable in system tables/settings, not hard-coded.
- All approval stage transitions should persist actor + timestamp + notes as applicable.
- Prior approved weeks remain locked; corrections after lock use carry-forward records in current week.
