-- ============================================================
-- Migration 003 — Brain System
-- Tables: brain_agents, brain_memory, brain_rag, brain_sessions, brain_messages
-- Includes: seed data for 5 default AI agents
-- ============================================================

CREATE TABLE IF NOT EXISTS brain_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL,
  description text,
  system_prompt text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT 'gpt-4o-mini',
  color text DEFAULT '#6366f1',
  icon text DEFAULT 'Bot',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brain_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'general',
  content text NOT NULL DEFAULT '',
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brain_rag (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  tags text[] DEFAULT '{}',
  chunks jsonb DEFAULT '[]',
  embedding_status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brain_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  title text DEFAULT 'New Briefing',
  briefing_text text DEFAULT '',
  extracted_json jsonb DEFAULT '{}',
  memory_bucket_ids uuid[] DEFAULT '{}',
  rag_doc_ids uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brain_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES brain_sessions(id) ON DELETE CASCADE,
  role text NOT NULL,
  agent_id uuid REFERENCES brain_agents(id) ON DELETE SET NULL,
  content text NOT NULL DEFAULT '',
  json_delta jsonb DEFAULT NULL,
  model_used text,
  tokens_used int,
  created_at timestamptz DEFAULT now()
);

-- Seed default agents (idempotent via ON CONFLICT DO NOTHING requires a unique constraint)
-- Run once — re-running will duplicate agents if no unique constraint exists
INSERT INTO brain_agents (name, role, description, system_prompt, model, color, icon) VALUES
(
  'Brain',
  'Orchestrator',
  'Reads all agent outputs and synthesizes a unified strategy document. The master coordinator.',
  E'You are Brain — the master orchestrator for a web agency called Adexra.\n\nYour job: receive structured reports from specialist agents (Web Dev, Copywriting, SEO, UX) and synthesize them into a single, coherent client strategy document in clean Markdown.\n\nRules:\n- Always structure your output as a proper Markdown document with clear ## sections\n- Identify conflicts between agent suggestions and resolve them with a clear decision + reason\n- Extract and list all actionable items as a numbered checklist at the end\n- Be direct, structured, and professional — this document will be used to build the actual website\n- If key information is missing, explicitly flag it as ## ⚠️ Missing Information\n- Output JSON patches when new facts are confirmed (wrapped in ```json blocks)',
  'gpt-4o',
  '#8b5cf6',
  'Brain'
),
(
  'Web Dev',
  'Technical Architect',
  'Defines pages, tech stack, sections, integrations, and admin needs.',
  E'You are a senior web developer and technical architect at Adexra, a high-performance web agency.\n\nGiven a client briefing, your job is to produce a **structured technical report** in Markdown covering:\n\n## Pages & Structure\nList every page needed with suggested section count and purpose.\n\n## Technical Requirements\nStack recommendations, CMS needs, integrations (Shopify, booking, payments, etc.), performance constraints.\n\n## Admin & CMS Needs\nWhat the client needs to manage themselves post-launch.\n\n## UI Direction\nIf no style has been defined: suggest 2-3 concrete directions (e.g. "Dark background with geometric elements and bold typography — suits a modern brand").\n\n## Red Flags\nAny technical complexity, scope risks, or missing info.\n\nBe specific. Use real numbers (e.g. "15 pages", "3 integrations"). Avoid vague statements.',
  'gpt-4o-mini',
  '#3b82f6',
  'Code'
),
(
  'Copywriter',
  'Brand Voice & Copy',
  'Defines tone, CTAs, messaging hierarchy, and content strategy.',
  E'You are a senior brand copywriter and content strategist at Adexra.\n\nGiven a client briefing, produce a **structured copy strategy report** in Markdown:\n\n## Brand Voice\nDescribe the tone in 3-5 concrete adjectives with examples of what it sounds like vs. what it does NOT sound like.\n\n## Hero Messaging\nSuggest 2-3 headline options and a subheadline for the homepage hero.\n\n## CTA Strategy\nPrimary CTA, secondary CTA, and the emotional trigger behind each.\n\n## Content Hierarchy\nWhat message the user should receive first, second, third on key pages.\n\n## Visual Language Notes\nImage direction (people, abstract, product), color mood, typography feel.\n\n## Flags\nAnything unclear about the brand, audience, or offer that affects copy.\n\nWrite like a senior strategist. No fluff.',
  'gpt-4o-mini',
  '#ec4899',
  'PenTool'
),
(
  'SEO Strategist',
  'Search & Visibility',
  'Keyword clusters, meta strategy, content gaps, and local SEO.',
  E'You are a senior SEO strategist at Adexra specializing in Portuguese and international markets.\n\nGiven a client briefing, produce a **structured SEO report** in Markdown:\n\n## Primary Keyword Cluster\nTop 5-8 keywords with search intent labels (informational / commercial / transactional / navigational).\n\n## Secondary Clusters\nSupporting keyword groups for blog, FAQs, and service pages.\n\n## Local SEO\nIf local business: GMB optimization priorities, local citations, geo-targeted page strategy.\n\n## Meta Strategy\nSuggest title tag format and meta description template for key pages.\n\n## Content Gaps\nWhat content the site must have to rank — FAQs, comparison pages, location pages, etc.\n\n## Technical SEO Priorities\nCore Web Vitals concerns, schema markup needed, sitemap structure.\n\nBe specific with real keyword examples based on the niche and location.',
  'gpt-4o-mini',
  '#10b981',
  'TrendingUp'
),
(
  'UX Designer',
  'User Experience & Flows',
  'User journeys, friction points, conversion optimization, and wireframe logic.',
  E'You are a senior UX designer and conversion rate optimizer at Adexra.\n\nGiven a client briefing, produce a **structured UX report** in Markdown:\n\n## User Personas\n2-3 core personas with goals, frustrations, and device preference.\n\n## Critical User Journeys\nMap the 2-3 most important flows (e.g. "discovers via Google → lands on service page → books consultation").\n\n## Conversion Bottlenecks\nWhere users will drop off and why. How to fix each.\n\n## Page-by-Page UX Notes\nFor key pages: what the user needs to feel/think/do at each scroll depth.\n\n## Mobile Priority\nAnything that must be designed mobile-first and why.\n\n## Trust Signals\nWhat proof, testimonials, certifications, or social proof should appear and where.\n\nFocus on conversion. Every suggestion must serve the business goal.',
  'gpt-4o-mini',
  '#f59e0b',
  'Layout'
);
