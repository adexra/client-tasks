import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Trophy, FileText, ExternalLink, Paperclip, Search, RefreshCw, ArrowLeft,
} from "lucide-react";
import {
  getAllArtifacts, getMonthKey, getRollingMonths, getSprintLabel,
  UTILIDADE_OPTIONS,
} from "../lib/tasks";
import type { UtilidadeKey, TaskArtifactWithTask, ArtifactType } from "../lib/tasks";

const cc = {
  panel: "rounded-2xl border border-white/[0.08] bg-[#0B1324]/80 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl",
  card: "relative rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#101A2E] to-[#070D18] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.28)]",
};

const KIND_META: Record<ArtifactType, { label: string; icon: typeof FileText; color: string }> = {
  resultado: { label: "Resultado", icon: Trophy, color: "text-[#09a1e5]" },
  artifact:  { label: "Artifact",  icon: Paperclip, color: "text-violet-400" },
  evidencia: { label: "Evidência", icon: FileText, color: "text-emerald-400" },
};

type GroupMode = "mes" | "sprint";

export default function ResultsPage() {
  const [items, setItems] = useState<TaskArtifactWithTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<ArtifactType | "todos">("todos");
  const [monthFilter, setMonthFilter] = useState<string | "todos">("todos");
  const [groupMode, setGroupMode] = useState<GroupMode>("mes");
  const [utilidadeFilter, setUtilidadeFilter] = useState<UtilidadeKey | "todos">("todos");
  const [botFilter, setBotFilter] = useState<"todos" | "sim" | "nao">("todos");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getAllArtifacts().catch(() => []);
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const ALL_MONTHS = useMemo(() => getRollingMonths(new Date(), 12), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(a => {
      if (kindFilter !== "todos" && a.type !== kindFilter) return false;
      const month = getMonthKey({ projeto: a.task?.projeto ?? null });
      if (monthFilter !== "todos" && month !== monthFilter) return false;
      if (utilidadeFilter !== "todos" && a.utilidade !== utilidadeFilter) return false;
      if (botFilter === "sim" && !a.bot_acessivel) return false;
      if (botFilter === "nao" && a.bot_acessivel) return false;
      if (q) {
        const hay = `${a.title ?? ""} ${a.content_markdown ?? ""} ${a.task?.titulo ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, kindFilter, monthFilter, utilidadeFilter, botFilter]);

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: TaskArtifactWithTask[] }>();
    for (const a of filtered) {
      let key: string;
      let label: string;
      if (groupMode === "mes") {
        const mk = getMonthKey({ projeto: a.task?.projeto ?? null });
        key = mk ?? "sem-mes";
        label = ALL_MONTHS.find(m => m.key === mk)?.titulo ?? "Sem mês / sprint";
      } else {
        const sp = getSprintLabel({ projeto: a.task?.projeto ?? null });
        key = sp ?? "sem-sprint";
        label = sp ?? "Sem sprint";
      }
      if (!map.has(key)) map.set(key, { label, items: [] });
      map.get(key)!.items.push(a);
    }
    return Array.from(map.entries())
      .sort(([ka, va], [kb, vb]) => {
        if (ka === "sem-mes" || ka === "sem-sprint") return 1;
        if (kb === "sem-mes" || kb === "sem-sprint") return -1;
        const da = va.items[0]?.created_at ?? "";
        const db = vb.items[0]?.created_at ?? "";
        return db.localeCompare(da);
      })
      .map(([key, v]) => ({ key, ...v }));
  }, [filtered, groupMode, ALL_MONTHS]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/tasks/hoje" className="p-2 rounded-xl border text-slate-300 hover:text-white transition-colors"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Trophy size={20} className="text-[#09a1e5]" /> Resultados
              <span className="text-slate-400 font-semibold">— Arsenal de Conteúdo</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Tudo que foi entregue, registrado por tarefa — {filtered.length} item{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-colors border"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Atualizar
        </button>
      </div>

      {/* Filters */}
      <div className={`${cc.panel} p-3 flex flex-wrap items-center gap-2`}>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por título, conteúdo ou tarefa…"
            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-[#09a1e5]" />
        </div>

        <div className="flex bg-slate-900/60 border border-slate-800 rounded-xl p-1 gap-1">
          {([["todos", "Todos"], ["resultado", "Resultado"], ["artifact", "Artifact"], ["evidencia", "Evidência"]] as const).map(([v, label]) => (
            <button key={v} onClick={() => setKindFilter(v)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${kindFilter === v ? "bg-slate-800 text-white shadow-sm border border-slate-700" : "text-slate-400 hover:text-slate-100"}`}>
              {label}
            </button>
          ))}
        </div>

        <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
          className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#09a1e5]">
          <option value="todos">Todos os meses</option>
          {ALL_MONTHS.map(m => <option key={m.key} value={m.key}>{m.titulo}</option>)}
        </select>

        <select value={utilidadeFilter} onChange={e => setUtilidadeFilter(e.target.value as UtilidadeKey | "todos")}
          className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#09a1e5]">
          <option value="todos">Todas as utilidades</option>
          {UTILIDADE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select value={botFilter} onChange={e => setBotFilter(e.target.value as "todos" | "sim" | "nao")}
          className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#09a1e5]">
          <option value="todos">Bot: todos</option>
          <option value="sim">Acessível ao bot</option>
          <option value="nao">Não acessível</option>
        </select>

        <div className="flex bg-slate-900/60 border border-slate-800 rounded-xl p-1 gap-1">
          {([["mes", "Por mês"], ["sprint", "Por sprint"]] as const).map(([v, label]) => (
            <button key={v} onClick={() => setGroupMode(v)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${groupMode === v ? "bg-slate-800 text-white shadow-sm border border-slate-700" : "text-slate-400 hover:text-slate-100"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-slate-400 text-center py-8">Carregando…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">Nada encontrado.</p>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group.key} className="space-y-2">
              <h2 className="text-sm font-bold text-white/80 tracking-wide uppercase">{group.label}</h2>
              <div className="grid gap-2 md:grid-cols-2">
                {group.items.map(a => {
                  const km = KIND_META[a.type];
                  const Icon = km.icon;
                  return (
                    <div key={a.id} className={`${cc.card} p-3`}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Icon size={13} className={`${km.color} shrink-0`} />
                          <span className={`text-[10px] font-bold uppercase tracking-wide ${km.color}`}>{km.label}</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-500 shrink-0">
                          {new Date(a.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      {a.title && <p className="text-sm font-semibold text-slate-100 mb-1">{a.title}</p>}
                      {a.content_markdown && (
                        <div className="text-xs text-slate-300 line-clamp-4 mb-1 [&_a]:text-[#09a1e5] [&_a]:underline [&_img]:max-w-full [&_img]:rounded-lg [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_h1]:text-sm [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-semibold"
                          dangerouslySetInnerHTML={{ __html: a.content_markdown }} />
                      )}
                      {a.url && (
                        <a href={a.url} target="_blank" rel="noreferrer"
                          className="text-xs text-[#09a1e5] hover:underline flex items-center gap-1 mb-1">
                          {a.file_path ? <Paperclip size={11} /> : <ExternalLink size={11} />}
                          {a.file_path ? "Abrir arquivo" : a.url}
                        </a>
                      )}
                      {(a.utilidade || a.bot_acessivel) && (
                        <div className="flex flex-wrap items-center gap-1 mb-1">
                          {a.utilidade && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md border text-slate-300"
                              style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.08)' }}>
                              {UTILIDADE_OPTIONS.find(o => o.value === a.utilidade)?.label ?? a.utilidade}
                            </span>
                          )}
                          {a.bot_acessivel && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Bot
                            </span>
                          )}
                        </div>
                      )}
                      {a.task && (
                        <Link to={`/tasks/hoje?openTask=${a.task.id}`}
                          className="text-[11px] text-slate-400 hover:text-white transition-colors flex items-center gap-1 mt-1.5 pt-1.5 border-t border-white/[0.06]">
                          <FileText size={11} /> {a.task.titulo}
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
