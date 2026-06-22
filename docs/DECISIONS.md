# Architecture Decision Records — Operator OS

Format: ADR-XXX — Date — Title

---

## ADR-001 — 2026-06-21 — Single-user tool: no RLS, no team features

**Context:** The app is a personal execution cockpit for one user (Luan Varela). Multi-user and SaaS features would add significant complexity.

**Decision:** Keep RLS disabled on core tables. No team roles, no invite system, no organization switcher. Auth is used only for the Supabase anon key security boundary and the `ad_plans` public-sharing feature.

**Consequences:** Simple data model. Fast to build. If the app ever becomes multi-user, all tables need `user_id` columns and RLS policies added. The `ad_plans` table (which has RLS already) shows the pattern to follow.

---

## ADR-002 — 2026-06-21 — Azure OpenAI called directly from client

**Context:** The Brain/Briefing system needs AI. Options were: (a) call Azure directly from client, (b) proxy through a Vercel Edge Function, (c) use Supabase Edge Function.

**Decision:** Call Azure directly from the client (`src/lib/azure.js`). The key is exposed in the bundle. Acceptable because this is a personal internal tool — the URL is not shared publicly.

**Consequences:** Fast to implement. Zero server infrastructure. Risk: if the Vercel URL is shared or discovered, the Azure key could be abused. Mitigation: set Azure quota limits.

---

## ADR-003 — 2026-06-21 — JS code handles phase creation, not SQL trigger

**Context:** Phase creation logic existed in two places: a SQL trigger (`initialize_client_phases()`) and JS code in `AddClientModal.jsx`. Both ran on client creation, producing duplicate phases.

**Decision:** Drop the SQL trigger. Keep the JS code. Reason: the JS code uses `PHASE_TEMPLATES` from `src/lib/templates.js` and correctly sets `field_type: 'tasklist'`. The SQL trigger used outdated field definitions and the wrong field types.

**Consequences:** Phase template changes only need to be made in `src/lib/templates.js`. A fresh DB setup must run `complete_migration.sql` which drops the trigger.

---

## ADR-004 — 2026-06-21 — MoveOn tracked as milestones only, not as tasks

**Context:** MoveOn (the other company Luan manages) already has its own admin panel with full sprint/task management. Building a task board here would create a second system to maintain and cause context-switching confusion.

**Decision:** MoveOn is represented in this system only as `company_milestones` — high-level health indicators with status, confidence, source links, and next actions. No tasks, no sprint board.

**Consequences:** Cleaner mental model. The system reminds Luan of MoveOn's strategic state without duplicating operational work.

---

## ADR-005 — 2026-06-21 — Operator OS upgrade: 9-sprint roadmap

**Context:** The current app is a good MVP but not trustworthy enough for daily use. It lacks daily planning, weekly outcomes, availability awareness, ritual system, and the dark brand design.

**Decision:** Upgrade the system in 9 sprints, starting with schema/lint fixes before any UI redesign. Sprint order: Foundation → Command Center → Availability+Rituals → Weekly Planning → Daily Planning → MoveOn Milestones → Adexra Client OS → Finance → AI Assistance.

**Full plan:** `C:\Users\luanc\.claude\plans\luan-your-idea-is-eager-noodle.md`

---

## ADR-006 — 2026-06-21 — Adexra service types define delivery checklists

**Context:** Adexra delivers 6 service types (Landing Page, Website, WhatsApp Ads Management, WhatsApp Chatbot, Maintenance, Consultation). Each has a different delivery checklist. Generic phases don't capture service-specific deliverables well.

**Decision:** Add `SERVICE_TEMPLATES` to `src/lib/templates.js` — one checklist per service type. Client detail pages will render the appropriate checklist based on the client's service type.

**Consequences:** Delivery is more systematic. Future AI features (task breakdown) can use these templates as context.

---

## ADR-007 — 2026-06-21 — Dark brand applied via CSS custom properties + inline styles, not Tailwind config rewrite

**Context:** The app was built with a beige editorial aesthetic using Tailwind utility classes like `bg-bg-paper`, `text-ink-primary`, `bg-accent-sand`. Sprint 2 required migrating to the Adexra dark brand (`#01020E` background, `#3362FF` accent). Two approaches: (a) remap the CSS custom properties in `@theme {}` block in `index.css`, (b) write all new dark classes from scratch.

**Decision:** Remap the `@theme {}` CSS variables in `index.css` to the dark brand values. This makes all existing Tailwind utility classes (`bg-bg-paper`, etc.) automatically render dark colors without touching every component. For new components (Command Center sections), use inline `style` props with exact hex values for precision and readability.

**Consequences:** All existing pages (ClientDetail, PriorityView, Financials, etc.) inherit the dark theme immediately without per-file changes. Trade-off: the variable names (`bg-bg-paper`, `accent-sand`) are now semantically misleading (they map to dark values). This is acceptable for a single-user tool — the names are implementation details, not a design system contract.
