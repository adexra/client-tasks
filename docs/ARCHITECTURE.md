# Architecture — Operator OS (Adexra Execution Platform)

Last updated: 2026-06-21 | Source: automated audit by Claude

## System Overview

Operator OS is a single-user personal execution cockpit for Luan Varela, managing two companies: **MoveOn** (internal company with its own admin panel) and **Adexra** (digital agency). The system replaces a generic CRM with a daily decision tool that answers: *"What should I focus on today?"*

It is a React SPA backed by Supabase (PostgreSQL + Auth) with Azure OpenAI powering the Brain/Briefing system. Deployed on Vercel as a static build with client-side routing.

## Core Flow

```
User (browser)
  │
  ├── Supabase Auth ──→ session token stored in localStorage
  │
  ├── React Router ──→ protected routes check AuthContext
  │
  ├── Supabase DB ──→ direct from client (anon key + RLS)
  │      └── Tables: clients, tasks, subtasks, contacts,
  │                  client_payments, expenses, ad_plans,
  │                  brain_agents, brain_memory, brain_rag,
  │                  brain_sessions, brain_messages
  │                  [+ new Operator OS tables — see complete_migration.sql]
  │
  └── Azure OpenAI ──→ direct from client (key in .env)
         ├── gpt-4o        → briefing extraction, agent orchestration
         ├── gpt-4o-mini   → agent specialist responses
         └── embeddings     → RAG vectorization
```

## System Layers

### Frontend (src/)
React 19 SPA. All business logic runs client-side. No backend server — Supabase handles auth and data, Azure handles AI.

**State management:** React Context only (AuthContext, FinancialContext, LanguageContext, ToastContext). No Redux/Zustand.

**Routing:** React Router v7. Two public routes (`/auth`, `/plan/:id`). All others protected by AuthContext check.

**Styling:** Tailwind v4 (CSS-first config). Custom design tokens in `src/index.css` via CSS custom properties. Target design: Adexra dark brand system (`#01020E` bg, `#3362FF` accent) — currently uses a beige/editorial aesthetic. Migration to dark brand is planned for Sprint 2.

### Database (Supabase)
PostgreSQL via Supabase. Direct client access using anon key. RLS is disabled on most tables (single-user tool). Only `ad_plans` has RLS enabled (for public plan sharing via `/plan/:id`).

**Migration state:** 3 SQL files exist but are incomplete. See `docs/KNOWN_ISSUES.md` for the full schema gap list. Run `complete_migration.sql` (to be created in Sprint 1) before any new feature work.

### AI Layer (Azure OpenAI)
Called directly from the browser via `src/lib/azure.js`. Three endpoints:
- `VITE_AZURE_OPENAI_ENDPOINT_GPT4O` — gpt-4o for extraction and synthesis
- `VITE_AZURE_OPENAI_ENDPOINT_GPT4O_MINI` — gpt-4o-mini for agent responses
- `VITE_AZURE_OPENAI_ENDPOINT_EMBEDDINGS` — text-embedding-ada-002 for RAG

Key risk: Azure API key exposed in the client bundle. Acceptable for a single-user internal tool, but not for any multi-user or public-facing use.

## Tech Stack

| Component | Technology | Version | Status |
|---|---|---|---|
| UI Framework | React | 19.2.4 | Active |
| Build Tool | Vite | 6.3.5 | Active |
| Routing | React Router | 7.13.1 | Active |
| Styling | Tailwind CSS | 4.2.2 | Active |
| Database | Supabase (PostgreSQL) | JS client 2.45.0 | Active |
| Auth | Supabase Auth | — | Active |
| AI | Azure OpenAI (gpt-4o, embeddings) | — | Active |
| Charts | Recharts | 3.8.1 | Active |
| Animations | Framer Motion | 12.38.0 | Active |
| Flow diagrams | @xyflow/react | 12.10.2 | Active (Ads Planning) |
| Icons | Lucide React | 0.577.0 | Active |
| Deployment | Vercel | — | Active |
| Node version | Node.js | >=22 (locked at 22) | Active |

## Project Structure

```
F:/automated-sites/Client Tasks/
├── src/
│   ├── pages/          — One file per route (Dashboard, Clients, etc.)
│   ├── components/     — Shared UI components and modals
│   ├── context/        — React context providers (Auth, Financial, Language, Toast)
│   ├── lib/            — Utilities: supabase.js, azure.js, templates.js, utils.js, translations.js
│   └── assets/         — Static images
├── docs/               — Project documentation (this folder)
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql  — clients, client_phases, phase_fields (historical)
│   │   ├── 002_ad_plans.sql        — ad_plans with RLS (historical)
│   │   ├── 003_brain_system.sql    — brain_* tables + agent seeds (historical)
│   │   └── 004_operator_os.sql     — ⚠️ Run this: schema fixes + all Operator OS tables
│   └── README.md                   — migration run order and status
├── setup_supabase.sql      — Legacy (superseded by supabase/migrations/001)
├── ad_plans_migration.sql  — Legacy (superseded by supabase/migrations/002)
├── brain_migration.sql     — Legacy (superseded by supabase/migrations/003)
├── complete_migration.sql  — Legacy (superseded by supabase/migrations/004)
├── vercel.json         — Vercel deployment config (SPA rewrites)
├── vite.config.js      — Vite build config
├── tailwind.config.js  — Tailwind config (minimal — v4 uses CSS)
├── eslint.config.js    — ESLint config
└── .env                — Environment variables (not committed)
```

## Planned Additions (Operator OS Upgrade)

See the approved plan at `C:\Users\luanc\.claude\plans\luan-your-idea-is-eager-noodle.md` for the full 9-sprint roadmap. Key additions:

- `complete_migration.sql` — fixes all schema gaps (Sprint 1)
- New tables: `companies`, `company_milestones`, `availability_rules`, `day_rituals`, `weekly_plans`, `weekly_outcomes`, `daily_plans`, `daily_plan_tasks`, `daily_reviews`
- New pages: Command Center (redesigned Dashboard), Today, WeeklyPlan, MoveOn, Availability
- Dark Adexra brand system applied to all UI (Sprint 2+)
