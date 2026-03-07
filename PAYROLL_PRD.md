# Product Requirements Document
# Stanton Management — Payroll & Invoicing System

**Version:** 1.0  
**Status:** Ready for Development  
**Source Documents:** `payroll-system-spec.md`, `DECISIONS_LOG.md`, `EXCEL_SOURCE_ANALYSIS.md`, `PRODUCT_VISION.md`, `DATABASE_ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `windsurfrules`

---

## Problem Statement

Stanton Management runs payroll weekly for ~17 employees across a portfolio of ~41 properties owned by multiple LLCs. The current process is two linked Excel workbooks rebuilt from scratch every week. This creates:

- **Zero historical retention** — each week overwrites the previous file
- **No audit trail** — manager overrides have no notes, no timestamps, no reason
- **Broken approval gates** — an "Approved by:" row exists on paper; nothing enforces it
- **Hidden revenue** — the management fee is embedded in formulas, not visible on invoices
- **Manual reconciliation** — ADP variance (~$186 this week) is tracked by hand with no enforcement
- **No error detection** — unallocated hours, wrong property assignments, and cash shortfalls are caught only if a manager remembers to check

This system replaces the workbooks with an institutional-grade tool that retains history, enforces approvals, surfaces the management fee, and grows with the business as Stanton onboards additional portfolios.

---

## Users & Roles

| Role | Who | Access |
|---|---|---|
| **Admin** | System owner | Everything — config, approvals, full visibility, rate management |
| **Manager** | 4-person management team | Portfolio visibility, timesheet corrections, approvals, cost monitoring |
| **Bookkeeper** | Kathleen | ADP export, ADP report upload, reconciliation view |
| **Employee** | Office staff (occasional) | Submit own hours / dept splits for the week only — own rows only |

**RLS requirements per `DATABASE_ARCHITECTURE.md`:**
- Employee role: restricted to own rows via Supabase RLS
- Manager role: filtered by portfolio
- All payroll tables require proper role-based RLS — not the permissive `USING (true)` default
- This must be in place before multi-portfolio deployment

---

## Core Features by Module

### Module 1 — Workyard Import

**What it does:** Pulls weekly approved time cards from the Workyard API and creates validated time entries. CSV upload is available as a fallback.

#### Two-Stage Adjustment Workflow

| Stage | System | What Happens |
|---|---|---|
| **1 — Time Tracking & Initial Approval** | **Workyard** | Employees clock in/out (GPS or manual entry). Managers review raw time cards, make clock corrections, and give initial approval inside Workyard. |
| **2 — Allocation & Final Processing** | **Payroll System** | Approved cards are imported. Further adjustments: property allocation, timesheet corrections, dept cost splits, ADP reconciliation, final approval. |

Only time cards with `status = approved` in Workyard are imported. The status lifecycle is: `working → submitted → approved → processed → deleted`.

#### API Integration

- **Endpoint:** `GET /orgs/25316/time_cards?status=eq:approved&start_dt_unix=gte:{}&end_dt_unix=lt:{}`
- **Proxy route:** `/api/workyard/timecards?weekStart=YYYY-MM-DD` (server-side, keeps API key off client)
- Projects in Workyard are named `"S0024 - 10 Wolcott"` — S-code is extracted via regex for property matching
- Time cards with multiple cost allocations are split into one row per allocation, hours distributed proportionally by `duration_secs`
- Source field on imported entries: `workyard_api` (vs `workyard` for CSV imports)
- See `WORKYARD_API_REFERENCE.md` for full endpoint documentation and field mappings

#### Inputs (API)
Workyard `TimeCardFullResource` fields: `worker.employee_id`, `start_dt_unix`, `time_summary_v2` (regular/OT/DT seconds), `cost_allocations[].org_project_id`, `cost_allocations[].duration_secs`

#### Inputs (CSV fallback)
Workyard CSV with fields: employee (Workyard Team Member ID), property (Project Name = S-code), Customer Name (LLC), Regular Hours, OT Hours, PTO Hours, cost codes, entry date.

**Logic:**
- Match `worker.employee_id` (or name) → `payroll_employees.workyard_id`
- Match extracted S-code → `properties.code`
- Flag all entries where property = "Unallocated" or "Stanton Management LLC" or overhead codes → push to Timesheet Correction Queue
- Flag entries where employee has no matching record
- Do not import OT as 1.5× — raw hours passed to ADP as-is (per DECISIONS_LOG)

**Output:** Draft time entries with `source = 'workyard_api'`, flagged entries surfaced in correction queue.

---

### Module 2 — Timesheet Correction Queue

**What it does:** Structured workflow for resolving flagged time entries before payroll runs.

**Trigger conditions for flagging:**
- Hours logged to "Unallocated"
- Hours logged to "Stanton Management LLC" or overhead codes requiring redistribution
- Employee forgot to clock in (no entry exists, flagged by manager)
- Hours logged to wrong property (manager judgment call)

**Correction workflow:**
1. Flagged entries presented as an action queue: employee name, hours, day, current property, reason for flag
2. Manager selects corrected property and enters reason (required field)
3. System validates corrections net to zero per employee per day
4. Correction logged to `payroll_timesheet_corrections` with `corrected_by`, `corrected_at`
5. Timesheet locked when queue is cleared and manager approves

**UI:** Advanced data table per `ADVANCED_DATA_TABLE_SPECIFICATION.md` — sortable by employee, day, flag type. Bulk assignment for common corrections (e.g., move all of an employee's unallocated hours to their primary property).

**Constraint:** Payroll cannot advance to calculation until all flagged entries are resolved and timesheet is approved.

---

### Module 3 — Employee & Rate Management

**What it does:** Master record for all employees with rates, flags, and department splits.

**Per-employee data:**
- Name, Workyard ID, type (`hourly` | `salaried` | `contractor`)
- Hourly rate or weekly rate
- Trade / department
- Boolean flags: `is_active`, `ot_allowed`, `pay_tax`, `wc`
- `effective_date` on rates (history preserved, no overwrites)

**Confirmed rates from workbook:**
- Phone reimbursement: $8/employee/week
- Payroll tax rate: 8% (employer burden, `pay_tax = true` employees only)
- Workers comp rate: 3% (`wc = true` employees only)
- Management fee: 10% (confirmed from Summary-Payable row 34) — configurable per portfolio

**Currently active employees:** Zach, Dan, Jess, Blake, Carlos, Santiago + hourly field workers  
**Currently inactive (zeroed out):** Kishan, Jaime, Luis, Tif — `is_active = false`

**Salaried dept splits (per DECISIONS_LOG — Option C):**
- Each salaried employee has a default dept split on file (fixed until changed)
- Each week the default pre-fills automatically
- Employee can override via self-service form with required reason
- Manager can override on behalf of anyone
- All overrides logged with timestamp and user
- Default splits confirmed: Dan — 25% each Acquisitions/Asset Mgmt/Collections/Maintenance; Zach — 25% each Acquisitions/Leasing/Collections

---

### Module 4 — Adjustment Manager

**What it does:** Tracks all per-employee additions and deductions before gross pay is finalized.

**Types:**

| Type | Effect | Allocation |
|---|---|---|
| `phone` | +$8/employee gross pay | Unit-weighted across all properties |
| `tool` | No employee pay impact | Unit-weighted across all properties |
| `advance` | Deduction from gross pay | Employee-only, no property impact |
| `deduction_other` | Deduction from gross pay | Employee-only |

**Required fields for every adjustment:** type, amount, description/reason, week, employee.  
**Advance tracking:** reason required, running balance visible per employee.

**Current week example:** Carlos −$150 advance, Santiago −$500 advance — these are deducted before gross pay.

---

### Module 5 — Cost Allocation Engine

**What it does:** The core calculation engine. Replicates the logic currently in the Summary sheet (~1,359 rows). This is the most complex module.

**Three allocation methods:**

**Method A — Direct Labor:**
- Hours × hourly rate = direct cost
- Applied directly to the property the hours were logged to
- Formula: `regular_hours × rate` (OT passed raw to ADP, no 1.5× here)

**Method B — Unit-Weighted Portfolio Spread:**
- Cost ÷ total portfolio units × each property's unit count
- Spread scope: company-wide across ALL active properties
- Used for: phone reimbursements ($8/employee), tool purchases
- Phone reimbursements also add $8 to employee gross pay

**Management Fee:**
- 10% of all direct costs (labor + adjustments)
- Configurable per portfolio via Admin UI with effective date
- `management_fee_config` table: `portfolio_id = null` applies to all; specific portfolio ID overrides
- **Must appear as an explicit, auditable line item on every invoice** — currently hidden in Excel

**Per-employee cost calculation (replicating Summary-Payable sheet):**
```
Regular wages = regular_hours × hourly_rate
OT wages = ot_hours × hourly_rate  (passed raw, no 1.5×)
+ Adjustments (phone reimbursements, bonuses)
- Deductions (advances, etc.)
= Gross Pay

Payroll tax = gross_pay × 0.08  (if pay_tax = true)
Workers comp = gross_pay × 0.03  (if wc = true)
Management fee = gross_pay × management_fee_rate
= Total Billable
```

**Pre-payroll cash estimate (per DECISIONS_LOG):**
```
Required Pre-Fund = Σ Gross Pay + Σ (Gross Pay × 0.08) + Σ (Gross Pay × 0.03)
```
This must display before the ADP export step — ADP pulls from bank before LLC transfers arrive.

---

### Module 6 — Invoice Generator

**What it does:** Produces per-LLC invoices with explicit line items.

**Invoice structure per property:**
- Labor: direct hours × rate
- Spread costs: unit-weighted reimbursements/tools
- Management fee: explicit % line item (not hidden)
- Total per property

**Portfolio groupings (per DECISIONS_LOG):**
- SREP Southend LLC (S0002–S0009)
- SREP Hartford 1 LLC (S0010, S0019)
- SREP Northend LLC (S0011–S0018)
- SREP Park 1 through Park 12 — **separate invoice per sub-LLC** (was consolidated in Excel; now split per legal entity)
- SREP Westend LLC (S0049)
- STANTON REP 90 PARK STREET HARTFORD LLC (S0001)
- External projects: Zimmerman (billed to Zach), New City/Dan Dvoskin — treated as first-class entity type, addable without dev work via Admin UI

**Park Portfolio note:** Each of the ~12 sub-LLCs gets its own invoice. All appear on the consolidated Statement.

**Invoice status flow:** `draft` → `approved` → `sent`

---

### Module 7 — Statement Generator

**What it does:** Single consolidated weekly statement rolling up all LLC invoices — drives ACH/bank transfers.

**Structure:** All invoice totals → one master summary.

**Error check (replicating current Excel logic):**
- Non-zero difference that is reimbursements-only = "Good to go"
- Any other non-zero difference = blocked, requires investigation before statement is released

**Statement status:** Cannot generate until all invoices are approved.

---

### Module 8 — ADP Export & Reconciliation

**Direction 1 — Outbound:**
- Clean gross pay summary per employee per week
- Formatted for Kathleen to submit to ADP
- Includes: employee name, regular hours, gross pay, adjustment totals

**Direction 2 — Inbound (per DECISIONS_LOG):**
- Kathleen uploads ADP-generated Excel report after payroll runs
- System auto-reconciles submitted totals vs ADP actuals
- Flags any variance automatically
- Variance stored in `payroll_adp_reconciliation` with `resolved` flag

**Current week reference:** ADP Total Paid $13,223 | Tax Withheld $715.65 | Net Pay $12,507.35 | Employer Liability $438.32 | Total Expense $13,661.32 | Variance ~$186 (currently manual, no audit trail)

---

### Module 9 — Cost-Per-Unit Dashboard

**What it does:** Management intelligence layer. Not yet calculable from Excel because history doesn't exist.

**Weekly calculations per property:**
- Total cost = labor + spread costs
- Cost per unit = total cost ÷ `properties.total_units`

**Monitoring:**
- vs. property's own historical average (rolling)
- vs. similar properties in same portfolio
- vs. manually set budget threshold (threshold input — parked per DECISIONS_LOG, needed before alerts activate)

**Portfolio roll-up:** Rolling average cost per unit by portfolio

**UI:** Data table with sparklines for trend direction. Flag column for properties exceeding thresholds.

**Note:** This module requires historical data from Phase 1 before it produces meaningful output. Build the data structure in Phase 1; surface the dashboard in Phase 2.

---

### Module 10 — Approval Workflow

**What it does:** Enforced sequential approvals with audit trail. Replaces the unenforced "Approved by:" row on blue sheets.

**Approval chain:**
1. Timesheet corrections approved → payroll calculation unlocked
2. Payroll approved → invoice generation unlocked
3. Invoices approved (per LLC) → statement generation unlocked
4. Statement approved → ADP export unlocked

**Each approval records:** user ID, timestamp, role.  
**Approved records:** locked (read-only). No silent changes after lock.

---

### Module 11 — History Store

**What it does:** Immutable weekly records. Every approved week is stored and queryable.

**Requirements:**
- Approved weeks cannot be edited
- Weekly snapshots exportable as Excel (for existing downstream workflows)
- History drives cost-per-unit trend analysis
- Enables queries like "what did we pay Angel last March"

---

## Data Model

All payroll tables use prefix `payroll_` per `windsurfrules` and `DATABASE_ARCHITECTURE.md`.

**Shared canonical tables (FK only, never duplicated):**
- `properties` — `asset_id` (S-code), `total_units`, `portfolio_id`
- `portfolios`
- `units`

**Payroll-owned tables:**

```sql
payroll_employees
  id UUID PK
  name TEXT NOT NULL
  workyard_id TEXT UNIQUE
  type TEXT CHECK (type IN ('hourly','salaried','contractor'))
  hourly_rate NUMERIC(10,2)
  weekly_rate NUMERIC(10,2)
  trade TEXT
  is_active BOOLEAN DEFAULT true
  ot_allowed BOOLEAN DEFAULT false
  pay_tax BOOLEAN DEFAULT false
  wc BOOLEAN DEFAULT false
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, created_by UUID

payroll_employee_rates  (history — never overwrite, add new row)
  id UUID PK
  employee_id UUID → payroll_employees
  rate NUMERIC(10,2)
  effective_date DATE
  created_at TIMESTAMPTZ, created_by UUID

payroll_employee_dept_splits  (salaried staff default allocation)
  id UUID PK
  employee_id UUID → payroll_employees
  department TEXT
  allocation_pct NUMERIC(5,4)
  effective_date DATE
  created_at TIMESTAMPTZ, created_by UUID

payroll_weeks
  id UUID PK
  week_start DATE NOT NULL
  week_end DATE NOT NULL
  status TEXT CHECK (status IN ('draft','corrections_complete','payroll_approved','invoiced','statement_sent'))
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, created_by UUID

payroll_time_entries
  id UUID PK
  payroll_week_id UUID → payroll_weeks
  employee_id UUID → payroll_employees
  property_id UUID → properties  (canonical FK)
  entry_date DATE
  regular_hours NUMERIC(5,2)
  ot_hours NUMERIC(5,2)
  pto_hours NUMERIC(5,2)
  source TEXT CHECK (source IN ('workyard','manual'))
  workyard_timecardid TEXT
  is_flagged BOOLEAN DEFAULT false
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, created_by UUID

payroll_timesheet_corrections
  id UUID PK
  time_entry_id UUID → payroll_time_entries
  from_property_id UUID → properties
  to_property_id UUID → properties
  hours NUMERIC(5,2)
  reason TEXT NOT NULL
  corrected_by UUID → auth.users
  corrected_at TIMESTAMPTZ

payroll_dept_split_overrides  (weekly override of salaried default)
  id UUID PK
  payroll_week_id UUID → payroll_weeks
  employee_id UUID → payroll_employees
  department TEXT
  allocation_pct NUMERIC(5,4)
  reason TEXT NOT NULL
  submitted_by UUID → auth.users
  approved_by UUID → auth.users
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ

payroll_adjustments
  id UUID PK
  payroll_week_id UUID → payroll_weeks
  employee_id UUID → payroll_employees
  type TEXT CHECK (type IN ('phone','tool','advance','deduction_other'))
  amount NUMERIC(10,2)  -- negative for deductions
  description TEXT NOT NULL
  allocation_method TEXT CHECK (allocation_method IN ('employee_pay','unit_weighted','direct'))
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, created_by UUID

payroll_management_fee_config
  id UUID PK
  rate_pct NUMERIC(5,4) NOT NULL
  portfolio_id UUID → portfolios  (NULL = applies to all)
  effective_date DATE NOT NULL
  created_at TIMESTAMPTZ, created_by UUID

payroll_invoices
  id UUID PK
  payroll_week_id UUID → payroll_weeks
  owner_llc TEXT NOT NULL
  portfolio_id UUID → portfolios
  status TEXT CHECK (status IN ('draft','approved','sent'))
  total_amount NUMERIC(10,2)
  approved_by UUID → auth.users
  approved_at TIMESTAMPTZ
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ

payroll_invoice_line_items
  id UUID PK
  invoice_id UUID → payroll_invoices
  property_id UUID → properties
  description TEXT
  cost_type TEXT CHECK (cost_type IN ('labor','spread','mgmt_fee'))
  labor_amount NUMERIC(10,2)
  spread_amount NUMERIC(10,2)
  mgmt_fee_amount NUMERIC(10,2)
  total_amount NUMERIC(10,2)
  created_at TIMESTAMPTZ

payroll_weekly_property_costs  (materialized for monitoring)
  payroll_week_id UUID → payroll_weeks
  property_id UUID → properties
  total_cost NUMERIC(10,2)
  cost_per_unit NUMERIC(10,2)
  PRIMARY KEY (payroll_week_id, property_id)

payroll_adp_reconciliation
  id UUID PK
  payroll_week_id UUID → payroll_weeks
  system_gross_total NUMERIC(10,2)
  adp_gross_total NUMERIC(10,2)
  variance NUMERIC(10,2)
  resolved BOOLEAN DEFAULT false
  notes TEXT
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ

payroll_approvals  (audit trail for all approval steps)
  id UUID PK
  payroll_week_id UUID → payroll_weeks
  stage TEXT CHECK (stage IN ('timesheet','payroll','invoice','statement'))
  reference_id UUID  (invoice_id for invoice stage, null for others)
  approved_by UUID → auth.users
  approved_at TIMESTAMPTZ NOT NULL
  notes TEXT
```

**RLS on every table. No exceptions. No hard deletes — `is_active = false`.**  
**Money: `NUMERIC(10,2)`. Status columns: lowercase TEXT with CHECK constraint.**  
**Every table: `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`, `created_by UUID`.**  
**`updated_at` uses existing `trigger_set_updated_at()` function.**

---

## Integration Points

### Workyard
- Input: CSV export — weekly manual upload (no live API today)
- Key field: `Workyard Team Member ID` → matches `payroll_employees.workyard_id`
- Property match: `Project Name` (S-code) → `properties.asset_id`

### ADP
- Output: Clean gross pay summary exported as formatted file
- Input: ADP Excel report uploaded by Kathleen post-payroll
- Reconciliation is automated — no manual comparison

### Existing Supabase Project
- Shares database with expense report system
- Reads `properties`, `portfolios`, `units` from canonical tables — never duplicates them
- Follows all patterns in `DATABASE_ARCHITECTURE.md`
- Never queries `AF_` staging tables

### Design System
- All UI built to `DESIGN_SYSTEM.md` — deep navy (`#1a2744`), muted gold (`#8b7355`), warm white (`#fdfcfa`)
- `rounded-none` on all inputs — no border radius
- Serif (`Libre Baskerville`) headers only — `Inter` for everything else
- Use `@/components/form/` and `@/components/kit/` before building new components
- Advanced data tables per `ADVANCED_DATA_TABLE_SPECIFICATION.md` — sortable, resizable, density control

---

## Implementation Phases

### Phase 1 — Replace Excel (Core Operations)

**Goal:** Weekly payroll runs entirely in the new system. Excel is no longer needed.

**Deliverables:**

| # | Feature | Notes |
|---|---|---|
| 1.1 | Database schema — all `payroll_` tables | RLS from day one |
| 1.2 | Employee & Rate Management UI | Rates, flags, dept splits |
| 1.3 | Workyard CSV Import | Parse, validate, match employees/properties |
| 1.4 | Timesheet Correction Queue | Flag, correct, net-zero validate, lock |
| 1.5 | Adjustment Manager | Phone, tools, advances — typed and tracked |
| 1.6 | Cost Allocation Engine | Direct labor + unit-weighted spread + mgmt fee |
| 1.7 | Invoice Generator | Per-LLC with explicit mgmt fee line item |
| 1.8 | Statement Generator | Consolidated + error check |
| 1.9 | ADP Export (outbound) | Clean gross pay summary for Kathleen |
| 1.10 | ADP Reconciliation (inbound) | Upload ADP report, auto-reconcile, flag variance |
| 1.11 | Approval Workflow | All four gates with locks and audit trail |
| 1.12 | Pre-payroll cash estimate | Required pre-fund calculation before ADP export |
| 1.13 | Management Fee Config UI | Per-portfolio rate with effective date |
| 1.14 | External Project Management | Add Zimmerman, New City + future projects via Admin UI |
| 1.15 | History Store | Immutable approved weeks, Excel export |

**Phase 1 exit criteria:** One full payroll week processed end-to-end with zero Excel involvement.

---

### Phase 2 — Intelligence Layer

**Goal:** The history from Phase 1 starts paying off.

**Deliverables:**

| # | Feature | Notes |
|---|---|---|
| 2.1 | Cost-Per-Unit Dashboard | Weekly + rolling average per property |
| 2.2 | Portfolio comparison view | Cost per unit across portfolio |
| 2.3 | Budget threshold alerts | Requires threshold input from management first |
| 2.4 | Historical payroll queries | "What did we pay X in March?" |
| 2.5 | Trend visualizations | Property cost over time |

---

### Phase 3 — Portfolio Expansion

**Goal:** Onboard additional management portfolios without dev work.

**Deliverables:**

| # | Feature | Notes |
|---|---|---|
| 3.1 | Per-portfolio management fee rates | Already supported in data model from Phase 1 |
| 3.2 | New portfolio onboarding flow | Admin UI only |
| 3.3 | New external client onboarding | Already supported in Phase 1 |
| 3.4 | Separate invoice structures per portfolio | If contracts differ |

---

## Technical Standards

All code in this module must follow `windsurfrules`:

- All new payroll tables: `payroll_` prefix
- Read canonical tables only — never `AF_` tables
- Never write to AF-Authoritative columns
- RLS on every table from day one
- No hard deletes
- `NUMERIC(10,2)` for money
- Queries in hooks — no raw Supabase calls in components
- One hook per logical data domain
- Loading, error, and empty states handled explicitly
- If a problem doesn't resolve after two attempts, stop and reassess approach

---

## Open Items (Parked)

These are confirmed out of scope for Phase 1 and 2:

| Item | Status |
|---|---|
| Budget threshold amounts for cost-per-unit alerts | Need management input before implementing |
| Per-portfolio fee rates for existing portfolios | UI built in Phase 1; rate values need input at setup |
| Park Portfolio becoming fully separate management contracts | Already separate invoices; future contract structure TBD |

---

## Confirmed Rates Reference

From `EXCEL_SOURCE_ANALYSIS.md` — do not hard-code these; store in config tables:

| Parameter | Value | Configurable |
|---|---|---|
| Management Fee | 10% | Yes — per portfolio, effective date |
| Payroll Tax Rate | 8% | System config |
| Workers Comp Rate | 3% | System config |
| Phone Reimbursement | $8/employee/week | System config |
| OT Multiplier | 1.5× | Passed to ADP — not calculated here |
