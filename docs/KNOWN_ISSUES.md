# Known Issues — Operator OS

Last updated: 2026-06-21 — Sprint 2 complete (Supabase project: pjqxsxjzmpemsmwmijjr)

## Critical

### ISSUE-001 — 5 tables used in frontend have no migration
**Severity:** Critical  
**Status:** ✅ Fixed — 2026-06-21 (run `supabase/migrations/004_operator_os.sql`)  
**Tables missing:** `tasks`, `subtasks`, `contacts`, `client_payments`, `expenses`  
**Fix applied:** Migration 004 creates all 5 tables plus the Operator OS tables. Must be run in Supabase SQL Editor.

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
**Status:** Open — Sprint 1  
**Missing columns:** `phone`, `url`, `what_sold`, `contact_link`, `next_action`, `definition_of_done`, `not_included`, `tags`, `revenue`, `currency`, `phase`  
**Impact:** Client creation and editing silently drops these fields. They appear to save in the UI (optimistic) but are never persisted.  
**Fix:** `ALTER TABLE clients ADD COLUMN IF NOT EXISTS ...` for each in `complete_migration.sql`.

### ISSUE-005 — ESLint errors
**Severity:** High  
**Status:** ✅ Fixed — 2026-06-21  
**Result:** 0 errors, 32 warnings (all React Compiler architectural opinions — intentionally downgraded to warn)

### ISSUE-006 — Bundle too large: main JS chunk ~1.23 MB minified
**Severity:** High  
**Status:** ✅ Fixed — 2026-06-21  
**Result:** 7 routes lazy-loaded via `React.lazy`. Vendor libs split via `manualChunks`. No single chunk exceeds 500 KB. Largest chunks: `index` ~388KB (app code), `vendor-charts` ~285KB (recharts+d3), `vendor-supabase` ~103KB.

---

## Medium

### ISSUE-007 — Azure OpenAI key exposed in client bundle
**Severity:** Medium (acceptable for single-user use)  
**Status:** Known/Accepted  
**File:** `src/lib/azure.js` — all `VITE_AZURE_*` env vars  
**Impact:** Key readable from browser network tab. Risk: key abuse if URL is shared. Not a concern for personal internal tool.  
**Fix if escalated:** Move AI calls to a Vercel Edge Function or Supabase Edge Function.

### ISSUE-008 — RLS disabled on all core tables except `ad_plans`
**Severity:** Medium (acceptable for single-user use)  
**Status:** Known/Accepted  
**Tables without RLS:** clients, client_phases, phase_fields, contacts, tasks, subtasks, client_payments, expenses, brain_*  
**Impact:** Any authenticated user (if invites were ever added) can read/write all records.  
**Fix if escalated:** Enable RLS and add `user_id` column with `auth.uid()` policies on each table.

### ISSUE-009 — FX rates hardcoded (USD: 5.20, EUR: 6.00)
**Severity:** Medium  
**Status:** Open  
**File:** `src/context/FinancialContext.jsx`  
**Impact:** Currency conversion uses stale rates. BRL snapshots on payment (paid_brl_amount) are correct, but live display conversion drifts.  
**Fix:** Add a live FX rate fetch (e.g. from a free exchange rate API) or allow manual update in Settings.

### ISSUE-010 — `package.json` name is `temp-app`
**Severity:** Low  
**Status:** Open  
**Fix:** Update to `operator-os` or `adexra-exec-platform`.

---

## Low

### ISSUE-011 — `tmp_adplanview.jsx` stale file in root
**Severity:** Low  
**Status:** ✅ Fixed — 2026-06-21  
**Fix:** File deleted.

### ISSUE-012 — `README.md` is the default Vite template README
**Severity:** Low  
**Status:** Open  
**Fix:** Replace with actual project README after Sprint 1.

### ISSUE-013 — `PhaseSection.jsx` calls `Date.now()` at render time
**Severity:** Low (real bug risk under React Strict Mode)  
**Status:** ✅ Fixed — 2026-06-21  
**Fix:** Moved `Date.now()` inside the event handler body (was fixed earlier in session).

### ISSUE-014 — `Memory.jsx` re-declares `const { data, error }`
**Severity:** Low  
**Status:** Open — Sprint 1  
**File:** `src/pages/Memory.jsx`  
**Fix:** Rename second destructuring to `const { data: newBucket }`.
