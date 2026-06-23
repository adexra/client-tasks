import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Flag, Zap, Calendar, User,
  MessageCircle, Sparkles, CheckCircle2, Loader2, ExternalLink,
} from "lucide-react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { createTask, FRONTES } from "../lib/tasks";
import type { PlanningBucket, TaskInsert, FronteKey } from "../lib/tasks";
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

const mono = { className: "font-mono" };

const PRIO_LABELS: Record<number, string> = { 1: "Baixa", 2: "Média", 3: "Alta" };
const URG_LABELS:  Record<number, string> = { 1: "Pode esperar 🟢", 2: "Logo 🟡", 3: "Urgente 🔴" };

const FRENTE_ICONS: Record<FronteKey, string> = {
  instagram: "📸", desenvolvimento: "💻", anuncios: "🎯", admin_dash: "🗄️",
  automation: "🤖", site: "🌐", marketing: "📣", loja: "🛍️",
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
        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1.5">Área de trabalho (opcional — aplica a todas)</label>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(FRONTES) as FronteKey[]).map(k => (
            <button type="button" key={k} onClick={() => setCategoria(prev => prev === k ? "" : k)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${categoria === k ? "bg-[#09a1e5]/15 border-[#09a1e5]/40 text-[#09a1e5]" : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"}`}>
              {FRENTE_ICONS[k]} {FRONTES[k].name}
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
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border bg-slate-900/60 border-slate-800 text-slate-400">
                        {FRENTE_ICONS[t.categoria as FronteKey] ?? "📌"} {FRONTES[t.categoria as FronteKey]?.name ?? t.categoria}
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
    categoria:       "" as FronteKey | "",
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

  const input = "w-full bg-[#111A2E] border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-[#09a1e5]";
  const label = "text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1.5";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/tasks/hoje"
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 transition-colors shrink-0">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-white">Nova tarefa</h1>
          <p className="text-slate-500 text-xs mt-0.5">Adiciona ao backlog de planejamento</p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex p-1 rounded-xl bg-slate-900/60 border border-slate-800 gap-1">
        <button onClick={() => setMode("formulario")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
            mode === "formulario" ? "bg-slate-800 text-white shadow-sm border border-slate-700" : "text-slate-500 hover:text-slate-300"
          }`}>
          <Plus size={14} /> Formulário
        </button>
        <button onClick={() => setMode("dump")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
            mode === "dump" ? "bg-slate-800 text-[#09a1e5] shadow-sm border border-slate-700" : "text-slate-500 hover:text-slate-300"
          }`}>
          <Sparkles size={14} /> Text Dump + IA
        </button>
      </div>

      {/* Dump mode */}
      {mode === "dump" && (
        <div className="rounded-2xl border border-slate-800 bg-[#0B1324]/80 p-5 sm:p-6">
          <DumpMode leads={leads} onDone={() => navigate("/tasks")} />
        </div>
      )}

      {/* Formulário mode */}
      {mode === "formulario" && (
        <form onSubmit={submit} className="rounded-2xl border border-slate-800 bg-[#0B1324]/80 p-5 sm:p-6 space-y-5">

          <div>
            <label className={label}>Título <span className="text-red-400">*</span></label>
            <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              placeholder="Ex: Ajustar preços no catálogo" required className={input} />
          </div>

          {/* Área / Frente */}
          <div>
            <label className={label}>Área de trabalho</label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(FRONTES) as FronteKey[]).map(k => (
                <button type="button" key={k} onClick={() => setForm(f => ({ ...f, categoria: f.categoria === k ? "" : k }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${form.categoria === k ? "bg-[#09a1e5]/15 border-[#09a1e5]/40 text-[#09a1e5]" : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"}`}>
                  {FRENTE_ICONS[k]} {FRONTES[k].name}
                </button>
              ))}
            </div>
          </div>

          {/* Destino */}
          <div>
            <label className={label}>Onde colocar</label>
            <div className="grid grid-cols-3 gap-1.5">
              {([["today", "📅 Hoje"], ["sprint", "🚀 Sprint"], ["backlog", "📥 Backlog"]] as const).map(([v, lbl]) => (
                <button type="button" key={v} onClick={() => setForm(f => ({ ...f, destino: v }))}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${form.destino === v ? "bg-[#09a1e5]/15 border-[#09a1e5]/40 text-[#09a1e5]" : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"}`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {form.destino === "today" && (
            <div>
              <label className={label}><Calendar size={10} className="inline mr-1" />Dia</label>
              <input type="date" value={form.data_foco} onChange={e => setForm(f => ({ ...f, data_foco: e.target.value }))}
                className={input} />
            </div>
          )}

          {/* Mais detalhes */}
          <button type="button" onClick={() => setShowAdvanced(s => !s)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors">
            {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Mais detalhes (opcional)
          </button>

          {showAdvanced && (
            <div className="space-y-5 pt-1 border-t border-slate-800">
              <div className="pt-4">
                <label className={label}>Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  rows={3} placeholder="Contexto, detalhes, o que precisa ser feito…"
                  className={`${input} resize-none`} />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {([
                  ["prioridade", "Prioridade", PRIO_LABELS] as const,
                  ["urgencia",   "Urgência",   { 1: "U1", 2: "U2", 3: "U3" }] as const,
                  ["impacto",    "Impacto",    IMPACTO_LABELS] as const,
                ]).map(([field, title, labels]) => (
                  <div key={field}>
                    <label className={label}>{title}</label>
                    <div className="flex gap-1">
                      {([1,2,3] as const).map(v => (
                        <button type="button" key={v} onClick={() => setForm(f => ({ ...f, [field]: v }))}
                          className={`flex-1 py-2 rounded-lg text-[10px] font-black border transition-all ${(form as Record<string, number>)[field] === v ? "bg-[#09a1e5]/15 border-[#09a1e5]/40 text-[#09a1e5]" : "bg-slate-900/60 border-slate-800 text-slate-500"}`}>
                          {(labels as Record<number,string>)[v][0]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className={label}>Projeto / Sprint</label>
                <input value={form.projeto} onChange={e => setForm(f => ({ ...f, projeto: e.target.value }))}
                  placeholder="Ex: Sprint 1 — Diagnóstico" className={input} />
              </div>

              <div>
                <label className={label}>Critério de pronto</label>
                <textarea value={form.done_criteria} onChange={e => setForm(f => ({ ...f, done_criteria: e.target.value }))}
                  rows={2} placeholder="Como saber que está realmente concluída?"
                  className={`${input} resize-none`} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={label}><User size={10} className="inline mr-1" />Responsável</label>
                  <input value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))}
                    placeholder="Nome" className={input} />
                </div>
                <div>
                  <label className={label}><Calendar size={10} className="inline mr-1" />Semana alvo</label>
                  <input type="date" value={form.semana_alvo} onChange={e => setForm(f => ({ ...f, semana_alvo: e.target.value }))}
                    className={input} />
                </div>
              </div>

              <div>
                <label className={label}><ExternalLink size={10} className="inline mr-1" />URL de verificação</label>
                <input value={form.url_verificacao} onChange={e => setForm(f => ({ ...f, url_verificacao: e.target.value }))}
                  placeholder="https://…" className={input} />
              </div>

              {leads.length > 0 && (
                <div>
                  <label className={label}><MessageCircle size={10} className="inline mr-1" />Cliente relacionado</label>
                  <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                    className={input}>
                    <option value="">Nenhum</option>
                    {leads.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className={label}>Notas internas</label>
                <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  rows={2} placeholder="Observações, links, contexto adicional…"
                  className={`${input} resize-none`} />
              </div>
            </div>
          )}

          <button type="submit" disabled={saving || !form.titulo.trim()}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#09a1e5] hover:bg-[#0891d5] rounded-2xl text-white font-black text-sm transition-all disabled:opacity-40 shadow-lg shadow-[#09a1e5]/20">
            <Plus size={15} /> {saving ? "Criando…" : "Criar tarefa"}
          </button>

        </form>
      )}
    </div>
  );
}
