# CLAUDE.md — Operator OS Agent Instructions

Read this before starting any task.

---

## Mandatory Reading at Session Start

Before any task, read these in order:
1. `docs/KNOWN_ISSUES.md` — what is broken (3 Critical issues open as of last update)
2. `docs/PROGRESS_LOG.md` — last 2 entries (what was just done)
3. `docs/DEPLOYMENT_TOPOLOGY.md` — where services run and env var security boundaries

Never assume current state. Always verify.

---

## Project Identity

**Name:** Operator OS (internal codename) / Adexra Execution Platform  
**Owner:** Luan Varela (single user — not a multi-user SaaS)  
**Purpose:** Daily execution cockpit answering "What should I focus on today?"  
**Companies in scope:** MoveOn (milestone tracking only) + Adexra (full client/delivery management)  
**Stack:** React 19 + Vite + Tailwind v4 + Supabase + Azure OpenAI → deployed on Vercel

---

## Non-Negotiable Rules

1. **This is a single-user tool.** Do not build team features, invites, org switchers, or multi-user UX. Auth is only for Supabase row security and the ad_plans public sharing feature.
2. **MoveOn = milestones only.** MoveOn detailed tasks stay inside the MoveOn admin panel. This system only tracks `company_milestones` for MoveOn.
3. **Foundation before redesign.** Do not touch UI until Sprint 1 (schema + lint + build) is complete. Check `docs/KNOWN_ISSUES.md` — 3 Critical issues must be resolved first.
4. **Run `supabase/migrations/004_operator_os.sql` before any schema-dependent feature work.** The `tasks`, `subtasks`, `contacts`, `client_payments`, `expenses` tables may be missing. See ISSUE-001. Migration guide at `supabase/README.md`.
5. **No task is complete until `docs/PROGRESS_LOG.md` is updated.**
6. **Architecture decisions are recorded as ADRs in `docs/DECISIONS.md`.**
7. **Azure API key is in the client bundle by design** (single-user tool, ADR-002). Do not move it server-side unless the app becomes multi-user.

---

## Skills to Use

Always invoke the right skill before working. Quick reference:

| Task | Skill to invoke |
|---|---|
| Any new session start | Already done if CLAUDE.md was read |
| UI/component work for Adexra | `brand-guidelines` + `frontend-design` |
| React performance / hooks / patterns | `react-best-practices` |
| Database / backend patterns | `senior-backend` |
| Security concerns | `cybersecurity` |
| Commit message | `git-commit-helper` |
| Test local UI | `webapp-testing` |
| Architecture decisions | `senior-architect` |

Full skill index: `C:\Users\luanc\.claude\projects\C--Users-luanc\memory\reference_skills_guide.md`

---

## Sprint Roadmap

| Sprint | Goal | Skills |
|---|---|---|
| **1 — CURRENT** | Foundation: schema, lint, code splitting | `clean-code`, `senior-backend` |
| 2 | Command Center (redesign Dashboard) | `brand-guidelines`, `frontend-design`, `senior-frontend` |
| 3 | Availability + Rituals | `senior-backend`, `react-best-practices` |
| 4 | Weekly Planning | `react-best-practices`, `senior-frontend` |
| 5 | Daily Planning & Review | `react-best-practices`, `senior-frontend` |
| 6 | MoveOn Milestones page | `frontend-design`, `brand-guidelines` |
| 7 | Adexra Client Delivery OS | `senior-frontend`, `frontend-design` |
| 8 | Finance Awareness | `senior-frontend` |
| 9 | AI Assistance | `senior-backend`, `react-best-practices` |

**Full plan:** `C:\Users\luanc\.claude\plans\luan-your-idea-is-eager-noodle.md`

---

## Design System (Sprint 2+)

Apply Adexra brand system (from `brand-guidelines` skill):
- Background: `#01020E`
- Surface: `#0D0F1E`
- Text: `#F4F4F6`
- Accent: `#3362FF`
- Fonts: monospace + serif
- Grid rhythm: 60px
- Feel: dark command center, premium, fast, operational

Current app uses beige/editorial aesthetic — migration to dark brand happens in Sprint 2.

---

## After Every Task

1. Update `docs/PROGRESS_LOG.md` — new entry
2. Update `docs/KNOWN_ISSUES.md` — add new issues, mark resolved ones as fixed
3. Update `docs/CHANGELOG.md` if behavior changed
4. Write an ADR in `docs/DECISIONS.md` if an architecture decision was made
5. Update the relevant `docs/modules/*.md` if a module changed

---

## Project Overview

Operator OS is a React SPA backed by Supabase (PostgreSQL + Auth) with Azure OpenAI for the Brain/Briefing system. Deployed on Vercel. Single user. No server — all logic is client-side.

**Current routes:**
- `/` — Dashboard (→ Command Center after Sprint 2)
- `/clients` — Portfolio list
- `/client/:id` — Client detail
- `/priority` — Task execution board
- `/financials` — Income/expenses
- `/ads` — Ad planning
- `/agents`, `/agents/:id` — AI agent management
- `/memory` — Memory buckets
- `/rag` — RAG documents
- `/briefing/:clientId` — Multi-agent briefing session
- `/account` — Settings
- `/auth` — Login/signup (public)
- `/plan/:id` — Shareable ad plan view (public)

**Planned new routes (Sprints 2–9):**
- `/today` — Daily planning & review
- `/weekly` — Weekly planning
- `/moveon` — MoveOn milestones
- `/settings/availability` — Availability + ritual management

See `docs/ARCHITECTURE.md` for the full system design.
