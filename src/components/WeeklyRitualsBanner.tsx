import React, { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Check, ChevronUp, ChevronDown, Pencil, ChevronRight } from "lucide-react";
import {
  getWeeklyRituals, createRitual, updateRitual, deleteRitual, reorderRituals,
  getRitualCompletionsForDates, toggleRitualCompletion, RITUAL_XP,
} from "../lib/rituals";

const cc = {
  panel: "rounded-2xl border border-white/[0.08] bg-[#0B1324]/80 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl",
};

const DAY_LABELS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

/** JS getDay() returns 0=Sunday..6=Saturday; our schema uses 0=Monday..6=Sunday. */
function jsDayToRitualDay(jsDay: number): number {
  return (jsDay + 6) % 7;
}

function isoDateForRitualDay(ritualDay: number): string {
  const todayRitualDay = jsDayToRitualDay(new Date().getDay());
  const diff = ritualDay - todayRitualDay;
  const d = new Date();
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default function WeeklyRitualsBanner() {
  const [rituals, setRituals] = useState<WeeklyRitual[]>([]);
  const [completions, setCompletions] = useState<Record<string, RitualCompletion>>({});
  const [loading, setLoading] = useState(true);
  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [xpFlash, setXpFlash] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const todayRitualDay = jsDayToRitualDay(new Date().getDay());

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getWeeklyRituals().catch(() => []);
    setRituals(data);
    const dates = Array.from(new Set(data.map(r => isoDateForRitualDay(r.day_of_week))));
    const comp = await getRitualCompletionsForDates(dates).catch(() => ({}));
    setCompletions(comp);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const byDay = useMemo(() => {
    const map: Record<number, WeeklyRitual[]> = {};
    for (let d = 0; d < 7; d++) map[d] = [];
    for (const r of rituals) map[r.day_of_week]?.push(r);
    return map;
  }, [rituals]);

  const handleAdd = async (day: number) => {
    const title = newTitle.trim();
    setAddingDay(null);
    setNewTitle("");
    if (!title) return;
    try {
      const created = await createRitual(day, title);
      setRituals(prev => [...prev, created]);
    } catch (err) {
      console.error("Failed to create ritual:", err);
    }
  };

  const handleRename = async (id: string) => {
    const title = editTitle.trim();
    setEditingId(null);
    if (!title) return;
    setRituals(prev => prev.map(r => r.id === id ? { ...r, title } : r));
    try { await updateRitual(id, { title }); } catch { /* best-effort */ }
  };

  const handleDelete = async (id: string) => {
    setRituals(prev => prev.filter(r => r.id !== id));
    try { await deleteRitual(id); } catch { /* best-effort */ }
  };

  const handleMove = async (day: number, id: string, dir: -1 | 1) => {
    const list = [...(byDay[day] ?? [])];
    const idx = list.findIndex(r => r.id === id);
    const newIdx = idx + dir;
    if (idx < 0 || newIdx < 0 || newIdx >= list.length) return;
    [list[idx], list[newIdx]] = [list[newIdx], list[idx]];
    const orderedIds = list.map(r => r.id);
    setRituals(prev => {
      const others = prev.filter(r => r.day_of_week !== day);
      const reordered = list.map((r, i) => ({ ...r, sort_order: i }));
      return [...others, ...reordered];
    });
    try { await reorderRituals(day, orderedIds); } catch { /* best-effort */ }
  };

  const handleToggle = async (ritual: WeeklyRitual) => {
    const dateISO = isoDateForRitualDay(ritual.day_of_week);
    const key = `${ritual.id}:${dateISO}`;
    const wasCompleted = !!completions[key];
    // optimistic update
    setCompletions(prev => {
      const next = { ...prev };
      if (wasCompleted) delete next[key];
      else next[key] = { id: "temp", ritual_id: ritual.id, completed_date: dateISO, completed_by: null, created_at: new Date().toISOString() };
      return next;
    });
    if (!wasCompleted) {
      setXpFlash(ritual.id);
      setTimeout(() => setXpFlash(curr => curr === ritual.id ? null : curr), 1200);
    }
    try { await toggleRitualCompletion(ritual.id, dateISO); } catch { /* best-effort */ }
  };

  const todayItems = byDay[todayRitualDay] ?? [];
  const todayRitualLabel = todayItems.length > 0
    ? todayItems.slice(0, 2).map(r => r.title).join(", ")
    : "—";

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-[#0D1220] shadow-[0_4px_40px_rgba(251,191,36,0.06)] overflow-hidden">
      {/* Gold accent bar */}
      <div className="h-[2px] w-full bg-gradient-to-r from-amber-400/60 via-amber-300/30 to-transparent" />
      <div className="p-4">
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <span className="text-base">🔁</span>
          <p className="text-sm font-bold text-amber-100 shrink-0">Rituais da Semana</p>
          <p className="text-[11px] text-slate-400 truncate">
            Hoje: {todayRitualLabel || "—"} · {DAY_LABELS[todayRitualDay]}
          </p>
        </div>
        <ChevronRight
          size={16}
          className={`shrink-0 text-amber-400/60 transition-transform ${expanded ? "rotate-90" : ""}`}
        />
      </button>

      {expanded && (
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 mt-3">
        {DAY_LABELS.map((label, day) => {
          const items = byDay[day] ?? [];
          const isToday = day === todayRitualDay;
          const dateISO = isoDateForRitualDay(day);
          return (
            <div key={day}
              className={`rounded-xl p-2 flex flex-col gap-1.5 min-h-[88px] border transition-colors ${
                isToday ? "border-[#09a1e5]/40 bg-[#09a1e5]/[0.06] shadow-[0_0_20px_rgba(9,161,229,0.12)]" : "border-white/[0.06] bg-white/[0.02]"
              }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold ${isToday ? "text-[#09a1e5]" : "text-slate-400"}`}>{label}</span>
                <span className="text-[10px] text-slate-500">{items.length}</span>
              </div>

              <div className="flex flex-col gap-1">
                {items.map(r => {
                  const key = `${r.id}:${dateISO}`;
                  const done = isToday && !!completions[key];
                  return (
                    <div key={r.id}
                      className={`group relative flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] border transition-colors ${
                        done ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-white/[0.03] border-white/[0.06] text-slate-300"
                      }`}>
                      {isToday && (
                        <button onClick={() => handleToggle(r)} className="shrink-0" title="Marcar como concluído">
                          <Check size={11} className={done ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"} />
                        </button>
                      )}
                      {editingId === r.id ? (
                        <input autoFocus value={editTitle} onChange={e => setEditTitle(e.target.value)}
                          onBlur={() => handleRename(r.id)}
                          onKeyDown={e => { if (e.key === "Enter") handleRename(r.id); if (e.key === "Escape") setEditingId(null); }}
                          className="flex-1 min-w-0 bg-transparent border-b border-slate-600 outline-none text-[11px]" />
                      ) : (
                        <span onClick={() => { setEditingId(r.id); setEditTitle(r.title); }}
                          className="flex-1 min-w-0 truncate cursor-text" title={r.title}>
                          {r.title}
                        </span>
                      )}
                      <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                        <button onClick={() => handleMove(day, r.id, -1)} className="text-slate-500 hover:text-slate-300"><ChevronUp size={10} /></button>
                        <button onClick={() => handleMove(day, r.id, 1)} className="text-slate-500 hover:text-slate-300"><ChevronDown size={10} /></button>
                        <button onClick={() => { setEditingId(r.id); setEditTitle(r.title); }} className="text-slate-500 hover:text-slate-300"><Pencil size={10} /></button>
                        <button onClick={() => handleDelete(r.id)} className="text-slate-500 hover:text-red-400"><X size={10} /></button>
                      </div>
                      <AnimatePresence>
                        {xpFlash === r.id && (
                          <motion.span
                            initial={{ opacity: 0, y: 0, scale: 0.8 }}
                            animate={{ opacity: 1, y: -10, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute -top-1 right-1 text-[10px] font-bold text-emerald-400 pointer-events-none">
                            +{RITUAL_XP} XP
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                {addingDay === day ? (
                  <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
                    onBlur={() => handleAdd(day)}
                    onKeyDown={e => {
                      if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
                      if (e.key === "Escape") { setAddingDay(null); setNewTitle(""); }
                    }}
                    placeholder="Novo ritual…"
                    className="rounded-lg px-1.5 py-1 text-[11px] bg-white/[0.04] border border-slate-700 outline-none text-slate-200 placeholder-slate-500" />
                ) : (
                  <button onClick={() => { setAddingDay(day); setNewTitle(""); }}
                    className="flex items-center justify-center gap-1 rounded-lg px-1.5 py-1 text-[11px] text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] border border-dashed border-white/[0.06] transition-colors">
                    <Plus size={10} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}
      {loading && expanded && <p className="text-[11px] text-slate-500 mt-2">Carregando…</p>}
      </div>
    </div>
  );
}
