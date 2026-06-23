import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Plus, RefreshCw, Search, CheckCircle2,
  Calendar, X, Save, ExternalLink, AlertTriangle,
  Flag, LayoutGrid, Columns3, ChevronDown, ChevronUp,
  MoreHorizontal, RotateCcw, GripVertical, Clock, Ban, Table2, Map as MapIcon, Trophy, Sparkles, Target,
  FileText, Paperclip, ShieldAlert, Trash2,
  Camera, MessageCircle, Bike, CircleDollarSign, GitBranch, BarChart3, Zap, Rocket,
  Bold, Italic, List, Link as LinkIcon, Code, Pencil, Maximize2, Minimize2, ChevronRight, ChevronLeft,
  Code2, Globe, Megaphone, ShoppingBag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "../lib/supabase";
import RichTextEditor from "../components/RichTextEditor";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, useDroppable, useDraggable,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  getTasks, updateTask, moveTask, restoreTask, createTask,
  getXp, getEarnedXp, hasEvidence, getMonthKey, getRollingMonths, buildHistoryLine, getEquityReadiness, getEstimatedDueDate,
  getTaskArtifacts, createArtifact, updateArtifact, deleteArtifact, looksLikeSecret, getArtifactCounts,
  getObjectives, upsertObjective, getObjetivoNome, getSprintNome, OBJECTIVE_META, SPRINT_SIZE_WARNING_THRESHOLD,
  UTILIDADE_OPTIONS, MODELO_GERAL,
  FRONTES, getFronte, rollingSprintMonthKey,
} from "../lib/tasks";
import type { UtilidadeKey, FronteKey, Task, TaskInsert, PlanningBucket, ExecutionStatus, TaskArtifact, ArtifactType, TaskArtifactInsert } from "../lib/tasks";
import WeeklyRitualsBanner from "../components/WeeklyRitualsBanner";

/** Bike models for the "Modelo" picker (arsenal tagging). */
const BIKE_MODELS: string[] = [];

const mono = { className: "font-mono" };

// ─── Command Center design tokens ──────────────────────────────────────────────

const cc = {
  panel: "rounded-2xl border border-white/[0.08] bg-[#0B1324]/80 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl",
  card: "relative rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#101A2E] to-[#070D18] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.28)]",
  cardActive: "relative rounded-2xl border border-[#09a1e5]/40 bg-gradient-to-br from-[#0E2A44] to-[#081020] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_40px_rgba(9,161,229,0.18)]",
  glow: "shadow-[0_0_35px_rgba(9,161,229,0.18)]",
};

const FRENTE_ICONS: Record<FronteKey, LucideIcon> = {
  instagram:       Camera,
  desenvolvimento: Code2,
  anuncios:        Megaphone,
  operacao:        BarChart3,
  automation:      Zap,
  site:            Globe,
  marketing:       Rocket,
  loja:            ShoppingBag,
};

/** Tiny SVG circular progress ring, used for KPI/sprint visuals. */
function Confetti() {
  const colors = ["#09a1e5", "#34d399", "#fbbf24", "#a78bfa", "#f472b6"];
  const pieces = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.4,
    duration: 1.6 + Math.random() * 1.2,
    color: colors[i % colors.length],
    rotate: Math.random() * 360,
    size: 6 + Math.random() * 6,
  })), []);
  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      {pieces.map(p => (
        <span key={p.id} className="absolute top-[-10px] rounded-sm animate-confetti-fall"
          style={{
            left: `${p.left}%`, width: p.size, height: p.size * 0.6, background: p.color,
            animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }} />
      ))}
      <style jsx global>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(540deg); opacity: 0; }
        }
        .animate-confetti-fall { animation: confetti-fall linear forwards; }
      `}</style>
    </div>
  );
}

function KpiResourceCard({ label, value, sub, icon: Icon, accent, pct }: {
  label: string; value: React.ReactNode; sub: string; icon: React.ElementType; accent: string; pct?: number;
}) {
  return (
    <div className={`${cc.card} p-4 overflow-hidden group hover:border-white/[0.14] transition-colors`}>
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl opacity-20 transition-opacity group-hover:opacity-30" style={{ background: accent }} />
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-slate-400 tracking-wide">{label}</span>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${accent}1A` }}>
          <Icon size={15} style={{ color: accent }} />
        </div>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className={`${mono.className} text-3xl font-extrabold text-white leading-none`}>{value}</div>
          <p className="text-xs text-slate-400 mt-1.5">{sub}</p>
        </div>
        {pct !== undefined && (
          <RingProgress pct={pct} size={48} stroke={4} color={accent}>
            <span className={`${mono.className} text-[11px] font-bold text-white`}>{pct}%</span>
          </RingProgress>
        )}
      </div>
    </div>
  );
}

function RingProgress({ pct, size = 56, stroke = 5, color = "#09a1e5", track = "rgba(255,255,255,0.08)", children }: {
  pct: number; size?: number; stroke?: number; color?: string; track?: string; children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(Math.max(pct, 0), 100) / 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ExtendedTask = Task;
type ColumnId = "backlog" | "sprint" | "today" | "doing" | "review" | "blocked" | "done" | "trash";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function score(t: { urgencia: number; prioridade: number; impacto?: number | null }) {
  return t.urgencia * t.prioridade * (t.impacto ?? 1);
}

function todayStr() { return new Date().toISOString().slice(0, 10); }
function tomorrowStr() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); }
function plusDaysStr(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
const PRAZO_PRESETS = [1, 2, 3, 5, 10, 15] as const;
function isToday(date?: string | null) { return !!date && date === todayStr(); }
function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

const IMPACTO_LABELS: Record<number, string> = { 1: "Baixo", 2: "Médio", 3: "Alto" };

// Maps any categoria value (new frente key or legacy string) to an emoji icon.
const CATEGORIA_ICONS: Record<string, string> = {
  // frente keys (new canonical values)
  instagram: "📸", desenvolvimento: "💻", anuncios: "🎯", operacao: "⚙️",
  automation: "🤖", site: "🌐", marketing: "📣", loja: "🛍️",
  // legacy free-text values kept for display of old tasks
  "Admin/Banco": "🗄️", "Bot/Chatwoot": "🤖", "Ads/Tracking": "🎯", "Site/SEO": "🌐",
  "Instagram/Conteúdo": "📸", "Automações": "⚙️", "Dashboard/Dados": "📊",
  "Operação": "🏍️", "Estratégia/CEO": "🧭", "Segurança": "🔒", "Outros": "📌",
  "Ads": "🎯", "Site": "🌐", "Admin": "🛠️", "Instagram": "📸", "Automação": "🤖",
  "Marketing": "📣", "Loja": "🏍️",
};

// ─── Objetivos do Mês (MVP — dados manuais/mockados) ───────────────────────────
type GoalStatus = "on_track" | "attention" | "late" | "completed" | "no_data";

interface MonthlyGoal {
  id: string;
  title: string;
  icon: React.ElementType;
  current: number | null;
  target: number | null;
  unit: "number" | "percent" | "currency";
  source: string;
}

const MONTHLY_GOALS: MonthlyGoal[] = [
  { id: "instagram",  title: "Seguidores Instagram",        icon: Camera,          current: null, target: 2500, unit: "number",   source: "Meta Graph API" },
  { id: "conversas",  title: "Conversas iniciadas (Click-to-WhatsApp)", icon: MessageCircle, current: null, target: 300,  unit: "number",   source: "Meta Ads Insights" },
  { id: "cliques",    title: "Cliques no link (Ads)",        icon: Zap,             current: null, target: 1500, unit: "number",   source: "Meta Ads Insights" },
  { id: "visitas",    title: "Visitas ao site",              icon: BarChart3,       current: null, target: 5000, unit: "number",   source: "Google Analytics 4" },
  { id: "testdrive",  title: "Test drives realizados",       icon: Bike,            current: 6,    target: 20,   unit: "number",   source: "Test Drives/Admin" },
  { id: "vendas",     title: "Vendas digitais",              icon: CircleDollarSign, current: 4,    target: 10,   unit: "number",   source: "CRM/Vendas" },
  { id: "origem",     title: "Leads com origem preenchida",  icon: GitBranch,       current: 62,   target: 90,   unit: "percent",  source: "CRM/Admin" },
  { id: "receita",    title: "Receita digital atribuída",    icon: BarChart3,       current: null, target: null, unit: "currency", source: "Dashboard financeiro (futuro)" },
];

const GOAL_STATUS_META: Record<GoalStatus, { label: string; color: string; bar: string; bg: string }> = {
  on_track:  { label: "No caminho", color: "text-blue-300",    bar: "bg-blue-500",    bg: "bg-blue-500/10 border-blue-500/30" },
  attention: { label: "Atenção",    color: "text-amber-300",   bar: "bg-amber-500",   bg: "bg-amber-500/10 border-amber-500/30" },
  late:      { label: "Atrasado",   color: "text-red-300",     bar: "bg-red-500",     bg: "bg-red-500/10 border-red-500/30" },
  completed: { label: "Batida",     color: "text-emerald-300", bar: "bg-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30" },
  no_data:   { label: "Sem dados",  color: "text-slate-400",   bar: "bg-slate-600",   bg: "bg-slate-800/60 border-slate-700" },
};

function getGoalProgress(goal: MonthlyGoal): { pct: number | null; status: GoalStatus } {
  if (goal.current == null || goal.target == null || goal.target === 0) {
    return { pct: null, status: "no_data" };
  }
  const pct = Math.min(Math.round((goal.current / goal.target) * 100), 100);
  if (pct >= 100) return { pct, status: "completed" };
  if (pct >= 60) return { pct, status: "on_track" };
  if (pct >= 30) return { pct, status: "attention" };
  return { pct, status: "late" };
}

function formatGoalValue(value: number | null, unit: MonthlyGoal["unit"]): string {
  if (value == null) return "—";
  if (unit === "percent") return `${value}%`;
  if (unit === "currency") return `R$ ${value.toLocaleString("pt-BR")}`;
  return value.toLocaleString("pt-BR");
}

// ─── Column model ─────────────────────────────────────────────────────────────

const COLUMNS: { id: ColumnId; label: string; icon: string; color: string; bg: string; border: string; dot: string }[] = [
  { id: "backlog", label: "Backlog",          icon: "",   color: "text-slate-400",   bg: "bg-slate-900/40",   border: "border-slate-700",   dot: "bg-slate-400" },
  { id: "sprint",  label: "Sprint da semana",  icon: "🚀", color: "text-violet-300",  bg: "bg-violet-500/10",  border: "border-violet-500/30",  dot: "bg-violet-500/100" },
  { id: "today",   label: "Hoje",              icon: "📅", color: "text-cyan-300",    bg: "bg-cyan-500/10",    border: "border-cyan-500/30",    dot: "bg-[#09a1e5]" },
  { id: "doing",   label: "Em andamento",      icon: "",   color: "text-blue-300",    bg: "bg-blue-500/10",    border: "border-blue-500/30",    dot: "bg-blue-500/100" },
  { id: "review",  label: "Revisão",           icon: "",   color: "text-amber-300",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   dot: "bg-amber-500/100" },
  { id: "blocked", label: "Bloqueado",         icon: "🚧", color: "text-red-300",     bg: "bg-red-500/10",     border: "border-red-500/30",     dot: "bg-red-500/100" },
  { id: "done",    label: "Concluído",         icon: "✅", color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-500/100" },
  { id: "trash",   label: "Lixeira",           icon: "",   color: "text-slate-400",   bg: "bg-slate-900/40",   border: "border-slate-700",   dot: "bg-slate-300" },
];
const COLUMN_META: Record<ColumnId, typeof COLUMNS[number]> = Object.fromEntries(COLUMNS.map(c => [c.id, c])) as never;
const FOCUS_LIMIT_TODAY = 3;

function getColumnId(t: Task): ColumnId {
  switch (t.execution_status) {
    case "archived": return "trash";
    case "done": return "done";
    case "blocked": return "blocked";
    case "review": return "review";
    case "doing": return "doing";
    default:
      if (t.planning_bucket === "today") return "today";
      if (t.planning_bucket === "sprint") return "sprint";
      return "backlog";
  }
}

/** Maps a target column to the (planning_bucket, execution_status) pair to persist. */
function columnTarget(columnId: ColumnId, current: Task): { planning: PlanningBucket; execution: ExecutionStatus } {
  switch (columnId) {
    case "backlog": return { planning: "backlog", execution: "todo" };
    case "sprint":  return { planning: "sprint",  execution: "todo" };
    case "today":   return { planning: "today",   execution: "todo" };
    case "doing":   return { planning: current.planning_bucket === "later" ? "today" : current.planning_bucket, execution: "doing" };
    case "review":  return { planning: current.planning_bucket === "later" ? "today" : current.planning_bucket, execution: "review" };
    case "blocked": return { planning: current.planning_bucket === "later" ? "today" : current.planning_bucket, execution: "blocked" };
    case "done":    return { planning: current.planning_bucket === "later" ? "today" : current.planning_bucket, execution: "done" };
    case "trash":   return { planning: "later",   execution: "archived" };
  }
}

function calcOrderIndex(arr: ExtendedTask[], index: number): number {
  const before = index > 0 ? arr[index - 1]?.order_index : undefined;
  const after = index < arr.length ? arr[index]?.order_index : undefined;
  if (before == null && after == null) return 1000;
  if (before == null) return after! - 1000;
  if (after == null) return before + 1000;
  return (before + after) / 2;
}

// ─── Move menu (mobile / no-DnD fallback) ──────────────────────────────────────

function MoveMenu({ current, onMove }: { current: ColumnId; onMove: (col: ColumnId) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className="text-slate-500 hover:text-slate-300 transition-colors p-0.5">
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-30 bg-[#111A2E] border border-slate-800/70 rounded-xl shadow-lg py-1 w-44"
          onClick={e => e.stopPropagation()}>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-3 py-1">Mover para</p>
          {COLUMNS.map(c => (
            <button key={c.id} onClick={() => { onMove(c.id); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-800/60 transition-colors ${c.id === current ? "font-bold text-white" : "text-slate-400"}`}>
              <span>{c.icon}</span>{c.label}{c.id === current && <span className="ml-auto text-[#09a1e5]">●</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

// ─── Artifacts panel (Resultado / Artifacts / Evidências) ──────────────────

const ARTIFACT_TAB_META: Record<ArtifactType, { label: string; help: string; placeholder: string; titlePlaceholder?: string }> = {
  resultado: {
    label: "Resultado",
    help: "Prova de que foi feito e funciona — pode ser texto, link com título, ou arquivo (upload).",
    placeholder: "Descreva o resultado…",
    titlePlaceholder: "Título (opcional)",
  },
  artifact: {
    label: "Artifacts",
    help: "Materiais produzidos durante o trabalho: documentos, prints, arquivos, links de referência.",
    placeholder: "Descrição do artifact…",
    titlePlaceholder: "Título do artifact",
  },
  evidencia: {
    label: "Evidência",
    help: "Prova de que foi feito e funciona: link de verificação, deploy, commit, print de teste.",
    placeholder: "Notas sobre a evidência (opcional)…",
    titlePlaceholder: "Título (opcional)",
  },
};

type ArtifactKind = "texto" | "link" | "arquivo";

function MarkdownToolbar({ onInsert }: { onInsert: (before: string, after: string, placeholder: string) => void }) {
  const BTNS: { label: string; icon: React.ElementType; before: string; after: string; placeholder: string }[] = [
    { label: "Negrito", icon: Bold, before: "**", after: "**", placeholder: "texto" },
    { label: "Itálico", icon: Italic, before: "_", after: "_", placeholder: "texto" },
    { label: "Lista", icon: List, before: "- ", after: "", placeholder: "item" },
    { label: "Link", icon: LinkIcon, before: "[", after: "](https://)", placeholder: "texto" },
    { label: "Código", icon: Code, before: "`", after: "`", placeholder: "código" },
  ];
  return (
    <div className="flex items-center gap-1 px-1">
      {BTNS.map(b => (
        <button key={b.label} type="button" title={b.label} onClick={() => onInsert(b.before, b.after, b.placeholder)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
          <b.icon size={13} />
        </button>
      ))}
      <span className="ml-1 text-[10px] text-slate-500">Markdown</span>
    </div>
  );
}

function ArtifactsPanel({ taskId, type, types }: { taskId: string; type: ArtifactType; types?: ArtifactType[] }) {
  const includeTypes = types ?? [type];
  // When the panel contains both resultado+evidencia, let the user pick which to add
  const canPickType = includeTypes.includes("resultado") && includeTypes.includes("evidencia");
  const [addType, setAddType] = useState<ArtifactType>(type);
  const meta = ARTIFACT_TAB_META[addType];
  const [items, setItems] = useState<TaskArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  // Default kind: evidencia → link; resultado → texto
  const [kind, setKind] = useState<ArtifactKind>(type === "evidencia" ? "link" : "texto");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [modelo, setModelo] = useState("");
  const [utilidade, setUtilidade] = useState<UtilidadeKey | "">("");
  const [botAcessivel, setBotAcessivel] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  function toggleExpanded(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKind, setEditKind] = useState<ArtifactKind>("texto");
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editModelo, setEditModelo] = useState("");
  const [editUtilidade, setEditUtilidade] = useState<UtilidadeKey | "">("");
  const [editBotAcessivel, setEditBotAcessivel] = useState(false);
  const [fullscreenContent, setFullscreenContent] = useState(false);
  const [fullscreenEditContent, setFullscreenEditContent] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipAutoSave = useRef(true);

  const draftKey = `resultado-draft-${taskId}-${type}`;
  const [draftStatus, setDraftStatus] = useState<"idle" | "saved">("idle");
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftLoaded = useRef(false);

  // Reset kind to sensible default when switching addType
  useEffect(() => {
    if (!canPickType) return;
    setKind(addType === "evidencia" ? "link" : "texto");
    setContent(""); setUrl(""); setTitle(""); setFile(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addType]);

  // Restore draft for the create form on mount (resultado type only).
  useEffect(() => {
    if (type !== "resultado" || draftLoaded.current) return;
    draftLoaded.current = true;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as { title?: string; content?: string; modelo?: string; utilidade?: string; botAcessivel?: boolean };
      if (!title && !content && !modelo && !utilidade && !botAcessivel) {
        if (draft.title) setTitle(draft.title);
        if (draft.content) setContent(draft.content);
        if (draft.modelo) setModelo(draft.modelo);
        if (draft.utilidade) setUtilidade(draft.utilidade as UtilidadeKey | "");
        if (draft.botAcessivel) setBotAcessivel(draft.botAcessivel);
        setDraftStatus("saved");
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced autosave of the create form draft to localStorage.
  useEffect(() => {
    if (type !== "resultado") return;
    if (!draftLoaded.current) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      try {
        if (!title.trim() && !content.trim() && !modelo && !utilidade && !botAcessivel) {
          localStorage.removeItem(draftKey);
          setDraftStatus("idle");
        } else {
          localStorage.setItem(draftKey, JSON.stringify({ title, content, modelo, utilidade, botAcessivel }));
          setDraftStatus("saved");
        }
      } catch { /* ignore */ }
    }, 1000);
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, modelo, utilidade, botAcessivel]);

  function clearDraft() {
    try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
    setDraftStatus("idle");
  }

  const load = useCallback(async () => {
    setLoading(true);
    const all = await getTaskArtifacts(taskId);
    setItems(all.filter(a => includeTypes.includes(a.type)));
    setLoading(false);
  }, [taskId, includeTypes]);

  useEffect(() => { load(); }, [load]);

  const secretWarning = looksLikeSecret(content) || looksLikeSecret(title);

  function insertMarkdown(before: string, after: string, placeholder: string) {
    const ta = textareaRef.current;
    if (!ta) { setContent(c => c + before + placeholder + after); return; }
    const start = ta.selectionStart, end = ta.selectionEnd;
    const selected = content.slice(start, end) || placeholder;
    const next = content.slice(0, start) + before + selected + after + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  async function add() {
    if (!content.trim() && !url.trim() && !title.trim() && !file) return;
    setSaving(true);
    let filePath: string | null = null;
    let fileUrl: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop();
      const path = `task-artifacts/${taskId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("task-media").upload(path, file, { contentType: file.type });
      if (!error) {
        filePath = path;
        fileUrl = supabase.storage.from("task-media").getPublicUrl(path).data.publicUrl;
      }
    }
    await createArtifact({
      task_id: taskId, type: addType,
      title: title.trim() || (file ? file.name : null),
      content_markdown: content.trim() || null,
      url: url.trim() || fileUrl || null,
      file_path: filePath,
      tags: null,
      modelo: modelo || null,
      utilidade: utilidade || null,
      bot_acessivel: botAcessivel,
      category: null,
    });
    setTitle(""); setContent(""); setUrl(""); setFile(null);
    setModelo(""); setUtilidade(""); setBotAcessivel(false);
    clearDraft();
    await load();
    setSaving(false);
  }

  async function remove(id: string, filePath: string | null) {
    if (filePath) await supabase.storage.from("task-media").remove([filePath]).catch(() => {});
    await deleteArtifact(id);
    await load();
  }

  function startEdit(a: TaskArtifact) {
    setEditingId(a.id);
    setEditKind(a.file_path ? "arquivo" : a.url ? "link" : "texto");
    setEditTitle(a.title ?? "");
    setEditContent(a.content_markdown ?? "");
    setEditUrl(a.url ?? "");
    setEditModelo(a.modelo ?? "");
    setEditUtilidade(a.utilidade ?? "");
    setEditBotAcessivel(a.bot_acessivel ?? false);
    setAutoSaveStatus("idle");
    skipAutoSave.current = true;
  }

  function cancelEdit() {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setEditingId(null);
    setEditTitle(""); setEditContent(""); setEditUrl("");
    setEditModelo(""); setEditUtilidade(""); setEditBotAcessivel(false);
    setAutoSaveStatus("idle");
    setFullscreenEditContent(false);
  }

  async function saveEdit(id: string) {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setEditSaving(true);
    await updateArtifact(id, {
      title: editTitle.trim() || null,
      content_markdown: editContent.trim() || null,
      url: editKind === "link" ? (editUrl.trim() || null) : undefined,
      modelo: editModelo || null,
      utilidade: editUtilidade || null,
      bot_acessivel: editBotAcessivel,
    } as Partial<TaskArtifactInsert>);
    setEditSaving(false);
    cancelEdit();
    await load();
  }

  // Auto-save content of an existing artifact while editing, debounced.
  useEffect(() => {
    if (!editingId) return;
    if (skipAutoSave.current) { skipAutoSave.current = false; return; }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setAutoSaveStatus("saving");
    autoSaveTimer.current = setTimeout(async () => {
      await updateArtifact(editingId, {
        content_markdown: editContent.trim() || null,
      } as Partial<TaskArtifactInsert>);
      setAutoSaveStatus("saved");
    }, 1500);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editContent, editingId]);

  // Group items added within 2 minutes of each other (same upload batch).
  const groups = useMemo(() => {
    const result: { time: string; items: TaskArtifact[] }[] = [];
    for (const a of items) {
      const last = result[result.length - 1];
      if (last && Math.abs(new Date(a.created_at).getTime() - new Date(last.items[last.items.length - 1].created_at).getTime()) <= 2 * 60 * 1000) {
        last.items.push(a);
      } else {
        result.push({ time: a.created_at, items: [a] });
      }
    }
    return result;
  }, [items]);

  return (
    <div className="space-y-3">
      {loading ? (
        <p className="text-xs text-slate-400 text-center py-2">Carregando…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-2">Nada registrado ainda.</p>
      ) : (
        <div className="space-y-3">
          {groups.map((group, gi) => (
          <div key={`${group.time}-${gi}`} className={group.items.length > 1 ? "border border-slate-800/70 rounded-xl p-2 space-y-2 bg-slate-950/30" : "space-y-2"}>
            {group.items.length > 1 && (
              <p className={`${mono.className} text-[10px] text-slate-500 px-1 flex items-center gap-1.5`}>
                <Paperclip size={10} /> {group.items.length} itens adicionados juntos — {new Date(group.time).toLocaleString("pt-BR")}
              </p>
            )}
          {group.items.map(a => {
            const isExpanded = editingId === a.id || expandedIds.has(a.id);
            return (
            <div key={a.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
              {editingId === a.id ? (
                <div className="space-y-2">
                  {meta.titlePlaceholder && (
                    <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder={meta.titlePlaceholder}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-[#09a1e5]" />
                  )}
                  {editKind === "link" && (
                    <input value={editUrl} onChange={e => setEditUrl(e.target.value)} placeholder="https://…"
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-[#09a1e5]" />
                  )}
                  {editKind !== "arquivo" && (
                    <div className="relative">
                      {a.type === "resultado" ? (
                        <>
                          <RichTextEditor value={editContent} onChange={setEditContent} placeholder={ARTIFACT_TAB_META.resultado.placeholder} showAiFix />
                          <button type="button" title="Expandir" onClick={() => setFullscreenEditContent(true)}
                            className="absolute top-1.5 right-1.5 text-slate-500 hover:text-white transition-colors bg-slate-900/80 rounded p-0.5">
                            <Maximize2 size={13} />
                          </button>
                        </>
                      ) : (
                        <>
                          <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={4}
                            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 pr-8 text-sm text-white placeholder-slate-400 outline-none focus:border-[#09a1e5] resize-none font-mono"
                            placeholder={ARTIFACT_TAB_META[a.type]?.placeholder ?? ""} />
                          <button type="button" title="Expandir" onClick={() => setFullscreenEditContent(true)}
                            className="absolute top-2 right-2 text-slate-500 hover:text-white transition-colors">
                            <Maximize2 size={13} />
                          </button>
                        </>
                      )}
                      {a.type === "resultado" && (
                        <p className="text-[10px] text-slate-500 mt-1">
                          {autoSaveStatus === "saving" ? "Salvando…" : autoSaveStatus === "saved" ? "Salvo" : ""}
                        </p>
                      )}
                    </div>
                  )}
                  <AnimatePresence>
                    {fullscreenEditContent && (
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8">
                        <motion.div
                          initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }}
                          className="bg-slate-900 border border-slate-700 rounded-2xl w-full h-full max-w-4xl flex flex-col p-4 gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400">
                              {autoSaveStatus === "saving" ? "Salvando…" : autoSaveStatus === "saved" ? "Salvo" : ""}
                            </span>
                            <button type="button" title="Minimizar" onClick={() => setFullscreenEditContent(false)}
                              className="text-slate-400 hover:text-white transition-colors">
                              <Minimize2 size={16} />
                            </button>
                          </div>
                          {a.type === "resultado" ? (
                            <div className="flex-1 min-h-0">
                              <RichTextEditor value={editContent} onChange={setEditContent} placeholder={ARTIFACT_TAB_META.resultado.placeholder} fullscreen showAiFix />
                            </div>
                          ) : (
                            <textarea value={editContent} onChange={e => setEditContent(e.target.value)} autoFocus
                              placeholder={ARTIFACT_TAB_META[a.type]?.placeholder ?? ""}
                              className="flex-1 w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-[#09a1e5] resize-none font-mono" />
                          )}
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {editKind === "arquivo" && a.file_path && (
                    <p className="text-[11px] text-slate-400">Arquivo não pode ser substituído aqui — apague e crie um novo registro se necessário.</p>
                  )}
                  {a.type === "resultado" && (
                    <div className="flex flex-wrap items-center gap-2">
                      <select value={editModelo} onChange={e => setEditModelo(e.target.value)}
                        className="bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-white outline-none focus:border-[#09a1e5]">
                        <option value="">Modelo (opcional)</option>
                        <option value={MODELO_GERAL}>{MODELO_GERAL}</option>
                        {BIKE_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <select value={editUtilidade} onChange={e => setEditUtilidade(e.target.value as UtilidadeKey | "")}
                        className="bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-white outline-none focus:border-[#09a1e5]">
                        <option value="">Utilidade (opcional)</option>
                        {UTILIDADE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                        <input type="checkbox" checked={editBotAcessivel} onChange={e => setEditBotAcessivel(e.target.checked)} />
                        Disponível para o bot Melissa
                      </label>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button onClick={() => saveEdit(a.id)} disabled={editSaving}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#09a1e5] hover:bg-[#08a] rounded-lg text-white text-xs font-semibold transition-all disabled:opacity-40">
                      <Save size={12} /> {editSaving ? "Salvando…" : "Salvar"}
                    </button>
                    <button onClick={cancelEdit}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 text-xs font-semibold transition-all">
                      <X size={12} /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        {includeTypes.length > 1 && (
                          a.type === "evidencia" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-[#09a1e5]/10 text-[#09a1e5] border border-[#09a1e5]/25 font-semibold">
                              <Paperclip size={9} /> Evidência
                            </span>
                          ) : a.type === "resultado" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-semibold">
                              <FileText size={9} /> Resultado
                            </span>
                          ) : null
                        )}
                        {a.title && <p className="text-sm font-semibold text-slate-100">{a.title}</p>}
                      </div>
                      {(a.modelo || a.utilidade || a.bot_acessivel) && (
                        <div className="flex flex-wrap items-center gap-1 mb-1">
                          {a.modelo && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.06] text-slate-300 border border-white/[0.08]">{a.modelo}</span>}
                          {a.utilidade && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.06] text-slate-300 border border-white/[0.08]">{UTILIDADE_OPTIONS.find(o => o.value === a.utilidade)?.label ?? a.utilidade}</span>}
                          {a.bot_acessivel && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Melissa</span>}
                        </div>
                      )}
                      <p className={`${mono.className} text-[10px] text-slate-500`}>{new Date(a.created_at).toLocaleString("pt-BR")}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => toggleExpanded(a.id)} className="text-slate-400 hover:text-white transition-colors">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <button onClick={() => startEdit(a)} className="text-slate-400 hover:text-[#09a1e5] transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => remove(a.id, a.file_path)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-2">
                      {a.content_markdown && (
                        a.type === "resultado" ? (
                          <div className="text-xs text-slate-300 [&_a]:text-[#09a1e5] [&_a]:underline [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-1 [&_iframe]:w-full [&_iframe]:aspect-video [&_iframe]:rounded-lg [&_iframe]:my-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-semibold"
                            dangerouslySetInnerHTML={{ __html: a.content_markdown }} />
                        ) : (
                          <p className="text-xs text-slate-300 whitespace-pre-wrap">{a.content_markdown}</p>
                        )
                      )}
                      {a.file_path && a.url && (
                        /\.(png|jpe?g|gif|webp|svg|bmp|avif)(\?|$)/i.test(a.url) ? (
                          <div className="mt-2">
                            <img src={a.url} alt={a.title ?? "Evidência"} className="max-w-full max-h-64 rounded-lg border border-slate-700 object-contain" />
                            <a href={a.url} target="_blank" rel="noreferrer" className="text-[10px] text-slate-400 hover:text-[#09a1e5] flex items-center gap-1 mt-1">
                              <ExternalLink size={10} /> Abrir em tela cheia
                            </a>
                          </div>
                        ) : (
                          <a href={a.url} target="_blank" rel="noreferrer" className="text-xs text-emerald-400 hover:underline flex items-center gap-1 mt-1">
                            <Paperclip size={11} /> Abrir arquivo
                          </a>
                        )
                      )}
                      {a.url && !a.file_path && (
                        <a href={a.url} target="_blank" rel="noreferrer" className="text-xs text-[#09a1e5] hover:underline flex items-center gap-1 mt-1">
                          <ExternalLink size={11} /> {a.url}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );})}
          </div>
          ))}
        </div>
      )}

      <div className="space-y-2 pt-2 border-t border-slate-800">
        {/* Seletor resultado vs evidência */}
        {canPickType && (
          <div className="flex bg-slate-950/60 border border-slate-800 rounded-xl p-1 gap-1">
            {([
              ["resultado", "Resultado", FileText, "text-emerald-400", "bg-emerald-500/10 border-emerald-500/30"],
              ["evidencia", "Evidência", Paperclip, "text-[#09a1e5]", "bg-[#09a1e5]/10 border-[#09a1e5]/30"],
            ] as const).map(([v, label, Icon, activeText, activeBg]) => (
              <button key={v} type="button" onClick={() => setAddType(v)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${addType === v ? `${activeBg} ${activeText}` : "border-transparent text-slate-400 hover:text-slate-100"}`}>
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>
        )}
        <p className="text-[11px] text-slate-500 bg-white/[0.02] border border-white/[0.05] rounded-xl px-3 py-2">{meta.help}</p>
        {/* Tipo de entrada (texto / link / arquivo) */}
        <div className="flex bg-slate-900/60 border border-slate-800 rounded-xl p-1 gap-1">
          {([
            ["texto", "Texto", FileText],
            ["link", "Link", ExternalLink],
            ["arquivo", "Arquivo", Paperclip],
          ] as const).map(([v, label, Icon]) => (
            <button key={v} type="button" onClick={() => setKind(v)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${kind === v ? "bg-slate-800 text-white shadow-sm border border-slate-700" : "text-slate-400 hover:text-slate-100"}`}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        {meta.titlePlaceholder && (
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder={meta.titlePlaceholder}
            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-[#09a1e5]" />
        )}

        {kind === "link" && (
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://… (link, print, deploy, commit)"
            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-[#09a1e5]" />
        )}

        {kind === "arquivo" && (
          <label className="flex items-center gap-2 w-full bg-slate-900/60 border border-dashed border-slate-700 rounded-xl px-3 py-3 text-sm text-slate-300 cursor-pointer hover:border-[#09a1e5]/50 transition-colors">
            <Paperclip size={14} className="text-slate-400 shrink-0" />
            <span className="truncate">{file ? file.name : "Escolher arquivo…"}</span>
            <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </label>
        )}

        {addType === "resultado" && (
          <div className="flex flex-wrap items-center gap-2">
            <select value={modelo} onChange={e => setModelo(e.target.value)}
              className="bg-slate-900/60 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-white outline-none focus:border-[#09a1e5]">
              <option value="">Modelo (opcional)</option>
              <option value={MODELO_GERAL}>{MODELO_GERAL}</option>
              {BIKE_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={utilidade} onChange={e => setUtilidade(e.target.value as UtilidadeKey | "")}
              className="bg-slate-900/60 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-white outline-none focus:border-[#09a1e5]">
              <option value="">Utilidade (opcional)</option>
              {UTILIDADE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
              <input type="checkbox" checked={botAcessivel} onChange={e => setBotAcessivel(e.target.checked)} />
              Disponível para o bot Melissa
            </label>
          </div>
        )}

        {kind === "texto" && addType !== "resultado" && <MarkdownToolbar onInsert={insertMarkdown} />}
        <div className="relative">
          {kind === "texto" && addType === "resultado" ? (
            <>
              <RichTextEditor value={content} onChange={setContent} placeholder={meta.placeholder} showAiFix />
              <button type="button" title="Expandir" onClick={() => setFullscreenContent(true)}
                className="absolute top-1.5 right-1.5 text-slate-500 hover:text-white transition-colors bg-slate-900/80 rounded p-0.5">
                <Maximize2 size={13} />
              </button>
              {draftStatus === "saved" && (
                <p className="text-[10px] text-slate-500 mt-1">Rascunho salvo localmente</p>
              )}
            </>
          ) : (
            <>
              <textarea ref={textareaRef} value={content} onChange={e => setContent(e.target.value)} rows={4}
                placeholder={kind === "arquivo" || kind === "link" ? "Descrição (opcional)…" : meta.placeholder}
                className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 pr-8 text-sm text-white placeholder-slate-400 outline-none focus:border-[#09a1e5] resize-none font-mono" />
              <button type="button" title="Expandir" onClick={() => setFullscreenContent(true)}
                className="absolute top-2 right-2 text-slate-500 hover:text-white transition-colors">
                <Maximize2 size={13} />
              </button>
            </>
          )}
        </div>
        <AnimatePresence>
          {fullscreenContent && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8">
              <motion.div
                initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }}
                className="bg-slate-900 border border-slate-700 rounded-2xl w-full h-full max-w-4xl flex flex-col p-4 gap-2">
                <div className="flex items-center justify-end">
                  <button type="button" title="Minimizar" onClick={() => setFullscreenContent(false)}
                    className="text-slate-400 hover:text-white transition-colors">
                    <Minimize2 size={16} />
                  </button>
                </div>
                {kind === "texto" && addType === "resultado" ? (
                  <div className="flex-1 min-h-0">
                    <RichTextEditor value={content} onChange={setContent} placeholder={meta.placeholder} fullscreen showAiFix />
                  </div>
                ) : (
                  <textarea value={content} onChange={e => setContent(e.target.value)} autoFocus
                    className="flex-1 w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-[#09a1e5] resize-none font-mono" />
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {secretWarning && (
          <p className="text-[11px] text-amber-400 flex items-center gap-1.5">
            <ShieldAlert size={12} /> Evite salvar credenciais ou tokens aqui.
          </p>
        )}
        <button onClick={add} disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-white text-xs font-semibold transition-all disabled:opacity-40">
          <Plus size={13} /> {saving ? "Salvando…" : `Adicionar ${meta.label.toLowerCase()}`}
        </button>
      </div>
    </div>
  );
}

/** Inline-editable objective text (click pencil to edit, save on blur/Enter). */
function ObjectiveEditor({ value, placeholder, onSave, className }: {
  value: string;
  placeholder: string;
  onSave: (text: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== value.trim()) onSave(trimmed);
  };

  if (editing) {
    return (
      <textarea
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        placeholder={placeholder}
        rows={2}
        className={`w-full bg-slate-900/80 border border-[#09a1e5]/40 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-[#09a1e5] resize-none ${className ?? ""}`}
      />
    );
  }

  return (
    <button onClick={() => setEditing(true)}
      className={`group flex items-start gap-1.5 text-left w-full rounded-lg px-1 py-0.5 -mx-1 hover:bg-white/[0.04] transition-colors ${className ?? ""}`}>
      <span className={`text-xs flex-1 ${value ? "text-slate-300" : "text-slate-500 italic"}`}>
        {value || placeholder}
      </span>
      <Pencil size={11} className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
    </button>
  );
}

// ─── Audit Findings → Correction Tasks ─────────────────────────────────────

interface AuditFinding {
  titulo: string;
  descricao: string | null;
  prioridade: 1 | 2 | 3;
  urgencia: 1 | 2 | 3;
  impacto: 1 | 2 | 3;
  categoria: string;
  done_criteria: string | null;
  notas: string | null;
}

const PRIO_LABELS: Record<number, string> = { 1: "Baixa", 2: "Média", 3: "Alta" };

/** Strips HTML tags from the rich-text "resultado" content for the AI prompt. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function Loader2Spin() {
  return <RefreshCw size={13} className="animate-spin" />;
}

function AuditFindingsPanel({ task, onCreated }: { task: ExtendedTask; onCreated: (created: Task[]) => void }) {
  const [loadingText, setLoadingText] = useState(false);
  const [reportText, setReportText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [findings, setFindings] = useState<AuditFinding[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(0);

  async function loadResultadoText() {
    setLoadingText(true);
    setError(null);
    try {
      const artifacts = await getTaskArtifacts(task.id);
      const texts = artifacts
        .filter(a => (a.type === "resultado" || a.type === "evidencia") && a.content_markdown)
        .map(a => stripHtml(a.content_markdown!))
        .filter(Boolean);
      if (texts.length === 0) {
        setError("Nenhum resultado com texto encontrado. Registre o resultado da auditoria primeiro.");
        return;
      }
      setReportText(texts.join("\n\n---\n\n"));
    } catch {
      setError("Falha ao carregar o resultado da tarefa.");
    } finally {
      setLoadingText(false);
    }
  }

  async function parse() {
    if (!reportText.trim()) return;
    setParsing(true);
    setError(null);
    setFindings(null);
    try {
      // AI parse-audit-findings not wired yet — stub for future Azure OpenAI integration
      setError("AI audit parsing not available yet. Wire to Azure OpenAI in a future sprint.");
      return;
    } catch {
      setError("Falha na chamada à IA");
    } finally {
      setParsing(false);
    }
  }

  async function saveSelected() {
    if (!findings) return;
    setSaving(true);
    setDone(0);
    const toSave = findings.filter((_, i) => selected.has(i));
    const created: Task[] = [];
    try {
      for (const f of toSave) {
        const t = await createTask({
          titulo: f.titulo,
          descricao: f.descricao,
          prioridade: f.prioridade,
          urgencia: f.urgencia,
          impacto: f.impacto,
          responsavel: null,
          client_id: null,
          semana_alvo: null,
          data_foco: null,
          url_verificacao: null,
          notas: f.notas,
          categoria: f.categoria,
          projeto: null,
          objetivo_nome: `Correção: ${task.titulo}`,
          done_criteria: f.done_criteria,
          planning_bucket: "backlog",
          execution_status: "todo",
          parent_task_id: task.id,
          generated_from_audit: true,
        } as Omit<TaskInsert, "concluido_em">);
        created.push(t);
        setDone(d => d + 1);
      }
      onCreated(created);
      setFindings(null);
      setReportText("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-t border-slate-800/70 pt-4 mt-2 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldAlert size={14} className="text-amber-400 shrink-0" />
        <h4 className="text-sm font-bold text-white">Gerar tarefas de correção a partir do resultado</h4>
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">
        Se esta missão é uma auditoria/diagnóstico, use a IA para transformar os achados do resultado em tarefas de correção no backlog, vinculadas a esta missão.
      </p>

      {!findings && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button onClick={loadResultadoText} disabled={loadingText}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-900/60 hover:bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs font-bold transition-all disabled:opacity-40">
              {loadingText ? <Loader2Spin /> : <FileText size={13} />} Carregar resultado registrado
            </button>
          </div>
          <textarea value={reportText} onChange={e => setReportText(e.target.value)}
            rows={5} placeholder="Cole aqui o relatório/achados da auditoria, ou clique em “Carregar resultado registrado”…"
            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#09a1e5] resize-none" />
          <button onClick={parse} disabled={parsing || !reportText.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-300 font-bold text-xs transition-all disabled:opacity-40">
            {parsing ? <><Loader2Spin /> Analisando achados…</> : <><Sparkles size={13} /> Gerar tarefas de correção</>}
          </button>
        </div>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {findings && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-200">{findings.length} achados → tarefas de correção</p>
            <div className="flex gap-2 text-[11px]">
              <button onClick={() => setSelected(new Set(findings.map((_, i) => i)))}
                className="text-amber-400 hover:text-amber-300 transition-colors">Todas</button>
              <button onClick={() => setSelected(new Set())}
                className="text-slate-500 hover:text-slate-400 transition-colors">Nenhuma</button>
              <button onClick={() => { setFindings(null); }}
                className="text-slate-500 hover:text-slate-400 transition-colors">Cancelar</button>
            </div>
          </div>

          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {findings.map((f, i) => (
              <div key={i} onClick={() => setSelected(prev => {
                  const s = new Set(prev);
                  s.has(i) ? s.delete(i) : s.add(i);
                  return s;
                })}
                className={`cursor-pointer rounded-xl border px-3 py-2 transition-all ${
                  selected.has(i) ? "border-amber-500/30 bg-amber-500/5" : "border-slate-800 bg-transparent opacity-50"
                }`}>
                <div className="flex items-start gap-2">
                  {selected.has(i)
                    ? <CheckCircle2 size={14} className="text-amber-400 mt-0.5 shrink-0" />
                    : <div className="w-3.5 h-3.5 rounded-full border border-slate-600 mt-0.5 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white">{f.titulo}</p>
                    {f.descricao && <p className="text-[11px] text-slate-400 mt-0.5">{f.descricao}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-slate-700 bg-slate-900/60 text-slate-400">{f.categoria}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                        f.prioridade === 3 ? "border-red-500/30 text-red-400" : f.prioridade === 2 ? "border-amber-500/30 text-amber-400" : "border-slate-700 text-slate-400"
                      }`}>P{f.prioridade} {PRIO_LABELS[f.prioridade]}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={saveSelected} disabled={saving || selected.size === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 font-bold text-xs transition-all disabled:opacity-40">
            {saving
              ? <><Loader2Spin /> Criando {done}/{selected.size}…</>
              : <><Plus size={13} /> Criar {selected.size} tarefa{selected.size !== 1 ? "s" : ""} de correção no backlog</>}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Reorganize generated correction tasks across sprints ──────────────────

function ChildTasksSprintSplitter({ task, allTasks, onTaskUpdated }: {
  task: ExtendedTask;
  allTasks: Task[];
  onTaskUpdated: (id: string, patch: Partial<Task>) => void;
}) {
  const [children, setChildren] = useState<Task[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSprint, setBulkSprint] = useState("");
  const [bulkNewLabel, setBulkNewLabel] = useState("");
  const [rowNewLabelFor, setRowNewLabelFor] = useState<string | null>(null);
  const [rowNewLabel, setRowNewLabel] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createAdminClient();
    supabase.from("tasks").select("*").eq("parent_task_id", task.id).order("created_at", { ascending: true })
      .then(({ data }) => { if (active) setChildren((data ?? []) as Task[]); });
    return () => { active = false; };
  }, [task.id]);

  // Sprint labels already in use across the board, e.g. "Sprint 2 — Conversão e Test Drive".
  const sprintLabels = useMemo(() => {
    const byNum = new Map<string, string>();
    for (const t of allTasks) {
      const prefix = (t.projeto ?? "").split(" / ")[0]?.trim() ?? "";
      const m = /^sprint\s*(\d+)/i.exec(prefix);
      if (m && !byNum.has(m[1])) byNum.set(m[1], prefix);
    }
    return Array.from(byNum.entries()).sort((a, b) => Number(a[0]) - Number(b[0])).map(([, label]) => label);
  }, [allTasks]);

  // Suggest the next sprint number based on the highest one currently in use.
  const nextSprintSuggestion = useMemo(() => {
    let max = 0;
    for (const label of sprintLabels) {
      const m = /^sprint\s*(\d+)/i.exec(label);
      if (m) max = Math.max(max, Number(m[1]));
    }
    return `Sprint ${max + 1} — `;
  }, [sprintLabels]);

  if (!children || children.length === 0) return null;

  function sprintLabelOf(t: Task): string {
    return (t.projeto ?? "").split(" / ")[0]?.trim() ?? "—";
  }
  function frenteOf(t: Task): string | null {
    const parts = (t.projeto ?? "").split(" / ");
    return parts.length > 1 ? parts[1]?.trim() ?? null : null;
  }

  async function moveTo(ids: string[], sprintLabel: string) {
    setSaving(true);
    try {
      for (const id of ids) {
        const child = children!.find(c => c.id === id);
        if (!child) continue;
        const frente = frenteOf(child);
        const projeto = frente ? `${sprintLabel} / ${frente}` : sprintLabel;
        const patch = { projeto, sprint_nome: sprintLabel };
        await updateTask(id, patch);
        onTaskUpdated(id, patch);
        setChildren(prev => prev?.map(c => c.id === id ? { ...c, ...patch } : c) ?? null);
      }
      setSelected(new Set());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-t border-slate-800/70 pt-4 mt-2 space-y-3">
      <div className="flex items-center gap-2">
        <GitBranch size={14} className="text-violet-400 shrink-0" />
        <h4 className="text-sm font-bold text-white">Reorganizar tarefas geradas em sprints</h4>
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">
        {children.length} tarefa{children.length !== 1 ? "s" : ""} de correção geradas a partir desta missão. Selecione e mova para a sprint correta — hoje todas estão como &quot;{sprintLabelOf(children[0])}&quot;.
      </p>

      <div className="flex items-center gap-2">
        <button onClick={() => setSelected(new Set(selected.size === children!.length ? [] : children!.map(c => c.id)))}
          className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors">
          {selected.size === children.length ? "Desmarcar todas" : "Selecionar todas"}
        </button>
        <select value={bulkSprint} onChange={e => {
            setBulkSprint(e.target.value);
            if (e.target.value === "__new__" && !bulkNewLabel) setBulkNewLabel(nextSprintSuggestion);
          }}
          className="bg-slate-900/60 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white outline-none focus:border-[#09a1e5]">
          <option value="">Mover para…</option>
          {sprintLabels.map(label => <option key={label} value={label}>{label}</option>)}
          <option value="__new__">+ Nova sprint…</option>
        </select>
        {bulkSprint === "__new__" && (
          <input value={bulkNewLabel} onChange={e => setBulkNewLabel(e.target.value)}
            placeholder="Sprint N — Nome"
            className="bg-slate-900/60 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white outline-none focus:border-[#09a1e5] w-48" />
        )}
        <button onClick={() => {
            const label = bulkSprint === "__new__" ? bulkNewLabel.trim() : bulkSprint;
            if (label && selected.size > 0) moveTo(Array.from(selected), label);
          }}
          disabled={saving || !bulkSprint || (bulkSprint === "__new__" && !bulkNewLabel.trim()) || selected.size === 0}
          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 transition-all disabled:opacity-40">
          Aplicar a {selected.size} selecionada{selected.size !== 1 ? "s" : ""}
        </button>
      </div>

      <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
        {children.map(c => (
          <div key={c.id} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-2.5 py-1.5">
            <input type="checkbox" checked={selected.has(c.id)} onChange={() => setSelected(prev => {
                const s = new Set(prev);
                s.has(c.id) ? s.delete(c.id) : s.add(c.id);
                return s;
              })}
              className="shrink-0 accent-violet-500" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-200 truncate">{c.titulo}</p>
            </div>
            {rowNewLabelFor === c.id ? (
              <div className="shrink-0 flex items-center gap-1">
                <input value={rowNewLabel} onChange={e => setRowNewLabel(e.target.value)} autoFocus
                  placeholder="Sprint N — Nome"
                  className="bg-slate-900/60 border border-slate-800 rounded-lg px-1.5 py-0.5 text-[10px] text-white outline-none focus:border-[#09a1e5] w-40" />
                <button disabled={saving || !rowNewLabel.trim()}
                  onClick={() => { const l = rowNewLabel.trim(); if (l) { moveTo([c.id], l); setRowNewLabelFor(null); setRowNewLabel(""); } }}
                  className="text-[10px] font-bold text-violet-300 hover:text-violet-200 disabled:opacity-40">OK</button>
                <button onClick={() => { setRowNewLabelFor(null); setRowNewLabel(""); }}
                  className="text-[10px] text-slate-500 hover:text-slate-300">✕</button>
              </div>
            ) : (
              <select value={sprintLabelOf(c)} disabled={saving}
                onChange={e => {
                  if (e.target.value === "__new__") { setRowNewLabelFor(c.id); setRowNewLabel(nextSprintSuggestion); return; }
                  moveTo([c.id], e.target.value);
                }}
                className="shrink-0 bg-slate-900/60 border border-slate-800 rounded-lg px-1.5 py-0.5 text-[10px] text-slate-300 outline-none focus:border-[#09a1e5] max-w-[160px]">
                {!sprintLabels.includes(sprintLabelOf(c)) && <option value={sprintLabelOf(c)}>{sprintLabelOf(c)}</option>}
                {sprintLabels.map(label => <option key={label} value={label}>{label}</option>)}
                <option value="__new__">+ Nova sprint…</option>
              </select>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Lets the user promote a standalone task into the seed of a new sprint, then add more tasks to it inline. */
function PromoteToSprintPanel({ task, allTasks, onTaskUpdated, onTaskCreated, onProjetoChange }: {
  task: Task;
  allTasks: Task[];
  onTaskUpdated: (id: string, patch: Partial<Task>) => void;
  onTaskCreated: (created: Task) => void;
  onProjetoChange: (projeto: string) => void;
}) {
  const sprintLabels = useMemo(() => {
    const byNum = new Map<string, string>();
    for (const t of allTasks) {
      const prefix = (t.projeto ?? "").split(" / ")[0]?.trim() ?? "";
      const m = /^sprint\s*(\d+)/i.exec(prefix);
      if (m && !byNum.has(m[1])) byNum.set(m[1], prefix);
    }
    return Array.from(byNum.entries()).sort((a, b) => Number(a[0]) - Number(b[0])).map(([, label]) => label);
  }, [allTasks]);

  const nextSprintSuggestion = useMemo(() => {
    let max = 0;
    for (const label of sprintLabels) {
      const m = /^sprint\s*(\d+)/i.exec(label);
      if (m) max = Math.max(max, Number(m[1]));
    }
    return `Sprint ${max + 1} — `;
  }, [sprintLabels]);

  const currentLabel = (task.projeto ?? "").split(" / ")[0]?.trim() ?? "";
  const isSprint = /^sprint\s*\d+/i.test(currentLabel);

  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(nextSprintSuggestion);
  const [frente, setFrente] = useState(task.titulo);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  if (isSprint) return null;

  async function promote() {
    const lbl = label.trim();
    const frenteName = frente.trim();
    if (!lbl) return;
    setSaving(true);
    setSaveError(null);
    try {
      const projeto = frenteName ? `${lbl} / ${frenteName}` : lbl;
      const patch = { projeto, sprint_nome: lbl };
      await updateTask(task.id, patch);
      onTaskUpdated(task.id, patch);
      onProjetoChange(projeto);
      setOpen(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function addTask() {
    const titulo = newTitle.trim();
    if (!titulo) return;
    setAdding(true);
    try {
      const lbl = label.trim();
      const frenteName = frente.trim();
      const projeto = frenteName ? `${lbl} / ${frenteName}` : lbl;
      const created = await createTask({
        titulo, descricao: null, prioridade: 2, urgencia: 2, responsavel: null, client_id: null,
        semana_alvo: null, url_verificacao: null, notas: null, categoria: task.categoria, data_foco: null,
        projeto, impacto: 2, done_criteria: null,
        planning_bucket: "backlog", execution_status: "todo",
      });
      onTaskCreated(created);
      setNewTitle("");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="border-t border-slate-800/70 pt-4 mt-2 space-y-3">
      {!open ? (
        <button onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-[11px] font-semibold text-violet-300 hover:text-violet-200 transition-colors">
          <Rocket size={14} /> Transformar em sprint…
        </button>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Rocket size={14} className="text-violet-400 shrink-0" />
            <h4 className="text-sm font-bold text-white">Transformar em sprint</h4>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1.5">Sprint</label>
              <input value={label} onChange={e => setLabel(e.target.value)}
                placeholder="Sprint N — Nome"
                className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#09a1e5]" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1.5">Frente</label>
              <input value={frente} onChange={e => setFrente(e.target.value)}
                placeholder="Nome da frente"
                className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#09a1e5]" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={promote} disabled={saving || !label.trim()}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 transition-all disabled:opacity-40">
              {saving ? "Salvando…" : "Confirmar sprint"}
            </button>
            {saveError && <p className="text-[11px] text-red-400">{saveError}</p>}
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1.5">Adicionar outra tarefa a esta sprint</label>
            <div className="flex gap-2">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addTask(); }}
                placeholder="Título da tarefa"
                className="flex-1 bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-[#09a1e5]" />
              <button onClick={addTask} disabled={adding || !newTitle.trim()}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-[#09a1e5]/10 hover:bg-[#09a1e5]/20 border border-[#09a1e5]/30 text-[#09a1e5] transition-all disabled:opacity-40">
                {adding ? "…" : "+ Adicionar"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EditModal({ task, onClose, onSave, onMove, onChildTasksCreated, onTaskUpdated, allTasks, initialTab, forceResultPrompt, onCompleteWithoutResult }: {
  task: ExtendedTask;
  onClose: () => void;
  onSave: (id: string, patch: Partial<Task>) => void;
  onMove: (id: string, col: ColumnId) => void;
  onChildTasksCreated: (created: Task[]) => void;
  onTaskUpdated: (id: string, patch: Partial<Task>) => void;
  allTasks: Task[];
  initialTab?: "missao" | "tarefas" | "resultado";
  forceResultPrompt?: boolean;
  onCompleteWithoutResult?: () => void;
}) {
  const [draft, setDraft] = useState({
    titulo:          task.titulo,
    descricao:       task.descricao ?? "",
    prioridade:      task.prioridade,
    urgencia:        task.urgencia,
    responsavel:     task.responsavel ?? "",
    semana_alvo:     task.semana_alvo ?? "",
    data_foco:       task.data_foco ?? "",
    url_verificacao: task.url_verificacao ?? "",
    notas:           task.notas ?? "",
    categoria:       task.categoria ?? "",
    projeto:         task.projeto ?? "",
    impacto:         task.impacto ?? 2,
    done_criteria:   task.done_criteria ?? "",
  });
  const [coluna, setColuna] = useState<ColumnId>(getColumnId(task));
  const [saving, setSaving] = useState(false);
  const isSprintTask = !!(task.sprint_nome || /^sprint\s*\d+/i.test((task.projeto ?? "").split(" / ")[0]?.trim() ?? ""));
  const [tab, setTab] = useState<"missao" | "tarefas" | "resultado">(initialTab ?? "missao");

  async function save() {
    setSaving(true);
    if (coluna !== getColumnId(task)) onMove(task.id, coluna);
    await onSave(task.id, {
      ...draft,
      descricao:        draft.descricao || null,
      responsavel:      draft.responsavel || null,
      semana_alvo:      draft.semana_alvo || null,
      data_foco:        draft.data_foco || null,
      url_verificacao:  draft.url_verificacao || null,
      notas:            draft.notas || null,
      categoria:        draft.categoria || null,
      projeto:          draft.projeto || null,
      impacto:          draft.impacto,
      done_criteria:    draft.done_criteria || null,
    } as Partial<Task>);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#111A2E] border border-slate-800/70 rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-white">Editar tarefa</h3>
            <p className="text-sm font-semibold text-slate-200 truncate mt-0.5">{draft.titulo || "Sem título"}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors shrink-0"><X size={16} /></button>
        </div>

        {forceResultPrompt && (
          <div className="flex items-start justify-between gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2.5">
            <div>
              <p className="text-xs font-semibold text-emerald-300">Adicione o resultado na aba abaixo</p>
              <p className="text-[10px] text-emerald-400/70 mt-0.5">Ao fechar o modal após registrar, a tarefa será concluída automaticamente.</p>
            </div>
            <button onClick={onCompleteWithoutResult}
              className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors whitespace-nowrap">
              Concluir sem resultado
            </button>
          </div>
        )}

        <div className="flex bg-slate-900/60 border border-slate-800 rounded-xl p-1 gap-1">
          {(isSprintTask
            ? [["missao", "Missão"], ["tarefas", "Tarefas"], ["resultado", "Resultado"]]
            : [["missao", "Missão"], ["resultado", "Resultado"]]
          ).map(([v, label]) => (
            <button key={v} onClick={() => setTab(v as "missao" | "tarefas" | "resultado")}
              className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${tab === v ? "bg-slate-800 text-white shadow-sm border border-slate-700" : "text-slate-400 hover:text-slate-100"}`}>
              {label}
            </button>
          ))}
        </div>
        {tab === "missao" && (
          <p className="text-[11px] text-slate-400 -mt-1">
            <span className="text-slate-200 font-semibold">Missão</span> é o que precisa ser feito. Depois de feito, registre o
            {" "}<span className="text-slate-200 font-semibold">Resultado</span> — prova de que foi feito e funciona.
          </p>
        )}

        {tab === "tarefas" ? (
          <ChildTasksSprintSplitter task={task} allTasks={allTasks} onTaskUpdated={onTaskUpdated} />
        ) : tab === "resultado" ? (
          <>
          <ArtifactsPanel taskId={task.id} type="resultado" types={["resultado", "artifact", "evidencia"]} />
          <AuditFindingsPanel task={task} onCreated={onChildTasksCreated} />
          {!isSprintTask && <ChildTasksSprintSplitter task={task} allTasks={allTasks} onTaskUpdated={onTaskUpdated} />}
          </>
        ) : (
        <>
        <input value={draft.titulo} onChange={e => setDraft(d => ({ ...d, titulo: e.target.value }))}
          placeholder="Título"
          className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-400 outline-none focus:border-[#09a1e5]" />

        <textarea value={draft.descricao} onChange={e => setDraft(d => ({ ...d, descricao: e.target.value }))}
          rows={2} placeholder="Descrição (opcional)"
          className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-400 outline-none focus:border-[#09a1e5] resize-none" />

        {/* Área / Coluna */}
        <div>
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1.5">Área</label>
          <div className="flex flex-wrap gap-1.5">
            {COLUMNS.map(c => (
              <button key={c.id} onClick={() => setColuna(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${coluna === c.id ? `${c.bg} ${c.border} ${c.color}` : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200"}`}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Área de trabalho */}
        <div>
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1.5">Área de trabalho</label>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(FRONTES) as FronteKey[]).map(k => (
              <button key={k} onClick={() => setDraft(d => ({ ...d, categoria: d.categoria === k ? "" : k }))}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${draft.categoria === k ? "bg-[#09a1e5]/10 border-[#09a1e5]/40 text-[#09a1e5]" : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200"}`}>
                {CATEGORIA_ICONS[k]} {FRONTES[k].name}
              </button>
            ))}
          </div>
        </div>

        {/* Projeto / Sprint */}
        <div>
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1.5">Sprint / Projeto</label>
          <input value={draft.projeto} onChange={e => setDraft(d => ({ ...d, projeto: e.target.value }))}
            placeholder="Sprint 3 — Desenvolvimento"
            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-400 outline-none focus:border-[#09a1e5]" />
          <p className="text-[10px] text-slate-600 mt-1">Formato "Sprint N — Frente" para aparecer no Mapa do mês.</p>
        </div>

        {/* Prioridade + Urgência + Impacto */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1.5">Prioridade</label>
            <div className="flex gap-1">
              {([1,2,3] as const).map(v => (
                <button key={v} onClick={() => setDraft(d => ({ ...d, prioridade: v }))}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all ${draft.prioridade === v ? "bg-[#09a1e5]/10 border-[#09a1e5]/40 text-[#09a1e5]" : "bg-slate-900/40 border-slate-800 text-slate-400"}`}>
                  P{v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1.5">Urgência</label>
            <div className="flex gap-1">
              {([1,2,3] as const).map(v => (
                <button key={v} onClick={() => setDraft(d => ({ ...d, urgencia: v }))}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all ${draft.urgencia === v ? "bg-[#09a1e5]/10 border-[#09a1e5]/40 text-[#09a1e5]" : "bg-slate-900/40 border-slate-800 text-slate-400"}`}>
                  U{v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1.5">Impacto</label>
            <div className="flex gap-1">
              {([1,2,3] as const).map(v => (
                <button key={v} onClick={() => setDraft(d => ({ ...d, impacto: v }))}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all ${draft.impacto === v ? "bg-[#09a1e5]/10 border-[#09a1e5]/40 text-[#09a1e5]" : "bg-slate-900/40 border-slate-800 text-slate-400"}`}>
                  {IMPACTO_LABELS[v][0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Critério de pronto */}
        <div>
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1.5">Critério de pronto</label>
          <textarea value={draft.done_criteria} onChange={e => setDraft(d => ({ ...d, done_criteria: e.target.value }))}
            rows={2} placeholder="Como saber que essa tarefa está realmente concluída?"
            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-400 outline-none focus:border-[#09a1e5] resize-none" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1.5">📅 Data de foco</label>
            <input type="date" value={draft.data_foco} onChange={e => setDraft(d => ({ ...d, data_foco: e.target.value }))}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#09a1e5]" />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {PRAZO_PRESETS.map(n => (
                <button key={n} type="button" onClick={() => setDraft(d => ({ ...d, data_foco: plusDaysStr(n) }))}
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-[#09a1e5] hover:border-[#09a1e5]/40 transition-all">
                  +{n}d
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1.5">Responsável</label>
            <input value={draft.responsavel} onChange={e => setDraft(d => ({ ...d, responsavel: e.target.value }))}
              placeholder="Nome"
              className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-400 outline-none focus:border-[#09a1e5]" />
          </div>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1.5">URL de verificação</label>
          <input value={draft.url_verificacao} onChange={e => setDraft(d => ({ ...d, url_verificacao: e.target.value }))}
            placeholder="https://…"
            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-400 outline-none focus:border-[#09a1e5]" />
        </div>

        <textarea value={draft.notas} onChange={e => setDraft(d => ({ ...d, notas: e.target.value }))}
          rows={2} placeholder="Notas internas… (motivo do bloqueio, etc.)"
          className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-400 outline-none focus:border-[#09a1e5] resize-none" />

        <button onClick={save} disabled={saving || !draft.titulo.trim()}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#09a1e5] hover:bg-[#0891d5] rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-40">
          <Save size={14} /> {saving ? "Salvando…" : "Salvar"}
        </button>

        <PromoteToSprintPanel task={task} allTasks={allTasks} onTaskUpdated={onTaskUpdated}
          onTaskCreated={created => onChildTasksCreated([created])}
          onProjetoChange={projeto => setDraft(d => ({ ...d, projeto }))} />
        </>
        )}
      </div>
    </div>
  );
}

// ─── Artifact badges (Resultado / Artifacts / Evidências counts per task) ──────

type ArtifactCounts = Record<string, Record<ArtifactType, number>>;
const ArtifactCountsContext = React.createContext<ArtifactCounts>({});

function ArtifactBadges({ taskId }: { taskId: string }) {
  const counts = React.useContext(ArtifactCountsContext)[taskId];
  if (!counts) return null;
  return (
    <>
      {counts.resultado > 0 && (
        <span title="Tem resultado" className="text-[10px] text-emerald-400 flex items-center gap-0.5 shrink-0"><FileText size={10} /></span>
      )}
      {counts.artifact > 0 && (
        <span title={`${counts.artifact} artifact(s)`} className="text-[10px] text-violet-300 flex items-center gap-0.5 shrink-0"><Paperclip size={10} />{counts.artifact}</span>
      )}
      {counts.evidencia > 0 && (
        <span title="Com evidência" className="text-[10px] text-amber-400 flex items-center gap-0.5 shrink-0"><CheckCircle2 size={10} /></span>
      )}
    </>
  );
}

// ─── Task Row (used in dashboard lists) ────────────────────────────────────────

// ─── Undo Toast ─────────────────────────────────────────────────────────────
function UndoToast({ undo, onUndo, onDismiss }: {
  undo: { id: string; message: string } | null;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(onDismiss, 7000);
    return () => clearTimeout(t);
  }, [undo, onDismiss]);

  return (
    <AnimatePresence>
      {undo && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-700 bg-[#111A2E] shadow-2xl"
        >
          <span className="text-xs font-medium text-slate-200">{undo.message}</span>
          <button
            onClick={() => onUndo()}
            className="flex items-center gap-1 text-xs font-bold text-[#09a1e5] hover:text-[#3bb6ed] transition-colors"
          >
            <RotateCcw size={12} /> Desfazer
          </button>
          <button onClick={onDismiss} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={12} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TaskRow({ task, onEdit, onMove, onSave, draggable, completing, onComplete, onCancel, onPostpone, className }: {
  task: ExtendedTask;
  onEdit: (task: ExtendedTask) => void;
  onMove: (id: string, col: ColumnId) => void;
  onSave?: (id: string, patch: Partial<Task>) => void;
  className?: string;
  draggable?: boolean;
  completing?: boolean;
  onComplete?: (id: string) => void;
  onCancel?: (id: string) => void;
  onPostpone?: (id: string) => void;
}) {
  const colId = getColumnId(task);
  const cfg = COLUMN_META[colId];
  const isDone = colId === "done";
  const isTrash = colId === "trash";

  const sortable = useSortable({ id: task.id, disabled: !draggable });
  const style = draggable
    ? { transform: CSS.Translate.toString(sortable.transform), transition: sortable.transition, opacity: sortable.isDragging ? 0.4 : 1 }
    : undefined;

  return (
    <motion.div ref={draggable ? sortable.setNodeRef : undefined} style={style}
      layout
      initial={false}
      animate={completing ? { opacity: 0, scale: 0.92 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: "easeInOut" }}
      className={`group flex items-center gap-3 px-4 py-3 bg-[#111A2E] border rounded-xl shadow-sm transition-all ${
        completing ? "border-emerald-500/40 bg-emerald-500/5" : className || "border-slate-800/70 hover:border-[#09a1e5]/30"
      } ${isDone ? "opacity-60" : ""}`}>
      {draggable && (
        <button {...sortable.attributes} {...sortable.listeners} className="text-slate-300 hover:text-slate-400 cursor-grab active:cursor-grabbing touch-none shrink-0">
          <GripVertical size={13} />
        </button>
      )}
      <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />

      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(task)}>
        <p className={`text-sm font-medium truncate ${isDone ? "line-through text-slate-400" : "text-slate-100"}`}>{task.titulo}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {task.categoria && <span className="text-[10px] text-slate-400">{CATEGORIA_ICONS[task.categoria] ?? "📌"} {task.categoria}</span>}
          {task.projeto && <p className="text-[10px] text-slate-400 truncate">📁 {task.projeto}</p>}
          {task.data_foco && (
            <p className="text-[10px] text-[#09a1e5] flex items-center gap-1 shrink-0">
              <Calendar size={9} />
              {new Date(task.data_foco + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
            </p>
          )}
          {(() => {
            const due = getEstimatedDueDate(task);
            return due ? (
              <p className="text-[10px] text-amber-400 flex items-center gap-1 shrink-0">
                <Clock size={9} />
                Prazo: {due.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
              </p>
            ) : null;
          })()}
          <ArtifactBadges taskId={task.id} />
        </div>
      </div>

      <span className={`hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${cfg.bg} ${cfg.border} ${cfg.color}`}>
        {cfg.icon} {cfg.label}
      </span>

      {task.url_verificacao && (
        <a href={task.url_verificacao} target="_blank" rel="noreferrer"
          onClick={e => e.stopPropagation()}
          className="shrink-0 text-slate-400 hover:text-[#09a1e5] transition-colors">
          <ExternalLink size={13} />
        </a>
      )}

      {!isDone && !isTrash && (
        <div className={`hidden sm:flex items-center gap-1 shrink-0 transition-opacity ${completing ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
          {onSave && (
            <button onClick={e => { e.stopPropagation(); if (onPostpone) onPostpone(task.id); else onSave(task.id, { data_foco: tomorrowStr() }); }}
              title="Adiar para amanhã"
              disabled={completing}
              className="p-1 text-slate-400 hover:text-amber-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <Clock size={13} />
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); if (onCancel) onCancel(task.id); else onMove(task.id, "trash"); }}
            title="Cancelar tarefa"
            disabled={completing}
            className="p-1 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <Ban size={13} />
          </button>
          <button onClick={e => { e.stopPropagation(); if (completing) return; if (onComplete) onComplete(task.id); else onMove(task.id, "done"); }}
            title="Concluir tarefa"
            disabled={completing}
            className="p-1 text-slate-400 hover:text-emerald-600 transition-colors disabled:cursor-not-allowed">
            <AnimatePresence mode="wait" initial={false}>
              {completing ? (
                <motion.span key="check" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1.3, opacity: 1 }} transition={{ duration: 0.3, ease: "easeOut" }} className="block text-emerald-500">
                  <CheckCircle2 size={13} />
                </motion.span>
              ) : (
                <motion.span key="idle" initial={{ scale: 1, opacity: 1 }} animate={{ scale: 1, opacity: 1 }} className="block">
                  <CheckCircle2 size={13} />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      )}

      <MoveMenu current={colId} onMove={col => onMove(task.id, col)} />
    </motion.div>
  );
}

// ─── Kanban Card ────────────────────────────────────────────────────────────────

function KanbanCard({ task, onEdit, onMove }: {
  task: ExtendedTask;
  onEdit: (task: ExtendedTask) => void;
  onMove: (id: string, col: ColumnId) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const colId = getColumnId(task);

  return (
    <div ref={setNodeRef} style={style}
      className="group bg-[#111A2E] border border-slate-800/70 rounded-xl shadow-sm p-3 space-y-2 hover:border-[#09a1e5]/30 transition-colors">
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="text-slate-300 hover:text-slate-400 cursor-grab active:cursor-grabbing mt-0.5 touch-none shrink-0">
          <GripVertical size={13} />
        </button>
        <p className="flex-1 text-sm font-medium text-slate-100 cursor-pointer leading-snug" onClick={() => onEdit(task)}>
          {task.titulo}
        </p>
        <MoveMenu current={colId} onMove={col => onMove(task.id, col)} />
      </div>
      <div className="flex items-center gap-1.5 flex-wrap pl-5">
        {task.categoria && (
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400">
            {CATEGORIA_ICONS[task.categoria] ?? "📌"} {task.categoria.split("/")[0]}
          </span>
        )}
        {task.impacto === 3 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-600 border border-red-500/30">Alto impacto</span>}
        {task.data_foco && (
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 flex items-center gap-1">
            <Calendar size={8} /> {new Date(task.data_foco + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
          </span>
        )}
        {task.url_verificacao && (
          <a href={task.url_verificacao} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
            className="text-slate-400 hover:text-[#09a1e5] transition-colors">
            <ExternalLink size={11} />
          </a>
        )}
        {colId === "trash" && (
          <button onClick={() => onMove(task.id, "backlog")} title="Restaurar"
            className="ml-auto text-slate-400 hover:text-emerald-600 transition-colors flex items-center gap-1 text-[9px] font-bold">
            <RotateCcw size={11} /> Restaurar
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Kanban Column ──────────────────────────────────────────────────────────────

function KanbanColumn({ column, tasks: colTasks, onEdit, onMove, onQuickAdd }: {
  column: typeof COLUMNS[number];
  tasks: ExtendedTask[];
  onEdit: (task: ExtendedTask) => void;
  onMove: (id: string, col: ColumnId) => void;
  onQuickAdd: (col: ColumnId, titulo: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [adding, setAdding] = useState("");

  return (
    <div className="flex flex-col min-w-[260px] w-[260px] shrink-0">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border mb-2 ${column.bg} ${column.border}`}>
        <span>{column.icon}</span>
        <span className={`text-xs font-bold ${column.color}`}>{column.label}</span>
        <span className={`${mono.className} ml-auto text-[10px] text-slate-400`}>{colTasks.length}</span>
      </div>

      <div ref={setNodeRef}
        className={`flex-1 space-y-2 rounded-xl p-1.5 min-h-[80px] transition-colors ${isOver ? "bg-[#09a1e5]/5 ring-2 ring-[#09a1e5]/30" : ""}`}>
        <SortableContext items={colTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {colTasks.map(t => <KanbanCard key={t.id} task={t} onEdit={onEdit} onMove={onMove} />)}
        </SortableContext>
        {colTasks.length === 0 && (
          <p className="text-center text-slate-300 text-[11px] py-4">Solte aqui</p>
        )}
      </div>

      {column.id !== "trash" && (
        <form onSubmit={e => { e.preventDefault(); if (adding.trim()) { onQuickAdd(column.id, adding.trim()); setAdding(""); } }}
          className="mt-2">
          <input value={adding} onChange={e => setAdding(e.target.value)} placeholder="+ adicionar tarefa…"
            className="w-full bg-[#111A2E] border border-slate-800/70 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-400 outline-none focus:border-[#09a1e5]" />
        </form>
      )}
    </div>
  );
}

// ─── Category Section (Por Área view) ──────────────────────────────────────────

function CategorySection({ categoria, tasks, onEdit, onMove, onSave, draggable }: {
  categoria: string;
  tasks: ExtendedTask[];
  onEdit: (task: ExtendedTask) => void;
  onMove: (id: string, col: ColumnId) => void;
  onSave?: (id: string, patch: Partial<Task>) => void;
  draggable?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const total = tasks.length;
  const done = tasks.filter(t => t.execution_status === "done").length;
  const inProgress = tasks.filter(t => ["doing", "review"].includes(t.execution_status)).length;
  const blocked = tasks.filter(t => t.execution_status === "blocked").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const barColor = pct >= 80 ? "bg-emerald-500/100" : pct >= 50 ? "bg-amber-500/100" : "bg-blue-500/100";
  const icon = CATEGORIA_ICONS[categoria] ?? "📌";

  return (
    <div className={`${cc.panel} overflow-hidden`}>
      <button className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-800/60 transition-colors" onClick={() => setOpen(o => !o)}>
        <span className="text-lg">{icon}</span>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-semibold text-slate-100">{categoria}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden max-w-[120px]">
              <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`${mono.className} text-[10px] text-slate-400`}>{done}/{total} · {pct}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {blocked > 0 && <span className="text-[10px] font-bold text-red-600 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full">{blocked} bloqueada{blocked > 1 ? "s" : ""}</span>}
          {inProgress > 0 && <span className="text-[10px] font-bold text-blue-300 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded-full">{inProgress} ativo{inProgress > 1 ? "s" : ""}</span>}
          {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-slate-800 pt-3">
          {draggable ? (
            <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
              {tasks.map(t => <TaskRow key={t.id} task={t} onEdit={onEdit} onMove={onMove} onSave={onSave} draggable />)}
            </SortableContext>
          ) : (
            tasks.map(t => <TaskRow key={t.id} task={t} onEdit={onEdit} onMove={onMove} onSave={onSave} />)
          )}
        </div>
      )}
    </div>
  );
}

// ─── Objetivo Section (Sprint view — one objective + its active sprint) ────────

function ObjetivoSection({ objetivo, sprintNome, desiredOutcome, tasks, objective, onSaveObjective, onEdit, onMove, onSave, defaultOpen, allTasks }: {
  objetivo: string;
  sprintNome: string;
  desiredOutcome?: string;
  tasks: ExtendedTask[];
  objective: string;
  onSaveObjective: (text: string) => void;
  onEdit: (task: ExtendedTask) => void;
  onMove: (id: string, col: ColumnId) => void;
  onSave: (id: string, patch: Partial<Task>) => void;
  defaultOpen: boolean;
  allTasks: Task[];
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [moving, setMoving] = useState(false);
  const [targetSprint, setTargetSprint] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const sprintLabels = useMemo(() => {
    const byNum = new Map<string, string>();
    for (const t of allTasks) {
      const prefix = (t.projeto ?? "").split(" / ")[0]?.trim() ?? "";
      const m = /^sprint\s*(\d+)/i.exec(prefix);
      if (m && !byNum.has(m[1])) byNum.set(m[1], prefix);
    }
    return Array.from(byNum.entries()).sort((a, b) => Number(a[0]) - Number(b[0])).map(([, label]) => label);
  }, [allTasks]);

  const nextSprintSuggestion = useMemo(() => {
    let max = 0;
    for (const label of sprintLabels) {
      const m = /^sprint\s*(\d+)/i.exec(label);
      if (m) max = Math.max(max, Number(m[1]));
    }
    return `Sprint ${max + 1} — `;
  }, [sprintLabels]);

  const currentSprintLabel = (tasks[0]?.projeto ?? "").split(" / ")[0]?.trim() ?? "";

  async function moveFrente() {
    const label = targetSprint === "__new__" ? newLabel.trim() : targetSprint;
    if (!label || label === currentSprintLabel) return;
    setSaving(true);
    try {
      for (const t of tasks) {
        const projeto = `${label} / ${objetivo}`;
        const patch = { projeto, sprint_nome: label };
        await updateTask(t.id, patch);
        onSave(t.id, patch);
      }
      setMoving(false);
      setTargetSprint("");
      setNewLabel("");
    } finally {
      setSaving(false);
    }
  }
  const total = tasks.length;
  const done = tasks.filter(t => t.execution_status === "done").length;
  const inProgress = tasks.filter(t => ["doing", "review"].includes(t.execution_status)).length;
  const blocked = tasks.filter(t => t.execution_status === "blocked").length;
  const active = tasks.filter(t => !["done", "archived"].includes(t.execution_status)).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const barColor = pct >= 80 ? "bg-emerald-500/100" : pct >= 50 ? "bg-amber-500/100" : "bg-violet-500/100";
  const oversized = active > SPRINT_SIZE_WARNING_THRESHOLD;

  const sorted = [...tasks].sort((a, b) => {
    const aDone = a.execution_status === "done";
    const bDone = b.execution_status === "done";
    if (aDone !== bDone) return aDone ? 1 : -1;
    if (aDone && bDone) {
      return new Date(b.concluido_em ?? b.updated_at).getTime() - new Date(a.concluido_em ?? a.updated_at).getTime();
    }
    return a.order_index - b.order_index;
  });

  return (
    <div className={`${cc.panel} overflow-hidden`}>
      <button className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-800/60 transition-colors" onClick={() => setOpen(o => !o)}>
        <span className="text-lg">🎯</span>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-bold text-slate-100">{objetivo}</p>
          {desiredOutcome && <p className="text-[11px] text-slate-400 mt-0.5">{desiredOutcome}</p>}
          <p className="text-[10px] text-violet-300 font-semibold mt-1">🚀 Sprint ativa: {sprintNome}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden max-w-[160px]">
              <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`${mono.className} text-[10px] text-slate-400`}>{done}/{total} · {pct}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {blocked > 0 && <span className="text-[10px] font-bold text-red-600 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full">{blocked} bloqueada{blocked > 1 ? "s" : ""}</span>}
          {inProgress > 0 && <span className="text-[10px] font-bold text-blue-300 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded-full">{inProgress} ativo{inProgress > 1 ? "s" : ""}</span>}
          {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-800 pt-3">
          {oversized && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-semibold">
              <AlertTriangle size={13} className="shrink-0" />
              Esse sprint está grande demais. Quebre em objetivos menores.
            </div>
          )}
          <div className="px-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Objetivo</p>
            <ObjectiveEditor
              value={objective}
              placeholder="Qual é o objetivo único deste sprint? Ex: deixar o bot funcionando corretamente de novo."
              onSave={onSaveObjective}
            />
          </div>

          <div className="px-1">
            {!moving ? (
              <button onClick={() => { setMoving(true); setTargetSprint("__new__"); setNewLabel(nextSprintSuggestion); }}
                className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1">
                <GitBranch size={11} /> Mover esta frente ({tasks.length}) para outra sprint
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <select value={targetSprint} onChange={e => {
                    setTargetSprint(e.target.value);
                    if (e.target.value === "__new__" && !newLabel) setNewLabel(nextSprintSuggestion);
                  }}
                  className="bg-slate-900/60 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white outline-none focus:border-[#09a1e5]">
                  <option value="">Mover para…</option>
                  {sprintLabels.filter(l => l !== currentSprintLabel).map(label => <option key={label} value={label}>{label}</option>)}
                  <option value="__new__">+ Nova sprint…</option>
                </select>
                {targetSprint === "__new__" && (
                  <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Sprint N — Nome"
                    className="bg-slate-900/60 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white outline-none focus:border-[#09a1e5] w-52" />
                )}
                <button onClick={moveFrente} disabled={saving || !targetSprint || (targetSprint === "__new__" && !newLabel.trim())}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 transition-all disabled:opacity-40">
                  {saving ? "Movendo…" : `Mover ${tasks.length} tarefas`}
                </button>
                <button onClick={() => { setMoving(false); setTargetSprint(""); setNewLabel(""); }}
                  className="text-[11px] text-slate-500 hover:text-slate-300">Cancelar</button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {sorted.map(t => <TaskRow key={t.id} task={t} onEdit={onEdit} onMove={onMove} onSave={onSave} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Table view ─────────────────────────────────────────────────────────────────

function TableView({ tasks, onEdit, onMove, onSave }: {
  tasks: ExtendedTask[];
  onEdit: (task: ExtendedTask) => void;
  onMove: (id: string, col: ColumnId) => void;
  onSave: (id: string, patch: Partial<Task>) => void;
}) {
  if (tasks.length === 0) {
    return <p className="text-sm text-slate-300 py-8 text-center">Nenhuma tarefa encontrada.</p>;
  }
  return (
    <div className={`${cc.panel} overflow-x-auto`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <th className="text-left px-4 py-2.5">Tarefa</th>
            <th className="text-left px-3 py-2.5 hidden md:table-cell">Categoria</th>
            <th className="text-left px-3 py-2.5 hidden lg:table-cell">Projeto</th>
            <th className="text-left px-3 py-2.5">Status</th>
            <th className="text-left px-3 py-2.5 hidden sm:table-cell">P/U/I</th>
            <th className="text-left px-3 py-2.5 hidden sm:table-cell">Data</th>
            <th className="text-right px-4 py-2.5">Ações</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(t => {
            const colId = getColumnId(t);
            const cfg = COLUMN_META[colId];
            const isDone = colId === "done";
            const isTrash = colId === "trash";
            return (
              <tr key={t.id} className={`border-b border-slate-800 last:border-0 hover:bg-slate-800/60 transition-colors ${isDone ? "opacity-60" : ""}`}>
                <td className="px-4 py-2.5 cursor-pointer max-w-[260px]" onClick={() => onEdit(t)}>
                  <p className={`font-medium truncate ${isDone ? "line-through text-slate-400" : "text-slate-100"}`}>{t.titulo}</p>
                  {t.data_foco && (
                    <p className="text-[10px] text-[#09a1e5] mt-0.5 sm:hidden">
                      {new Date(t.data_foco + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2.5 hidden md:table-cell text-xs text-slate-400 whitespace-nowrap">
                  {t.categoria ? <>{CATEGORIA_ICONS[t.categoria] ?? "📌"} {t.categoria}</> : "—"}
                </td>
                <td className="px-3 py-2.5 hidden lg:table-cell text-xs text-slate-400 truncate max-w-[200px]">{t.projeto ?? "—"}</td>
                <td className="px-3 py-2.5">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                    {cfg.icon} {cfg.label}
                  </span>
                </td>
                <td className={`${mono.className} px-3 py-2.5 hidden sm:table-cell text-[11px] text-slate-400 whitespace-nowrap`}>
                  {t.prioridade}/{t.urgencia}/{t.impacto ?? "-"}
                </td>
                <td className={`${mono.className} px-3 py-2.5 hidden sm:table-cell text-[11px] whitespace-nowrap ${t.data_foco && t.data_foco < todayStr() && !isDone ? "text-red-600 font-bold" : "text-slate-400"}`}>
                  {t.data_foco ? new Date(t.data_foco + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    {!isDone && !isTrash && (
                      <>
                        <button onClick={() => onSave(t.id, { data_foco: tomorrowStr() })}
                          title="Adiar para amanhã"
                          className="p-1 text-slate-400 hover:text-amber-600 transition-colors">
                          <Clock size={14} />
                        </button>
                        <button onClick={() => onMove(t.id, "trash")}
                          title="Cancelar tarefa"
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors">
                          <Ban size={14} />
                        </button>
                        <button onClick={() => onMove(t.id, "done")}
                          title="Concluir tarefa"
                          className="p-1 text-slate-400 hover:text-emerald-600 transition-colors">
                          <CheckCircle2 size={14} />
                        </button>
                      </>
                    )}
                    {isTrash && (
                      <button onClick={() => onMove(t.id, "backlog")} title="Restaurar"
                        className="p-1 text-slate-400 hover:text-emerald-600 transition-colors">
                        <RotateCcw size={14} />
                      </button>
                    )}
                    <MoveMenu current={colId} onMove={col => onMove(t.id, col)} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Drop chip (Fase 1 drag targets: Sprint / Backlog / Concluído / Arquivado) ──

function DropChip({ id, label, icon, hint }: { id: ColumnId; label: string; icon: React.ReactNode; hint: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const danger = id === "trash";
  return (
    <div ref={setNodeRef} title={hint}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all
        ${isOver
          ? danger ? "bg-red-500/10 border-red-300 text-red-600 ring-2 ring-red-200" : "bg-[#09a1e5]/10 border-[#09a1e5]/40 text-[#09a1e5] ring-2 ring-[#09a1e5]/20"
          : "bg-slate-900/40 border-slate-800 text-slate-400"}`}>
      {icon}{label}
    </div>
  );
}

// ─── Backlog group drop zone (arrastar tarefas entre sprints) ─────────────────

function GroupDropZone({ id, children, isOver: forceOver }: { id: string; children: React.ReactNode; isOver?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const active = isOver || forceOver;
  return (
    <div ref={setNodeRef} className={`space-y-2 rounded-2xl transition-all ${active ? "ring-2 ring-[#09a1e5]/40 ring-offset-2 ring-offset-[#0B1120]" : ""}`}>
      {children}
    </div>
  );
}

// ─── Mapa do mês: sprint arrastável entre meses ────────────────────────────────

function DraggableSprintCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 10 : undefined } : undefined;
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none cursor-grab active:cursor-grabbing">
      {children}
    </div>
  );
}

/** Compact "Mapa do Mês" sprint column: title/subtitle, ring progress, status label, ATIVA ribbon. */
function SprintMapCard({ s, isActive, isDone, statusLabel, statusColor, subtitle, objectiveValue, onSaveObjective, onOpen }: {
  s: { n: number; label: string; tasks: ExtendedTask[]; done: number; pct: number };
  isActive: boolean;
  isDone: boolean;
  statusLabel: string;
  statusColor: string;
  subtitle: string;
  objectiveValue: string;
  onSaveObjective: (text: string) => void;
  onOpen: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const oversized = s.tasks.filter(t => !["done", "archived"].includes(t.execution_status)).length > SPRINT_SIZE_WARNING_THRESHOLD;

  return (
    <div className={`relative overflow-hidden ${isActive ? cc.cardActive + " " + cc.glow : cc.card}`}>
      {isActive && (
        <div className="absolute -left-9 top-2 w-32 rotate-[-45deg] bg-[#09a1e5] text-white text-[9px] font-bold text-center py-0.5 shadow-md z-10">
          ATIVA
        </div>
      )}
      <div className="p-3 pt-4">
        <p className="text-xs font-bold text-slate-100 truncate text-center">{s.label}</p>
        {subtitle && <p className="text-[10px] text-slate-400 mt-0.5 text-center line-clamp-2">{subtitle}</p>}

        <div className="flex justify-center my-3">
          <RingProgress pct={s.pct} size={56} stroke={5} color={isDone ? "#34d399" : "#09a1e5"}>
            <span className={`${mono.className} text-xs font-bold text-white`}>{s.pct}%</span>
          </RingProgress>
        </div>

        <p className={`text-[10px] font-semibold text-center ${statusColor}`}>{statusLabel}</p>
        <p className={`${mono.className} text-[10px] text-slate-500 text-center mt-0.5`}>{s.done}/{s.tasks.length}</p>

        {oversized && (
          <div className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-semibold">
            <AlertTriangle size={11} className="shrink-0" />
            Sprint grande demais
          </div>
        )}

        <div className="flex items-center justify-center gap-2 mt-2.5">
          <button onClick={onOpen} className="text-[10px] text-slate-400 hover:text-[#09a1e5] transition-colors font-semibold">
            Abrir →
          </button>
          <span className="text-slate-700">·</span>
          <button onClick={() => setExpanded(v => !v)} className="text-[10px] text-slate-400 hover:text-[#09a1e5] transition-colors font-semibold">
            {expanded ? "Ocultar detalhes" : "Detalhes"}
          </button>
        </div>

        {expanded && (
          <div className="mt-2 pt-2 border-t border-white/[0.06]" onClick={e => e.stopPropagation()}>
            <ObjectiveEditor
              value={objectiveValue}
              placeholder="Definir objetivo da sprint…"
              onSave={onSaveObjective}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Listagem de todos os sprints (aba Sprint → "Todos os sprints") ────────────

function AllSprintsCard({ s, isActive, isDone, onActivate, onEdit, onMove, onSave }: {
  s: { n: number; label: string; tasks: ExtendedTask[]; done: number; pct: number; month: string };
  isActive: boolean;
  isDone: boolean;
  onActivate: () => void;
  onEdit: (task: ExtendedTask) => void;
  onMove: (id: string, col: ColumnId) => void;
  onSave: (id: string, patch: Partial<Task>) => void;
}) {
  const [open, setOpen] = useState(isActive);
  const pending = s.tasks.filter(t => !["done", "archived"].includes(t.execution_status));

  return (
    <div className={`overflow-hidden ${isActive ? cc.cardActive + " " + cc.glow : cc.panel}`}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-3 p-3 text-left">
        <RingProgress pct={s.pct} size={32} stroke={3} color={isDone ? "#34d399" : "#a78bfa"}>
          {isDone ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Rocket size={12} className="text-violet-300" />}
        </RingProgress>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-100 truncate">{s.label}</p>
          <p className={`${mono.className} text-[10px] text-slate-500`}>{s.month} · {s.done}/{s.tasks.length} · {s.pct}% · {pending.length} pendente{pending.length !== 1 ? "s" : ""}</p>
        </div>
        {isActive
          ? <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-[#09a1e5]/20 text-[#09a1e5] shrink-0">ATIVA</span>
          : (
            <span onClick={e => { e.stopPropagation(); onActivate(); }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:bg-violet-500/20 transition-colors shrink-0">
              <Rocket size={11} /> Ativar
            </span>
          )}
        <ChevronRight size={15} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="p-3 pt-0 space-y-2">
          {s.tasks.length === 0
            ? <p className="text-xs text-slate-400 py-2 text-center">Sem tarefas.</p>
            : s.tasks.map(t => <TaskRow key={t.id} task={t} onEdit={onEdit} onMove={onMove} onSave={onSave} />)}
        </div>
      )}
    </div>
  );
}

function MonthDropZone({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 transition-colors rounded-b-2xl ${isOver ? "bg-[#09a1e5]/5 ring-2 ring-inset ring-[#09a1e5]/30" : ""}`}>
      {children}
    </div>
  );
}

// ─── Dashboard blocks ───────────────────────────────────────────────────────────

function Block({ title, icon, accent, right, children }: { title: string; icon: string; accent: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={`${cc.panel} overflow-hidden`}>
      <div className={`flex items-center gap-2 px-4 py-3 border-b border-slate-800 ${accent}`}>
        <span className="text-base">{icon}</span>
        <p className="text-xs font-bold uppercase tracking-widest">{title}</p>
        {right}
      </div>
      <div className="p-3 space-y-2">{children}</div>
    </div>
  );
}

// ─── Sprint Assign Panel ──────────────────────────────────────────────────────

function SprintAssignPanel({ tasks, existingLabels, onAssign }: {
  tasks: ExtendedTask[];
  existingLabels: string[];
  onAssign: (ids: string[], label: string) => void;
}) {
  const [selected, setSelected] = useState<string>(""); // sprint label to assign
  const [custom, setCustom] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const effectiveLabel = showCustom ? custom.trim() : selected;

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-amber-400 font-bold text-sm">⚠️ {tasks.length} tarefa{tasks.length !== 1 ? "s" : ""} sem sprint</span>
        <span className="text-slate-500 text-xs">— selecione um sprint para atribuir</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {existingLabels.map(l => (
          <button key={l} type="button" onClick={() => { setSelected(l); setShowCustom(false); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${selected === l && !showCustom ? "bg-[#09a1e5]/15 border-[#09a1e5]/40 text-[#09a1e5]" : "bg-slate-900/60 border-slate-800 text-slate-300 hover:text-white"}`}>
            {l}
          </button>
        ))}
        <button type="button" onClick={() => { setShowCustom(v => !v); setSelected(""); }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border border-dashed transition-all ${showCustom ? "border-[#09a1e5]/40 text-[#09a1e5]" : "border-slate-700 text-slate-500 hover:text-slate-300"}`}>
          + Novo sprint
        </button>
      </div>

      {showCustom && (
        <input value={custom} onChange={e => setCustom(e.target.value)} autoFocus
          placeholder="Sprint 3 — Desenvolvimento"
          className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-[#09a1e5]" />
      )}

      <div className="space-y-1 max-h-40 overflow-y-auto">
        {tasks.map(t => (
          <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-900/40">
            <span className="flex-1 text-xs text-slate-300 truncate">{t.titulo}</span>
            {effectiveLabel && (
              <button onClick={() => onAssign([t.id], effectiveLabel)}
                className="shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold bg-[#09a1e5]/15 border border-[#09a1e5]/30 text-[#09a1e5] hover:bg-[#09a1e5]/25 transition-all">
                Atribuir →
              </button>
            )}
          </div>
        ))}
      </div>

      {effectiveLabel && (
        <button onClick={() => onAssign(tasks.map(t => t.id), effectiveLabel)}
          className="w-full py-2 rounded-xl text-xs font-bold bg-[#09a1e5] hover:bg-[#0891d5] text-white transition-all">
          Atribuir todas para "{effectiveLabel}"
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TarefasPage() {
  // page title
  const [tasks, setTasks] = useState<ExtendedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deadlineOnly, setDeadlineOnly] = useState(false);
  const [equityOpen, setEquityOpen] = useState(false);
  const [editTask, setEditTask] = useState<ExtendedTask | null>(null);
  const [editTaskTab, setEditTaskTab] = useState<"missao" | "tarefas" | "resultado">("missao");

  function openResultado(t: ExtendedTask) {
    setEditTaskTab("resultado");
    setEditTask(t);
  }
  const [pendingCompleteId, setPendingCompleteId] = useState<string | null>(null);
  const { tab } = useParams<{ tab: string }>();
  const view = (tab as "hoje" | "mapa" | "sprint" | "backlog" | "historico" | "avancado") ?? "hoje";
  const [selectedFronte, setSelectedFronte] = useState<FronteKey | null>(null);
  const [carouselMonthIdx, setCarouselMonthIdx] = useState(0);
  const [avancadoView, setAvancadoView] = useState<"kanban" | "tabela">("kanban");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sprintMonthOverride, setSprintMonthOverride] = useState<Record<number, string>>({});
  const [showFutureMonths, setShowFutureMonths] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cc_sprint_month_override");
      if (raw) setSprintMonthOverride(JSON.parse(raw));
    } catch {}
  }, []);
  const [showTrash, setShowTrash] = useState(false);
  const [foco, setFoco] = useState(false);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [sprintFilter, setSprintFilter] = useState<"ativa" | "todas">("ativa");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const [artifactCounts, setArtifactCounts] = useState<ArtifactCounts>({});
  const [objectives, setObjectives] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getTasks({ includeArchived: true }).catch(() => []);
    setTasks(data);
    setLoading(false);
    getArtifactCounts().then(setArtifactCounts).catch(() => {});
    getObjectives().then(setObjectives).catch(() => {});
  }, []);

  const saveObjective = useCallback(async (scope: "month" | "sprint" | "frente", key: string, text: string) => {
    setObjectives(prev => ({ ...prev, [`${scope}:${key}`]: text }));
    try { await upsertObjective(scope, key, text); } catch { /* best-effort */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Deep-link: ?openTask=<id> opens that task's EditModal once tasks are loaded.
  useEffect(() => {
    if (loading || tasks.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const openId = params.get("openTask");
    if (!openId) return;
    const target = tasks.find(t => t.id === openId);
    if (target) {
      setEditTask(target);
      params.delete("openTask");
      const rest = params.toString();
      window.history.replaceState({}, "", rest ? `?${rest}` : window.location.pathname);
    }
  }, [loading, tasks]);

  const [goalLiveData, setGoalLiveData] = useState<Record<string, { current: number | null; target?: number | null }>>({});

  useEffect(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

    (async () => {
      // 1. Test drives realizados (attended) this month, by completed_at
      try {
        const { count, error } = await supabase
          .from("test_drives")
          .select("id", { count: "exact", head: true })
          .eq("status", "attended")
          .gte("completed_at", monthStart)
          .lt("completed_at", monthEnd);
        if (!error && count != null) {
          setGoalLiveData(prev => ({ ...prev, testdrive: { current: count } }));
        }
      } catch {}

      // 2. Vendas digitais this month (sales.origem = 'digital')
      try {
        const { count, error } = await supabase
          .from("sales")
          .select("id", { count: "exact", head: true })
          .eq("origem", "digital")
          .gte("sold_at", monthStart)
          .lt("sold_at", monthEnd);
        if (!error && count != null) {
          setGoalLiveData(prev => ({ ...prev, vendas: { current: count } }));
        }
      } catch {}

      // 3. Leads com origem preenchida this month (% with utm_source or channel set)
      try {
        const { data: leads, error } = await supabase
          .from("leads")
          .select("utm_source, channel")
          .gte("created_at", monthStart)
          .lt("created_at", monthEnd);
        if (!error && leads) {
          const total = leads.length;
          const withOrigem = leads.filter(l => (l.utm_source && l.utm_source.trim() !== "") || (l.channel && l.channel.trim() !== "")).length;
          if (total > 0) {
            setGoalLiveData(prev => ({ ...prev, origem: { current: Math.round((100 * withOrigem) / total) } }));
          }
        }
      } catch {}

      // 4. Receita digital atribuída this month (sum of price_brl where origem = 'digital')
      try {
        const { data: sales, error } = await supabase
          .from("sales")
          .select("price_brl")
          .eq("origem", "digital")
          .gte("sold_at", monthStart)
          .lt("sold_at", monthEnd);
        if (!error && sales) {
          const total = sales.reduce((sum, s) => sum + (s.price_brl ?? 0), 0);
          setGoalLiveData(prev => ({ ...prev, receita: { current: total } }));
        }
      } catch {}

      // 5 & 6. Meta/GA4 marketing goals — not wired (no server API in this project)
    })();
  }, []);

  function withLiveGoal(goal: MonthlyGoal): MonthlyGoal {
    const live = goalLiveData[goal.id];
    if (!live) return goal;
    return {
      ...goal,
      current: live.current ?? goal.current,
      target: live.target !== undefined ? (live.target ?? goal.target) : goal.target,
    };
  }

  async function handleSave(id: string, patch: Partial<Task>) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    await updateTask(id, patch as Parameters<typeof updateTask>[1]);
  }

  const [showConfetti, setShowConfetti] = useState(false);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());

  // ─── Undo toast ──────────────────────────────────────────────────────────
  type UndoSnapshot = {
    id: string;
    message: string;
    prev: Pick<ExtendedTask, "planning_bucket" | "execution_status" | "order_index" | "data_foco">;
  };
  const [undoState, setUndoState] = useState<UndoSnapshot | null>(null);

  function captureSnapshot(id: string, message: string) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    setUndoState({
      id,
      message,
      prev: {
        planning_bucket: task.planning_bucket,
        execution_status: task.execution_status,
        order_index: task.order_index,
        data_foco: task.data_foco,
      },
    });
  }

  async function handleUndo() {
    if (!undoState) return;
    const { id, prev } = undoState;
    setUndoState(null);
    setTasks(prevTasks => prevTasks.map(t => t.id === id ? { ...t, ...prev } : t));
    try {
      await moveTask(id, prev.planning_bucket, prev.execution_status, prev.order_index);
      if (prev.data_foco !== undefined) {
        await updateTask(id, { data_foco: prev.data_foco });
      }
    } catch {
      // fall back to a full reload if the revert fails server-side
    } finally {
      load();
    }
  }

  function completeTask(id: string) {
    captureSnapshot(id, "Missão concluída");
    setCompletingIds(prev => new Set(prev).add(id));
    // Let the exit animation play before actually mutating state/server.
    setTimeout(() => {
      applyMove(id, "done");
      setCompletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 450);
  }

  function handleCompleteFoco(id: string) {
    if (completingIds.has(id)) return;
    const hasResult = (artifactCounts[id]?.resultado ?? 0) > 0 || (artifactCounts[id]?.evidencia ?? 0) > 0;
    if (!hasResult) {
      const t = tasks.find(x => x.id === id);
      if (t) { setPendingCompleteId(id); openResultado(t); }
      return;
    }
    completeTask(id);
  }

  function completeWithoutResult(id: string) {
    setPendingCompleteId(null);
    setEditTask(null);
    setEditTaskTab("missao");
    completeTask(id);
  }

  // Called when EditModal closes — if there was a pendingComplete, re-check from DB
  // (artifactCounts is loaded at page-load and goes stale when user adds result inside the modal)
  async function handleModalClose() {
    const pid = pendingCompleteId;
    setEditTask(null);
    setEditTaskTab("missao");
    setPendingCompleteId(null);
    if (!pid) return;
    try {
      const fresh = await getTaskArtifacts(pid);
      setArtifactCounts(prev => ({
        ...prev,
        [pid]: {
          resultado: fresh.filter(a => a.type === "resultado").length,
          artifact:  fresh.filter(a => a.type === "artifact").length,
          evidencia: fresh.filter(a => a.type === "evidencia").length,
        },
      }));
      if (fresh.some(a => a.type === "resultado" || a.type === "evidencia")) {
        completeTask(pid);
      }
    } catch { /* ignore — user can click concluir again */ }
  }

  function handleCancelTask(id: string) {
    captureSnapshot(id, "Missão cancelada");
    applyMove(id, "trash");
  }

  function handlePostponeTask(id: string) {
    captureSnapshot(id, "Missão adiada para amanhã");
    handleSave(id, { data_foco: tomorrowStr() });
  }
  const [activatingSprint, setActivatingSprint] = useState(false);

  async function activateNextSprint(taskIds: string[]) {
    setActivatingSprint(true);
    setTasks(prev => prev.map(t => taskIds.includes(t.id) ? { ...t, planning_bucket: "sprint" } : t));
    try {
      await Promise.all(taskIds.map(id => updateTask(id, { planning_bucket: "sprint" })));
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2200);
    } finally {
      setActivatingSprint(false);
    }
  }

  /**
   * Troca o foco do mês para outra sprint. Tarefas ainda abertas da sprint
   * antiga (que não pertencem à nova sprint) são realocadas para um grupo
   * "Misc — <sprint antiga>" no backlog, sem perder o vínculo/contexto.
   */
  async function activateSprint(targetLabel: string, targetTasks: ExtendedTask[]) {
    if (targetLabel === sprintName) return;
    const updates: { id: string; patch: Partial<Task> }[] = [];

    for (const t of sprintTasks) {
      const prefix = (t.projeto ?? "").split(" / ")[0]?.trim();
      if (prefix === targetLabel || ["done", "archived"].includes(t.execution_status)) continue;
      const rest = (t.projeto ?? "").split(" / ").slice(1).join(" / ");
      const miscLabel = `Misc — ${prefix || "Sem sprint"}`;
      const newProjeto = rest ? `${miscLabel} / ${rest}` : miscLabel;
      updates.push({ id: t.id, patch: { projeto: newProjeto, planning_bucket: "backlog" } });
    }

    for (const t of targetTasks) {
      if (t.planning_bucket !== "sprint" && !["done", "archived"].includes(t.execution_status)) {
        updates.push({ id: t.id, patch: { planning_bucket: "sprint" } });
      }
    }

    if (updates.length === 0) return;

    setTasks(prev => prev.map(t => {
      const u = updates.find(u => u.id === t.id);
      return u ? { ...t, ...u.patch } : t;
    }));
    await Promise.all(updates.map(u => updateTask(u.id, u.patch as Parameters<typeof updateTask>[1])));
  }

  /** Renomeia um grupo de backlog (prefixo "Sprint N — ..." ou "Misc — ...") reescrevendo o `projeto` de todas as tarefas do grupo. */
  async function renameGroup(oldName: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    const affected = tasks.filter(t => ((t.projeto ?? "").split(" / ")[0]?.trim() || "Sem sprint") === oldName);
    const updates = affected.map(t => {
      const rest = (t.projeto ?? "").split(" / ").slice(1).join(" / ");
      const projeto = rest ? `${trimmed} / ${rest}` : trimmed;
      return { id: t.id, projeto };
    });
    setTasks(prev => prev.map(t => {
      const u = updates.find(u => u.id === t.id);
      return u ? { ...t, projeto: u.projeto } : t;
    }));
    await Promise.all(updates.map(u => updateTask(u.id, { projeto: u.projeto })));
  }

  /** Move a task to a column, appending it to the end of that column. */
  function applyMove(id: string, columnId: ColumnId, insertIndex?: number) {
    setTasks(prev => {
      const task = prev.find(t => t.id === id);
      if (!task) return prev;
      const colTasks = prev.filter(t => t.id !== id && getColumnId(t) === columnId)
        .sort((a, b) => a.order_index - b.order_index);
      const idx = insertIndex ?? colTasks.length;
      const orderIndex = calcOrderIndex(colTasks, idx);
      const { planning, execution } = columnTarget(columnId, task);
      const updated: ExtendedTask = { ...task, planning_bucket: planning, execution_status: execution, order_index: orderIndex };
      moveTask(id, planning, execution, orderIndex).catch(() => load());
      return prev.map(t => t.id === id ? updated : t);
    });
  }

  function onDragStart(e: DragStartEvent) { setActiveId(e.active.id as string); }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const overId = over.id as string;
    const overTask = tasks.find(t => t.id === overId);
    const targetColumn: ColumnId = overTask ? getColumnId(overTask) : (overId as ColumnId);
    if (!COLUMNS.find(c => c.id === targetColumn)) return;

    const colTasksExcl = tasks.filter(t => t.id !== active.id && getColumnId(t) === targetColumn)
      .sort((a, b) => a.order_index - b.order_index);
    let insertIndex = overTask ? colTasksExcl.findIndex(t => t.id === overTask.id) : colTasksExcl.length;
    if (insertIndex === -1) insertIndex = colTasksExcl.length;

    applyMove(active.id as string, targetColumn, insertIndex);
  }

  // Rolling list of months: current month + 12 ahead. First 3 = "Foco atual",
  // rest = "Planejamento futuro" (collapsed). Sprints 0-4 keep their legacy
  // month mapping; sprints 5+ are computed via the date-based formula.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ALL_MONTHS = useMemo(() => getRollingMonths(new Date(), 12), []);

  /** Move a task to another sprint/group (Backlog view): rewrites the "Sprint N — ..." prefix of `projeto`. */
  function onBacklogDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const task = tasks.find(t => t.id === active.id);
    if (!task) return;

    const overId = String(over.id);
    let targetGroup: string | null = null;
    if (overId.startsWith("group:")) {
      targetGroup = overId.slice("group:".length);
    } else {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) targetGroup = (overTask.projeto ?? "").split(" / ")[0]?.trim() || "Sem sprint";
    }
    if (!targetGroup) return;

    const currentGroup = (task.projeto ?? "").split(" / ")[0]?.trim() || "Sem sprint";
    if (targetGroup === currentGroup) return;

    const rest = (task.projeto ?? "").split(" / ").slice(1).join(" / ");
    const newProjeto = targetGroup === "Sem sprint" ? (rest || null) : (rest ? `${targetGroup} / ${rest}` : targetGroup);
    handleSave(task.id, { projeto: newProjeto });
  }

  /** Move a sprint card to another month (Mapa view): stores a local override (Sprint N -> mês). */
  function onMapaDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const n = Number(String(active.id).replace("sprintcard:", ""));
    const monthKey = String(over.id).replace("monthdrop:", "");
    if (!ALL_MONTHS.find(m => m.key === monthKey)) return;
    if (sprintMonthOverride[n] === monthKey) return;
    setSprintMonthOverride(prev => {
      const next = { ...prev, [n]: monthKey };
      try { localStorage.setItem("cc_sprint_month_override", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  async function quickAdd(columnId: ColumnId, titulo: string) {
    const { planning, execution } = columnTarget(columnId, { planning_bucket: "backlog" } as Task);
    const created = await createTask({
      titulo, descricao: null, prioridade: 2, urgencia: 2, responsavel: null, client_id: null,
      semana_alvo: null, url_verificacao: null, notas: null, categoria: null, data_foco: null,
      projeto: null, impacto: 2, done_criteria: null,
      planning_bucket: planning, execution_status: execution,
    });
    setTasks(prev => [...prev, created]);
  }

  const filtered = useMemo(() => tasks.filter(t => {
    const q = search.toLowerCase();
    const matchesSearch = !search || t.titulo.toLowerCase().includes(q) || (t.descricao ?? "").toLowerCase().includes(q) || (t.projeto ?? "").toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (deadlineOnly) {
      if (["done", "archived"].includes(t.execution_status)) return false;
      const in7 = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); })();
      const dueByFoco = !!t.data_foco && t.data_foco <= in7;
      const estimated = getEstimatedDueDate(t);
      const dueByEstimate = !!estimated && estimated.toISOString().slice(0, 10) <= in7;
      if (!dueByFoco && !dueByEstimate) return false;
    }
    return true;
  }), [tasks, search, deadlineOnly]);

  const grouped = useMemo(() => {
    const g: Record<ColumnId, ExtendedTask[]> = { backlog: [], sprint: [], today: [], doing: [], review: [], blocked: [], done: [], trash: [] };
    for (const t of filtered) g[getColumnId(t)].push(t);
    for (const k of Object.keys(g) as ColumnId[]) g[k].sort((a, b) => a.order_index - b.order_index);
    return g;
  }, [filtered]);

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  // ── Dashboard derived data ──
  const live = filtered.filter(t => t.execution_status !== "archived");
  const focoHoje = live.filter(t => getColumnId(t) === "today");
  const bloqueados = live.filter(t => t.execution_status === "blocked");
  const atrasadas = live.filter(t => t.data_foco && t.data_foco < todayStr() && !["done", "archived"].includes(t.execution_status));
  const sprintTasks = live.filter(t => t.planning_bucket === "sprint");
  const sprintDone = sprintTasks.filter(t => t.execution_status === "done").length;
  const sprintBlocked = sprintTasks.filter(t => t.execution_status === "blocked").length;
  const sprintPct = sprintTasks.length > 0 ? Math.round((sprintDone / sprintTasks.length) * 100) : 0;
  // Foco do dia prioriza tarefas da sprint ativa; o restante completa com as de maior score.
  const top3 = (() => {
    const pending = live.filter(t => !["done", "archived"].includes(t.execution_status));
    const fromSprint = pending.filter(t => t.planning_bucket === "sprint").sort((a, b) => score(b) - score(a));
    const rest = pending.filter(t => t.planning_bucket !== "sprint").sort((a, b) => score(b) - score(a));
    return [...fromSprint, ...rest].slice(0, 3);
  })();

  // Nome do sprint ativo (mês/campanha): pega o trecho "Sprint N — ..." mais comum entre as tarefas da sprint.
  const sprintName = (() => {
    const counts = new Map<string, number>();
    for (const t of sprintTasks) {
      const part = (t.projeto ?? "").split(" / ")[0]?.trim();
      if (part && /sprint/i.test(part)) counts.set(part, (counts.get(part) ?? 0) + 1);
    }
    let best: string | null = null, bestCount = 0;
    for (const [name, c] of counts) if (c > bestCount) { best = name; bestCount = c; }
    return best;
  })();

  // Sprint concluída 100% → oferece ativar a próxima sprint (move suas tarefas para o bucket "sprint").
  const currentSprintNum = (() => {
    const m = sprintName ? /sprint\s*(\d+)/i.exec(sprintName) : null;
    return m ? Number(m[1]) : null;
  })();
  const sprintFinished = sprintTasks.length > 0 && sprintDone === sprintTasks.length;
  const nextSprintNum = currentSprintNum !== null ? currentSprintNum + 1 : null;
  const nextSprintTasks = nextSprintNum !== null
    ? live.filter(t => {
        const m = /sprint\s*(\d+)/i.exec((t.projeto ?? "").split(" / ")[0] ?? "");
        return m && Number(m[1]) === nextSprintNum && t.planning_bucket !== "sprint";
      })
    : [];
  const nextSprintLabel = (nextSprintTasks[0]?.projeto ?? "").split(" / ")[0]?.trim() || (nextSprintNum !== null ? `Sprint ${nextSprintNum}` : "");
  const showActivateNextSprint = sprintFinished && nextSprintTasks.length > 0;

  const SPRINT_STAGES: { status: ExecutionStatus | "todo_planning"; label: string; color: string }[] = [
    { status: "todo",     label: "A fazer",   color: "bg-slate-300" },
    { status: "doing",    label: "Fazendo",   color: "bg-blue-500/100" },
    { status: "review",   label: "Revisão",   color: "bg-amber-500/100" },
    { status: "blocked",  label: "Bloqueado", color: "bg-red-500/100" },
    { status: "done",     label: "Concluído", color: "bg-emerald-500/100" },
  ];
  const sprintStageCounts = SPRINT_STAGES.map(s => ({
    ...s, count: sprintTasks.filter(t => t.execution_status === s.status).length,
  }));

  // Sprint tasks grouped by "objetivo" (Campanha → Objetivo → Sprint → Missão) —
  // each objetivo has ONE sprint with a focused set of missions (5-12 ideally).
  const sprintFrentes = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, ExtendedTask[]>();
    for (const t of sprintTasks) {
      const key = getObjetivoNome(t);
      if (!map.has(key)) { map.set(key, []); order.push(key); }
      map.get(key)!.push(t);
    }
    const groups = order.map(name => {
      const groupTasks = map.get(name)!;
      const pending = groupTasks.filter(t => !["done", "archived"].includes(t.execution_status)).length;
      const sprintNome = getSprintNome(groupTasks[0]);
      return { name, sprintNome, tasks: groupTasks, pending };
    });
    // Most pending/urgent objetivo first — that's the one shown expanded by default.
    groups.sort((a, b) => b.pending - a.pending);
    return groups;
  }, [sprintTasks]);

  // Sprint focada ativa = objetivo/sprint com mais atividade pendente (mesmo critério do Mapa do Mês / SprintMapCard).
  const activeFrente = sprintFrentes[0] ?? null;
  const activeFrenteDone = activeFrente ? activeFrente.tasks.filter(t => t.execution_status === "done").length : 0;
  const activeFrentePct = activeFrente && activeFrente.tasks.length > 0
    ? Math.round((activeFrenteDone / activeFrente.tasks.length) * 100)
    : 0;

  // Próximos 7 dias (qualquer bucket, com data_foco futura dentro da janela)
  const in7Days = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); })();
  const proximos7dias = live.filter(t =>
    t.data_foco && t.data_foco >= todayStr() && t.data_foco <= in7Days &&
    !["done", "archived"].includes(t.execution_status) && getColumnId(t) !== "today"
  ).sort((a, b) => (a.data_foco! < b.data_foco! ? -1 : 1));

  // Backlog/Roadmap: tudo que não é "hoje" nem concluído, agrupado por sprint (projeto) e depois categoria
  const backlogTasks = live.filter(t => getColumnId(t) !== "today" && t.execution_status !== "done");
  const backlogGroups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, ExtendedTask[]>();
    for (const t of backlogTasks) {
      const key = (t.projeto ?? "").split(" / ")[0]?.trim() || "Sem sprint";
      if (!map.has(key)) { map.set(key, []); order.push(key); }
      map.get(key)!.push(t);
    }
    order.sort((a, b) => {
      const sa = /sprint\s*(\d+)/i.exec(a), sb = /sprint\s*(\d+)/i.exec(b);
      if (sa && sb) return Number(sa[1]) - Number(sb[1]);
      if (sa) return -1;
      if (sb) return 1;
      if (a === "Sem sprint") return 1;
      if (b === "Sem sprint") return -1;
      return a.localeCompare(b);
    });
    return order.map(name => ({ name, tasks: map.get(name)! }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  // Backlog agrupado também por Mês (acima de Sprint)
  const backlogByMonth = useMemo(() => {
    const monthGroups = ALL_MONTHS.map(month => ({
      ...month,
      groups: backlogGroups.filter(g => getMonthKey({ projeto: g.tasks[0]?.projeto }) === month.key),
    })).filter(m => m.groups.length > 0);
    const semMes = backlogGroups.filter(g => getMonthKey({ projeto: g.tasks[0]?.projeto }) === null);
    return { monthGroups, semMes };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backlogGroups]);

  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  // ── Growth Game derived data ──
  const equity = useMemo(() => getEquityReadiness(live), [live]);

  const focoOrdenado = [...focoHoje].filter(t => t.execution_status !== "done").sort((a, b) => score(b) - score(a));
  const missaoPrincipal = top3[0] ?? null;
  const missoesSecundarias = top3.slice(1, FOCUS_LIMIT_TODAY);
  // Tarefas adicionadas manualmente para hoje (fora do sprint/top3) — exibidas abaixo em destaque roxo.
  const focoBaseIds = new Set([missaoPrincipal, ...missoesSecundarias].filter((t): t is ExtendedTask => !!t).map(t => t.id));
  const extrasHoje = focoOrdenado.filter(t => !focoBaseIds.has(t.id));
  const missoesHoje = [missaoPrincipal, ...missoesSecundarias, ...extrasHoje].filter((t): t is ExtendedTask => !!t);
  const missoesConcluidas = missoesHoje.filter(t => t.execution_status === "done").length;
  const xpPossivelHoje = missoesHoje.reduce((sum, t) => sum + getXp(t), 0);

  // Mapa do mês: agrupa tarefas por mês (via projeto "Sprint N") e depois por sprint.
  // Suporta um override local (arrastar sprint para outro mês) sem migração de schema.
  // Also include sprint numbers found in actual tasks (tasks may reference sprints not yet in the static month list)
  const ALL_SPRINT_NUMS = useMemo(() => {
    const fromMonths = ALL_MONTHS.flatMap(m => m.sprints);
    const fromTasks = live
      .map(t => { const m = /sprint\s*(\d+)/i.exec((t.projeto ?? "").split(" / ")[0] ?? ""); return m ? Number(m[1]) : null; })
      .filter((n): n is number => n !== null);
    return Array.from(new Set([...fromMonths, ...fromTasks])).sort((a, b) => a - b);
  }, [ALL_MONTHS, live]);
  const monthKeyForSprint = useCallback((n: number): string | null => {
    return sprintMonthOverride[n] ?? ALL_MONTHS.find(m => m.sprints.includes(n))?.key ?? rollingSprintMonthKey(n);
  }, [sprintMonthOverride, ALL_MONTHS]);

  const mapaMeses = useMemo(() => {
    // Build a complete month list: static ALL_MONTHS + any extra months implied by tasks
    const extraMonthKeys = new Set<string>();
    for (const n of ALL_SPRINT_NUMS) {
      const key = monthKeyForSprint(n);
      if (key && !ALL_MONTHS.find(m => m.key === key)) extraMonthKeys.add(key);
    }
    const extraMonths = Array.from(extraMonthKeys).map(key => {
      const sprintN = ALL_SPRINT_NUMS.find(n => monthKeyForSprint(n) === key) ?? 0;
      const d = new Date("2026-06-01T00:00:00");
      d.setDate(d.getDate() + sprintN * 7);
      const name = d.toLocaleDateString("pt-BR", { month: "long" });
      return { key, titulo: `${name.charAt(0).toUpperCase()}${name.slice(1)} ${d.getFullYear()}`, sprints: [] as number[] };
    });
    const allMonths = [...ALL_MONTHS, ...extraMonths];

    return allMonths.map(month => {
      const sprintNums = ALL_SPRINT_NUMS.filter(n => monthKeyForSprint(n) === month.key);
      const sprints = sprintNums.map(n => {
        const sprintTasks = live.filter(t => {
          const m = /sprint\s*(\d+)/i.exec((t.projeto ?? "").split(" / ")[0] ?? "");
          return m && Number(m[1]) === n;
        });
        const done = sprintTasks.filter(t => t.execution_status === "done").length;
        const label = (sprintTasks[0]?.projeto ?? "").split(" / ")[0]?.trim() || `Sprint ${n}`;
        return { n, label, tasks: sprintTasks, done, pct: sprintTasks.length > 0 ? Math.round((done / sprintTasks.length) * 100) : 0 };
      });
      const activeSprints = sprints.filter(s => s.tasks.length > 0);
      const monthTasks = activeSprints.flatMap(s => s.tasks);
      const total = monthTasks.length;
      const done = monthTasks.filter(t => t.execution_status === "done").length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      return { ...month, sprints: activeSprints, total, done, pct };
    }).filter(m => m.sprints.length > 0);
  }, [live, ALL_SPRINT_NUMS, monthKeyForSprint, ALL_MONTHS]);

  // Histórico/Evidências: tarefas concluídas/arquivadas, mais recentes primeiro
  const historico = useMemo(() => {
    return tasks
      .filter(t => t.execution_status === "done" || t.execution_status === "archived")
      .sort((a, b) => new Date(b.concluido_em ?? b.updated_at).getTime() - new Date(a.concluido_em ?? a.updated_at).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  // Impact XP ganho nos últimos 7 dias
  const xpWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return historico
      .filter(t => t.execution_status === "done" && t.concluido_em && new Date(t.concluido_em).getTime() >= weekAgo)
      .reduce((sum, t) => sum + getEarnedXp(t), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historico]);

  // Mês ativo (contém a sprint ativa) para o mini mapa do mês
  const activeMonth = useMemo(() => {
    return mapaMeses.find(m => m.sprints.some(s => s.label === sprintName)) ?? mapaMeses[0];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapaMeses, sprintName]);

  // Stats por frente: open, done, pct, overdue, nextDue, sprintCount
  const fronteStats = useMemo(() => {
    const today = todayStr();
    type FStats = { open: number; done: number; pct: number; overdue: number; nextDue: string | null; sprintCount: number };
    const stats = {} as Record<FronteKey, FStats>;
    const sprintSets = {} as Record<FronteKey, Set<string>>;
    for (const k of Object.keys(FRONTES) as FronteKey[]) {
      stats[k] = { open: 0, done: 0, pct: 0, overdue: 0, nextDue: null, sprintCount: 0 };
      sprintSets[k] = new Set();
    }
    for (const t of live) {
      const key = getFronte(t);
      if (!key) continue;
      const s = stats[key];
      if (t.execution_status === "done") {
        s.done++;
      } else if (t.execution_status !== "archived") {
        s.open++;
        if (t.data_foco && t.data_foco < today) s.overdue++;
        if (t.data_foco && (!s.nextDue || t.data_foco < s.nextDue)) s.nextDue = t.data_foco;
      }
      const sprintLabel = (t.projeto ?? "").split(" / ")[0]?.trim();
      if (sprintLabel && /sprint/i.test(sprintLabel)) sprintSets[key].add(sprintLabel);
    }
    for (const k of Object.keys(FRONTES) as FronteKey[]) {
      const s = stats[k];
      const total = s.open + s.done;
      s.pct = total > 0 ? Math.round((s.done / total) * 100) : 0;
      s.sprintCount = sprintSets[k].size;
    }
    return stats;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  return (
    <ArtifactCountsContext.Provider value={artifactCounts}>
    <div className="relative min-h-screen text-slate-100 font-sans">
      {showConfetti && <Confetti />}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[#09a1e5]/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/admin"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-[#111A2E] border border-slate-800/70 text-slate-400 hover:text-white hover:border-slate-600 transition-colors shrink-0 shadow-sm">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <p className={`${mono.className} text-[10px] font-bold text-[#09a1e5] uppercase tracking-[0.25em] flex items-center gap-2`}>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#09a1e5] animate-pulse" /> Command Center
              </p>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Projeto MoveOn</h1>
              <p className={`${mono.className} text-[11px] text-slate-400 mt-0.5 capitalize`}>{today}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setFoco(f => !f); navigate("/tasks/hoje"); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all border ${foco ? "bg-[#09a1e5]/15 border-[#09a1e5]/40 text-[#09a1e5]" : "bg-[#111A2E] border-slate-800/70 text-slate-300 hover:text-white"}`}>
              <Target size={13} /> Foco
            </button>
            <button onClick={load} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#111A2E] border border-slate-800/70 rounded-xl text-xs text-slate-300 hover:text-white shadow-sm transition-all disabled:opacity-50">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Atualizar
            </button>
            <Link to="/tasks/new"
              className="flex items-center gap-1.5 px-3 py-2 bg-[#09a1e5] hover:bg-[#0891d5] rounded-xl text-xs text-white font-semibold shadow-sm shadow-[#09a1e5]/20 transition-all">
              <Plus size={13} /> Nova tarefa
            </Link>
          </div>
        </div>

        {/* Rituais da Semana — hábitos recorrentes */}
        {!foco && view === "hoje" && <WeeklyRitualsBanner />}

        {/* KPI Cards — Hoje / Sprint Ativa / Entregas Próximas / Impact XP */}
        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 ${foco || view !== "hoje" ? "hidden" : ""}`}>
          <KpiResourceCard label="Hoje" value={missoesHoje.length} sub="missões do dia" icon={Target} accent="#22d3ee" />
          <KpiResourceCard label="Sprint Ativa" value={`${activeFrentePct}%`} sub={activeFrente ? `${activeFrente.sprintNome} · ${activeFrenteDone}/${activeFrente.tasks.length}` : "—"} icon={Flag} accent="#a78bfa" pct={activeFrentePct} />
          <KpiResourceCard label="Entregas Próximas" value={proximos7dias.length} sub="nos próximos 7 dias" icon={Calendar} accent="#fbbf24" />
          <KpiResourceCard label="Impact XP" value={equity.xpEarned.toLocaleString("pt-BR")} sub={xpWeek > 0 ? `+${xpWeek.toLocaleString("pt-BR")} XP esta semana` : "acumulado"} icon={Trophy} accent="#34d399" />
        </div>

        {/* Objetivos do Mês — tira compacta */}
        {!foco && view === "hoje" && (
          <div className={`${cc.panel} p-4`}>
            <p className="text-[11px] font-bold text-slate-400 mb-3">Objetivos do Mês</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {MONTHLY_GOALS.map(withLiveGoal).map(goal => {
                const { pct, status } = getGoalProgress(goal);
                const meta = GOAL_STATUS_META[status];
                const Icon = goal.icon;
                return (
                  <div key={goal.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <Icon size={16} className={`${meta.color} shrink-0`} />
                    <span className="text-[13px] font-semibold text-slate-200 truncate flex-1">{goal.title}</span>
                    {goal.current != null && goal.target != null && (
                      <span className={`${mono.className} text-xs text-slate-400 shrink-0`}>
                        {formatGoalValue(goal.current, goal.unit)}/{formatGoalValue(goal.target, goal.unit)}
                      </span>
                    )}
                    <span className={`${mono.className} text-sm font-bold ${meta.color} shrink-0`}>{pct !== null ? `${pct}%` : "—"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Equity Readiness — accordion */}
        {!foco && view === "hoje" && (
          <div className={cc.panel}>
            <button onClick={() => setEquityOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3 text-left">
              <span className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <Sparkles size={15} className="text-amber-400" /> Equity Readiness
              </span>
              <div className="flex items-center gap-2">
                <span className={`${mono.className} text-xs font-bold text-slate-400`}>
                  {equity.xpEarned.toLocaleString("pt-BR")} XP · {equity.pct}%
                </span>
                <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${equityOpen ? "rotate-180" : ""}`} />
              </div>
            </button>
            {equityOpen && (
              <div className="px-4 pb-4">
                <div className="h-2.5 rounded-full overflow-hidden bg-white/[0.06]">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-[#09a1e5] transition-all duration-700" style={{ width: `${equity.pct}%` }} />
                </div>
                <p className="text-xs text-slate-500 mt-2.5">
                  Medidor simbólico de impacto acumulado (entregas concluídas + evidências), não é cálculo legal de equity.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className={`flex flex-wrap gap-2 ${foco ? "hidden" : ""}`}>
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar tarefa, projeto…"
              className="w-full bg-[#111A2E] border border-slate-800/70 rounded-xl shadow-sm pl-8 pr-3 py-2 text-sm text-slate-100 placeholder-slate-400 outline-none focus:border-[#09a1e5]" />
          </div>
          <button onClick={() => setDeadlineOnly(v => !v)}
            title="Mostrar só tarefas atrasadas ou com prazo nos próximos 7 dias"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all border whitespace-nowrap ${deadlineOnly ? "bg-amber-500/15 border-amber-500/40 text-amber-300" : "bg-[#111A2E] border-slate-800/70 text-slate-300 hover:text-white"}`}>
            <Clock size={13} /> Prazos próximos
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-[#111A2E] rounded-2xl animate-pulse border border-slate-800" />)}</div>
        ) : view === "hoje" ? (
          <div className="space-y-5">

            {/* ── RITUAIS — highlighted ring so it can't be missed ── */}
            <div className="rounded-2xl ring-1 ring-amber-400/25 shadow-[0_0_30px_rgba(251,191,36,0.07)]">
              <WeeklyRitualsBanner />
            </div>

            {/* ── FRENTES GRID — 8 work areas ── */}
            <div>
              <p className={`${mono.className} text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 px-0.5`}>Áreas de trabalho</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(Object.keys(FRONTES) as FronteKey[]).map(key => {
                  const f = FRONTES[key];
                  const Icon = FRENTE_ICONS[key];
                  const s = fronteStats[key];
                  const isSelected = selectedFronte === key;
                  const today2 = todayStr();
                  const dueLabel = s.nextDue
                    ? s.nextDue < today2
                      ? "Atrasada"
                      : new Date(s.nextDue).toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit" })
                    : null;
                  return (
                    <button key={key} onClick={() => setSelectedFronte(k => k === key ? null : key)}
                      className="text-left p-4 rounded-2xl border transition-all"
                      style={{
                        borderColor: isSelected ? f.color + "70" : "rgba(255,255,255,0.07)",
                        background: isSelected ? f.color + "12" : "#0B132480",
                        boxShadow: isSelected ? `0 0 30px ${f.color}18` : undefined,
                      }}>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: f.color + "18", border: `1px solid ${f.color}35` }}>
                          <Icon size={16} style={{ color: f.color }} />
                        </div>
                        {s.overdue > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25 shrink-0">
                            {s.overdue}d atrasada{s.overdue !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-slate-100 leading-tight">{f.name}</p>
                      <p className={`${mono.className} text-[10px] text-slate-500 mt-0.5`}>
                        {s.open} aberta{s.open !== 1 ? "s" : ""} · {s.sprintCount} sprint{s.sprintCount !== 1 ? "s" : ""}
                      </p>
                      <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.pct}%`, background: f.color }} />
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className={`${mono.className} text-[10px] font-bold`} style={{ color: f.color }}>{s.pct}%</span>
                        {dueLabel && (
                          <span className={`${mono.className} text-[9px] ${s.nextDue && s.nextDue < today2 ? "text-red-400 font-bold" : "text-slate-500"}`}>
                            📅 {dueLabel}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── FRENTE DETAIL (when a front is selected) ── */}
            {selectedFronte && (() => {
              const f = FRONTES[selectedFronte];
              const Icon = FRENTE_ICONS[selectedFronte];
              const frenteTasks = live.filter(t => getFronte(t) === selectedFronte);
              const openTasks = frenteTasks.filter(t => !["done","archived"].includes(t.execution_status));
              const doneTasks = frenteTasks.filter(t => t.execution_status === "done");
              // group open tasks by sprint label
              const sprintGroups: { label: string; tasks: ExtendedTask[] }[] = [];
              const seen = new Map<string, ExtendedTask[]>();
              for (const t of openTasks) {
                const label = (t.projeto ?? "").split(" / ")[0]?.trim() || "Sem sprint";
                if (!seen.has(label)) { seen.set(label, []); sprintGroups.push({ label, tasks: seen.get(label)! }); }
                seen.get(label)!.push(t);
              }
              sprintGroups.sort((a, b) => {
                const na = /sprint\s*(\d+)/i.exec(a.label), nb = /sprint\s*(\d+)/i.exec(b.label);
                if (na && nb) return Number(na[1]) - Number(nb[1]);
                return a.label === "Sem sprint" ? 1 : -1;
              });
              return (
                <div className={`${cc.panel} overflow-hidden`}>
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: f.color + "18", border: `1px solid ${f.color}35` }}>
                      <Icon size={16} style={{ color: f.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">{f.name}</p>
                      <p className={`${mono.className} text-[10px] text-slate-400`}>{openTasks.length} abertas · {doneTasks.length} concluídas</p>
                    </div>
                    <button onClick={() => setSelectedFronte(null)}
                      className="text-slate-400 hover:text-white transition-colors ml-auto shrink-0">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="p-4 space-y-5">
                    {sprintGroups.length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-4">Nenhuma tarefa aberta nesta frente.</p>
                    )}
                    {sprintGroups.map(g => {
                      const sprintDone = frenteTasks.filter(t => t.execution_status === "done" && ((t.projeto ?? "").split(" / ")[0]?.trim() || "Sem sprint") === g.label).length;
                      const sprintTotal = g.tasks.length + sprintDone;
                      const sprintPct2 = sprintTotal > 0 ? Math.round((sprintDone / sprintTotal) * 100) : 0;
                      const isActiveSprint = g.label === sprintName;
                      return (
                        <div key={g.label}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <RingProgress pct={sprintPct2} size={24} stroke={2.5} color={isActiveSprint ? "#09a1e5" : f.color}>
                                {isActiveSprint ? <Rocket size={9} className="text-[#09a1e5]" /> : <Flag size={9} style={{ color: f.color }} />}
                              </RingProgress>
                              <p className="text-xs font-bold text-slate-100 truncate">{g.label}</p>
                              {isActiveSprint && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#09a1e5]/20 text-[#09a1e5] border border-[#09a1e5]/30 shrink-0">ATIVA</span>}
                            </div>
                            <span className={`${mono.className} text-[10px] text-slate-500 shrink-0`}>{sprintPct2}% · {sprintDone}/{sprintTotal}</span>
                          </div>
                          <div className="space-y-1.5 pl-1">
                            {g.tasks.map(t => (
                              <TaskRow key={t.id} task={t} onEdit={setEditTask} onMove={applyMove} onSave={handleSave}
                                completing={completingIds.has(t.id)} onComplete={handleCompleteFoco}
                                onCancel={handleCancelTask} onPostpone={handlePostponeTask} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* ── BOTTOM SPLIT: Foco do dia (L) + Sprint carousel (R) ── */}
            <div className={`grid gap-4 ${foco ? "" : "lg:grid-cols-3"}`}>

            {/* LEFT — Foco do dia */}
            <div className={`${cc.panel} overflow-hidden ${foco ? "" : "lg:col-span-2"}`}>
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.06]">
                <div className="w-8 h-8 rounded-xl bg-[#09a1e5]/10 border border-[#09a1e5]/20 flex items-center justify-center shrink-0">
                  <Target size={15} className="text-[#09a1e5]" />
                </div>
                <p className="text-sm font-bold text-slate-100">Foco de Hoje</p>
                {missoesHoje.length > 0 && (
                  <span className={`${mono.className} ml-auto text-[11px] font-bold text-slate-400`}>
                    {missoesConcluidas}/{missoesHoje.length} · {xpPossivelHoje} XP possível
                  </span>
                )}
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
                <div className="p-4 space-y-3">
                  {showActivateNextSprint && (
                    <div className={`${cc.cardActive} ${cc.glow} p-4 flex items-center justify-between gap-3 flex-wrap`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                          <Trophy size={18} className="text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Sprint concluída! 🎉</p>
                          <p className="text-xs text-slate-400 mt-0.5">{sprintName} chegou a 100%. Pronto para puxar a {nextSprintLabel} para o foco?</p>
                        </div>
                      </div>
                      <button onClick={() => activateNextSprint(nextSprintTasks.map(t => t.id))} disabled={activatingSprint}
                        className="flex items-center gap-1.5 px-3 py-2 bg-[#09a1e5] hover:bg-[#0891d5] rounded-xl text-xs text-white font-semibold shadow-sm shadow-[#09a1e5]/20 transition-all disabled:opacity-50 shrink-0">
                        <Rocket size={13} /> {activatingSprint ? "Ativando…" : `Ativar ${nextSprintLabel}`}
                      </button>
                    </div>
                  )}
                  {missaoPrincipal && (
                    <div>
                      <p className="text-[11px] text-amber-400 font-bold tracking-wide mb-2 px-1 flex items-center gap-1.5">
                        <Sparkles size={12} /> Missão principal
                      </p>
                      <SortableContext items={[missaoPrincipal.id]} strategy={verticalListSortingStrategy}>
                        <div className={`${cc.cardActive} ${cc.glow} p-1`}>
                          <AnimatePresence mode="popLayout">
                            <TaskRow key={missaoPrincipal.id} task={missaoPrincipal} onEdit={setEditTask} onMove={applyMove} onSave={handleSave} draggable
                              completing={completingIds.has(missaoPrincipal.id)} onComplete={handleCompleteFoco}
                              onCancel={handleCancelTask} onPostpone={handlePostponeTask} />
                          </AnimatePresence>
                        </div>
                      </SortableContext>
                    </div>
                  )}
                  {missoesSecundarias.length > 0 && (
                    <div className="pt-1">
                      <p className="text-[11px] text-slate-400 font-bold tracking-wide mb-2 px-1 mt-2">Missões secundárias</p>
                      <SortableContext items={missoesSecundarias.map(t => t.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                          <AnimatePresence mode="popLayout">
                            {missoesSecundarias.map(t => <TaskRow key={t.id} task={t} onEdit={setEditTask} onMove={applyMove} onSave={handleSave} draggable
                              completing={completingIds.has(t.id)} onComplete={handleCompleteFoco}
                              onCancel={handleCancelTask} onPostpone={handlePostponeTask} />)}
                          </AnimatePresence>
                        </div>
                      </SortableContext>
                    </div>
                  )}
                  {extrasHoje.length > 0 && (
                    <div className="pt-1">
                      <p className="text-[11px] text-violet-300 font-bold tracking-wide mb-2 px-1 mt-2 flex items-center gap-1.5">
                        <Sparkles size={12} /> Adicionadas para hoje (fora do sprint)
                      </p>
                      <SortableContext items={extrasHoje.map(t => t.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                          <AnimatePresence mode="popLayout">
                            {extrasHoje.map(t => <TaskRow key={t.id} task={t} onEdit={setEditTask} onMove={applyMove} onSave={handleSave} draggable
                              completing={completingIds.has(t.id)} onComplete={handleCompleteFoco}
                              onCancel={handleCancelTask} onPostpone={handlePostponeTask}
                              className="border-violet-500/40 bg-violet-500/[0.06]" />)}
                          </AnimatePresence>
                        </div>
                      </SortableContext>
                    </div>
                  )}
                  {missoesHoje.length === 0 && (
                    <p className="text-sm text-slate-400 py-6 text-center">Nada marcado para hoje — backlog vazio ou tudo concluído.</p>
                  )}
                  {focoHoje.length > FOCUS_LIMIT_TODAY && (
                    <p className="text-xs text-amber-400 text-center pt-1">Foco demais — você tem {focoHoje.length} tarefas hoje, mova algumas para a sprint.</p>
                  )}
                  {missoesHoje.length > 0 && (
                    <div className="pt-3 mt-1 border-t border-white/[0.06]">
                      <p className="text-[11px] text-slate-400 font-bold tracking-wide mb-2 px-1 pt-2">Arraste uma missão para</p>
                      <div className="flex flex-wrap gap-1.5 px-1">
                        <DropChip id="sprint" label="Sprint ativa" icon={<Flag size={11} />} hint="Move para a sprint ativa" />
                        <DropChip id="backlog" label="Backlog" icon={<LayoutGrid size={11} />} hint="Volta para o backlog" />
                        <DropChip id="done" label="Concluído" icon={<CheckCircle2 size={11} />} hint="Marca como concluído e gera XP" />
                        <DropChip id="trash" label="Arquivar" icon={<Ban size={11} />} hint="Arquiva (não exclui)" />
                      </div>
                    </div>
                  )}
                  <button onClick={() => navigate("/tasks/backlog")}
                    className="w-full text-center text-xs text-slate-400 hover:text-[#09a1e5] transition-colors pt-2">
                    Mudar foco no Backlog →
                  </button>
                </div>
                <DragOverlay>
                  {activeTask && (
                    <div className={`${cc.cardActive} ${cc.glow} p-3 rotate-1`}>
                      <p className="text-sm font-medium text-slate-100">{activeTask.titulo}</p>
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
            </div>

            {/* RIGHT — Sprint carousel */}
            {!foco && (
              <div className={`${cc.panel} overflow-hidden flex flex-col`}>
                {mapaMeses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 py-10 gap-3">
                    <Rocket size={28} className="text-slate-600" />
                    <p className="text-xs text-slate-500">Nenhum sprint definido ainda</p>
                    <button onClick={() => navigate("/tasks/mapa")} className="text-xs text-[#09a1e5] hover:underline">Ver mapa completo →</button>
                  </div>
                ) : (() => {
                  const idx = Math.min(carouselMonthIdx, mapaMeses.length - 1);
                  const month = mapaMeses[idx];
                  const today = todayStr();
                  return (
                    <>
                      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                        <button onClick={() => setCarouselMonthIdx(i => Math.max(0, i - 1))}
                          disabled={idx === 0}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                          <ChevronLeft size={14} />
                        </button>
                        <div className="flex-1 flex items-center gap-2 min-w-0 justify-center">
                          <Calendar size={13} className="text-violet-400 shrink-0" />
                          <p className="text-sm font-bold text-slate-100 truncate">{month.titulo}</p>
                          <span className={`${mono.className} text-[11px] font-bold text-violet-300 shrink-0`}>{month.pct}%</span>
                        </div>
                        <button onClick={() => setCarouselMonthIdx(i => Math.min(mapaMeses.length - 1, i + 1))}
                          disabled={idx === mapaMeses.length - 1}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                          <ChevronRight size={14} />
                        </button>
                      </div>
                      <div className="px-5 pt-3">
                        <div className="h-1.5 rounded-full overflow-hidden bg-white/[0.06]">
                          <div className={`h-full rounded-full transition-all duration-700 ${month.pct >= 80 ? "bg-emerald-500" : month.pct >= 50 ? "bg-amber-500" : "bg-[#09a1e5]"}`}
                            style={{ width: `${month.pct}%` }} />
                        </div>
                      </div>
                      <div className="p-3 space-y-2 overflow-y-auto flex-1">
                        {month.sprints.map(s => {
                          const isActive = s.label === sprintName;
                          const isDone = s.pct === 100;
                          const overdue = s.tasks.some(t => t.data_foco && t.data_foco < today && t.execution_status !== "done" && t.execution_status !== "archived");
                          return (
                            <button key={s.n}
                              onClick={() => { if (!isActive) activateSprint(s.label, s.tasks); }}
                              className={`group w-full text-left p-3 rounded-xl transition-all ${isActive ? cc.cardActive + " " + cc.glow + " border-2 border-[#09a1e5] ring-1 ring-[#09a1e5]/50" : cc.card + " hover:border-violet-400/40"}`}>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <RingProgress pct={s.pct} size={24} stroke={2.5} color={isDone ? "#34d399" : "#a78bfa"}>
                                    {isDone ? <CheckCircle2 size={10} className="text-emerald-400" /> : <Rocket size={9} className="text-violet-300" />}
                                  </RingProgress>
                                  <p className="text-[11px] font-bold text-slate-100 truncate">{s.label}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {overdue && !isDone && <span className="text-[9px] text-red-400 font-bold">ATRASADO</span>}
                                  {isActive
                                    ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#09a1e5]/20 text-[#09a1e5]">ATIVA</span>
                                    : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-300 opacity-0 group-hover:opacity-100 transition-opacity">Ativar</span>}
                                </div>
                              </div>
                              <p className={`${mono.className} text-[10px] text-slate-400 mt-1.5 pl-1`}>{s.done}/{s.tasks.length} tarefas · {s.pct}%</p>
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.06]">
                        <span className={`${mono.className} text-[10px] text-slate-500`}>{idx + 1} / {mapaMeses.length}</span>
                        <button onClick={() => navigate("/tasks/mapa")} className="text-xs text-slate-400 hover:text-[#09a1e5] transition-colors">
                          Ver mapa completo →
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
            </div>
          </div>
        ) : view === "mapa" ? (
          <div className="space-y-4">
            {mapaMeses.length === 0 && (
              <p className="text-sm text-slate-300 py-8 text-center">Nenhuma tarefa com sprint definida ainda.</p>
            )}
            <p className="text-[11px] text-slate-400 px-1">Arraste um card de sprint para outro mês para reorganizar o roadmap.</p>
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onMapaDragEnd}>
              <div>
                <p className="text-[11px] font-bold text-slate-300 px-1 mb-2 uppercase tracking-wide">Foco atual</p>
                {mapaMeses.slice(0, 3).map(month => (
                  <div key={month.key} className={`${cc.panel} overflow-hidden mb-4`}>
                    {/* Header: month icon+title left, "Progresso do mês" + big % right */}
                    <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-[#09a1e5]/10 border border-[#09a1e5]/20 flex items-center justify-center shrink-0">
                          <Calendar size={15} className="text-[#09a1e5]" />
                        </div>
                        <p className="text-sm font-bold text-slate-100 truncate">{month.titulo}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progresso do mês</p>
                        <p className={`${mono.className} text-2xl font-extrabold text-[#09a1e5] leading-none`}>{month.pct}%</p>
                      </div>
                    </div>

                    {/* Full-width linear progress bar */}
                    <div className="px-5 pb-4">
                      <div className="h-2.5 rounded-full overflow-hidden bg-slate-800">
                        <div className="h-full rounded-full bg-[#09a1e5] transition-all duration-700" style={{ width: `${month.pct}%` }} />
                      </div>
                    </div>

                    <div className="px-5 pb-2.5">
                      <ObjectiveEditor
                        value={objectives[`month:${month.key}`] ?? ""}
                        placeholder="Definir objetivo do mês…"
                        onSave={text => saveObjective("month", month.key, text)}
                      />
                    </div>

                    {/* Sprint columns row */}
                    <MonthDropZone id={`monthdrop:${month.key}`}>
                      {month.sprints.map((s) => {
                        const isActive = s.label === sprintName;
                        const isDone = s.pct === 100;
                        const statusLabel = isDone ? "Concluída" : s.pct > 0 ? "Em andamento" : "Não iniciada";
                        const statusColor = isDone ? "text-emerald-400" : s.pct > 0 ? "text-[#09a1e5]" : "text-slate-500";
                        const subtitle = OBJECTIVE_META[s.label]?.desired_outcome ?? objectives[`sprint:${s.n}`] ?? "";
                        return (
                          <DraggableSprintCard key={s.n} id={`sprintcard:${s.n}`}>
                            <SprintMapCard
                              s={s}
                              isActive={isActive}
                              isDone={isDone}
                              statusLabel={statusLabel}
                              statusColor={statusColor}
                              subtitle={subtitle}
                              objectiveValue={objectives[`sprint:${s.n}`] ?? ""}
                              onSaveObjective={text => saveObjective("sprint", String(s.n), text)}
                              onOpen={() => navigate("/tasks/backlog")}
                            />
                          </DraggableSprintCard>
                        );
                      })}
                    </MonthDropZone>
                  </div>
                ))}
              </div>

              {mapaMeses.length > 3 && (
                <div>
                  <button onClick={() => setShowFutureMonths(v => !v)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-800 text-[11px] font-bold text-slate-300 uppercase tracking-wide hover:border-slate-700 transition-colors">
                    <span>Planejamento futuro ({mapaMeses.length - 3} meses)</span>
                    <span className="text-slate-500">{showFutureMonths ? "▲ ocultar" : "▼ mostrar"}</span>
                  </button>
                  {showFutureMonths && (
                    <div className="mt-3 space-y-3 opacity-80">
                      {mapaMeses.slice(3).map(month => (
                        <div key={month.key} className={`${cc.panel} overflow-hidden`}>
                          <div className="px-4 py-2.5 border-b border-slate-800/70 flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-xs font-bold text-slate-300">{month.titulo}</p>
                            {month.total > 0 && (
                              <span className={`${mono.className} text-[10px] font-bold text-slate-500`}>{month.done}/{month.total} · {month.pct}%</span>
                            )}
                          </div>
                          <div className="px-4 py-2.5">
                            <ObjectiveEditor
                              value={objectives[`month:${month.key}`] ?? ""}
                              placeholder="Definir objetivo do mês…"
                              onSave={text => saveObjective("month", month.key, text)}
                            />
                          </div>
                          {month.sprints.length > 0 && (
                            <MonthDropZone id={`monthdrop:${month.key}`}>
                              {month.sprints.map((s) => {
                                const isActive = s.label === sprintName;
                                const isDone = s.pct === 100;
                                return (
                                  <DraggableSprintCard key={s.n} id={`sprintcard:${s.n}`}>
                                    <button onClick={() => navigate("/tasks/backlog")}
                                      className={`w-full text-left rounded-xl p-3 transition-colors border ${isActive ? "bg-[#09a1e5]/10 border-[#09a1e5]/40 ring-1 ring-[#09a1e5]/30" : "bg-slate-900/60 border-slate-800 hover:border-[#09a1e5]/30"}`}>
                                      <div className="flex items-center justify-between gap-1">
                                        <p className="text-xs font-bold text-violet-300 truncate">🚀 {s.label}</p>
                                        {isActive && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#09a1e5]/20 text-[#09a1e5] shrink-0">ATIVA</span>}
                                        {!isActive && isDone && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">✓ Concluída</span>}
                                      </div>
                                      <div className="h-1.5 rounded-full overflow-hidden bg-slate-700 mt-2">
                                        <div className={`h-full rounded-full transition-all duration-700 ${isDone ? "bg-emerald-500" : "bg-violet-500"}`} style={{ width: `${s.pct}%` }} />
                                      </div>
                                      <p className={`${mono.className} text-[10px] text-slate-400 mt-1.5`}>{s.done}/{s.tasks.length} · {s.pct}%</p>
                                    </button>
                                    <div onClick={e => e.stopPropagation()} className="px-1 pb-1">
                                      <ObjectiveEditor
                                        value={objectives[`sprint:${s.n}`] ?? ""}
                                        placeholder="Definir objetivo da sprint…"
                                        onSave={text => saveObjective("sprint", String(s.n), text)}
                                      />
                                    </div>
                                  </DraggableSprintCard>
                                );
                              })}
                            </MonthDropZone>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </DndContext>
          </div>
        ) : view === "historico" ? (
          <div className="space-y-2">
            {historico.length === 0 && (
              <p className="text-sm text-slate-300 py-8 text-center">Nenhuma entrega registrada ainda.</p>
            )}
            {historico.map(t => (
              <div key={t.id} className="bg-[#111A2E] border border-slate-800/70 rounded-xl shadow-sm p-3 flex items-start gap-3">
                <Trophy size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-100">{buildHistoryLine(t)}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {t.categoria && <span className="text-[10px] text-slate-400">{CATEGORIA_ICONS[t.categoria] ?? "📌"} {t.categoria}</span>}
                    <span className={`${mono.className} text-[10px] font-bold text-amber-600`}>+{getEarnedXp(t)} XP{hasEvidence(t) ? " (1.5x evidência)" : ""}</span>
                    {t.url_verificacao && (
                      <a href={t.url_verificacao} target="_blank" rel="noreferrer" className="text-[10px] text-[#09a1e5] hover:underline flex items-center gap-1">
                        <ExternalLink size={9} /> evidência
                      </a>
                    )}
                    <button onClick={() => openResultado(t)}
                      className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors ml-auto">
                      Ver resultado →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : view === "sprint" ? (
          <div className="space-y-4">
            {/* ── Sem sprint: tarefas no bucket sprint sem projeto definido ── */}
            {(() => {
              const unassigned = sprintTasks.filter(t => !t.projeto?.trim());
              if (unassigned.length === 0) return null;
              const existingLabels = Array.from(new Set(
                sprintTasks.filter(t => t.projeto?.trim()).map(t => (t.projeto ?? "").split(" / ")[0]?.trim()).filter(Boolean)
              )).sort((a, b) => {
                const na = Number(/sprint\s*(\d+)/i.exec(a)?.[1] ?? 999);
                const nb = Number(/sprint\s*(\d+)/i.exec(b)?.[1] ?? 999);
                return na - nb;
              });
              return (
                <SprintAssignPanel
                  tasks={unassigned}
                  existingLabels={existingLabels}
                  onAssign={(ids, label) => ids.forEach(id => handleSave(id, { projeto: label }))}
                />
              );
            })()}
            {/* Timeline do sprint ativo */}
            <div className={`${cc.panel} p-4`}>
              <div className="flex items-center justify-between mb-2.5 flex-wrap gap-1">
                <p className="text-sm font-bold text-violet-300 flex items-center gap-1.5">
                  🚀 {sprintName ?? "Sprint da semana"}
                </p>
                <span className={`${mono.className} text-[10px] font-bold text-slate-400`}>
                  {sprintDone}/{sprintTasks.length} concluídas · {sprintPct}%
                </span>
              </div>
              {sprintTasks.length > 0 ? (
                <>
                  <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-800">
                    {sprintStageCounts.map(s => s.count > 0 && (
                      <div key={s.status} className={`${s.color} transition-all duration-700`}
                        style={{ width: `${(s.count / sprintTasks.length) * 100}%` }}
                        title={`${s.label}: ${s.count}`} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    {sprintStageCounts.filter(s => s.count > 0).map(s => (
                      <span key={s.status} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <span className={`w-2 h-2 rounded-full ${s.color}`} /> {s.label} · {s.count}
                      </span>
                    ))}
                  </div>
                  {sprintBlocked > 0 && <p className="text-[10px] text-red-600 mt-2">{sprintBlocked} bloqueada{sprintBlocked > 1 ? "s" : ""} na sprint</p>}
                </>
              ) : (
                <p className="text-xs text-slate-300 py-3 text-center">Nada na sprint ainda — mova tarefas do Backlog.</p>
              )}
            </div>

            {/* Atrasadas */}
            {atrasadas.length > 0 && (
              <Block title="Atrasadas" icon="⏰" accent="bg-amber-500/10 text-amber-300"
                right={<span className={`${mono.className} ml-auto text-[10px] font-bold opacity-60`}>{atrasadas.length}</span>}>
                {atrasadas.map(t => <TaskRow key={t.id} task={t} onEdit={setEditTask} onMove={applyMove} onSave={handleSave} />)}
              </Block>
            )}

            {/* Próximos 7 dias */}
            <Block title="Próximos 7 dias" icon="📅" accent="bg-cyan-500/10 text-cyan-300"
              right={<span className={`${mono.className} ml-auto text-[10px] font-bold opacity-60`}>{proximos7dias.length}</span>}>
              {proximos7dias.length === 0
                ? <p className="text-xs text-slate-300 py-3 text-center">Nada com data marcada para os próximos 7 dias.</p>
                : proximos7dias.map(t => <TaskRow key={t.id} task={t} onEdit={setEditTask} onMove={applyMove} onSave={handleSave} />)}
            </Block>

            {/* Frentes da sprint — uma sprint deve focar em UM objetivo por vez */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2 px-1">
                <p className="text-[11px] text-slate-400">
                  {sprintFilter === "ativa"
                    ? "🎯 Objetivos deste mês — cada um com sua sprint focada (5-12 missões). O objetivo com mais pendências fica aberto por padrão; os outros ficam recolhidos."
                    : "🗺️ Todos os sprints, organizados por mês. Clique em \"Ativar\" para tornar um deles o foco do mês."}
                </p>
                <div className="flex bg-slate-900/60 border border-slate-800 rounded-xl p-1 gap-1 shrink-0">
                  {([["ativa", "Sprint ativa"], ["todas", "Todos os sprints"]] as const).map(([f, label]) => (
                    <button key={f} onClick={() => setSprintFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${sprintFilter === f ? "bg-slate-800 text-white shadow-sm border border-slate-700" : "text-slate-400 hover:text-slate-100"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {sprintFilter === "ativa" ? (
                sprintFrentes.length === 0 ? (
                  <div className={`${cc.panel} p-4`}>
                    <p className="text-xs text-slate-300 py-3 text-center">Vazio.</p>
                  </div>
                ) : (
                  sprintFrentes.map((f, i) => (
                    <ObjetivoSection
                      key={f.name}
                      objetivo={f.name}
                      sprintNome={f.sprintNome}
                      desiredOutcome={OBJECTIVE_META[f.name]?.desired_outcome}
                      tasks={f.tasks}
                      objective={objectives[`frente:${f.name}`] ?? ""}
                      onSaveObjective={text => saveObjective("frente", f.name, text)}
                      onEdit={setEditTask}
                      onMove={applyMove}
                      onSave={handleSave}
                      defaultOpen={i === 0}
                      allTasks={tasks}
                    />
                  ))
                )
              ) : (
                <div className="space-y-3">
                  {mapaMeses.flatMap(m => m.sprints.filter(s => s.tasks.length > 0).map(s => ({ ...s, month: m.titulo })))
                    .map(s => {
                      const isActive = s.label === sprintName;
                      const isDone = s.pct === 100;
                      return (
                        <AllSprintsCard key={s.label} s={s} isActive={isActive} isDone={isDone}
                          onActivate={() => activateSprint(s.label, s.tasks)}
                          onEdit={setEditTask} onMove={applyMove} onSave={handleSave} />
                      );
                    })}
                  {mapaMeses.every(m => m.sprints.every(s => s.tasks.length === 0)) && (
                    <div className={`${cc.panel} p-4`}>
                      <p className="text-xs text-slate-300 py-3 text-center">Nenhum sprint encontrado.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : view === "backlog" ? (
          <div className="space-y-6">
            {backlogGroups.length === 0 && (
              <p className="text-sm text-slate-300 py-8 text-center">Backlog vazio.</p>
            )}
            <p className="text-[11px] text-slate-400 px-1">Arraste uma tarefa pelo ícone <GripVertical size={11} className="inline -mt-0.5" /> para mover entre sprints/backlog.</p>
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onBacklogDragEnd}>
              {backlogByMonth.monthGroups.map(month => (
                <div key={month.key} className="space-y-3">
                  <h2 className="text-sm font-black text-slate-100 px-1">{month.titulo}</h2>
                  {month.groups.map((group: { name: string; tasks: ExtendedTask[] }) => {
                    const objetivos = Array.from(new Set(group.tasks.map((t: ExtendedTask) => getObjetivoNome(t)))).sort();
                    const isSprintGroup = /sprint/i.test(group.name);
                    const isMisc = /^misc/i.test(group.name);
                    return (
                      <GroupDropZone key={group.name} id={`group:${group.name}`}>
                        <div className="flex items-center gap-2 px-1">
                          {editingGroup === group.name ? (
                            <input autoFocus value={editingGroupName} onChange={e => setEditingGroupName(e.target.value)}
                              onBlur={() => { renameGroup(group.name, editingGroupName); setEditingGroup(null); }}
                              onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEditingGroup(null); }}
                              className="text-xs font-bold bg-transparent border-b border-slate-600 outline-none text-slate-200" />
                          ) : (
                            <span className={`text-xs font-bold ${isSprintGroup ? "text-violet-300" : "text-slate-400"}`}>
                              {isSprintGroup ? "🚀 " : "📥 "}{group.name}
                            </span>
                          )}
                          {isMisc && editingGroup !== group.name && (
                            <button onClick={() => { setEditingGroup(group.name); setEditingGroupName(group.name); }}
                              className="text-slate-500 hover:text-slate-300"><Pencil size={10} /></button>
                          )}
                          <span className={`${mono.className} text-[10px] text-slate-400`}>{group.tasks.length}</span>
                        </div>
                        {objetivos.map((obj: string) => {
                          const objTasks = group.tasks.filter((t: ExtendedTask) => getObjetivoNome(t) === obj);
                          if (objTasks.length === 0) return null;
                          const sprintNome = getSprintNome(objTasks[0]);
                          const label = sprintNome && sprintNome !== obj ? `${obj} · ${sprintNome}` : obj;
                          return <CategorySection key={obj} categoria={label} tasks={objTasks} onEdit={setEditTask} onMove={applyMove} onSave={handleSave} draggable />;
                        })}
                      </GroupDropZone>
                    );
                  })}
                </div>
              ))}
              {backlogByMonth.semMes.map((group: { name: string; tasks: ExtendedTask[] }) => {
                const cats = Array.from(new Set(group.tasks.map((t: ExtendedTask) => t.categoria ?? "Outros"))).sort();
                const isSprintGroup = /sprint/i.test(group.name);
                return (
                  <GroupDropZone key={group.name} id={`group:${group.name}`}>
                    <div className="flex items-center gap-2 px-1">
                      <span className={`text-xs font-bold ${isSprintGroup ? "text-violet-300" : "text-slate-400"}`}>
                        {isSprintGroup ? "🚀 " : "📥 "}{group.name}
                      </span>
                      <span className={`${mono.className} text-[10px] text-slate-400`}>{group.tasks.length}</span>
                    </div>
                    {cats.map((cat: string) => {
                      const catTasks = group.tasks.filter((t: ExtendedTask) => (t.categoria ?? "Outros") === cat);
                      if (catTasks.length === 0) return null;
                      return <CategorySection key={cat} categoria={cat} tasks={catTasks} onEdit={setEditTask} onMove={applyMove} onSave={handleSave} draggable />;
                    })}
                  </GroupDropZone>
                );
              })}
              <DragOverlay>
                {activeTask && (
                  <div className="bg-[#111A2E] border border-[#09a1e5]/40 rounded-xl shadow-lg p-3 rotate-1">
                    <p className="text-sm font-medium text-slate-100">{activeTask.titulo}</p>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          </div>
        ) : view === "avancado" ? (
          <div className="space-y-3">
            <div className="flex bg-slate-900/60 border border-slate-800 rounded-xl p-1 gap-1 w-fit">
              {([["kanban", <Columns3 key="a1" size={13} />, "Board"], ["tabela", <Table2 key="a2" size={13} />, "Tabela"]] as const).map(([v, icon, label]) => (
                <button key={v} onClick={() => setAvancadoView(v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${avancadoView === v ? "bg-slate-800 text-white shadow-sm border border-slate-700" : "text-slate-400 hover:text-slate-100"}`}>
                  {icon}{label}
                </button>
              ))}
            </div>
            {avancadoView === "tabela" ? (
              <TableView tasks={[...live].sort((a, b) => a.order_index - b.order_index)} onEdit={setEditTask} onMove={applyMove} onSave={handleSave} />
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
                <div className="flex justify-end -mb-1">
                  <button onClick={() => setShowTrash(s => !s)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${showTrash ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200"}`}>
                    🗑️ Lixeira {grouped.trash.length > 0 && `(${grouped.trash.length})`}
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
                  {COLUMNS.filter(c => c.id !== "trash" || showTrash).map(col => (
                    <KanbanColumn key={col.id} column={col} tasks={grouped[col.id]} onEdit={setEditTask} onMove={applyMove} onQuickAdd={quickAdd} />
                  ))}
                </div>
                <DragOverlay>
                  {activeTask && (
                    <div className="bg-[#111A2E] border border-[#09a1e5]/40 rounded-xl shadow-lg p-3 w-[260px] rotate-2">
                      <p className="text-sm font-medium text-slate-100">{activeTask.titulo}</p>
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        ) : null}
      </div>

      {/* Edit modal */}
      {editTask && (
        <EditModal task={editTask} onClose={handleModalClose}
          onSave={handleSave} onMove={applyMove}
          onChildTasksCreated={created => setTasks(prev => [...prev, ...created])}
          onTaskUpdated={handleSave} allTasks={tasks} initialTab={editTaskTab} key={`${editTask.id}-${editTaskTab}`}
          forceResultPrompt={pendingCompleteId === editTask.id}
          onCompleteWithoutResult={() => completeWithoutResult(editTask.id)} />
      )}

      <UndoToast undo={undoState} onUndo={handleUndo} onDismiss={() => setUndoState(null)} />
    </div>
    </ArtifactCountsContext.Provider>
  );
}
