# Payroll & Invoicing System

Stanton Management's weekly payroll and property billing platform. Replaces a pair of linked Excel workbooks that were rebuilt from scratch every week with an auditable, approval-gated system built on Next.js 15 and Supabase. The system imports approved time cards from Workyard, routes flagged entries through a structured correction queue, calculates cost allocations across ~41 properties owned by multiple LLCs, generates per-entity invoices with explicit management fee line items, produces a consolidated weekly statement, and exports clean gross pay summaries for ADP processing. All manager overrides, approvals, and corrections carry full audit trails.

## Tech Stack

- **Framework:** Next.js 15 (App Router, Turbopack)
- **Database:** Supabase (Postgres with RLS)
- **UI:** React 18, Tailwind CSS, Lucide icons, custom design system (deep navy / muted gold / warm white)
- **Data tables:** Custom advanced data table with drag reorder, resize, density controls, and keyboard support
- **Charts:** Recharts
- **Time tracking integration:** Workyard API + CSV fallback
- **Payroll integration:** ADP (export/import reconciliation)

## Current State

The system is in **Phase 1 — Core Weekly Operations (Excel Replacement)**. Workyard ingestion, timesheet adjustment, and employee/rate management are partially built. The cost allocation engine, approval gates, invoice/statement generation, and ADP reconciliation are planned but not yet implemented. The exit criterion for Phase 1 is completing one full weekly payroll cycle with zero Excel dependency.

## Project Structure

```
src/
  app/           # Next.js App Router pages and API routes
  components/    # UI components (form/, kit/)
  hooks/         # Domain hooks (payroll/)
  lib/           # Services and Supabase client (payroll/, supabase/)
  middleware.ts  # Auth middleware
supabase/
  migrations/    # Database migration files
```

## Getting Started

```bash
npm install
npm run dev
```

Requires environment variables for Supabase URL, publishable key, and Workyard API credentials.
