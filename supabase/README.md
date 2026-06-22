# Supabase Migrations

All SQL migrations for Operator OS. Run in order in the Supabase SQL Editor.

## Migration Files

| File | What it does | Status |
|------|-------------|--------|
| `001_initial_schema.sql` | Creates `clients`, `client_phases`, `phase_fields` + the old phase trigger | Historical — already run |
| `002_ad_plans.sql` | Creates `ad_plans` with RLS for public plan sharing at `/plan/:id` | Historical — already run |
| `003_brain_system.sql` | Creates all `brain_*` tables + seeds 5 default AI agents | Historical — already run |
| `004_operator_os.sql` | **⚠️ Run this** — fixes all schema gaps, adds all Operator OS tables, seeds companies + milestones + rituals | **Pending** |
| `005_qa_seed.sql` | Sprint 2 QA seed data — 1 client, tasks, daily plan, payment, milestone, weekly outcome, ritual, availability | Run after 004 for QA |

## How to Run

**Project:** `pjqxsxjzmpemsmwmijjr` → `https://pjqxsxjzmpemsmwmijjr.supabase.co`

1. Open [SQL Editor](https://pjqxsxjzmpemsmwmijjr.supabase.co/project/pjqxsxjzmpemsmwmijjr/sql)
2. Paste the contents of the migration file
3. Click Run
4. Migration 004 is safe to re-run (fully idempotent)

## Migration 004 Quick Summary

Run `004_operator_os.sql` to:
- Add 15 missing columns to `clients`
- Fix `phase_fields.field_type` constraint to allow `'tasklist'`
- Drop the duplicate phase creation trigger (JS is source of truth)
- Create: `contacts`, `tasks`, `subtasks`, `client_payments`, `expenses`
- Create: `companies`, `company_milestones`, `availability_rules`, `day_rituals`
- Create: `weekly_plans`, `weekly_outcomes`, `daily_plans`, `daily_plan_tasks`, `daily_reviews`
- Seed: MoveOn + Adexra companies, 8 MoveOn milestones, 3 default day rituals

## After Running Migration 004

Check for duplicate phases (if clients existed before the trigger was dropped):

```sql
SELECT client_id, count(*) FROM client_phases
GROUP BY client_id HAVING count(*) > 4;
```

If any rows are returned, see Section H in `004_operator_os.sql` for the cleanup query.

## Sprint 2 QA Seed (Migration 005)

Run `005_qa_seed.sql` after 004 to populate the Command Center with test data:

- **Client:** NovaBrand Ltda (active, 6 days no contact, overdue update)
- **Tasks:** 3 tasks linked to today's daily plan (1 overdue, 1 due tomorrow, 1 due in 2 days)
- **Daily Plan:** Focus note set for today, all 3 tasks marked as top 3
- **Payment:** R$ 2,400 unpaid (due in 5 days)
- **MoveOn Milestone:** "Chatbot Reliability" at_risk, confidence 35%
- **Weekly Outcome:** "Landing page NovaBrand aprovada" at 65%
- **Day Ritual:** "Revisão de métricas de ontem" for today's weekday
- **Availability:** Limited today (09:00–13:00, no meetings)
