-- ============================================================
-- Migration 006 — Sprint 4–6 QA Seed
-- Safe to re-run: uses ON CONFLICT DO NOTHING + fixed UUIDs
-- Tests: weekly plan, outcomes, tasks, daily plan, daily_plan_tasks,
--        daily_review, MoveOn milestone update, availability rule
-- ============================================================

-- ── Weekly plan for current week ──────────────────────────
-- week_start = Monday of the week this is run (hardcode a recent Monday)
INSERT INTO weekly_plans (id, week_start, week_end, theme, notes)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  date_trunc('week', CURRENT_DATE)::date,
  (date_trunc('week', CURRENT_DATE) + interval '6 days')::date,
  'QA Week — validate planning loop',
  'Testing the full Today / Weekly / MoveOn flow'
)
ON CONFLICT (id) DO UPDATE SET
  week_start = EXCLUDED.week_start,
  week_end = EXCLUDED.week_end,
  theme = EXCLUDED.theme;

-- ── Weekly outcomes ────────────────────────────────────────
INSERT INTO weekly_outcomes (id, weekly_plan_id, title, status, success_metric, progress_percent, description)
VALUES
  ('10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001',
   'Close 1 new Adexra client', 'in_progress', 'Signed contract + first payment received', 40,
   'Targeting NovaBrand renewal and one cold outreach'),
  ('10000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001',
   'Ship Operator OS planning loop', 'in_progress', 'Today + Weekly + MoveOn pages live and working', 80,
   'Sprints 4–6 complete, Sprint 7 starting'),
  ('10000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001',
   'Send all client weekly updates', 'planned', 'All active clients received a progress update', 0, NULL)
ON CONFLICT (id) DO NOTHING;

-- ── Tasks (using a client if NovaBrand seed exists, else null) ──
INSERT INTO tasks (id, title, priority, bucket, done, due_date, impact, energy)
VALUES
  ('10000000-0000-0000-0000-000000000020', 'Prepare NovaBrand weekly report', 'high', 'today', false, CURRENT_DATE, 'high', 'admin'),
  ('10000000-0000-0000-0000-000000000021', 'Follow up on overdue invoice', 'high', 'today', false, CURRENT_DATE, 'critical', 'communication'),
  ('10000000-0000-0000-0000-000000000022', 'Write ad copy for new campaign', 'medium', 'today', false, CURRENT_DATE + 1, 'medium', 'deep_work'),
  ('10000000-0000-0000-0000-000000000023', 'Review MoveOn chatbot flow', 'medium', 'this_week', false, CURRENT_DATE + 3, 'medium', 'deep_work'),
  ('10000000-0000-0000-0000-000000000024', 'Update client CRM with last call notes', 'low', 'this_week', false, CURRENT_DATE + 2, 'low', 'admin'),
  ('10000000-0000-0000-0000-000000000025', 'Quick-create test task from /today', 'medium', 'today', false, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ── Daily plan for today ───────────────────────────────────
INSERT INTO daily_plans (id, date, focus_note)
VALUES (
  '10000000-0000-0000-0000-000000000030',
  CURRENT_DATE,
  'Close the loop on client updates and validate planning system.'
)
ON CONFLICT (date) DO UPDATE SET
  focus_note = 'Close the loop on client updates and validate planning system.';

-- ── Link tasks to today's plan ─────────────────────────────
INSERT INTO daily_plan_tasks (id, daily_plan_id, task_id, sort_order, is_top_three)
VALUES
  ('10000000-0000-0000-0000-000000000040', '10000000-0000-0000-0000-000000000030', '10000000-0000-0000-0000-000000000020', 1, true),
  ('10000000-0000-0000-0000-000000000041', '10000000-0000-0000-0000-000000000030', '10000000-0000-0000-0000-000000000021', 2, true),
  ('10000000-0000-0000-0000-000000000042', '10000000-0000-0000-0000-000000000030', '10000000-0000-0000-0000-000000000022', 3, true),
  ('10000000-0000-0000-0000-000000000043', '10000000-0000-0000-0000-000000000030', '10000000-0000-0000-0000-000000000023', 4, false),
  ('10000000-0000-0000-0000-000000000044', '10000000-0000-0000-0000-000000000030', '10000000-0000-0000-0000-000000000024', 5, false)
ON CONFLICT (id) DO NOTHING;

-- ── Daily review ───────────────────────────────────────────
INSERT INTO daily_reviews (id, daily_plan_id, completed_summary, slipped_summary, blocker_summary, tomorrow_note, ritual_completed)
VALUES (
  '10000000-0000-0000-0000-000000000050',
  '10000000-0000-0000-0000-000000000030',
  'Sent NovaBrand report. Invoice follow-up done.',
  'Ad copy deferred to tomorrow.',
  NULL,
  'Focus on deep work: ad copy + MoveOn review.',
  true
)
ON CONFLICT (id) DO NOTHING;

-- ── Availability rules ─────────────────────────────────────
INSERT INTO availability_rules (id, day_of_week, availability_type, company_scope, start_time, end_time, label, notes)
VALUES
  ('10000000-0000-0000-0000-000000000060', 1, 'available',   'adexra', '09:00', '18:00', 'Full Adexra day',        'Monday: client work focus'),
  ('10000000-0000-0000-0000-000000000061', 2, 'available',   'all',    '09:00', '17:00', 'Open day',               NULL),
  ('10000000-0000-0000-0000-000000000062', 3, 'focus_day',   'adexra', '09:00', '13:00', 'Content morning',        'Wednesday AM: content only'),
  ('10000000-0000-0000-0000-000000000063', 4, 'limited',     'adexra', '14:00', '17:00', 'Adexra afternoon only',  'Thursday: MoveOn morning'),
  ('10000000-0000-0000-0000-000000000064', 5, 'available',   'all',    '09:00', '15:00', 'Short Friday',           'Finish by 15:00'),
  ('10000000-0000-0000-0000-000000000065', 6, 'unavailable', 'all',    NULL,    NULL,    'Weekend',                NULL),
  ('10000000-0000-0000-0000-000000000066', 0, 'unavailable', 'all',    NULL,    NULL,    'Weekend',                NULL)
ON CONFLICT (id) DO NOTHING;

-- ── Update MoveOn milestone to test status/confidence changes ──
UPDATE company_milestones
SET
  status = 'at_risk',
  confidence = 35,
  next_action = 'Review chatbot error rate dashboard and escalate to dev team',
  source_url = 'https://adexra.com',
  last_reviewed_at = NOW(),
  current_note = 'Error rate spiked last week. Need immediate dev attention.',
  updated_at = NOW()
WHERE title = 'Chatbot Reliability'
  AND company_id = (SELECT id FROM companies WHERE name = 'MoveOn' LIMIT 1);
