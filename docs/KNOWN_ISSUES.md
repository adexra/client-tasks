# Known Issues — Operator OS

Last updated: 2026-06-22 — Tasks system cloned, 2 new pending actions added

---

## Pending User Actions

### ISSUE-017 — Migration 008 not yet run in Supabase
**Severity:** High — Tasks page will fail to load tasks without sprint columns
**Status:** ⏳ Pending — run `supabase/migrations/008_tasks_sprint_system.sql` in Supabase SQL editor
**What it adds:** planning_bucket, execution_status, order_index, task_artifacts table, roadmap_objectives, weekly_rituals, move_task RPC

### ISSUE-018 — `task-media` storage bucket not yet created
**Severity:** Low — Tasks load fine; only image uploads in RichTextEditor will fail
**Status:** ⏳ Pending — create public bucket named `task-media` in Supabase Storage

---

## Critical

### ISSUE-001 — 5 tables used in frontend have no migration
**Severity:** Critical
**Status:** ✅ Fixed — 2026-06-21 (run `supabase/migrations/004_operator_os.sql`)
**Tables missing:** `tasks`, `subtasks`, `contacts`, `client_payments`, `expenses`
**Fix applied:** Migration 004 creates all 5 tables plus the Operator OS tables.

### ISSUE-002 — `phase_fields.field_type` CHECK constraint rejects `'tasklist'`
**Severity:** Critical
**Status:** ✅ Fixed — 2026-06-21 (run `supabase/migrations/004_operator_os.sql`)
**Fix applied:** Migration 004 Section B drops old constraint and recreates it with `'tasklist'` allowed.

### ISSUE-003 — Duplicate phase creation: SQL trigger + JS code both run
**Severity:** Critical
**Status:** ✅ Fixed — 2026-06-21 (run `supabase/migrations/004_operator_os.sql`)
**Fix applied:** Migration 004 Section C drops the `initialize_client_phases` trigger. JS in AddClientModal.jsx remains as source of truth.

---

## High

### ISSUE-004 — 8 missing columns on `clients` table
**Severity:** High
**Status:** ✅ Fixed — 2026-06-22 (migration 004 run by user)
**Fix applied:** All columns added via `ALTER TABLE clients ADD COLUMN IF NOT EXISTS` in migration 004.

### ISSUE-005 — ESLint errors
**Severity:** High
**Status:** ✅ Fixed — 2026-06-21
**Result:** 0 errors, 38 warnings (all React Compiler architectural opinions — intentionally downgraded to warn)

### ISSUE-006 — Bundle too large: main JS chunk ~1.23 MB minified
**Severity:** High
**Status:** ✅ Fixed — 2026-06-21
**Result:** 7 routes lazy-loaded via `React.lazy`. Vendor libs split via `manualChunks`. No single chunk exceeds 500 KB.

---

## Medium

### ISSUE-007 — Azure OpenAI key exposed in client bundle
**Severity:** Medium (acceptable for single-user use)
**Status:** Known/Accepted (ADR-002)
**File:** `src/lib/azure.js`
**Impact:** Risk only if URL is shared publicly. Not a concern for personal internal tool.

### ISSUE-008 — RLS disabled on all core tables except `ad_plans`
**Severity:** Medium (acceptable for single-user use)
**Status:** Known/Accepted
**Impact:** Acceptable for single-user tool. Fix if app ever becomes multi-user.

### ISSUE-009 — FX rates hardcoded (USD: 5.20, EUR: 6.00)
**Severity:** Medium
**Status:** ✅ Fixed — 2026-06-22
**Fix applied:** `FinancialContext.fetchFX` now fetches live rates from `open.er-api.com/v6/latest/BRL` (free, no key). Falls back to hardcoded rates if API unavailable. Refreshes every 5 minutes.

### ISSUE-010 — `package.json` name is `temp-app`
**Severity:** Low
**Status:** ✅ Fixed — 2026-06-22
**Fix applied:** Renamed to `operator-os`.

---

## Low

### ISSUE-011 — `tmp_adplanview.jsx` stale file in root
**Severity:** Low
**Status:** ✅ Fixed — 2026-06-21

### ISSUE-012 — `README.md` is the default Vite template README
**Severity:** Low
**Status:** ✅ Fixed — 2026-06-22
**Fix applied:** Replaced with actual project README (routes, setup, stack).

### ISSUE-013 — `PhaseSection.jsx` calls `Date.now()` at render time
**Severity:** Low
**Status:** ✅ Fixed — 2026-06-21

### ISSUE-014 — `Memory.jsx` re-declares `const { data, error }`
**Severity:** Low
**Status:** ✅ Fixed — 2026-06-21 (ESLint pass resolved this)

---

## New Issues Found — 2026-06-22 QA Audit

### ISSUE-015 — `expenses` table has RLS still enabled
**Severity:** High
**Status:** ⚠️ Open — user must fix
**Symptom:** Financials page logs `401 Failed to load resource` for every `expenses` query; adding expenses fails silently.
**Fix required:** Run in Supabase SQL Editor:
```sql
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
```

### ISSUE-016 — `links` JSONB column missing from `clients` table
**Severity:** Medium
**Status:** ⚠️ Open — user must fix
**Symptom:** Links & Files section in ClientDetail cannot save (column doesn't exist yet).
**Fix required:** Run in Supabase SQL Editor:
```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]'::jsonb;
```
