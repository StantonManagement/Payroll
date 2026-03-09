# Timesheet Adjustment Interface — UI Spec (Revised)
**Project:** Stanton Management Payroll & Invoicing System  
**Version:** 2.0  
**Supersedes:** Module 2 UI description in TIMESHEET_ADJUSTMENT_PRD.md  
**Status:** Ready for Implementation

---

## The Core Problem with the Current Implementation

The modal approach is fundamentally wrong for this workflow. It forces the manager to work sequentially — one adjustment at a time — when the entire job is spatial. In Excel, you open Angel's sheet and the whole week is in front of you: every property, every day, every correction. You spot the problem, fix it, move on. The new interface has to replicate that awareness, not eliminate it.

---

## Primary View: The Week Grid

The main interface is a grid per employee. One screen shows the full week — no drilling in, no navigation required to see the state of things.

**Rows** = properties (Unallocated always floats to the top, separated by a rule)  
**Columns** = days of the week + weekly total  
**Cells** = hours at that property on that day

The unallocated row is visually distinct — amber background, not buried with the rest. The count of unresolved blocks and total hours at stake sits in the header above the grid so the manager sees the urgency before anything else.

### Cell Visual States

| State | Visual Treatment | Meaning |
|---|---|---|
| Normal text | No background | Workyard hours, untouched |
| Gold left border | Accent on cell | Manager-adjusted |
| Amber highlight | Row tinted amber | Unallocated, needs resolution |
| Muted blue highlight | Row tinted blue | Pending, investigation in progress |
| Dim / blank | Faded text or empty | Zero hours |

These states let a manager read the week in seconds without clicking anything.

---

## Interaction Model: Click to Act Inline

Clicking any cell opens an **inline action drawer** directly below that row, anchored to the selected day. No modals. No page navigation. The drawer closes when dismissed or when a different cell is clicked.

The drawer has four tabs:

### Quick Assign
Default for unallocated hours. Property typeahead (S-code or name), required reason dropdown (manager dispatch / clock-in error / Workyard not opened / other), one button. Under 15 seconds for a clean case.

### Split
Divide hours across multiple properties. Repeating rows of property + hours with a live remaining balance counter. Confirm button stays disabled until remaining = 0.

### Spread to Portfolio
For work dispatched across multiple properties at once (salting sidewalks, walkthroughs, etc.). Manager picks a portfolio, sees a checklist of all properties with checkboxes, deselects any exclusions, and per-property hours calculate live as they toggle. Should take about 10 seconds for a standard spread.

### Mark Pending
Optional note, saves the block as pending with a timestamp. Doesn't block other work but does block final payroll approval.

For cells that already have allocated hours, the default tab is **Edit** — shows the current value, source (Workyard vs manual), and lets the manager adjust or remove.

---

## Manual Add Panel

Separate from the unallocated queue. For proactively adding hours that never appeared in Workyard at all.

Fields: Employee → Date → Hours → Destination (single property or spread) → Pay Type → Reason

Spread destination expands inline to the same portfolio picker with live per-property calculation.

---

## Carry-Forward Panel

Separate section, clearly labeled. For prior-week underpayments where the week is already locked.

Fields: Employee → Prior Week (date picker showing approved weeks only) → Hours or dollar amount → Property/portfolio → Reason

The prior week stays locked. The carry-forward creates an adjustment in the current week with a back-reference to the origin. On the employee's pay summary it shows as "Back pay — week of 2/23" so the worker can see exactly what it is.

---

## Adjustment Log

Collapsible panel below the grid. Every operation in chronological order: who, what, which entry, when, why. Filterable by employee, date, and operation type. Accessible but never in the way during the main workflow.

---

## Header State

```
Angel Ramirez — Week of March 2, 2026
66.3 hrs total  ·  2 unresolved blocks  ·  4.5 hrs pending
```

The unresolved count and pending hours are the manager's first read. If both are zero, the header signals that clearly. Payroll approval is blocked until unresolved = 0 and pending is explicitly cleared.

---

## Employee Switcher

The grid is per-employee but switching employees shouldn't require navigating away. A sidebar or top selector shows all employees with a small indicator for each: green (clean), amber (has unresolved), blue (has pending). Manager jumps directly to whoever has outstanding work.

---

## Design Test

A manager should be able to open this screen, see exactly what needs attention, and resolve a typical unallocated block in under 30 seconds without any prior orientation. If that's not true, something in the interaction model needs to change.
