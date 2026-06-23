import React, { useState, useMemo, useEffect } from "react";
import {
  ChevronDown, ChevronUp, Calendar, CheckCircle2,
  AlertTriangle, GitBranch, Pencil, X, Rocket,
} from "lucide-react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Task } from "../lib/tasks";
import { updateTask, SPRINT_SIZE_WARNING_THRESHOLD } from "../lib/tasks";
import type { ColumnId } from "../pages/Tasks";
import ObjectiveEditor from "./ObjectiveEditor";
import CustomSelect from "./CustomSelect";
import { supabase } from "../lib/supabase";

type ExtendedTask = Task;

const cc = {
  panel: "rounded-2xl border border-white/[0.08] bg-[#0B1324]/80 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl",
};
const mono = { className: "font-mono" };

// Lazy import TaskRow to avoid circular dep — Tasks.tsx defines TaskRow and imports this component.
// We accept it as a prop so the parent controls rendering.
interface TaskRowComponent {
  (props: {
    task: ExtendedTask;
    onEdit: (task: ExtendedTask) => void;
    onMove: (id: string, col: ColumnId) => void;
    onSave?: (id: string, patch: Partial<Task>) => void;
    draggable?: boolean;
    completing?: boolean;
    onComplete?: (id: string) => void;
    onCancel?: (id: string) => void;
    onPostpone?: (id: string) => void;
    className?: string;
  }): React.ReactElement | null;
}

export interface SprintMeta {
  sprintNome: string;
  objective: string;
  clientName: string;
  projectName: string;
  desiredOutcome?: string;
  allTasks: Task[];
  onSaveObjective: (text: string) => void;
  onSaveMeta: (meta: { client_name?: string; project_name?: string }) => void;
  isActive?: boolean;
  onActivate?: () => void;
  onDeactivate?: () => void;
}

export interface TaskGroupSectionProps {
  name: string;
  tasks: ExtendedTask[];
  onEdit: (task: ExtendedTask) => void;
  onMove: (id: string, col: ColumnId) => void;
  onSave: (id: string, patch: Partial<Task>) => void;
  draggable?: boolean;
  defaultOpen?: boolean;
  icon?: string;
  sprintMeta?: SprintMeta;
  TaskRowComponent: TaskRowComponent;
}

export default function TaskGroupSection({
  name, tasks, onEdit, onMove, onSave,
  draggable, defaultOpen = true, icon = "📌",
  sprintMeta, TaskRowComponent: TaskRow,
}: TaskGroupSectionProps) {
  const isActive = sprintMeta?.isActive;
  const onActivate = sprintMeta?.onActivate;
  const onDeactivate = sprintMeta?.onDeactivate;
  const [open, setOpen] = useState(defaultOpen);

  // Sprint-only state
  const [moving, setMoving] = useState(false);
  const [targetSprint, setTargetSprint] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const [draftClient, setDraftClient] = useState(sprintMeta?.clientName ?? "");
  const [draftProject, setDraftProject] = useState(sprintMeta?.projectName ?? "");
  const [clientOptions, setClientOptions] = useState<{ value: string; label: string }[]>([]);
  const [projectOptions, setProjectOptions] = useState<{ value: string; label: string }[]>([]);

  React.useEffect(() => { setDraftClient(sprintMeta?.clientName ?? ""); }, [sprintMeta?.clientName]);
  React.useEffect(() => { setDraftProject(sprintMeta?.projectName ?? ""); }, [sprintMeta?.projectName]);

  useEffect(() => {
    if (!sprintMeta) return;
    supabase.from("clients").select("id, name").order("name").then(({ data }) => {
      setClientOptions((data ?? []).map(c => ({ value: c.name ?? c.id, label: c.name ?? c.id })));
    });
    supabase.from("roadmap_objectives").select("project_name").not("project_name", "is", null).then(({ data }) => {
      const unique = Array.from(new Set((data ?? []).map(r => r.project_name).filter(Boolean))) as string[];
      setProjectOptions(unique.map(p => ({ value: p, label: p })));
    });
  }, [!!sprintMeta]);

  const sprintLabels = useMemo(() => {
    if (!sprintMeta) return [];
    const byNum = new Map<string, string>();
    for (const t of sprintMeta.allTasks) {
      const prefix = (t.projeto ?? "").split(" / ")[0]?.trim() ?? "";
      const m = /^sprint\s*(\d+)/i.exec(prefix);
      if (m && !byNum.has(m[1])) byNum.set(m[1], prefix);
    }
    return Array.from(byNum.entries()).sort((a, b) => Number(a[0]) - Number(b[0])).map(([, label]) => label);
  }, [sprintMeta?.allTasks]);

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
    if (!sprintMeta) return;
    const label = targetSprint === "__new__" ? newLabel.trim() : targetSprint;
    if (!label || label === currentSprintLabel) return;
    setSaving(true);
    try {
      for (const t of tasks) {
        const projeto = `${label} / ${name}`;
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
  const barColor = sprintMeta
    ? (pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-violet-500")
    : (pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-blue-500");
  const oversized = sprintMeta ? active > SPRINT_SIZE_WARNING_THRESHOLD : false;

  const clientName = sprintMeta?.clientName ?? "";
  const projectName = sprintMeta?.projectName ?? "";

  const sorted = sprintMeta
    ? [...tasks].sort((a, b) => {
        const aDone = a.execution_status === "done";
        const bDone = b.execution_status === "done";
        if (aDone !== bDone) return aDone ? 1 : -1;
        if (aDone && bDone) return new Date(b.concluido_em ?? b.updated_at).getTime() - new Date(a.concluido_em ?? a.updated_at).getTime();
        return a.order_index - b.order_index;
      })
    : tasks;

  return (
    <div className={`${cc.panel} overflow-hidden`}>
      {/* Header */}
      <button className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-800/60 transition-colors" onClick={() => setOpen(o => !o)}>
        <span className="text-lg">{sprintMeta ? "🎯" : icon}</span>
        <div className="flex-1 text-left min-w-0">
          {/* Sprint name — dominant */}
          <p className={`${sprintMeta ? "text-base font-extrabold" : "text-sm font-semibold"} text-slate-100 leading-tight`}>{name}</p>
          {/* Client + project — secondary, below the name */}
          {sprintMeta && (clientName || projectName) ? (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {clientName && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#09a1e5]/15 border border-[#09a1e5]/30 text-[#09a1e5]">{clientName}</span>}
              {projectName && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300">{projectName}</span>}
              <button type="button" onClick={e => { e.stopPropagation(); setEditingMeta(true); setOpen(true); }}
                className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors"><Pencil size={9} className="inline" /></button>
            </div>
          ) : sprintMeta ? (
            <button type="button" onClick={e => { e.stopPropagation(); setEditingMeta(true); setOpen(true); }}
              className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors mt-0.5">+ cliente / projeto</button>
          ) : null}
          {sprintMeta?.desiredOutcome && <p className="text-[11px] text-slate-400 mt-0.5">{sprintMeta.desiredOutcome}</p>}
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
        <div className={`px-4 pb-4 border-t border-slate-800 pt-3 ${sprintMeta ? "space-y-3" : "space-y-2"}`}>

          {/* Sprint-only controls */}
          {sprintMeta && (
            <>
              {/* Due date + priority + mark done */}
              <div className="flex flex-wrap items-center gap-2 px-1">
                <div className="flex items-center gap-1.5">
                  <Calendar size={11} className="text-slate-500" />
                  <input type="date"
                    defaultValue={tasks.find(t => t.semana_alvo)?.semana_alvo ?? ""}
                    onChange={e => tasks.forEach(t => onSave(t.id, { semana_alvo: e.target.value || null }))}
                    className="bg-slate-900/60 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300 outline-none focus:border-[#09a1e5] cursor-pointer"
                    title="Data de entrega do sprint" />
                </div>
                <div className="flex items-center gap-1">
                  {([1, 2, 3] as const).map(v => (
                    <button key={v} type="button"
                      onClick={() => tasks.filter(t => !["done", "archived"].includes(t.execution_status)).forEach(t => onSave(t.id, { prioridade: v }))}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                        tasks.some(t => t.prioridade === v)
                          ? "bg-[#09a1e5]/15 border-[#09a1e5]/40 text-[#09a1e5]"
                          : "bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-300"
                      }`}
                      title={`Prioridade ${v} para todas as tarefas abertas`}>
                      P{v}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                  {/* Activate / deactivate toggle */}
                  {(onActivate || onDeactivate) && (
                    <button type="button"
                      onClick={() => isActive ? onDeactivate?.() : onActivate?.()}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                        isActive
                          ? "bg-[#09a1e5]/15 border-[#09a1e5]/40 text-[#09a1e5] hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
                          : "bg-violet-500/10 border-violet-500/30 text-violet-300 hover:bg-violet-500/20"
                      }`}>
                      {isActive ? <><CheckCircle2 size={11} /> Ativa</> : <><Rocket size={11} /> Ativar</>}
                    </button>
                  )}
                  {active > 0 && (
                    <button type="button"
                      onClick={() => {
                        if (!confirm(`Concluir todas as ${active} tarefas abertas deste sprint?`)) return;
                        tasks.filter(t => !["done", "archived"].includes(t.execution_status))
                          .forEach(t => onSave(t.id, { execution_status: "done", concluido_em: new Date().toISOString() } as Partial<Task>));
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all">
                      <CheckCircle2 size={11} /> Concluir
                    </button>
                  )}
                </div>
              </div>

              {/* Client / project selector — only shown when editing */}
              {editingMeta && (
                <div className="flex flex-wrap items-center gap-2 px-1">
                  <CustomSelect
                    value={draftClient}
                    onChange={(v: string) => setDraftClient(v)}
                    options={[{ value: "", label: "Nenhum cliente" }, ...clientOptions]}
                    placeholder="Cliente…"
                    style={{ minWidth: 160 }}
                  />
                  <CustomSelect
                    value={draftProject}
                    onChange={(v: string) => setDraftProject(v)}
                    options={[
                      { value: "", label: "Nenhum projeto" },
                      ...projectOptions,
                      ...(draftProject && !projectOptions.find(p => p.value === draftProject)
                        ? [{ value: draftProject, label: draftProject }] : []),
                    ]}
                    placeholder="Projeto…"
                    style={{ minWidth: 160 }}
                  />
                  <button onClick={() => { sprintMeta.onSaveMeta({ client_name: draftClient, project_name: draftProject }); setEditingMeta(false); }}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#09a1e5] text-white hover:bg-[#0891d5] transition-all">
                    Salvar
                  </button>
                  <button onClick={() => { setDraftClient(clientName); setDraftProject(projectName); setEditingMeta(false); }}
                    className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1"><X size={11} /> Cancelar</button>
                </div>
              )}

              {oversized && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-semibold">
                  <AlertTriangle size={13} className="shrink-0" />
                  Esse sprint está grande demais. Quebre em objetivos menores.
                </div>
              )}

              <div className="px-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Objetivo</p>
                <ObjectiveEditor
                  value={sprintMeta.objective}
                  placeholder="Qual é o objetivo único deste sprint?"
                  onSave={sprintMeta.onSaveObjective}
                />
              </div>

              {/* Move frente to another sprint */}
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
            </>
          )}

          {/* Task list */}
          <div className="space-y-2">
            {draggable ? (
              <SortableContext items={sorted.map(t => t.id)} strategy={verticalListSortingStrategy}>
                {sorted.map(t => <TaskRow key={t.id} task={t} onEdit={onEdit} onMove={onMove} onSave={onSave} draggable />)}
              </SortableContext>
            ) : (
              sorted.map(t => <TaskRow key={t.id} task={t} onEdit={onEdit} onMove={onMove} onSave={onSave} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}
