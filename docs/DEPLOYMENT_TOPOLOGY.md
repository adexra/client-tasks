# Deployment Topology — Operator OS

Last updated: 2026-06-21 | ⚠️ Agent-inferred — verify manually

## Services

| Service | Directory | Runtime | URL / Identifier | Status |
|---|---|---|---|---|
| Frontend SPA | `/` (root) | Vercel (static) | Vercel project: `client-tasks` | Active |
| Database | Supabase | PostgreSQL (managed) | `https://pjqxsxjzmpemsmwmijjr.supabase.co` | Active |
| Auth | Supabase Auth | Managed | Same project as DB | Active |
| AI — gpt-4o | Azure OpenAI | Managed | Set via `VITE_AZURE_OPENAI_ENDPOINT_GPT4O` | Active |
| AI — gpt-4o-mini | Azure OpenAI | Managed | Set via `VITE_AZURE_OPENAI_ENDPOINT_GPT4O_MINI` | Active |
| AI — Embeddings | Azure OpenAI | Managed | Set via `VITE_AZURE_OPENAI_ENDPOINT_EMBEDDINGS` | Active |

**Supabase project ID:** `pjqxsxjzmpemsmwmijjr`
**Supabase URL:** `https://pjqxsxjzmpemsmwmijjr.supabase.co`
**Vercel project ID:** `prj_LbDO5qJmmWMgRjqAHoA5ZAe7sxyR`
**Vercel org ID:** `team_CYmZWy8vavV5Xui69yhdvoYk`

## Build & Deploy

```bash
npm ci                # install
npm run build         # outputs to /dist
# Vercel auto-deploys on push to main
```

Vercel config (`vercel.json`):
- SPA rewrite: all routes → `index.html`
- Output: `dist/`
- Build command: `npm run build`
- Install command: `npm ci`

## Environment Variables — Security Boundaries

| Variable | Used by | Client-safe? | Notes |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `src/lib/supabase.js` | ✅ Yes | `https://pjqxsxjzmpemsmwmijjr.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabase.js` | ✅ Yes | Anon key — safe for client. Expires 2088. |
| `VITE_AZURE_OPENAI_KEY` | `src/lib/azure.js` | ⚠️ Exposed | API key in client bundle — acceptable for single-user internal tool only |
| `VITE_AZURE_OPENAI_ENDPOINT_GPT4O` | `src/lib/azure.js` | ⚠️ Exposed | Azure endpoint URL |
| `VITE_AZURE_OPENAI_ENDPOINT_GPT4O_MINI` | `src/lib/azure.js` | ⚠️ Exposed | Azure endpoint URL |
| `VITE_AZURE_OPENAI_ENDPOINT_EMBEDDINGS` | `src/lib/azure.js` | ⚠️ Exposed | Azure endpoint URL |

⚠️ **Security note:** All `VITE_` variables are bundled into the client JS. The Azure key is readable from the browser network tab. This is acceptable for a personal single-user tool. If the app ever becomes multi-user or public-facing, Azure calls must move to a server-side function (Vercel Edge Function or Supabase Edge Function).

## Local Development

```bash
npm run dev     # starts Vite dev server (default: localhost:5173)
```

Requires `.env` with all 6 variables above.

## Supabase Keys (confirmed 2026-06-21)

| Key | Value |
|-----|-------|
| Anon / public | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqcXhzeGp6bXBlbXNtd21pampyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MzYzMTIsImV4cCI6MjA4ODMxMjMxMn0.ynNYdftzLYHyeSXOolXtPZaiP9Pq-5Tiqz8zEEHWA50` |
| Service role / secret | stored in `.env` only — never commit |

## Migration Status (as of 2026-06-21)

| Migration | Status |
|-----------|--------|
| `001_initial_schema.sql` | ✅ Run (original setup) |
| `002_ad_plans.sql` | ✅ Run (original setup) |
| `003_brain_system.sql` | ✅ Run (original setup) |
| `004_operator_os.sql` | ✅ Run — 2026-06-21 |
| `005_qa_seed.sql` | ✅ Run — 2026-06-21 (QA seed data) |

To run 004: open Supabase SQL Editor → paste `supabase/migrations/004_operator_os.sql` → Run.

## Confirmations Needed

- [ ] Run `supabase/migrations/004_operator_os.sql` in Supabase SQL Editor
- [ ] Confirm Azure OpenAI deployments are active and within quota
- [ ] Confirm Vercel project is on the correct team/account
