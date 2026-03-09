# Expense & Reimbursement Submission — PRD
**Project:** Stanton Management Payroll & Invoicing System
**Version:** 1.0
**Status:** Draft

---

## Problem Statement

Field workers regularly spend their own money on behalf of Stanton and its properties — gas, tolls, materials, food on job sites. The current process is informal, paper-based, and inconsistently enforced. Reimbursements get submitted without receipts. The no-receipt rule exists on paper but has no mechanism behind it. Expenses get missed, disputed, or paid out of the wrong account.

This module creates a structured submission and approval flow for all employee expenses, enforces receipt capture at submission time, and routes each expense correctly based on payment method and expense type.

**The rule is simple and non-negotiable: no receipt, no submission. The system enforces it — not policy.**

---

## Two Submission Paths

The same data is required regardless of how it gets into the system. The path just determines who is doing the entering.

### Path A — Employee submits from phone
Employee takes a photo of the receipt, fills in a minimal form, signs, and submits. Should be completable in under two minutes for a single receipt. Designed for the phone, not a desktop browser.

### Path B — In-office submission
Employee brings in a paper receipt. Whoever is around — manager, coordinator, anyone with system access — photographs it and enters it on the employee's behalf. The system records both who submitted it and which employee it's for. These are different fields. If Carlos hands Jess a receipt, Jess is the submitter, Carlos is the employee.

---

## Receipt Requirements

- **One photo per receipt is strongly preferred.** A single image per expense keeps approvals clean and auditable.
- **Multi-receipt photos are accepted** — someone will photograph five receipts at once regardless. When a submission contains a multi-receipt image, the submitter must enter a separate line item with an amount for each receipt in the photo. The photo is the evidence; the line items are the data.
- **Amount is required per receipt.** Itemization is not required.
- **There is no minimum amount.** There is no receipt exemption for any amount.
- **Gas, tolls, parking — receipt required.** Cash fill-ups produce receipts. If there is no receipt, there is no reimbursement.

---

## Payment Method Question

Every submission requires the submitter to identify how the expense was paid:

| Selection | What happens |
|---|---|
| **Personal card / cash** | Enters reimbursement flow — employee gets paid back via payroll |
| **Company card** | No money owed — receipt routes to Kathleen for bookkeeping reconciliation only |
| **Company account** | Same as company card — bookkeeping only |
| **Not sure** | Routes to manager queue for clarification before going anywhere |

The system still captures the receipt and all details regardless of payment method. Kathleen sees everything. Only personal card / cash submissions flow through to payroll adjustments.

This distinction matters: employees should never be discouraged from submitting a receipt even if they're unsure how it was paid. The receipt is always welcome. The payment method determines what happens to it — not whether it gets recorded.

---

## Expense Types

| Type | Allocation Method | Notes |
|---|---|---|
| **Gas** | Direct to property/project | Most common submission |
| **Tolls / EZ-pass** | Direct to property/project | |
| **Parking** | Direct to property/project | |
| **Materials / Supplies** | Direct to property/project | Home Depot runs, hardware, etc. |
| **Tools** | Unit-weighted across all properties | No specific property required |
| **Food** | Direct to property/project | Job-site meals |
| **Travel bonus** | Direct to property/project | Configured on property — see below |
| **Other** | Direct to property/project | Requires description |

### Gas — Automatic Property Allocation

Gas is a travel cost and should bill to the properties the employee actually visited. The system calculates this automatically rather than asking the employee to guess at a split.

**Allocation window:** The shorter of:
- Since the employee's last approved gas reimbursement request, or
- The last 7 days

**Allocation method:** Weighted by visit count within the window.
- System counts how many days the employee has time entries at each property in the window
- Gas cost is split proportionally by those visit counts
- Example: Angel visited 15 Whit 3 times and 101 Maple once → 15 Whit gets 75%, 101 Maple gets 25%

**What the approver sees:**
A clear breakdown presented before approval:

> Gas reimbursement: $60.00 — allocated based on Angel's property visits 2/24–3/2
>
> | Property | Visits | Allocation | Amount |
> |---|---|---|---|
> | 15 Whit (S0006) | 3 | 75% | $45.00 |
> | 101 Maple (S0022) | 1 | 25% | $15.00 |

The approver can override individual allocations before approving if the automatic split looks wrong — with a required note explaining the change. The system records both the calculated split and any manual override.

**If no time entries exist in the window:** The approver must assign the allocation manually. The system flags this clearly rather than guessing.

**Multiple gas submissions in the same week:** Each submission calculates its own allocation window independently. If an employee submits two gas receipts in one week, both use the same window logic — the system does not distinguish which fill-up came first or attempt to split the week between them. The result is that both receipts produce the same property split for that week, which is a reasonable approximation.

*Future refinement: sequence multiple gas submissions within a week and calculate each window from the prior submission's timestamp rather than the prior approved request. Not worth the complexity now.*

---

### Tools vs. Materials
- **Materials** are purchased for a specific job at a specific property. The receipt goes to that property.
- **Tools** benefit all properties and are spread unit-weighted across the entire portfolio. No specific property attribution required.
- The submitter selects the type. If Materials is selected, a property/project field is required. If Tools is selected, no property selection is shown — the spread is automatic.

### Travel / Daily Bonus
Travel bonuses are not submitted by employees — they are **configured on the property or project** and applied automatically.

- Admin sets a travel premium on the property record: per-day or flat per-job, dollar amount, effective date
- When an employee is assigned to that property for the day, the premium applies automatically
- No employee action required. No receipt required — this is a configured rate, not a reimbursement.
- Example: Zimmerman Personal carries a $75/day travel premium. Five days on site = $375 added to the employee's pay automatically, billed to Zimmerman.

---

## Batch Submission

A single submission can contain multiple receipts. The flow:

1. Employee adds receipts one at a time — photo, amount, type, property/project, payment method
2. Additional receipts added to the same batch before submitting
3. Batch summary shown before signature: list of all receipts, total amount
4. Employee signs once to submit the entire batch
5. Signature is the attestation: "I certify all of these expenses are accurate and legitimate"

**Signature format:** Drawn signature on screen. Required — not a checkbox.

Receipts within a batch can go to different properties and have different types. A batch is just a convenient submission container, not a constraint on where things bill.

---

## Submission Cutoff

A configurable weekly cutoff determines whether a submission hits the current payroll week or rolls to the next.

- Cutoff day and time are set in Admin settings alongside the management fee rate and phone reimbursement amount
- If submitted before the cutoff: included in current week's payroll
- If submitted after the cutoff: automatically queued for the following week

**The employee must know immediately which week their submission will be paid in.** No ambiguity, no phone calls asking why it's not on their check.

- Before cutoff: "This will be included in this week's payroll."
- After cutoff: "The cutoff for this week has passed. This will be included in next week's payroll — week of [date]."

This message appears before the employee signs, not after. They know before they commit.

---

## Approval Flow

After submission, expenses route to an approver before they enter payroll.

**Who approves:** Depends on the property/project. Zimmerman expenses go to Zach. Portfolio expenses go to the manager responsible for that portfolio. This is configured on the property/project record — same place the travel premium lives.

**Approver actions:**
- Approve — expense enters payroll adjustment flow
- Reject — expense returned to submitter with a required reason
- Request correction — approver can flag something specific ("photo is unclear, please resubmit" or "property attribution looks wrong")
- Adjust property attribution — approver can correct which property the expense bills to before approving, with a note

**Company card / account submissions** go only to Kathleen — no payroll impact, bookkeeping queue only.

**Not sure submissions** go to manager queue first. Manager resolves payment method, then routes accordingly.

---

## Prior Week Submissions

If an expense surfaces after its payroll week has already closed, it follows the same carry-forward mechanic as timesheet adjustments:

- Submitted in the current week
- References the prior week (required field — the audit link)
- Processes through current week's payroll normally
- Employee's pay summary shows it clearly: "Reimbursement — week of 2/23"

The prior week remains locked. The carry-forward is the resolution.

---

## What Kathleen Sees

Kathleen's view is not the approval queue — it's the bookkeeping reconciliation view. She sees:

- All company card / account submissions with receipts attached
- All approved personal card reimbursements before they hit payroll
- Any submission marked "not sure" that was resolved as company card

This gives her a complete picture of company spend — not just the reimbursements, but all receipts captured in the system regardless of payment method.

---

## Workyard Reliability Tracking (Reimbursements)

Not applicable — reimbursements are employee-initiated, not Workyard-dependent. No reliability tracking needed here.

---

## Future Capability: Mileage Reimbursement

Workyard already tracks mileage and allocates drive time to projects by property. This data is not imported or used currently.

When mileage reimbursement is added, Workyard mileage data becomes the source — employees would confirm or dispute the logged miles rather than submitting a receipt. IRS rate or custom rate would apply per mile.

**Do not build this now. Do not design it out.** The expense type list should include a `mileage` type as a placeholder so no schema changes are required when it's built.

---

## Data Model

```sql
CREATE TABLE payroll_expense_submissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_week_id   UUID REFERENCES payroll_weeks(id),  -- which week it will pay in
  employee_id       UUID NOT NULL REFERENCES payroll_employees(id),
  submitted_by      UUID NOT NULL REFERENCES auth.users(id),  -- may differ from employee
  submitted_at      TIMESTAMPTZ DEFAULT now(),
  signature_data    TEXT NOT NULL,  -- drawn signature, base64
  status            TEXT CHECK (status IN (
                      'pending',
                      'approved',
                      'rejected',
                      'correction_requested',
                      'bookkeeping_only'
                    )),
  total_amount      NUMERIC(10,2),
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE payroll_expense_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id     UUID NOT NULL REFERENCES payroll_expense_submissions(id),
  expense_type      TEXT CHECK (expense_type IN (
                      'gas',
                      'tolls',
                      'parking',
                      'materials',
                      'tools',
                      'food',
                      'other',
                      'mileage'  -- future, placeholder
                    )),
  amount            NUMERIC(10,2) NOT NULL,
  property_id       UUID REFERENCES properties(id),  -- null for tools (unit-weighted)
  payment_method    TEXT CHECK (payment_method IN (
                      'personal',
                      'company_card',
                      'company_account',
                      'unknown'
                    )),
  receipt_image_url TEXT NOT NULL,  -- required, no exceptions
  description       TEXT,
  prior_week_id     UUID REFERENCES payroll_weeks(id),  -- non-null = carry-forward
  allocation_method TEXT CHECK (allocation_method IN (
                      'direct',         -- specific property
                      'unit_weighted'   -- tools spread
                    )),
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE payroll_expense_approvals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id     UUID NOT NULL REFERENCES payroll_expense_submissions(id),
  action            TEXT CHECK (action IN (
                      'approved',
                      'rejected',
                      'correction_requested',
                      'routed_to_bookkeeping'
                    )),
  actioned_by       UUID NOT NULL REFERENCES auth.users(id),
  actioned_at       TIMESTAMPTZ DEFAULT now(),
  notes             TEXT,
  property_override UUID REFERENCES properties(id)  -- if approver corrects attribution
);
```

---

## Admin Configuration

The following are configurable in Admin settings — not hard-coded:

| Setting | Description |
|---|---|
| Submission cutoff day | Day of week the cutoff falls on |
| Submission cutoff time | Time on that day |
| Travel premiums | Per-property, per-day or flat, with effective date |
| Default approver per portfolio | Who approves expenses for each portfolio |

---

## Out of Scope

- Mileage reimbursement — future, placeholder type added to schema
- Expense categories beyond the defined type list — extendable via admin, not hardcoded
- Integration with accounting software — Kathleen's bookkeeping queue is the handoff point
- Per diem rates — not a pattern in use currently