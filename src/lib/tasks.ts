import { supabase } from "./supabase";

export type TaskStatus =
  | "backlog"
  | "esta_semana"
  | "em_andamento"
  | "em_revisao"
  | "concluido"
  | "cancelado"
  | "erro";

export type PlanningBucket = "backlog" | "sprint" | "today" | "later";
export type ExecutionStatus = "todo" | "doing" | "review" | "blocked" | "done" | "archived";

export interface TaskHistoryEntry {
  at: string;
  from_planning: PlanningBucket;
  from_execution: ExecutionStatus;
  to_planning: PlanningBucket;
  to_execution: ExecutionStatus;
}

export interface Task {
  id: string;
  titulo: string;
  descricao: string | null;
  prioridade: 1 | 2 | 3;
  urgencia: 1 | 2 | 3;
  status: TaskStatus;
  responsavel: string | null;
  client_id: string | null;
  semana_alvo: string | null;
  concluido_em: string | null;
  url_verificacao: string | null;
  notas: string | null;
  categoria: string | null;
  data_foco: string | null;
  projeto: string | null;
  impacto: 1 | 2 | 3 | null;
  done_criteria: string | null;
  objetivo_nome: string | null;
  sprint_nome: string | null;
  planning_bucket: PlanningBucket;
  execution_status: ExecutionStatus;
  order_index: number;
  parent_task_id: string | null;
  generated_from_audit: boolean;
  archived_at: string | null;
  history: TaskHistoryEntry[];
  created_at: string;
  updated_at: string;
  // joined
  client?: { name: string | null; phone: string | null } | null;
}

// Fields with DB-side defaults are optional on insert.
type TaskAutoFields = "planning_bucket" | "execution_status" | "order_index" | "archived_at" | "history" | "status" | "concluido_em" | "objetivo_nome" | "sprint_nome" | "parent_task_id" | "generated_from_audit";
export type TaskInsert = Omit<Task, "id" | "created_at" | "updated_at" | "lead" | TaskAutoFields> & Partial<Pick<Task, TaskAutoFields>>;

export const STATUS_META: Record<TaskStatus, { label: string; color: string; bg: string; border: string }> = {
  backlog:       { label: "Backlog",        color: "text-slate-600",   bg: "bg-slate-100",      border: "border-slate-200" },
  esta_semana:   { label: "Sprint semana",  color: "text-violet-700",  bg: "bg-violet-50",      border: "border-violet-200" },
  em_andamento:  { label: "Em andamento",   color: "text-blue-700",    bg: "bg-blue-50",        border: "border-blue-200" },
  em_revisao:    { label: "Em revisão",     color: "text-amber-700",   bg: "bg-amber-50",       border: "border-amber-200" },
  concluido:     { label: "Concluído",      color: "text-emerald-700", bg: "bg-emerald-50",     border: "border-emerald-200" },
  cancelado:     { label: "Cancelado",      color: "text-slate-400",   bg: "bg-slate-50",       border: "border-slate-200" },
  erro:          { label: "Bloqueado",      color: "text-red-700",     bg: "bg-red-50",         border: "border-red-200" },
};

export const PRIORIDADE_META: Record<number, { label: string; color: string; dot: string }> = {
  1: { label: "Baixa",  color: "text-white/40",    dot: "bg-white/20" },
  2: { label: "Média",  color: "text-amber-400",   dot: "bg-amber-400" },
  3: { label: "Alta",   color: "text-red-400",     dot: "bg-red-400" },
};

export const URGENCIA_META: Record<number, { label: string; color: string; icon: string }> = {
  1: { label: "Pode esperar", color: "text-white/35", icon: "🟢" },
  2: { label: "Logo",         color: "text-amber-400", icon: "🟡" },
  3: { label: "Urgente",      color: "text-red-400",   icon: "🔴" },
};

export async function getTasks(opts: { includeArchived?: boolean } = {}): Promise<Task[]> {
  // supabase singleton from ./supabase
  let query = supabase
    .from("tasks")
    .select("*, client:clients(name, phone)")
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false });
  if (!opts.includeArchived) query = query.neq("execution_status", "archived");
  const { data, error } = await query;
  if (error) throw error;
  return data as Task[];
}

/** Persist a drag-and-drop move: updates planning/execution + order, appends history (via RPC). */
export async function moveTask(id: string, planningBucket: PlanningBucket, executionStatus: ExecutionStatus, orderIndex: number): Promise<void> {
  // supabase singleton from ./supabase
  const { error } = await supabase.rpc("move_task", {
    p_id: id,
    p_planning_bucket: planningBucket,
    p_execution_status: executionStatus,
    p_order_index: orderIndex,
  });
  if (error) throw error;
}

/** Soft-delete: archive instead of removing the row. */
export async function archiveTask(id: string): Promise<void> {
  await moveTask(id, "later", "archived", 0);
}

/** Restore an archived task back to the backlog. */
export async function restoreTask(id: string): Promise<void> {
  await moveTask(id, "backlog", "todo", 0);
}

export async function createTask(task: Omit<TaskInsert, "concluido_em">): Promise<Task> {
  // supabase singleton from ./supabase
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...task, title: task.titulo })
    .select("*, client:clients(name, phone)")
    .single();
  if (error) throw error;
  return data as Task;
}

export async function updateTask(id: string, patch: Partial<TaskInsert>): Promise<void> {
  // supabase singleton from ./supabase
  const update: Record<string, unknown> = { ...patch };
  if (patch.status === "concluido") update.concluido_em = new Date().toISOString();
  if (patch.status && patch.status !== "concluido") update.concluido_em = null;
  const { error } = await supabase.from("tasks").update(update).eq("id", id);
  if (error) throw error;
}

// ─── Growth Game helpers (derived, no new columns) ─────────────────────────

/** Symbolic Impact XP for a task, based on prioridade × urgencia × impacto. */
export function getXp(t: { urgencia: number; prioridade: number; impacto?: number | null }): number {
  return (t.urgencia ?? 1) * (t.prioridade ?? 1) * (t.impacto ?? 1) * 10;
}

/** Whether a task has an "evidence" trail (verification link or notes). */
export function hasEvidence(t: { url_verificacao?: string | null; notas?: string | null }): boolean {
  return !!(t.url_verificacao?.trim() || t.notas?.trim());
}

/** XP earned for a completed task — 1.5x multiplier if evidence is attached. */
export function getEarnedXp(t: { urgencia: number; prioridade: number; impacto?: number | null; url_verificacao?: string | null; notas?: string | null }): number {
  const base = getXp(t);
  return hasEvidence(t) ? Math.round(base * 1.5) : base;
}

/** Sprint prefix extracted from `projeto` (e.g. "Sprint 1 — Diagnóstico e Controle"). */
export function getSprintLabel(t: { projeto?: string | null }): string | null {
  const part = (t.projeto ?? "").split(" / ")[0]?.trim();
  return part && /sprint/i.test(part) ? part : null;
}

/**
 * "Frente" (focus front) for a task — the specific objective within a sprint.
 * Derived from the part of `projeto` after " / " (e.g. "Bot e Chatwoot"),
 * falling back to `categoria` when `projeto` has no "/" segment.
 * A sprint should focus on ONE frente at a time, not a flat mix of categories.
 */
export function getFrente(t: { projeto?: string | null; categoria?: string | null }): string {
  const parts = (t.projeto ?? "").split(" / ");
  const sub = parts.length > 1 ? parts[1]?.trim() : null;
  return sub || t.categoria || "Outros";
}

/**
 * Objetivo (real outcome) a task belongs to. Falls back to `getFrente()` for
 * tasks not yet migrated to the Campanha → Objetivo → Sprint → Missão model.
 */
export function getObjetivoNome(t: { objetivo_nome?: string | null; projeto?: string | null; categoria?: string | null }): string {
  return t.objetivo_nome || getFrente(t);
}

/**
 * Sprint (focused, 5-12 missions, ONE objective) a task belongs to. Falls back
 * to the legacy sprint label from `projeto` for unmigrated tasks.
 */
export function getSprintNome(t: { sprint_nome?: string | null; projeto?: string | null; categoria?: string | null }): string {
  return t.sprint_nome || getFrente(t);
}

/** Maximum number of active (non-done/archived) missions a sprint should hold before warning. */
export const SPRINT_SIZE_WARNING_THRESHOLD = 12;

/** Desired outcome text per objetivo, shown alongside its sprint(s). */
export const OBJECTIVE_META: Record<string, { desired_outcome: string }> = {
  "Bot/Chatwoot confiável": { desired_outcome: "Bot real voltar a rodar corretamente" },
  "Admin/Banco estabilizado": { desired_outcome: "Saber qual banco é fonte da verdade" },
  "Ads/Tracking auditado": { desired_outcome: "Saber de onde vêm leads e vendas" },
  "Site/SEO auditado": { desired_outcome: "Auditoria técnica inicial" },
  "Instagram reposicionado": { desired_outcome: "Transformar perfil em máquina de conversão" },
  "Dashboard executivo confiável": { desired_outcome: "Ter um dashboard executivo confiável com KPIs reais" },
  "Operação e Infraestrutura estabilizadas": { desired_outcome: "Mapear e auditar a operação e infraestrutura atuais" },
};

export interface MonthMeta {
  key: string;
  titulo: string;
  sprints: number[];
}

/**
 * Sprints 0-4 -> Mês, hardcoded narrative titles.
 *
 * IMPORTANT: this is an explicit OVERRIDE for sprints 0-4 / months Jun-Sep 2026.
 * Pure date math (anchor 2026-06-01, 7-day sprints) would actually place Sprint 2
 * starting 2026-06-15, which is still Junho — NOT Julho as mapped here. We keep
 * this historical mapping frozen so existing tasks/objectives users already set
 * for Junho/Julho/Agosto/Setembro don't shift. Only sprint numbers 5+ (months
 * after Setembro 2026) use the date-based rolling formula in getRollingMonths().
 */
const LEGACY_SPRINT_MONTH: Record<number, string> = { 0: "junho", 1: "junho", 2: "junho", 3: "junho", 4: "junho" };
const LEGACY_MONTH_META: MonthMeta[] = [
  { key: "junho",   titulo: "Junho — Takeover Operacional", sprints: [0, 1, 2, 3, 4] },
  { key: "julho",   titulo: "Julho — Máquina de Conversão",  sprints: [] },
  { key: "agosto",  titulo: "Agosto — Sistema Defensável",   sprints: [] },
  { key: "setembro", titulo: "Setembro — Escala e Autoridade", sprints: [] },
];
const LAST_LEGACY_SPRINT = 4;

/** Project start anchor: Sprint 0 begins this date. Each sprint runs ~7 days. */
const SPRINT_0_START = new Date("2026-06-01T00:00:00");
const SPRINT_LENGTH_DAYS = 7;

/** Start date of a given sprint number (Sprint N starts N*7 days after Sprint 0). */
export function getSprintStartDate(sprintNumber: number): Date {
  const d = new Date(SPRINT_0_START);
  d.setDate(d.getDate() + sprintNumber * SPRINT_LENGTH_DAYS);
  return d;
}

/** End date (= due date) of a given sprint number — start + 7 days. */
export function getSprintEndDate(sprintNumber: number): Date {
  const d = getSprintStartDate(sprintNumber);
  d.setDate(d.getDate() + SPRINT_LENGTH_DAYS);
  return d;
}

/** Month key for a calendar Date, e.g. "junho", "outubro" — lowercase pt-BR month name. */
function monthKeyForDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", { month: "long" }).toLowerCase();
}

/** Generic title for a dynamically generated month, e.g. "Outubro 2026". */
function genericMonthTitle(d: Date): string {
  const name = d.toLocaleDateString("pt-BR", { month: "long" });
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${d.getFullYear()}`;
}

/**
 * Sprint -> month for sprints 5+, via date-based formula: a sprint "belongs" to
 * the calendar month/year containing its start date (anchor + n*7 days).
 * Sprints 0-4 are NOT covered here — use LEGACY_SPRINT_MONTH for those.
 */
function rollingSprintMonthKey(n: number): string {
  const start = getSprintStartDate(n);
  return `${monthKeyForDate(start)}-${start.getFullYear()}`;
}

/**
 * Resolve a task's month key (or null if its projeto has no "Sprint N" prefix).
 * Sprints 0-4 use the frozen LEGACY_SPRINT_MONTH lookup; sprints 5+ use the
 * date-based rolling formula (month key includes the year, e.g. "outubro-2026",
 * to disambiguate across years).
 */
export function getMonthKey(t: { projeto?: string | null }): string | null {
  const label = getSprintLabel(t);
  if (!label) return null;
  const m = /sprint\s*(\d+)/i.exec(label);
  if (!m) return null;
  const n = Number(m[1]);
  if (n <= LAST_LEGACY_SPRINT) return LEGACY_SPRINT_MONTH[n] ?? null;
  return rollingSprintMonthKey(n);
}

/**
 * Generate a rolling list of months starting from `today`'s month, `monthsAhead`
 * months forward (inclusive of current month). For each month, computes which
 * sprint numbers fall within it.
 *
 * - For the 4 legacy months (Junho-Setembro 2026), uses LEGACY_MONTH_META's
 *   hardcoded sprints/titles (frozen, see LEGACY_SPRINT_MONTH comment above).
 * - For all other months, computes sprints via the date-based formula (a sprint
 *   belongs to the month containing its start date) starting from sprint
 *   LAST_LEGACY_SPRINT + 1, and uses a generic title (month name + year).
 */
export function getRollingMonths(today: Date, monthsAhead = 12): MonthMeta[] {
  const months: MonthMeta[] = [];
  // Precompute sprint->month for a generous range of rolling sprints.
  const MAX_SPRINTS_SCAN = (monthsAhead + 2) * 5; // ~5 sprints/month, padded
  const rollingSprintsByMonthKey = new Map<string, number[]>();
  for (let n = LAST_LEGACY_SPRINT + 1; n <= MAX_SPRINTS_SCAN; n++) {
    const key = rollingSprintMonthKey(n);
    if (!rollingSprintsByMonthKey.has(key)) rollingSprintsByMonthKey.set(key, []);
    rollingSprintsByMonthKey.get(key)!.push(n);
  }

  const cursor = new Date(today.getFullYear(), today.getMonth(), 1);
  for (let i = 0; i < monthsAhead; i++) {
    const ptKey = monthKeyForDate(cursor); // e.g. "junho"
    const yearKey = `${ptKey}-${cursor.getFullYear()}`;
    const legacy = LEGACY_MONTH_META.find(m => m.key === ptKey);
    if (legacy && cursor.getFullYear() === 2026) {
      months.push({ ...legacy, sprints: [...legacy.sprints, ...(rollingSprintsByMonthKey.get(yearKey) ?? [])] });
    } else {
      months.push({
        key: yearKey,
        titulo: genericMonthTitle(cursor),
        sprints: rollingSprintsByMonthKey.get(yearKey) ?? [],
      });
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

/**
 * Estimated due date for an open task, derived from its "Sprint N" projeto prefix.
 * Returns the sprint's end date (start + 7 days). Returns null if the task has no
 * recognizable sprint, or is already done/archived.
 */
export function getEstimatedDueDate(t: { projeto?: string | null; execution_status?: ExecutionStatus }): Date | null {
  if (t.execution_status === "done" || t.execution_status === "archived") return null;
  const label = getSprintLabel(t);
  if (!label) return null;
  const m = /sprint\s*(\d+)/i.exec(label);
  if (!m) return null;
  return getSprintEndDate(Number(m[1]));
}

// ─── Frontes (8 work areas that own all tasks) ────────────────────────────────

export const FRONTES = {
  instagram:      { name: "Instagram",      color: "#e1306c", keywords: ["instagram", "conteúdo em escala", "bio, fixados", "instagram/conteúdo"] },
  desenvolvimento: { name: "Desenvolvimento", color: "#6366f1", keywords: ["command center", "admin e banco", "admin/banco", "simplificação da página", "diagnóstico e controle", "fonte da verdade", "arrumar command"] },
  anuncios:       { name: "Anúncios",       color: "#f59e0b", keywords: ["ads focado", "test drive", "conversão e test", "inventário de campanhas", "ads/tracking"] },
  admin_dash:     { name: "Admin Dash",     color: "#09a1e5", keywords: ["dashboard", "financeiro e margem", "dinheiro, estoque", "mapa da operação", "mapa geral", "governança", "auditoria operacional", "operação e infraestrutura", "criar dashboard", "dashboard/dados", "operação", "estratégia/ceo", "segurança"] },
  automation:     { name: "Automation",     color: "#10b981", keywords: ["bot", "chatwoot", "melissa", "automação", "recuperar bot", "automações", "bot/chatwoot"] },
  site:           { name: "Site",           color: "#8b5cf6", keywords: ["site/seo", "seo e autoridade", "seo", "auditoria técnica inicial", "landing page"] },
  marketing:      { name: "Marketing",      color: "#f97316", keywords: ["growth e experimentos", "escala e autoridade", "expansão e dependências", "marketing"] },
  loja:           { name: "Loja",           color: "#ec4899", keywords: ["loja", "pós-venda", "estoque e pós-venda", "produto"] },
} as const;

export type FronteKey = keyof typeof FRONTES;

// automation checked first — "bot" is unambiguous; desenvolvimento last (broad match)
const FRONTE_ORDER: FronteKey[] = ["automation", "instagram", "anuncios", "admin_dash", "site", "marketing", "loja", "desenvolvimento"];

export function getFronte(t: Pick<Task, "projeto" | "objetivo_nome" | "sprint_nome" | "categoria">): FronteKey | null {
  const hay = [t.projeto ?? "", t.objetivo_nome ?? "", t.sprint_nome ?? "", t.categoria ?? ""].join(" ").toLowerCase();
  for (const key of FRONTE_ORDER) {
    if (FRONTES[key].keywords.some(kw => hay.includes(kw))) return key;
  }
  return null;
}

/** Human-readable auto-documentation line for a completed/archived task. */
export function buildHistoryLine(t: Task): string {
  const date = t.concluido_em ?? t.updated_at;
  const dateStr = new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const sprint = getSprintLabel(t);
  const parts = [`Em ${dateStr}, concluiu "${t.titulo}"`];
  if (sprint) parts.push(`relacionado à ${sprint}`);
  if (hasEvidence(t)) parts.push(`com evidência registrada`);
  return parts.join(", ") + ".";
}

export interface EquityReadiness {
  pct: number;
  xpTotal: number;
  xpEarned: number;
}

/** Symbolic "Impact/Equity Readiness" — share of possible XP already earned (with evidence bonus). */
export function getEquityReadiness(tasks: Task[]): EquityReadiness {
  const relevant = tasks.filter(t => t.execution_status !== "archived");
  const xpTotal = relevant.reduce((sum, t) => sum + getXp(t), 0);
  const xpEarned = relevant
    .filter(t => t.execution_status === "done")
    .reduce((sum, t) => sum + getEarnedXp(t), 0);
  const pct = xpTotal > 0 ? Math.round((xpEarned / xpTotal) * 100) : 0;
  return { pct, xpTotal, xpEarned };
}

// ─── Roadmap Objectives (Mapa do Mês — objetivos de mês/sprint) ────────────

export type ObjectiveScope = "month" | "sprint" | "frente";

export interface RoadmapObjective {
  scope: ObjectiveScope;
  key: string;
  objetivo: string | null;
  updated_at: string;
}

/** All roadmap objectives, keyed as `${scope}:${key}` for easy lookup. */
export async function getObjectives(): Promise<Record<string, string>> {
  // supabase singleton from ./supabase
  const { data, error } = await supabase
    .from("roadmap_objectives")
    .select("scope, key, objetivo");
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const row of data as { scope: ObjectiveScope; key: string; objetivo: string | null }[]) {
    if (row.objetivo) map[`${row.scope}:${row.key}`] = row.objetivo;
  }
  return map;
}

/** Create or update the objective text for a given month/sprint. */
export async function upsertObjective(scope: ObjectiveScope, key: string, objetivo: string): Promise<void> {
  // supabase singleton from ./supabase
  const { error } = await supabase
    .from("roadmap_objectives")
    .upsert({ scope, key, objetivo, updated_at: new Date().toISOString() }, { onConflict: "scope,key" });
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  // supabase singleton from ./supabase
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

// ─── Task Artifacts (Resultado / Artifacts / Evidências) ───────────────────

export type ArtifactType = "resultado" | "artifact" | "evidencia";

export interface TaskArtifact {
  id: string;
  task_id: string | null;
  type: ArtifactType;
  title: string | null;
  content_markdown: string | null;
  url: string | null;
  file_path: string | null;
  tags: string[] | null;
  modelo: string | null;
  utilidade: UtilidadeKey | null;
  bot_acessivel: boolean;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskArtifactInsert = Omit<TaskArtifact, "id" | "created_at" | "updated_at">;

// ─── Arsenal de Conteúdo (reusable content tagging) ────────────────────────

/** Fixed set of content "utilidade" (purpose) options for the arsenal. */
export type UtilidadeKey =
  | "post_instagram"
  | "story"
  | "resposta_whatsapp"
  | "argumento_venda"
  | "anuncio"
  | "video"
  | "outro";

export const UTILIDADE_OPTIONS: { value: UtilidadeKey; label: string }[] = [
  { value: "post_instagram", label: "Post Instagram" },
  { value: "story", label: "Story" },
  { value: "resposta_whatsapp", label: "Resposta WhatsApp" },
  { value: "argumento_venda", label: "Argumento de venda" },
  { value: "anuncio", label: "Anúncio" },
  { value: "video", label: "Vídeo" },
  { value: "outro", label: "Outro" },
];

/** "Geral" sentinel for content not tied to a specific bike model. */
export const MODELO_GERAL = "Geral";

/** Filters for browsing the content arsenal. */
export interface ArsenalFilters {
  modelo?: string;
  utilidade?: UtilidadeKey;
  botAcessivel?: boolean;
  category?: string;
  /** When true, only returns artifacts not tied to any task (task_id is null). */
  standaloneOnly?: boolean;
}

/**
 * Arsenal items: reusable artifacts (resultado/artifact) tagged with modelo,
 * utilidade and bot_acessivel, joined with their task for context (null for
 * standalone artifacts with no `task_id`).
 * Bot Melissa consumption: `task_artifacts where bot_acessivel = true`,
 * optionally filtered by `modelo` / `utilidade`.
 */
export async function getArsenalItems(filters: ArsenalFilters = {}): Promise<TaskArtifactWithTask[]> {
  // supabase singleton from ./supabase
  let query = supabase
    .from("task_artifacts")
    .select("*, task:tasks(id, titulo, projeto)")
    .order("created_at", { ascending: false });
  if (filters.modelo) query = query.eq("modelo", filters.modelo);
  if (filters.utilidade) query = query.eq("utilidade", filters.utilidade);
  if (filters.botAcessivel !== undefined) query = query.eq("bot_acessivel", filters.botAcessivel);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.standaloneOnly) query = query.is("task_id", null);
  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as TaskArtifactWithTask[];
}

const SECRET_PATTERN = /(api[_-]?key|secret|token|password|senha|bearer)\s*[:=]\s*\S+/i;

/** Returns true if the text looks like it contains a credential/token. */
export function looksLikeSecret(text: string): boolean {
  return SECRET_PATTERN.test(text);
}

export async function getTaskArtifacts(taskId: string): Promise<TaskArtifact[]> {
  // supabase singleton from ./supabase
  const { data, error } = await supabase
    .from("task_artifacts")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as TaskArtifact[];
}

export async function createArtifact(artifact: TaskArtifactInsert): Promise<TaskArtifact> {
  // supabase singleton from ./supabase
  const { data, error } = await supabase
    .from("task_artifacts")
    .insert(artifact)
    .select("*")
    .single();
  if (error) throw error;
  return data as TaskArtifact;
}

export async function updateArtifact(id: string, patch: Partial<TaskArtifactInsert>): Promise<void> {
  // supabase singleton from ./supabase
  const { error } = await supabase
    .from("task_artifacts")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteArtifact(id: string): Promise<void> {
  // supabase singleton from ./supabase
  const { error } = await supabase.from("task_artifacts").delete().eq("id", id);
  if (error) throw error;
}

/** All artifacts across the system, joined with their task's title/projeto for context. */
export interface TaskArtifactWithTask extends TaskArtifact {
  task: { id: string; titulo: string; projeto: string | null } | null;
}

export async function getAllArtifacts(opts: { standaloneOnly?: boolean } = {}): Promise<TaskArtifactWithTask[]> {
  // supabase singleton from ./supabase
  let query = supabase
    .from("task_artifacts")
    .select("*, task:tasks(id, titulo, projeto)")
    .order("created_at", { ascending: false });
  if (opts.standaloneOnly) query = query.is("task_id", null);
  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as TaskArtifactWithTask[];
}

/** Per-task counts of each artifact type, for showing badges in task lists. */
export async function getArtifactCounts(): Promise<Record<string, Record<ArtifactType, number>>> {
  // supabase singleton from ./supabase
  const { data, error } = await supabase.from("task_artifacts").select("task_id, type");
  if (error) throw error;
  const counts: Record<string, Record<ArtifactType, number>> = {};
  for (const row of data as { task_id: string | null; type: ArtifactType }[]) {
    if (!row.task_id) continue; // standalone (arsenal) artifacts have no task to badge
    if (!counts[row.task_id]) counts[row.task_id] = { resultado: 0, artifact: 0, evidencia: 0 };
    counts[row.task_id][row.type]++;
  }
  return counts;
}
