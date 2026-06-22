-- ============================================================
-- Migration 002 — Ad Plans
-- Table: ad_plans (with RLS for public plan sharing at /plan/:id)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ad_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  name text NOT NULL,
  currency text DEFAULT 'BRL',
  total_budget numeric DEFAULT 0,
  days integer DEFAULT 30,
  start_date date,
  target_kpi jsonb DEFAULT '{"type":"CPA","value":""}'::jsonb,
  mediums jsonb DEFAULT '{}'::jsonb,
  keywords jsonb DEFAULT '{"primary":"","secondary":"","negative":""}'::jsonb,
  funnel jsonb DEFAULT '{}'::jsonb,
  conversion jsonb DEFAULT '{}'::jsonb,
  audience jsonb DEFAULT '{}'::jsonb,
  creative jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ad_plans_pkey PRIMARY KEY (id)
);

ALTER TABLE public.ad_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active plans only" ON public.ad_plans
  FOR SELECT USING (
    is_active = true
    OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  );

CREATE POLICY "Authenticated insert" ON public.ad_plans
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated update" ON public.ad_plans
  FOR UPDATE USING (true);

CREATE POLICY "Authenticated delete" ON public.ad_plans
  FOR DELETE USING (true);
