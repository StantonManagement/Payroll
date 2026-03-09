# Timesheet Adjustment Interface — PRD
**Project:** Stanton Management Payroll & Invoicing System
**Version:** 1.1
**Status:** Final Draft
**Supersedes:** Module 2 (Timesheet Correction Queue) in PAYROLL_PRD.md

---

## Problem Restatement

The existing PRD treats this interface as a defect queue — Workyard produces data, some of it is wrong, you fix it before payroll runs. That framing is too narrow.

The reality: Workyard data is incomplete by design for a meaningful portion of the crew. Field workers doing grout, running to Home Depot, pulling supplies for multiple properties — asking them to log each trip with property attribution in a mobile app is unrealistic. For some employees, Workyard captures almost nothing useful. The manager knows where people were. The manager knows what should get billed where. This interface is where that knowledge enters the system.

**For some employees, this interface is the primary time entry tool, not a correction layer on top of Workyard.**

**Unallocated hours are not a data quality problem — they are unpaid hours.** An unallocated block that doesn't get resolved before payroll runs means a worker gets shorted. That is the urgency behind this module.

---

## How Work Actually Gets Dispatched

**Verbal dispatch to one property**
"Angel, go fix the boiler at 15 Whit today." Hours belong to one property. May or may not appear correctly in Workyard.

**Verbal dispatch across a portfolio**
"Go salt all the Southend sidewalks." Work spans multiple properties under one instruction. No property-level tracking is expected or realistic. Hours should spread evenly across relevant properties.

**Supply runs**
An employee drives to Home Depot for materials serving one or more properties. They won't log this in Workyard. The manager or maintenance coordinator knows what was picked up for whom.

**Full-crew days with no Workyard data**
Some employees barely open Workyard. Their whole week may land as unallocated or not appear at all. The manager reconstructs their week from knowledge of what was dispatched.

The interface has to support all of these. It is not only a fix-what-Workyard-broke tool.

---

## The Unallocated Hours Workflow

Unallocated hours come in two states when they hit this system:

**Immediately resolvable** — Manager dispatched the work, knows exactly where it belongs. The interface should make this a 10-second operation.

**Pending investigation** — Manager doesn't know off the top of their head. Someone needs to call the employee and ask. In the meantime hours sit in a **Pending** state — visible, flagged, not yet resolved, not blocking other work.

The pending state exists because the week gets worked throughout the week, not just at payroll close. Monday's unallocated hours might get resolved Tuesday. Wednesday's might not get resolved until Friday after a phone call. The interface must be usable any day of the week — resolving early is encouraged.

---

## Four Core Operations

### 1. Reassign
**When:** Hours exist in Workyard but are attributed to the wrong property, "Unallocated," or an overhead code. The hours are real. The destination is wrong.

**What happens:** Original entry is preserved. A correction record links old destination to new one. Hours move to correct property.

**Validation:** Net-zero per employee per day — total hours for that employee on that day don't change, only where they're allocated.

**Can split:** Yes. A 4-hour unallocated block can be reassigned as 2 hours to one property and 2 hours to another.

---

### 2. Add
**When:** Hours never made it into Workyard. The employee worked, there's no entry to correct — the entry needs to be created from scratch.

**What happens:** New time entry created with `source = 'manual_manager'`, attributed to the entering manager, reason required.

**Validation:** No net-zero — these are net-new hours.

**Destinations:** Single property, or portfolio spread (see below).

---

### 3. Spread (Portfolio Allocation)
**When:** Work was dispatched across multiple properties at once — salting sidewalks, walkthroughs, maintenance rounds. Hours belong to a group of properties, not one specific address.

**What happens:** Manager specifies total hours, selects target (full portfolio or manual subset), system distributes evenly. 8 hours across 8 Southend properties → 1 hour each. Fractional hours supported.

**Subset selection:** Manager can deselect specific properties before spreading. "All Southend except S0009 — it's vacant" should take 3 seconds. Property list shows with checkboxes, per-property hours update live as properties are toggled.

**Result:** Individual time entries created per property, all linked to the same `payroll_spread_events` parent record so the whole operation can be reviewed or reversed as a unit.

---

### 4. Remove
**When:** Hours exist in Workyard but shouldn't — duplicate entries, a clock-in that never happened, an error that can't be meaningfully reassigned anywhere.

**What happens:** Entry marked `is_active = false` — never hard deleted. Removal record written with required reason and manager identity.

**Constraint:** Cannot remove hours from an approved week. Removal only available in draft or corrections state.

---

## Special Pay Types

These are additions to an employee's pay for a given week, attributed to specific properties or portfolios.

### Travel / Daily Bonus
Workers dispatched to distant or out-of-area jobs receive a daily premium. This is configured on the **property or project**, not the employee — the rate reflects the job, not the person.

- Configurable as **per-day** or **flat per-job**
- Set via Admin UI on the property/project record
- Applied automatically when an employee is assigned to that property for the day
- Examples: Zimmerman Personal = $75/day travel bonus; a distant suburb job might be $40/day

### Snow Pay / Special Pay
Hours-based premium at the employee's regular rate, typically spread across a portfolio.

- Entered as hours in the Add operation
- Portfolio spread applies — "Carlos: 8 snow hours across portfolio" → spread evenly across all active properties
- Billed to properties the same as regular labor

---

## Carry-Forward (Prior Week Underpayments)

When a worker reports they weren't paid correctly for a prior week — and that week is already approved and locked — the resolution is a carry-forward, not an unlock.

**How it works:**
- Manager creates an adjustment in the **current week**
- Adjustment references the prior payroll week (required field — creates the audit link)
- Hours or dollar amount entered, property attribution entered
- Carries through to current week's payroll and invoicing normally

**The prior week remains locked.** The carry-forward is the clean mechanism. It pays the worker now, bills the right property, and maintains a complete paper trail linking the current adjustment to its origin.

**Workers see it clearly:** On their pay summary, carry-forward entries appear with the originating week noted — "Back pay — week of 2/23."

---

## Workyard Reliability Tracking

The system already captures `source` on every time entry. That data gets surfaced as a per-employee reliability summary visible to managers.

**Tracked per employee, per period:**
- Total time entries
- % sourced from Workyard vs. manually entered by a manager
- Average unallocated hours per week
- Consecutive weeks with unallocated entries

This is not a disciplinary tool in the system — it's a management visibility tool. If Angel has manually-entered hours 11 of 12 weeks, that's a conversation to have. If someone's hours are consistently "lost" and always need manager reconstruction, that pattern is visible.

**Displayed on:** Employee detail view, and optionally surfaced in a summary table on the manager dashboard showing all employees ranked by Workyard reliability.

---

## Future Capability: Mileage Tracking

Workyard already tracks mileage and allocates drive time to projects. This data is **not imported or used** in the current system.

When mileage reimbursement is added as a feature, the Workyard mileage data becomes the source rather than manual entry — no schema changes required if the `source` field is designed correctly from day one.

**Do not build this now. Do not design it out.**

## Future Capability: SMS Confirmation

When an employee has unallocated hours or no Workyard entries for a day, the system could prompt them via SMS — "We saw you near 15 Whit today, what were you working on?" — and auto-log their reply.

The goal is to push resolution as close to the work as possible rather than piling up all week. The `source` field value `sms_employee` is reserved for this. No schema changes required when built.

**Do not build this now. Do not design it out.**

---

## Entry Source Tracking

Every time entry carries a `source` field:

| Source | Meaning |
|---|---|
| `workyard` | Came from Workyard CSV, untouched |
| `workyard_corrected` | Came from Workyard, then reassigned |
| `manual_manager` | Created from scratch by a manager |
| `manual_spread` | Created as part of a portfolio spread operation |
| `sms_employee` | *(future)* Employee confirmed via SMS |
| `mileage_workyard` | *(future)* Derived from Workyard mileage data |

---

## Pending State

Unallocated hours that can't be immediately resolved are marked **Pending** with an optional note.

Pending hours:
- Are visible with a distinct status indicator
- Do not block other adjustments
- Do not block payroll from being worked on — but **do block final payroll approval**
- Show the manager who flagged them and when
- Can be updated to Resolved at any point during the week

At payroll approval, all pending entries must be either resolved or explicitly discarded with a reason before the approval gate clears.

---

## Interface Design Principles

**Speed is the product.** If resolving a typical unallocated block takes longer than 30 seconds, this interface will not get used. Every interaction should minimize clicks and form fields. The reason managers don't fix things in Workyard is that Workyard is slow and unpleasant — this has to be faster by a wide margin.

**Show the problem, don't make the manager go find it.** Unresolved unallocated hours are immediately visible when the manager opens the week — not buried in a table. Count, employees affected, total hours at stake, all in the header.

**Week-long workflow, not end-of-week scramble.** Resolving Monday's hours on Tuesday is the right behavior. The interface should never feel like it's only for payroll day.

**One employee, one day is the atomic unit.** Everything else — spread, split, pending — extends from that base.

---

## Primary UI Flow

### Unallocated Hours Panel

Header on entering the adjustment screen:
> **4 employees have unresolved hours — 23.5 hrs total unallocated**

Blocks listed grouped by employee, sorted oldest first. Each row: employee name, date, hours, time unresolved.

Clicking a block expands it inline — no modal, no page navigation:

1. **Quick-assign** — type or select a property, enter. Done. Under 10 seconds.
2. **Split** — divide hours across multiple properties. Rows added until hours sum to total.
3. **Spread** — select portfolio, toggle properties, confirm. Per-property hours calculate live.
4. **Mark pending** — optional note, saves as Pending.
5. **Remove** — enter reason, confirm.

### Manual Addition Panel

Separate from the unallocated queue. Proactively add hours for any employee on any day in the current week.

Fields: Employee → Date → Hours → Destination → Pay Type → Reason

Spread destination expands to show portfolio picker with property checkboxes and live per-property calculation.

### Carry-Forward Panel

Separate section. Add an adjustment referencing a prior approved week.

Fields: Employee → Prior Week (date picker, approved weeks only) → Hours or Amount → Property/Portfolio → Reason

### Adjustment Log

Collapsible. Every operation recorded: who, what, which entry, when, why. Filterable by employee, date, operation type. Accessible but not in the way.

---

## Data Model Additions

Extending PAYROLL_PRD.md schema:

```sql
-- Extend source field on payroll_time_entries
-- source CHECK: workyard | workyard_corrected | manual_manager | manual_spread | sms_employee | mileage_workyard

-- Pending resolution
ALTER TABLE payroll_time_entries
  ADD COLUMN pending_resolution BOOLEAN DEFAULT false,
  ADD COLUMN pending_note TEXT,
  ADD COLUMN pending_since TIMESTAMPTZ;

-- Spread event parent record
CREATE TABLE payroll_spread_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_week_id UUID NOT NULL REFERENCES payroll_weeks(id),
  employee_id     UUID NOT NULL REFERENCES payroll_employees(id),
  entry_date      DATE NOT NULL,
  total_hours     NUMERIC(5,2) NOT NULL,
  portfolio_id    UUID REFERENCES portfolios(id),
  reason          TEXT NOT NULL,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Link spread entries to parent event
ALTER TABLE payroll_time_entries
  ADD COLUMN spread_event_id UUID REFERENCES payroll_spread_events(id);

-- Carry-forward reference on adjustments
ALTER TABLE payroll_adjustments
  ADD COLUMN prior_week_id UUID REFERENCES payroll_weeks(id);
-- NULL = current week adjustment. Non-null = carry-forward from a prior locked week.

-- Travel premium config on properties/projects
CREATE TABLE payroll_travel_premiums (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID REFERENCES properties(id),
  premium_type    TEXT CHECK (premium_type IN ('per_day', 'flat_per_job')),
  amount          NUMERIC(10,2) NOT NULL,
  effective_date  DATE NOT NULL,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Extend corrections to cover all operations
ALTER TABLE payroll_timesheet_corrections
  ADD COLUMN operation TEXT CHECK (operation IN (
    'reassign',
    'split',
    'add',
    'remove'
  ));
```

---

## Approval Gate

- Payroll approval blocked if any entries have `pending_resolution = true`
- All pending entries must be resolved or explicitly discarded before approval
- Once approved, all time entries lock — no further adjustments
- Carry-forwards are created in the new week, not by unlocking the prior week

---

## Out of Scope

- Mileage reimbursement from Workyard data — future, source field ready
- SMS employee confirmation — future, source field ready
- Employee self-service hour entry for field workers
- Budget threshold alerts — parked per DECISIONS_LOG.md
