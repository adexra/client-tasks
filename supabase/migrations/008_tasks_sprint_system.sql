-- ============================================================
-- Migration 008 — Tasks Sprint System
-- Adds sprint/kanban columns to existing tasks table,
-- creates task_artifacts, roadmap_objectives, weekly_rituals,
-- ritual_completions tables, and the move_task RPC.
-- Safe to re-run — fully idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
-- ============================================================

-- ============================================================
-- SECTION A — Extend existing tasks table with sprint fields
-- ============================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS planning_bucket TEXT DEFAULT 'backlog'
  CHECK (planning_bucket IN ('backlog','sprint','today','later'));

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS execution_status TEXT DEFAULT 'todo'
  CHECK (execution_status IN ('todo','doing','review','blocked','done','archived'));

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS order_index FLOAT DEFAULT 0;

-- Sprint/roadmap metadata (sprint label encoded in projeto field)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS projeto TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sprint_nome TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS objetivo_nome TEXT;

-- Impact scoring fields (urgencia × prioridade × impacto × 10 = XP)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS urgencia INT DEFAULT 1
  CHECK (urgencia BETWEEN 1 AND 3);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS impacto INT
  CHECK (impacto BETWEEN 1 AND 3);

-- Grouping & categorisation
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS categoria TEXT;

-- Scheduling
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS data_foco DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS semana_alvo DATE;

-- Evidence & completion
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS done_criteria TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS concluido_em TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS url_verificacao TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notas TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS responsavel TEXT;

-- Immutable history log (array of {bucket, status, at})
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;

-- Parent-child task hierarchy (audit-generated correction tasks)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS generated_from_audit BOOLEAN DEFAULT false;

-- titulo/descricao: sprint system names (mapped from title/description)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS titulo TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS descricao TEXT;

-- prioridade: 1-3 priority score (separate from old bucket-based status)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS prioridade INT DEFAULT 2
  CHECK (prioridade BETWEEN 1 AND 3);

-- Backfill from existing columns
UPDATE tasks SET titulo = title WHERE titulo IS NULL AND title IS NOT NULL;
UPDATE tasks SET descricao = description WHERE descricao IS NULL AND description IS NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS tasks_planning_bucket_idx ON tasks(planning_bucket);
CREATE INDEX IF NOT EXISTS tasks_execution_status_idx ON tasks(execution_status);
CREATE INDEX IF NOT EXISTS tasks_order_index_idx ON tasks(order_index);
CREATE INDEX IF NOT EXISTS tasks_parent_task_id_idx ON tasks(parent_task_id);

-- ============================================================
-- SECTION B — task_artifacts table
-- Stores results (resultado), reference docs (artifact), and
-- proof/evidence (evidencia) linked to tasks.
-- task_id is nullable to allow standalone arsenal items.
-- ============================================================

CREATE TABLE IF NOT EXISTS task_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('resultado','artifact','evidencia')),
  title TEXT,
  content_markdown TEXT,
  url TEXT,
  file_path TEXT,
  tags TEXT[],
  modelo TEXT,
  utilidade TEXT,
  bot_acessivel BOOLEAN DEFAULT false,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_artifacts_task_id_idx ON task_artifacts(task_id);
CREATE INDEX IF NOT EXISTS task_artifacts_type_idx ON task_artifacts(type);

-- ============================================================
-- SECTION C — roadmap_objectives table
-- Stores text objectives keyed by scope+key
-- e.g. scope='sprint', key='sprint-3', objetivo='...'
-- ============================================================

CREATE TABLE IF NOT EXISTS roadmap_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT CHECK (scope IN ('month','sprint','frente')),
  key TEXT NOT NULL,
  objetivo TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (scope, key)
);

-- ============================================================
-- SECTION D — weekly_rituals + ritual_completions
-- Used by WeeklyRitualsBanner component
-- ============================================================

CREATE TABLE IF NOT EXISTS weekly_rituals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6),
  title TEXT NOT NULL,
  category TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ritual_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ritual_id UUID REFERENCES weekly_rituals(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,
  completed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (ritual_id, completed_date)
);

CREATE INDEX IF NOT EXISTS ritual_completions_ritual_id_idx ON ritual_completions(ritual_id);
CREATE INDEX IF NOT EXISTS ritual_completions_date_idx ON ritual_completions(completed_date);

-- ============================================================
-- SECTION E — move_task RPC
-- Atomic drag-and-drop: updates bucket + status + order_index
-- and appends a history entry in a single call.
-- ============================================================

CREATE OR REPLACE FUNCTION move_task(
  p_id UUID,
  p_planning_bucket TEXT,
  p_execution_status TEXT,
  p_order_index FLOAT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE tasks SET
    planning_bucket  = p_planning_bucket,
    execution_status = p_execution_status,
    order_index      = p_order_index,
    history          = COALESCE(history, '[]'::jsonb) || jsonb_build_object(
                         'bucket', p_planning_bucket,
                         'status', p_execution_status,
                         'at',     now()::text
                       ),
    updated_at       = now()
  WHERE id = p_id;
END;
$$;
