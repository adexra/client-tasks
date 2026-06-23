-- Migration 009 — Add client_name and project_name to roadmap_objectives
-- Safe to re-run (idempotent)

ALTER TABLE roadmap_objectives ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE roadmap_objectives ADD COLUMN IF NOT EXISTS project_name TEXT;
