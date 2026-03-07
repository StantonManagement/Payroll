# Database Architecture

One Supabase instance serves multiple department apps. Each app has its own frontend but they share the same Postgres database. This document describes the architectural patterns and rules — not a catalog of every table.

---

## Data Flow

```
AppFolio (source of truth)
    │
    ▼  hourly cron job
AF_ staging tables (read-only, PascalCase)
    │
    ▼  sync trigger functions
Canonical tables (snake_case, shared)
    │
    ├──▶ App 1 reads/writes
    ├──▶ App 2 reads/writes
    └──▶ App 3 reads/writes
```

AppFolio is the property management system. An hourly cron job exports data into **AF_ staging tables** (e.g., `AF_TenantDirectory`, `AF_work_order_new`). These are raw dumps — apps never read from them directly.

**Sync trigger functions** fire on INSERT/UPDATE to AF_ tables and transform the data into **canonical tables** — the normalized, snake_case tables that all apps share.

---

## Table Categories

### 1. AF_ Staging Tables

Raw AppFolio exports. PascalCase column names. **Read-only** — no app should SELECT from these in production code. They exist solely as a staging area for the sync pipeline.

### 2. Canonical Tables (shared across all apps)

The single source of truth for each entity. All apps read from these. Snake_case columns, UUID primary keys, `af_*_id` TEXT columns as dedup keys linking back to AppFolio.

| Table | Synced From | Category |
|---|---|---|
| `tenants` | `AF_TenantDirectory` | AF-Authoritative |
| `work_orders` | `AF_work_order_new` | AF-Authoritative |
| `inspections` | `AF_InspectionDetail` | AF-Authoritative |
| `leases` | `AF_leases` | AF-Authoritative |
| `units` | `AF_units` | AF-Seeded, Locally Owned |
| `properties` | `AF_buildings` | AF-Seeded, Locally Owned |
| `portfolios` | `AF_portfolios` | AF-Seeded, Locally Owned |
| `vendors` | `AF_vendor_directory_new` | AF-Seeded, Locally Owned |
| `technicians` | — | App-Native |
| `equipment` | — | App-Native |

**AF-Authoritative**: AppFolio always wins. Sync overwrites all AF-owned columns. Apps **never write** to these columns — not even to "correct" them.

**AF-Seeded, Locally Owned**: AppFolio creates the record and owns core identity columns (address, name). Apps can enrich the record with additional columns. Sync only updates AF-owned columns, never local enrichments.

**App-Native**: No AppFolio origin. Created and owned entirely by apps.

### 3. Department-Owned Tables

Each department creates its own tables for app-specific features. These are **not shared** — other departments must not depend on them.

#### Naming convention

New department-owned tables **must** use a department prefix to distinguish them from canonical tables:

| Department | Prefix | Example |
|---|---|---|
| MOC | `moc_` | `moc_inspection_documents`, `moc_inspection_records` |
| Collections | `collections_` | `collections_queue` |
| Leasing | `leasing_` | `leasing_prospects` |
| Accounting | `acct_` | `acct_journal_entries` |

> **Note:** Legacy tables created before this convention was established may not have the prefix (e.g., `work_order_actions`, `detector_acknowledgments`). New tables must follow it.

#### Required structure for every department-owned table

```sql
CREATE TABLE moc_example (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- FK to canonical table if applicable:
  unit_id     UUID REFERENCES units(id),
  -- ... feature-specific columns ...
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID REFERENCES auth.users(id)
);

-- Row-Level Security is mandatory
ALTER TABLE moc_example ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_access" ON moc_example
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Auto-update updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON moc_example
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
```

#### Linking department tables to canonical tables

Department tables FK to canonical tables for context, but **never write to the canonical table itself**. If you need to reference an AF-Authoritative record (e.g., link an MOC feature to a specific inspection), add an optional FK column:

```sql
-- Good: optional link to canonical, read-only relationship
ALTER TABLE moc_inspection_records ADD COLUMN inspection_id UUID REFERENCES inspections(id);

-- Bad: never update a canonical AF-Authoritative row from app code
UPDATE inspections SET status = 'confirmed' WHERE id = ?;  -- ❌
```

---

## Key Rules

### 1. Apps read canonical tables, not AF_ tables
```
❌  supabase.from('AF_TenantDirectory').select(...)
✅  supabase.from('tenants').select(...)
```

### 2. Canonical table column conventions
- **PK**: `id UUID DEFAULT gen_random_uuid()`
- **Dedup key**: `af_*_id TEXT UNIQUE` (links back to AppFolio entity IDs only — not for OCR text or free-form values)
- **Standard columns**: `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`
- **Column style**: `snake_case` (never PascalCase)
- **Money**: `NUMERIC(10,2)`
- **Statuses**: lowercase TEXT with CHECK constraint
- **No hard deletes**: Use `is_current = false` for soft-delete

### 3. `af_*_id` columns are AppFolio IDs only
`af_*_id` columns are reserved for the actual AppFolio entity identifier (e.g., `af_tenant_id = 'T-1234'`). Never use them to store free-form OCR text, addresses, or other app-generated strings. Use descriptive column names for those (e.g., `ocr_property_address`, `ocr_unit_number`).

### 4. Each department owns its tables — don't add columns to canonical tables
For department-specific data, create a department-owned table with a FK to the canonical table rather than adding columns directly.

```
❌  ALTER TABLE work_orders ADD COLUMN moc_internal_notes TEXT;
✅  CREATE TABLE moc_work_order_notes (
      id UUID PK, work_order_id UUID FK → work_orders, note TEXT, ...
    );
```

The exception: apps may add **enrichment columns** to AF-Seeded tables (e.g., `properties.vault_data`) because the sync trigger never touches those columns.

### 5. Sync functions never overwrite app-enriched columns
When a canonical table has both AF-owned and app-enriched columns, the sync trigger uses `ON CONFLICT ... DO UPDATE SET` only for AF-owned columns. App enrichment columns are left untouched.

### 6. Portfolio isolation
Properties have a `portfolio_id`. RLS policies should eventually filter by portfolio chain. Current MVP policies use `USING (true)` for all authenticated users — this must be tightened before multi-portfolio deployment.

---

## Active Sync Triggers

| AF_ Table | Canonical Table | Events |
|---|---|---|
| `AF_TenantDirectory` | `tenants` | INSERT/UPDATE/DELETE |
| `AF_work_order_new` | `work_orders` | INSERT/UPDATE |
| `AF_units` | `units` | INSERT/UPDATE |
| `AF_buildings` | `properties` | INSERT/UPDATE |
| `AF_portfolios` | `portfolios` | INSERT/UPDATE |
| `AF_vendor_directory_new` | `vendors` | INSERT/UPDATE |
| `AF_TenantLedger` | `payment_detections` | INSERT |
| `AF_InspectionDetail` | `inspections` | INSERT/UPDATE/DELETE |

**Not yet synced**: `AF_Delinquency`, `AF_leases`

---

## Adding a New Feature or Department

1. **Read from canonical tables** — don't duplicate `tenants`, `properties`, `units`
2. **Create prefixed department-owned tables** — follow the naming convention above
3. **If you need data from an AF_ table that isn't synced yet**, create a new canonical table + sync trigger
4. **Enable RLS** on every new table with appropriate policies
5. **Never modify sync functions** for other departments' tables
6. **Add `updated_at` trigger** using `trigger_set_updated_at()` (the function already exists in the DB)

---

## Collections: Temporary Dual-Tenant Tables

Collections currently uses `tenants_v3` (keyed on `occupancy_id`) alongside canonical `tenants` (keyed on `af_tenant_id`) because it needs financial aging data from `AF_Delinquency` that isn't in canonical `tenants`. Long-term goal: sync `AF_Delinquency` into a canonical `tenant_financials` table and retire `tenants_v3`.
