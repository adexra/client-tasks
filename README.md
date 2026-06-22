# Operator OS — Adexra Execution Platform

Personal daily execution cockpit answering "What should I focus on today?"

**Stack:** React 19 + Vite + Tailwind v4 + Supabase + Azure OpenAI → Vercel

**URL:** tasks.adexra.com

## Routes

| Path | Description |
|---|---|
| `/` | Command Center — daily focus dashboard |
| `/today` | Daily planning & review |
| `/weekly` | Weekly planning + outcomes |
| `/moveon` | MoveOn milestones |
| `/clients` | Client portfolio |
| `/client/:id` | Client delivery OS |
| `/priority` | Task execution board |
| `/financials` | Finance awareness |
| `/ads` | Ad planning |
| `/agents` | Brain agents |
| `/briefing/:clientId` | Multi-agent briefing session |
| `/memory` | Memory buckets |
| `/rag` | RAG documents |
| `/settings/availability` | Availability rules + rituals |
| `/account` | Settings |
| `/plan/:id` | Shareable ad plan (public) |

## Setup

```bash
npm install
npm run dev
```

Requires `.env` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and Azure OpenAI keys. Run `supabase/migrations/` in order in the Supabase SQL Editor before first use.
