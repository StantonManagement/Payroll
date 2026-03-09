## Significant Features
Ordered by priority within each tier.

### P1 — Critical
- End-to-end Weekly Payroll Run (Import -> Corrections -> Allocation -> Invoices -> Statement -> ADP): replaces Excel as the operational system of record for weekly payroll and billing.
  Status: partial
- Approval Gates + Immutable Weekly Locking: enforces sequential approvals with audit trails and prevents silent post-approval edits.
  Status: planned
- Timesheet Adjustment Workbench (Reassign/Add/Spread/Remove + Pending): captures manager dispatch knowledge quickly so unallocated hours are resolved before payroll close.
  Status: partial
- Cost Allocation Engine + Explicit Management Fee Line Items: makes labor/spread/fee calculations auditable and legally billable per owner entity.
  Status: planned

### P2 — High
- Expense & Reimbursement Submission (receipt-required, mobile-first, routed approvals): ensures all reimbursable and company-paid spend is captured with evidence and routed correctly.
  Status: planned
- ADP Export + Inbound Reconciliation: closes the payroll loop by detecting and tracking variance between system totals and ADP actuals.
  Status: planned
- Employee/Rate/Department Split Management with Effective Dating: preserves compensation history and supports salaried split defaults plus audited overrides.
  Status: partial
- Consolidated Statement Generator: turns approved invoices into transfer-ready weekly statement with release checks.
  Status: planned

### P3 — Backlog
- Cost-Per-Unit Intelligence Layer (history, trends, alerts): unlocks per-property and portfolio cost trend visibility after enough historical weeks exist.
  Status: planned
- Workyard Reliability Tracking: surfaces employee-level dependency on manual entry vs Workyard to focus operational coaching.
  Status: planned
- Future Mileage + SMS Confirmation Paths (schema-ready placeholders): keeps future operational automation additive without schema rework.
  Status: planned
- Portfolio Expansion Onboarding Flows: enables adding new portfolios/external projects through admin configuration rather than dev work.
  Status: planned

## Known Blockers
- Budget threshold alerts and target values -> blocked by management input on threshold amounts.
- Multi-portfolio security posture -> blocked by tightening RLS beyond current permissive authenticated policies.
- Full Workyard API-first ingestion reliability -> blocked by current dependency on fallback/manual correction workflows.
- Cost-per-unit trend usefulness -> blocked by insufficient approved historical week volume.

---

# Payroll & Invoicing Consolidated Plan

## Source Consolidation
This file consolidates planning content formerly maintained in:
- PAYROLL_PRD.md
- TIMESHEET_ADJUSTMENT_PRD.md
- TIMESHEET_ADJUSTMENT_UI_SPEC.md
- EXPENSE_REIMBURSEMENT_PRD.md
- DATABASE_ARCHITECTURE.md
- ADVANCED_DATA_TABLE_SPECIFICATION.md

## Product Scope and Outcome
Stanton Management runs weekly payroll and property billing across multiple portfolios/LLCs. The product objective is to replace spreadsheet-driven payroll with an auditable, role-aware, approval-gated system that preserves history, exposes management fees explicitly, and supports expansion without recurring spreadsheet rebuilds.

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
