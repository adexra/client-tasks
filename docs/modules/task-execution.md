# Task Execution — Operator OS

Last updated: 2026-06-21

## Purpose
Kanban-style priority board for managing daily and weekly task execution. Tasks are organized into buckets (Today, This Week, Backlog) and can be linked to clients.

## Entry Points
- `/priority` → `src/pages/PriorityView.jsx`
- `TaskModal` → `src/components/TaskModal.jsx` — create/edit task with subtasks

## Key Files
| File | Responsibility |
|---|---|
| `src/pages/PriorityView.jsx` | 4-column board: active clients, weekly execution, backlog, done |
| `src/components/TaskModal.jsx` | Task create/edit with subtasks, client link, time estimate |
| `src/components/FocusTimer.jsx` | Pomodoro-style timer in the sidebar header |
| `src/components/DeadlinesWidget.jsx` | Deadline display widget |

## Tables Used
- `tasks` — **MISSING FROM MIGRATIONS** (ISSUE-001). Must run `complete_migration.sql`.
- `subtasks` — **MISSING FROM MIGRATIONS** (ISSUE-001).
- `clients` — for linking tasks to clients and showing client cards

## Task Data Model
Current fields (inferred from code — table not yet in migration):
- `bucket`: `'today'` | `'this_week'` | `'backlog'`
- `priority`: `'high'` | `'medium'` | `'low'` | `'very_low'`
- `done`: boolean
- `estimated_minutes`: INT
- `scheduled_date`: DATE
- `contact_id`: FK to contacts (nullable)

Planned additions (Sprint 1 migration):
- `weekly_outcome_id`: FK to weekly_outcomes (nullable)
- `milestone_id`: FK to company_milestones (nullable)
- `impact`: `'low'` | `'medium'` | `'high'` | `'critical'`
- `energy`: `'deep_work'` | `'light_work'` | `'admin'` | `'communication'`

## Key UX Patterns
- **Overload detection:** If today's bucket > 5 tasks, shows amber overload modal
- **Rearrange mode:** Multi-select tasks + date picker to bulk-move to a scheduled date
- **Task completion:** Opens modal to capture actual_minutes and show QA reminder
- **Left border color:** Deterministic color per client (hash of client_id → 8 color options)

## Known Issues
- ISSUE-001: `tasks` and `subtasks` tables missing from migrations — app will error on any task query
