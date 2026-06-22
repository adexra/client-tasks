-- LEGACY FILE — superseded by supabase/migrations/004_operator_os.sql
-- Do not run this directly. Use supabase/migrations/ instead.
-- ============================================================

-- ============================================================
-- Operator OS — Complete Migration
-- Run this in Supabase SQL Editor (safe to re-run, idempotent)
-- ============================================================

-- ============================================================
-- SECTION A — Fix clients table (add missing columns)
-- ============================================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS what_sold TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_link TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS next_action TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS definition_of_done TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS not_included TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS revenue NUMERIC DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'onboarding';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS health_score INT DEFAULT 3;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS next_update_due_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS blocker_reason TEXT;

-- ============================================================
-- SECTION B — Fix phase_fields.field_type CHECK constraint
-- (adds 'tasklist' which the frontend already uses)
-- ============================================================
ALTER TABLE phase_fields DROP CONSTRAINT IF EXISTS phase_fields_field_type_check;
ALTER TABLE phase_fields ADD CONSTRAINT phase_fields_field_type_check
  CHECK (field_type IN ('text', 'checkbox', 'date', 'number', 'tasklist'));

-- ============================================================
-- SECTION C — Drop duplicate phase creation trigger
-- JS code in AddClientModal.jsx is the source of truth
-- ============================================================
DROP TRIGGER IF EXISTS after_client_insert ON clients;
DROP FUNCTION IF EXISTS initialize_client_phases();

-- ============================================================
-- SECTION D — Create 5 missing tables (FK-safe order)
-- ============================================================

-- contacts must come before tasks (tasks.contact_id FK)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT,
  role TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- tasks (depends on contacts)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  bucket TEXT CHECK (bucket IN ('today', 'this_week', 'backlog')),
  priority TEXT CHECK (priority IN ('high', 'medium', 'low', 'very_low')),
  estimated_minutes INT DEFAULT 30,
  actual_minutes INT,
  scheduled_date DATE,
  done BOOLEAN DEFAULT false,
  -- Operator OS fields (FKs added in Section F after dependent tables exist)
  weekly_outcome_id UUID,
  milestone_id UUID,
  impact TEXT CHECK (impact IN ('low', 'medium', 'high', 'critical')),
  energy TEXT CHECK (energy IN ('deep_work', 'light_work', 'admin', 'communication')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- subtasks (depends on tasks)
CREATE TABLE IF NOT EXISTS subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  amount NUMERIC,
  currency TEXT DEFAULT 'BRL',
  description TEXT,
  is_paid BOOLEAN DEFAULT false,
  is_recurring BOOLEAN DEFAULT false,
  recurring_start_date DATE,
  terminated_at TIMESTAMPTZ,
  paid_brl_amount NUMERIC,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC,
  currency TEXT DEFAULT 'BRL',
  description TEXT,
  is_repeatable BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SECTION E — Create Operator OS tables (dependency order)
-- ============================================================

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('internal_company', 'agency')),
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('healthy', 'at_risk', 'blocked', 'done', 'not_started')) DEFAULT 'not_started',
  confidence INT DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
  source_url TEXT,
  review_frequency TEXT,
  last_reviewed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  success_metric TEXT,
  current_note TEXT,
  next_action TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE,
  day_of_week INT CHECK (day_of_week >= 0 AND day_of_week <= 6),
  company_scope TEXT CHECK (company_scope IN ('all', 'adexra', 'moveon')) DEFAULT 'all',
  availability_type TEXT CHECK (availability_type IN ('available', 'limited', 'unavailable', 'focus_day')) DEFAULT 'available',
  start_time TIME,
  end_time TIME,
  label TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS day_rituals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  day_of_week INT CHECK (day_of_week >= 0 AND day_of_week <= 6),
  specific_date DATE,
  ritual_type TEXT CHECK (ritual_type IN ('finance', 'content', 'client_updates', 'planning', 'deep_work', 'admin', 'custom')) DEFAULT 'custom',
  company_scope TEXT CHECK (company_scope IN ('all', 'adexra', 'moveon')) DEFAULT 'all',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  theme TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS weekly_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_plan_id UUID REFERENCES weekly_plans(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('planned', 'in_progress', 'done', 'missed')) DEFAULT 'planned',
  success_metric TEXT,
  progress_percent INT DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  focus_note TEXT,
  workload_score INT,
  planned_minutes INT DEFAULT 0,
  actual_minutes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_plan_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_plan_id UUID REFERENCES daily_plans(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  is_top_three BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_plan_id UUID REFERENCES daily_plans(id) ON DELETE CASCADE,
  completed_summary TEXT,
  slipped_summary TEXT,
  blocker_summary TEXT,
  tomorrow_note TEXT,
  ritual_completed BOOLEAN,
  ritual_notes TEXT,
  client_update_needed BOOLEAN,
  payment_issue TEXT,
  milestone_change TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SECTION F — Add FK columns to tasks (if table pre-existed) + deferred FKs
-- (weekly_outcomes and company_milestones now exist)
-- ============================================================

-- Ensure client_payments columns exist if table pre-existed
ALTER TABLE client_payments ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE client_payments ADD COLUMN IF NOT EXISTS recurring_start_date DATE;
ALTER TABLE client_payments ADD COLUMN IF NOT EXISTS terminated_at TIMESTAMPTZ;
ALTER TABLE client_payments ADD COLUMN IF NOT EXISTS paid_brl_amount NUMERIC;
ALTER TABLE client_payments ADD COLUMN IF NOT EXISTS due_date DATE;

-- Ensure columns exist whether tasks was just created or already existed
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS weekly_outcome_id UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS milestone_id UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS impact TEXT CHECK (impact IN ('low', 'medium', 'high', 'critical'));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS energy TEXT CHECK (energy IN ('deep_work', 'light_work', 'admin', 'communication'));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scheduled_date DATE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_weekly_outcome_id_fkey'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_weekly_outcome_id_fkey
      FOREIGN KEY (weekly_outcome_id) REFERENCES weekly_outcomes(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_milestone_id_fkey'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_milestone_id_fkey
      FOREIGN KEY (milestone_id) REFERENCES company_milestones(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- SECTION G — Seed data
-- ============================================================
INSERT INTO companies (name, type) VALUES
  ('MoveOn', 'internal_company'),
  ('Adexra', 'agency')
ON CONFLICT DO NOTHING;

-- Seed default MoveOn milestones
WITH moveon AS (SELECT id FROM companies WHERE name = 'MoveOn' LIMIT 1)
INSERT INTO company_milestones (company_id, title, status, confidence, review_frequency)
SELECT
  moveon.id,
  ms.title,
  'not_started',
  50,
  'weekly'
FROM moveon, (VALUES
  ('Chatbot Reliability'),
  ('Admin Dashboard Stability'),
  ('Website Conversion'),
  ('Ads Tracking'),
  ('Test Drive Flow'),
  ('Instagram Automation'),
  ('Sales Dashboard'),
  ('Post-Sale Flow')
) AS ms(title)
ON CONFLICT DO NOTHING;

-- Seed default day rituals
INSERT INTO day_rituals (title, description, day_of_week, ritual_type, company_scope, is_active)
VALUES
  ('Financial Organization', 'Review payments, follow up invoices, check bank balance and expenses', 1, 'finance', 'all', true),
  ('Content / Carousel Day', 'Create and schedule content, carousels, social media posts', 3, 'content', 'adexra', true),
  ('Client Update & Review', 'Send client updates, review project progress, follow up on blocked items', 5, 'client_updates', 'adexra', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SECTION H — Duplicate phase cleanup check
-- Run this query to detect if existing clients have 8 phases:
-- SELECT client_id, count(*) FROM client_phases GROUP BY client_id HAVING count(*) > 4;
-- If any rows are returned, delete the trigger-created phases
-- (order_index 1-4 from trigger vs 0-3 from JS):
-- DELETE FROM client_phases WHERE order_index IN (1,2,3,4)
-- AND id NOT IN (SELECT id FROM client_phases WHERE order_index IN (0,1,2,3));
-- Review output before running the delete.
-- ============================================================
