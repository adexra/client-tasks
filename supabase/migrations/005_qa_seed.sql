-- ============================================================
-- Migration 005 — Sprint 2 QA Seed Data
-- Run AFTER 004_operator_os.sql
-- Safe to re-run (uses ON CONFLICT DO NOTHING or explicit checks)
-- ============================================================

-- ============================================================
-- 1. Adexra client
-- ============================================================
INSERT INTO clients (
  id,
  name,
  email,
  status,
  phase,
  health_score,
  last_contact_at,
  next_update_due_at,
  what_sold,
  currency,
  revenue,
  tags
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'NovaBrand Ltda',
  'contact@novabrand.com.br',
  'active',
  'delivery',
  4,
  NOW() - INTERVAL '6 days',
  NOW() - INTERVAL '1 day',  -- overdue update
  'Landing Page + WhatsApp Ads Management',
  'BRL',
  4800,
  ARRAY['landing-page', 'ads', 'whatsapp']
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  last_contact_at = EXCLUDED.last_contact_at,
  next_update_due_at = EXCLUDED.next_update_due_at;

-- ============================================================
-- 2. Tasks — upcoming deadline + overdue task
-- ============================================================
INSERT INTO tasks (
  id,
  client_id,
  title,
  description,
  bucket,
  priority,
  due_date,
  done,
  status
)
VALUES
  (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'Entregar copy da landing page',
    'Escrever headlines, subheads e CTAs para a página principal',
    'today',
    'high',
    CURRENT_DATE + INTERVAL '1 day',  -- due tomorrow
    false,
    'pending'
  ),
  (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000001',
    'Configurar pixel Meta Ads',
    'Instalar e validar pixel no site NovaBrand',
    'today',
    'high',
    CURRENT_DATE - INTERVAL '2 days',  -- overdue
    false,
    'pending'
  ),
  (
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000001',
    'Revisar campanha de tráfego pago',
    'Analisar métricas da semana e ajustar segmentação',
    'today',
    'medium',
    CURRENT_DATE + INTERVAL '2 days',
    false,
    'pending'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  due_date = EXCLUDED.due_date,
  done = EXCLUDED.done;

-- ============================================================
-- 3. Daily plan for today + top 3 tasks
-- ============================================================
INSERT INTO daily_plans (id, date, focus_note)
VALUES (
  '00000000-0000-0000-0000-000000000020',
  CURRENT_DATE,
  'Finalizar entregáveis NovaBrand e configurar tracking de conversão.'
)
ON CONFLICT (date) DO UPDATE SET
  id = '00000000-0000-0000-0000-000000000020',
  focus_note = EXCLUDED.focus_note;

INSERT INTO daily_plan_tasks (id, daily_plan_id, task_id, sort_order, is_top_three)
VALUES
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', 1, true),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000011', 2, true),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000012', 3, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. Unpaid payment
-- ============================================================
INSERT INTO client_payments (
  id,
  client_id,
  amount,
  currency,
  description,
  is_paid
)
VALUES (
  '00000000-0000-0000-0000-000000000030',
  '00000000-0000-0000-0000-000000000001',
  2400.00,
  'BRL',
  'Parcela 1/2 — Landing Page NovaBrand',
  false
)
ON CONFLICT (id) DO UPDATE SET
  amount = EXCLUDED.amount,
  is_paid = EXCLUDED.is_paid;

-- ============================================================
-- 5. MoveOn milestone — At Risk
-- ============================================================
WITH moveon AS (SELECT id FROM companies WHERE name = 'MoveOn' LIMIT 1)
INSERT INTO company_milestones (
  id,
  company_id,
  title,
  status,
  confidence,
  review_frequency,
  next_review_at,
  current_note,
  next_action
)
SELECT
  '00000000-0000-0000-0000-000000000040',
  moveon.id,
  'Chatbot Reliability',
  'at_risk',
  35,
  'weekly',
  NOW() + INTERVAL '3 days',
  'Taxa de erro aumentou 12% após última deploy. Investigação em andamento.',
  'Revisar logs do chatbot e identificar causa raiz'
FROM moveon
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  confidence = EXCLUDED.confidence,
  current_note = EXCLUDED.current_note;

-- ============================================================
-- 6. Weekly plan + outcome
-- ============================================================
-- Monday of current week
WITH week_monday AS (
  SELECT (CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 1)::date AS wstart
)
INSERT INTO weekly_plans (id, week_start, week_end, theme)
SELECT
  '00000000-0000-0000-0000-000000000050',
  wstart,
  wstart + INTERVAL '6 days',
  'Lançamento NovaBrand + estabilizar MoveOn'
FROM week_monday
ON CONFLICT (id) DO UPDATE SET theme = EXCLUDED.theme;

INSERT INTO weekly_outcomes (id, weekly_plan_id, title, status, progress_percent)
VALUES (
  '00000000-0000-0000-0000-000000000051',
  '00000000-0000-0000-0000-000000000050',
  'Landing page NovaBrand aprovada e ao ar',
  'in_progress',
  65
)
ON CONFLICT (id) DO UPDATE SET
  progress_percent = EXCLUDED.progress_percent,
  status = EXCLUDED.status;

-- ============================================================
-- 7. Day ritual for today's weekday
-- ============================================================
INSERT INTO day_rituals (id, title, description, day_of_week, ritual_type, company_scope, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000060',
  'Revisão de métricas de ontem',
  'Verificar resultados das campanhas e tarefas do dia anterior.',
  EXTRACT(DOW FROM CURRENT_DATE)::int,  -- today's weekday
  'planning',
  'adexra',
  true
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. Availability rule — Adexra limited today
-- ============================================================
INSERT INTO availability_rules (id, date, availability_type, company_scope, label, start_time, end_time)
VALUES (
  '00000000-0000-0000-0000-000000000070',
  CURRENT_DATE,
  'limited',
  'adexra',
  'Foco em entregáveis — sem reuniões',
  '09:00',
  '13:00'
)
ON CONFLICT (id) DO NOTHING;
