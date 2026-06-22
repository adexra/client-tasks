# Client Management — Operator OS

Last updated: 2026-06-21

## Purpose
Manage Adexra's external clients through their full lifecycle: from lead to delivery to maintenance/archive.

## Entry Points
- `/clients` → `src/pages/Clients.jsx` — portfolio list
- `/client/:id` → `src/pages/ClientDetail.jsx` — full client detail
- `AddClientModal` → `src/components/AddClientModal.jsx` — create/edit client

## Key Files
| File | Responsibility |
|---|---|
| `src/pages/Clients.jsx` | Portfolio list with search and active/archived filter |
| `src/pages/ClientDetail.jsx` | Full client view: phases, payments, tasks, contacts, billing |
| `src/components/AddClientModal.jsx` | Create/edit modal with phase initialization |
| `src/components/PhaseSection.jsx` | Collapsible phase accordion with editable fields |
| `src/lib/templates.js` | `PHASE_TEMPLATES` — default phase/field definitions |

## Tables Used
- `clients` — main record (see ISSUE-004 for missing columns)
- `client_phases` — 4 phases per client: onboarding, delivery, qa, update
- `phase_fields` — typed fields per phase (text, checkbox, date, number, tasklist)
- `contacts` — people associated with the client (see ISSUE-001 — table may be missing)
- `tasks` — tasks linked to client (see ISSUE-001 — table may be missing)
- `client_payments` — billing records (see ISSUE-001 — table may be missing)

## Critical Gotchas

**Phase creation runs in JS only (ADR-003):** When a new client is saved, `AddClientModal.jsx` creates 4 phases using `PHASE_TEMPLATES`. The SQL trigger that previously did this must be dropped (`complete_migration.sql` handles this). If both run, client gets 8 phases.

**`field_type: 'tasklist'` needs to be in the CHECK constraint (ISSUE-002):** The delivery phase uses tasklist fields. The current SQL CHECK only allows text/checkbox/date/number. This causes insert failures until `complete_migration.sql` is run.

**`clients.status` current values:** `'active'` or `'archived'`. Sprint 7 expands this to the full pipeline: lead → proposal → waiting_payment → active → waiting_client → in_production → in_qa → delivered → maintenance → paused → archived.

## Known Issues
- ISSUE-001: `contacts`, `tasks`, `client_payments` tables missing from migrations
- ISSUE-002: `phase_fields.field_type` CHECK rejects `'tasklist'`
- ISSUE-003: Duplicate phase creation
- ISSUE-004: 8 missing columns on `clients`
