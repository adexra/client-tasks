# Ad Planning — Operator OS

Last updated: 2026-06-21

## Purpose
Build and share advertising campaign plans with funnel allocation (TOFU/MOFU/BOFU), budget distribution across platforms, keywords, audience, KPIs, and conversion tracking. Plans can be shared as public read-only links.

## Entry Points
- `/ads` → `src/pages/AdPlanning.jsx` — plan builder
- `/plan/:id` → `src/pages/AdPlanView.jsx` — public shareable plan view (no auth required)

## Key Files
| File | Responsibility |
|---|---|
| `src/pages/AdPlanning.jsx` | CRUD for ad plans, funnel builder UI |
| `src/pages/AdPlanView.jsx` | Public-facing plan view (read-only, shareable) |
| `src/components/flow/` | React Flow nodes for visual funnel (PlatformNode, ClusterNode, ProjectionNode, AnimatedPipeEdge) |

## Tables Used
- `ad_plans` — defined in `ad_plans_migration.sql` with RLS enabled
- `clients` — for associating a plan with a client (optional)

## RLS on `ad_plans`
This is the only table with RLS enabled:
- Public read: `is_active = true OR auth.uid() = user_id`
- Auth insert/update/delete: open to any authenticated user

This allows `/plan/:id` to be shared publicly without login.

## JSONB Columns (all plan data)
- `funnel` — TOFU/MOFU/BOFU stages with budget_pct, platforms, objectives
- `mediums` — Google/Meta/TikTok/LinkedIn toggles and budgets
- `keywords` — primary, secondary, negative
- `audience` — demographic and psychographic targeting
- `conversion` — funnel metrics and tracking setup
- `creative` — creative brief and assets
- `target_kpi` — type and value

## Known Gotchas
- `tmp_adplanview.jsx` in the project root is a stale copy from development — delete it (ISSUE-011).
- AdPlanView imported `motion`, `useScroll`, `useTransform` from framer-motion but doesn't use them — causes lint errors (ISSUE-005). Remove those imports.
- Plan sharing is fully public if `is_active = true` — anyone with the UUID URL can view it.
