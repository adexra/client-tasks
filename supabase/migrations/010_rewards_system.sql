-- Migration 010 — Rewards System
-- Adds XP fields to tasks, creates rewards shop tables
-- Safe to re-run (idempotent)

-- ── New task fields for XP formula ──────────────────────────────────────────

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS effort_minutes INT DEFAULT 30
  CHECK (effort_minutes IN (5, 15, 30, 60, 120, 240, 480));

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS value_usd INT DEFAULT 0;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS complexity TEXT DEFAULT 'medium'
  CHECK (complexity IN ('easy', 'medium', 'hard', 'expert'));

-- ── Rewards shop ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '🎁',
  category TEXT CHECK (category IN ('consumable', 'asset', 'life', 'home', 'skill')) DEFAULT 'consumable',
  tier INT CHECK (tier BETWEEN 1 AND 4) DEFAULT 1,
  coin_cost INT NOT NULL,
  budget_required NUMERIC DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Redemptions ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id UUID REFERENCES rewards(id) ON DELETE SET NULL,
  reward_name TEXT,
  coins_spent INT NOT NULL DEFAULT 0,
  budget_spent NUMERIC DEFAULT 0,
  redeemed_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

-- ── Freebies (random drops from task completions) ─────────────────────────────

CREATE TABLE IF NOT EXISTS freebies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '🎲',
  dropped_at TIMESTAMPTZ DEFAULT now(),
  redeemed_at TIMESTAMPTZ
);

-- ── Reward budget log (8% of net profit) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS reward_budget_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC NOT NULL,
  source TEXT CHECK (source IN ('profit_8pct', 'manual', 'redemption')) DEFAULT 'manual',
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Seed: default rewards shop ───────────────────────────────────────────────

INSERT INTO rewards (name, emoji, category, tier, coin_cost, budget_required, description) VALUES
  -- Tier 1 consumables
  ('Café especial',         '☕', 'consumable', 1, 10,  0, 'Um café bom, sem culpa'),
  ('Ice cream',             '🍦', 'consumable', 1, 12,  0, NULL),
  ('Takeout',               '🥡', 'consumable', 1, 20,  0, 'Pedir comida sem culpa'),
  ('Movie night',           '🎬', 'consumable', 1, 25,  0, NULL),
  ('Nap',                   '😴', 'consumable', 1, 15,  0, 'Soneca merecida'),
  ('Extra gaming',          '🎮', 'consumable', 1, 20,  0, '2h extras de jogo'),
  ('Pizza',                 '🍕', 'consumable', 1, 30,  0, NULL),
  ('Bubble tea',            '🧋', 'consumable', 1, 15,  0, NULL),
  ('Steam game <$10',       '🕹️', 'consumable', 1, 40,  0, NULL),
  ('30min YouTube guilt-free','📺','consumable', 1, 10,  0, NULL),
  -- Tier 2
  ('Jantar bom',            '🍽️', 'consumable', 2, 60,  0, 'Restaurante decente'),
  ('Mousepad novo',         '🖱️', 'asset',      2, 80,  0, NULL),
  ('Camisa nova',           '👕', 'consumable', 2, 70,  0, NULL),
  ('Livro',                 '📚', 'consumable', 2, 50,  0, NULL),
  ('Corte de cabelo',       '💈', 'consumable', 2, 55,  0, NULL),
  ('Mês de academia',       '🏋️', 'consumable', 2, 100, 0, NULL),
  -- Tier 3
  ('SSD',                   '💾', 'asset',      3, 200, 150, NULL),
  ('Suporte de monitor',    '🖥️', 'asset',      3, 180, 100, NULL),
  ('Teclado mecânico',      '⌨️', 'asset',      3, 300, 200, NULL),
  ('Fone de ouvido bom',    '🎧', 'asset',      3, 250, 150, NULL),
  ('Mini férias',           '🏖️', 'life',       3, 400, 300, NULL),
  ('Fritadeira air fryer',  '🍳', 'home',       3, 200, 150, NULL),
  -- Tier 4
  ('Monitor novo',          '🖥️', 'asset',      4, 600, 800, NULL),
  ('GPU',                   '🎯', 'asset',      4, 1200,2000,NULL),
  ('Laptop',                '💻', 'asset',      4, 1000,1500,NULL),
  ('Férias',                '✈️', 'life',       4, 800, 1000,NULL),
  -- Life rewards
  ('Dia inteiro de folga',  '🌅', 'life',       2, 80,  0, NULL),
  ('Tarde livre',           '☀️', 'life',       1, 30,  0, NULL),
  ('Dia na praia',          '🏄', 'life',       2, 90,  0, NULL),
  ('Date night',            '💑', 'life',       2, 100, 0, NULL),
  ('Massagem',              '💆', 'life',       2, 90,  0, NULL),
  ('Sem alarme amanhã',     '⏰', 'life',       1, 20,  0, NULL)
ON CONFLICT DO NOTHING;
