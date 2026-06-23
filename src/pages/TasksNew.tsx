import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Flag, Zap, Calendar, User,
  MessageCircle, Sparkles, CheckCircle2, Loader2, ExternalLink,
} from "lucide-react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { createTask } from "../lib/tasks";
import type { PlanningBucket, TaskInsert } from "../lib/tasks";
import { supabase } from "../lib/supabase";

interface LeadOption { id: string; label: string; }

type Mode = "formulario" | "dump";

interface ParsedTask {
  titulo: string;
  descricao: string | null;
  prioridade: 1 | 2 | 3;
  urgencia: 1 | 2 | 3;
  impacto?: 1 | 2 | 3;
  responsavel: string | null;
  notas: string | null;
  categoria?: string | null;
  projeto?: string | null;
  sprint?: string | null;
  done_criteria?: string | null;
}

const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "700"] });

const PRIO_LABELS: Record<number, string> = { 1: "Baixa", 2: "Média", 3: "Alta" };
const URG_LABELS:  Record<number, string> = { 1: "Pode esperar 🟢", 2: "Logo 🟡", 3: "Urgente 🔴" };

const CATEGORIAS = [
  "Admin/Banco", "Bot/Chatwoot", "Ads/Tracking", "Site/SEO", "Instagram/Conteúdo",
  "Automações", "Dashboard/Dados", "Operação", "Estratégia/CEO", "Segurança", "Outros",
] as const;
const CATEGORIA_ICONS: Record<string, string> = {
  "Admin/Banco": "🗄️", "Bot/Chatwoot": "🤖", "Ads/Tracking": "🎯", "Site/SEO": "🌐",
  "Instagram/Conteúdo": "📸", "Automações": "⚙️", "Dashboard/Dados": "📊",
  "Operação": "🏍️", "Estratégia/CEO": "🧭", "Segurança": "🔒", "Outros": "📌",
};
const IMPACTO_LABELS: Record<number, string> = { 1: "Baixo", 2: "Médio", 3: "Alto" };

// ─── Text Dump Mode ───────────────────────────────────────────────────────────

function DumpMode({ leads, onDone }: { leads: LeadOption[]; onDone: () => void }) {
  const navigate = useNavigate();
  const [texto, setTexto] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedTask[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setLeadId] = useState("");
  const [categoria, setCategoria] = useState<string>("");

  async function parse() {
    if (!texto.trim()) return;
    setParsing(true);
    setError(null);
    setParsed(null);
    try {
      // AI parse-tasks not wired yet — stub for future Azure OpenAI integration
      setError("AI task parsing not available yet. Use the form mode instead.");
      return;
    } catch {
      setError("Falha na chamada à IA");
    } finally {
      setParsing(false);
    }
  }

  async function saveSelected() {
    if (!parsed) return;
    setSaving(true);
    const toSave = parsed.filter((_, i) => selected.has(i));
    for (const t of toSave) {
      const projeto = [t.sprint, t.projeto].filter(Boolean).join(" / ") || null;
      await createTask({
        titulo: t.titulo,
        descricao: t.descricao,
        prioridade: t.prioridade,
        urgencia: t.urgencia,
        responsavel: t.responsavel,
        notas: t.notas,
        status: "backlog",
        client_id: clientId || null,
        semana_alvo: null,
        url_verificacao: null,
        categoria: categoria || t.categoria || null,
        projeto,
        impacto: t.impacto ?? 2,
        done_criteria: t.done_criteria ?? null,
        planning_bucket: "backlog",
        execution_status: "todo",
      } as Omit<TaskInsert, "concluido_em">);
    }
    setSaving(false);
    navigate("/tasks");
  }

  const SCORE_COLOR = (p: number, u: number) => {
    const s = p * u;
    if (s >= 6) return "border-red-500/30 bg-red-50";
    if (s >= 3) return "border-amber-500/30 bg-amber-50";
    return "border-slate-200 bg-slate-50";
  };

  return (
    <div className="space-y-5">
      <div className="bg-cyan-50 border border-cyan-500/20 rounded-2xl px-4 py-3 text-xs text-cyan-700 leading-relaxed">
        <span className="font-bold">Modo IA:</span> Cole qualquer texto — lista de ideias, notas de reunião, backlog no WhatsApp, parágrafo longo. A IA organiza tudo em tarefas estruturadas para você revisar antes de salvar.
      </div>

      <textarea
        value={texto}
        onChange={e => setTexto(e.target.value)}
        rows={8}
        placeholder={`Ex:\n- Ajustar preços no catálogo\n- Configurar Instagram Messenger urgente\n- Bruno precisa revisar contratos essa semana\n- Criar página de manutenção no ar logo\n...\n\nOu cole qualquer texto, parágrafo, lista, notas de reunião...`}
        className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#09a1e5] resize-none font-mono"
      />

      <div>
        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1.5">Categoria (opcional — aplica a todas)</label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIAS.map(c => (
            <button type="button" key={c} onClick={() => setCategoria(prev => prev === c ? "" : c)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${categoria === c ? "bg-cyan-50 border-cyan-500/30 text-cyan-700" : "bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-700"}`}>
              {CATEGORIA_ICONS[c]} {c}
            </button>
          ))}
        </div>
      </div>

      {leads.length > 0 && (
        <div>
          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1 mb-1.5">
            <MessageCircle size={10} /> Lead relacionado (opcional — aplica a todas)
          </label>
          <select value={clientId} onChange={e => setLeadId(e.target.value)}
            className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 outline-none">
            <option value="">Nenhum</option>
            {leads.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </div>
      )}

      <button onClick={parse} disabled={parsing || !texto.trim()}
        className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-50 hover:bg-cyan-100 border border-cyan-500/30 rounded-xl text-cyan-700 font-black text-sm transition-all disabled:opacity-40">
        {parsing ? <><Loader2 size={15} className="animate-spin" /> Analisando…</> : <><Sparkles size={15} /> Organizar com IA</>}
      </button>

      {error && <p className="text-red-600 text-sm text-center">{error}</p>}

      {/* Parsed results */}
      {parsed && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900">{parsed.length} tarefas encontradas</p>
            <div className="flex gap-2 text-xs">
              <button onClick={() => setSelected(new Set(parsed.map((_,i)=>i)))}
                className="text-cyan-600 hover:text-[#09a1e5] transition-colors">Todas</button>
              <button onClick={() => setSelected(new Set())}
                className="text-slate-500 hover:text-slate-600 transition-colors">Nenhuma</button>
            </div>
          </div>

          {parsed.map((t, i) => (
            <div key={i}
              onClick={() => setSelected(prev => {
                const s = new Set(prev);
                s.has(i) ? s.delete(i) : s.add(i);
                return s;
              })}
              className={`cursor-pointer rounded-2xl border px-4 py-3 transition-all ${
                selected.has(i) ? SCORE_COLOR(t.prioridade, t.urgencia) : "border-slate-200 bg-transparent opacity-50"
              }`}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {selected.has(i)
                    ? <CheckCircle2 size={16} className="text-[#09a1e5]" />
                    : <div className="w-4 h-4 rounded-full border border-slate-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{t.titulo}</p>
                  {t.descricao && <p className="text-xs text-slate-500 mt-0.5">{t.descricao}</p>}
                  {(t.sprint || t.projeto) && (
                    <p className="text-[10px] text-cyan-600 mt-1">📁 {[t.sprint, t.projeto].filter(Boolean).join(" / ")}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {t.categoria && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border bg-slate-100 border-slate-200 text-slate-500">
                        {CATEGORIA_ICONS[t.categoria] ?? "📌"} {t.categoria}
                      </span>
                    )}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                      t.prioridade === 3 ? "bg-red-50 border-red-500/25 text-red-700" :
                      t.prioridade === 2 ? "bg-amber-50 border-amber-500/25 text-amber-700" :
                      "bg-slate-100 border-slate-200 text-slate-500"
                    }`}>P{t.prioridade} {PRIO_LABELS[t.prioridade]}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                      t.urgencia === 3 ? "bg-red-50 border-red-500/25 text-red-700" :
                      t.urgencia === 2 ? "bg-amber-50 border-amber-500/25 text-amber-700" :
                      "bg-emerald-50 border-emerald-500/25 text-emerald-700"
                    }`}>U{t.urgencia} {URG_LABELS[t.urgencia]}</span>
                    {t.responsavel && (
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <User size={9} />{t.responsavel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button onClick={saveSelected} disabled={saving || selected.size === 0}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-500/30 rounded-2xl text-emerald-700 font-black text-sm transition-all disabled:opacity-40">
            {saving
              ? <><Loader2 size={15} className="animate-spin" /> Salvando…</>
              : <><Plus size={15} /> Salvar {selected.size} tarefa{selected.size !== 1 ? "s" : ""}</>}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NovaTarefaPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("formulario");
  const [saving, setSaving] = useState(false);
  const [leads, setLeads] = useState<LeadOption[]>([]);

  const [showAdvanced, setShowAdvanced] = useState(false);

  const [form, setForm] = useState({
    titulo:          "",
    descricao:       "",
    prioridade:      2 as 1 | 2 | 3,
    urgencia:        2 as 1 | 2 | 3,
    destino:         "backlog" as PlanningBucket,
    data_foco:       "",
    responsavel:     "",
    client_id:         "",
    semana_alvo:     "",
    url_verificacao: "",
    notas:           "",
    categoria:       "" as string,
    projeto:         "",
    impacto:         2 as 1 | 2 | 3,
    done_criteria:   "",
  });

  useEffect(() => {
    supabase.from("clients")
      .select("id, name, phone")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setLeads((data ?? []).map(l => ({
          id: l.id,
          label: l.name ?? l.phone ?? l.id.slice(0, 8),
        })));
      });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    setSaving(true);
    try {
      await createTask({
        titulo:          form.titulo.trim(),
        descricao:       form.descricao.trim() || null,
        prioridade:      form.prioridade,
        urgencia:        form.urgencia,
        status:          "backlog",
        responsavel:     form.responsavel.trim() || null,
        client_id:         form.client_id || null,
        semana_alvo:     form.semana_alvo || null,
        url_verificacao: form.url_verificacao.trim() || null,
        notas:           form.notas.trim() || null,
        categoria:       form.categoria || null,
        projeto:         form.projeto.trim() || null,
        impacto:         form.impacto,
        done_criteria:   form.done_criteria.trim() || null,
        data_foco:       form.destino === "today" ? (form.data_foco || null) : null,
        planning_bucket: form.destino,
        execution_status: "todo",
      } as Omit<TaskInsert, "concluido_em">);
      navigate("/tasks");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-slate-900 font-sans">
      <div className="fixed inset-0 pointer-events-none opacity-[0.4]"
        style={{ backgroundImage: "radial-gradient(#CBD5E1 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#09a1e5] via-cyan-300 to-[#09a1e5] z-50" />

      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/tarefas"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors shrink-0 shadow-sm">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <p className={`${mono.className} text-[10px] font-bold text-[#09a1e5] uppercase tracking-[0.25em]`}>Command Center</p>
            <h1 className="text-2xl font-black tracking-tight">Nova tarefa</h1>
            <p className="text-slate-500 text-xs mt-0.5">Adiciona ao backlog de planejamento</p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex p-1 rounded-2xl bg-slate-200/60 border border-slate-200 mb-6">
          <button onClick={() => setMode("formulario")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              mode === "formulario" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}>
            <Plus size={14} /> Formulário
          </button>
          <button onClick={() => setMode("dump")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              mode === "dump" ? "bg-white text-cyan-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}>
            <Sparkles size={14} /> Text Dump + IA
          </button>
        </div>

        {/* Dump mode */}
        {mode === "dump" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
            <DumpMode leads={leads} onDone={() => navigate("/tasks")} />
          </div>
        )}

        {/* Formulário mode */}
        {mode === "formulario" && (
          <form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">

            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1.5">
                Título <span className="text-red-600">*</span>
              </label>
              <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: Ajustar preços no catálogo" required
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#09a1e5]" />
            </div>

            {/* Categoria */}
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1.5">Categoria</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIAS.map(c => (
                  <button type="button" key={c} onClick={() => setForm(f => ({ ...f, categoria: c }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${form.categoria === c ? "bg-cyan-50 border-cyan-500/30 text-cyan-700" : "bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-700"}`}>
                    {CATEGORIA_ICONS[c]} {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Destino: Hoje / Sprint / Backlog */}
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1.5">Onde colocar</label>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  ["today", "📅 Hoje"],
                  ["sprint", "🚀 Sprint"],
                  ["backlog", "📥 Backlog"],
                ] as const).map(([v, label]) => (
                  <button type="button" key={v} onClick={() => setForm(f => ({ ...f, destino: v }))}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${form.destino === v ? "bg-cyan-50 border-cyan-500/30 text-cyan-700" : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dia (só se Hoje) */}
            {form.destino === "today" && (
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1 mb-1.5">
                  <Calendar size={10} /> Dia
                </label>
                <input type="date" value={form.data_foco} onChange={e => setForm(f => ({ ...f, data_foco: e.target.value }))}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#09a1e5]" />
              </div>
            )}

            {/* Mais detalhes (opcional) */}
            <button type="button" onClick={() => setShowAdvanced(s => !s)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
              {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Mais detalhes (opcional)
            </button>

            {showAdvanced && (
              <div className="space-y-5 pt-1 border-t border-slate-100">
                <div className="pt-4">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1.5">Descrição</label>
                  <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                    rows={3} placeholder="Contexto, detalhes, o que precisa ser feito…"
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#09a1e5] resize-none" />
                </div>

                {/* Prioridade + Urgência + Impacto */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1 mb-1.5">
                      <Flag size={10} /> Prioridade
                    </label>
                    <div className="flex gap-1">
                      {([1,2,3] as const).map(v => (
                        <button type="button" key={v} onClick={() => setForm(f => ({ ...f, prioridade: v }))}
                          className={`flex-1 py-2 rounded-lg text-[10px] font-black border transition-all ${form.prioridade === v ? "bg-cyan-50 border-cyan-500/30 text-cyan-700" : "bg-white border-slate-200 text-slate-400"}`}>
                          {PRIO_LABELS[v][0]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1 mb-1.5">
                      <Zap size={10} /> Urgência
                    </label>
                    <div className="flex gap-1">
                      {([1,2,3] as const).map(v => (
                        <button type="button" key={v} onClick={() => setForm(f => ({ ...f, urgencia: v }))}
                          className={`flex-1 py-2 rounded-lg text-[10px] font-black border transition-all ${form.urgencia === v ? "bg-cyan-50 border-cyan-500/30 text-cyan-700" : "bg-white border-slate-200 text-slate-400"}`}>
                          U{v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1.5">Impacto</label>
                    <div className="flex gap-1">
                      {([1,2,3] as const).map(v => (
                        <button type="button" key={v} onClick={() => setForm(f => ({ ...f, impacto: v }))}
                          className={`flex-1 py-2 rounded-lg text-[10px] font-black border transition-all ${form.impacto === v ? "bg-cyan-50 border-cyan-500/30 text-cyan-700" : "bg-white border-slate-200 text-slate-400"}`}>
                          {IMPACTO_LABELS[v][0]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Projeto */}
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1.5">Projeto / Sprint</label>
                  <input value={form.projeto} onChange={e => setForm(f => ({ ...f, projeto: e.target.value }))}
                    placeholder="Ex: Sprint 1 — Diagnóstico / Auditoria V1 vs V2"
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#09a1e5]" />
                </div>

                {/* Critério de pronto */}
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1.5">Critério de pronto</label>
                  <textarea value={form.done_criteria} onChange={e => setForm(f => ({ ...f, done_criteria: e.target.value }))}
                    rows={2} placeholder="Como saber que essa tarefa está realmente concluída?"
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#09a1e5] resize-none" />
                </div>

                {/* Responsável + Semana */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1 mb-1.5">
                      <User size={10} /> Responsável
                    </label>
                    <input value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))}
                      placeholder="Nome"
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#09a1e5]" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1 mb-1.5">
                      <Calendar size={10} /> Semana alvo
                    </label>
                    <input type="date" value={form.semana_alvo} onChange={e => setForm(f => ({ ...f, semana_alvo: e.target.value }))}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#09a1e5]" />
                  </div>
                </div>

                {/* URL verificação */}
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1 mb-1.5">
                    <ExternalLink size={10} /> URL de verificação
                  </label>
                  <input value={form.url_verificacao} onChange={e => setForm(f => ({ ...f, url_verificacao: e.target.value }))}
                    placeholder="https://… link para ver o resultado"
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#09a1e5]" />
                </div>

                {/* Lead */}
                {leads.length > 0 && (
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1 mb-1.5">
                      <MessageCircle size={10} /> Lead relacionado
                    </label>
                    <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#09a1e5]">
                      <option value="">Nenhum</option>
                      {leads.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                    </select>
                  </div>
                )}

                {/* Notas */}
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1.5">Notas internas</label>
                  <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                    rows={2} placeholder="Observações, links, contexto adicional…"
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#09a1e5] resize-none" />
                </div>
              </div>
            )}

            <button type="submit" disabled={saving || !form.titulo.trim()}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-cyan-50 hover:bg-cyan-100 border border-cyan-500/30 rounded-2xl text-cyan-700 font-black text-sm transition-all disabled:opacity-40">
              <Plus size={15} /> {saving ? "Criando…" : "Criar tarefa"}
            </button>

          </form>
        )}
      </div>
    </div>
  );
}
