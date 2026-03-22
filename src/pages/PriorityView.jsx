import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  Plus, Rocket, CalendarDays, Inbox, AlertTriangle,
  ChevronRight, TrendingUp, Target, CheckCircle2,
  Clock, Move, X, Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import TagBadge from '../components/TagBadge';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import TaskModal from '../components/TaskModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatMinutes(mins) {
  if (!mins || mins === 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatDayLabel(dateStr, language) {
  if (!dateStr || dateStr === 'unscheduled') return 'Unscheduled';
  const today = todayStr();
  const d = new Date(dateStr + 'T12:00:00');
  const dayNames = language === 'pt'
    ? ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = language === 'pt'
    ? ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const label = `${dayNames[d.getDay()]} · ${monthNames[d.getMonth()]} ${d.getDate()}`;
  return dateStr === today ? `${label} · Today` : label;
}

function getWeekDays() {
  const days = [];
  const today = new Date();
  for (let i = 1; i <= 7 && days.length < 5; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      days.push(d.toISOString().split('T')[0]);
    }
  }
  return days;
}

function formatCreatedDate(dateStr, language) {
  const d = new Date(dateStr);
  const monthNames = language === 'pt'
    ? ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[d.getMonth()]} ${d.getDate()}`;
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function PriorityView() {
  const { t, language } = useLanguage();

  const PRIORITY_META = {
    high:     { label: t('execution.critical'),  color: 'text-rose-500',    bg: 'bg-rose-50',    weight: 3 },
    medium:   { label: t('execution.high'),      color: 'text-amber-500',   bg: 'bg-amber-50',   weight: 2 },
    low:      { label: t('execution.support'),   color: 'text-neutral-400', bg: 'bg-neutral-50', weight: 1 },
    very_low: { label: t('execution.internal'),  color: 'text-neutral-300', bg: 'bg-neutral-50', weight: 0 },
  };

  const [clients, setClients]           = useState([]);
  const [tasks, setTasks]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [modal, setModal]               = useState({ open: false, task: null });
  const [completionModal, setCompletionModal] = useState({ open: false, task: null });
  const [showOverloadModal, setShowOverloadModal] = useState(false);
  const [rearrangeMode, setRearrangeMode]       = useState(false);
  const [selectedTaskIds, setSelectedTaskIds]   = useState(new Set());
  const [moveTargetDate, setMoveTargetDate]     = useState('');
  const [moving, setMoving]             = useState(false);
  const toast = useToast();

  // ─── Load & auto-operations ────────────────────────────────────────────────

  async function load(suppressOverloadCheck = false) {
    setLoading(true);

    const [cRes, tRes] = await Promise.all([
      supabase.from('clients').select('*').eq('status', 'active'),
      supabase.from('tasks').select('*, clients(name)').order('created_at', { ascending: true })
    ]);
    if (!cRes.error) setClients(cRes.data || []);

    let allTasks = tRes.data || [];
    const today = todayStr();
    const pushKey = `priority_push_${today}`;

    if (!tRes.error) {
      // ① Auto-push stale this_week tasks (once per calendar day)
      if (!localStorage.getItem(pushKey)) {
        const stale = allTasks.filter(t =>
          t.bucket === 'this_week' &&
          t.scheduled_date &&
          t.scheduled_date < today &&
          !t.done
        );
        if (stale.length > 0) {
          await supabase.from('tasks')
            .update({ bucket: 'today', scheduled_date: today })
            .in('id', stale.map(t => t.id));
          // Refetch after push
          const { data } = await supabase.from('tasks').select('*, clients(name)').order('created_at', { ascending: true });
          allTasks = data || [];
        }

        // ② Smart distribution: if >5 this_week tasks hit the same day, spread them
        const sameDay = allTasks.filter(t =>
          t.bucket === 'this_week' && !t.done && t.scheduled_date === today
        );
        if (sameDay.length > 5) {
          const sorted = [...sameDay].sort((a, b) => {
            const pA = PRIORITY_META[a.priority]?.weight || 0;
            const pB = PRIORITY_META[b.priority]?.weight || 0;
            if (pA !== pB) return pB - pA;
            return new Date(a.created_at) - new Date(b.created_at);
          });
          // Keep first 5 on today, distribute the rest to upcoming days
          const overflow = sorted.slice(5);
          const futureDays = getWeekDays();
          let dayIdx = 0, dayCount = 0;
          const updates = [];
          for (const task of overflow) {
            if (dayIdx >= futureDays.length) break;
            updates.push({ id: task.id, scheduled_date: futureDays[dayIdx] });
            dayCount++;
            if (dayCount >= 5) { dayIdx++; dayCount = 0; }
          }
          for (const upd of updates) {
            await supabase.from('tasks').update({ scheduled_date: upd.scheduled_date }).eq('id', upd.id);
          }
          const { data } = await supabase.from('tasks').select('*, clients(name)').order('created_at', { ascending: true });
          allTasks = data || [];
        }

        localStorage.setItem(pushKey, '1');
      }

      setTasks(allTasks);

      // ③ Overload warning (once per day)
      if (!suppressOverloadCheck) {
        const overloadKey = `priority_overload_${today}`;
        const todayCount = allTasks.filter(t => t.bucket === 'today' && !t.done).length;
        if (todayCount > 5 && !localStorage.getItem(overloadKey)) {
          setShowOverloadModal(true);
        }
      }
    }

    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // ─── Task operations ───────────────────────────────────────────────────────

  async function updateTaskBucket(taskId, bucket) {
    const { error } = await supabase.from('tasks').update({ bucket }).eq('id', taskId);
    if (!error) load(true);
    else toast.error(t('common.error'));
  }

  async function toggleDone(task) {
    if (!task.done) {
      setCompletionModal({ open: true, task });
      return;
    }
    const { error } = await supabase.from('tasks').update({ done: false, actual_minutes: null }).eq('id', task.id);
    if (!error) load(true);
  }

  async function completeTask(taskId, minutes) {
    const { error } = await supabase.from('tasks').update({
      done: true,
      actual_minutes: parseInt(minutes) || 0
    }).eq('id', taskId);
    if (!error) {
      setCompletionModal({ open: false, task: null });
      load(true);
      toast.success(t('execution.task_finished'));
    }
  }

  async function moveSelectedTasks() {
    if (!moveTargetDate || selectedTaskIds.size === 0) return;
    setMoving(true);
    const ids = [...selectedTaskIds];
    const { error } = await supabase.from('tasks')
      .update({ bucket: 'this_week', scheduled_date: moveTargetDate })
      .in('id', ids);
    if (!error) {
      toast.success(`${ids.length} task${ids.length > 1 ? 's' : ''} rescheduled`);
      setRearrangeMode(false);
      setSelectedTaskIds(new Set());
      setMoveTargetDate('');
      load(true);
    } else {
      toast.error(t('common.error'));
    }
    setMoving(false);
  }

  function toggleTaskSelect(id) {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ─── Derived data ──────────────────────────────────────────────────────────

  const todayTasks = useMemo(() =>
    tasks.filter(t => t.bucket === 'today' && !t.done)
      .sort((a, b) => {
        const pA = PRIORITY_META[a.priority]?.weight || 0;
        const pB = PRIORITY_META[b.priority]?.weight || 0;
        if (pA !== pB) return pB - pA;
        return new Date(a.created_at) - new Date(b.created_at);
      }),
  [tasks]);

  const todayTotalMinutes  = useMemo(() => tasks.filter(t => t.bucket === 'today').reduce((s, t) => s + (t.estimated_minutes || 0), 0), [tasks]);
  const todayDoneMinutes   = useMemo(() => tasks.filter(t => t.bucket === 'today' && t.done).reduce((s, t) => s + (t.estimated_minutes || 0), 0), [tasks]);
  const todayRemainingMins = todayTotalMinutes - todayDoneMinutes;
  const completionPct = todayTotalMinutes > 0 ? Math.round((todayDoneMinutes / todayTotalMinutes) * 100) : 0;

  const weekTasksByDay = useMemo(() => {
    const groups = {};
    tasks
      .filter(t => t.bucket === 'this_week' && !t.done)
      .sort((a, b) => {
        if (a.scheduled_date && b.scheduled_date && a.scheduled_date !== b.scheduled_date)
          return a.scheduled_date.localeCompare(b.scheduled_date);
        if (a.scheduled_date && !b.scheduled_date) return -1;
        if (!a.scheduled_date && b.scheduled_date) return 1;
        const pA = PRIORITY_META[a.priority]?.weight || 0;
        const pB = PRIORITY_META[b.priority]?.weight || 0;
        if (pA !== pB) return pB - pA;
        return new Date(a.created_at) - new Date(b.created_at);
      })
      .forEach(task => {
        const key = task.scheduled_date || 'unscheduled';
        if (!groups[key]) groups[key] = [];
        groups[key].push(task);
      });
    return groups;
  }, [tasks]);

  const backlogTasks = useMemo(() => tasks.filter(t => t.bucket === 'backlog' && !t.done).sort((a, b) => {
    const pA = PRIORITY_META[a.priority]?.weight || 0;
    const pB = PRIORITY_META[b.priority]?.weight || 0;
    if (pA !== pB) return pB - pA;
    return new Date(a.created_at) - new Date(b.created_at);
  }), [tasks]);

  const doneTasks  = useMemo(() => tasks.filter(t => t.done), [tasks]);
  const isTodayOverloaded = todayTasks.length > 5;
  const weekDaysForPicker = [todayStr(), ...getWeekDays()];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-20 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">{t('execution.tag')}</span>
            <div className="h-[1px] w-8 bg-neutral-200" />
          </div>
          <h1 className="text-3xl xs:text-4xl md:text-5xl lg:text-6xl font-serif text-[var(--ink-primary)] leading-tight tracking-tight break-words">
            {t('execution.title')}
          </h1>
          <p className="text-neutral-500 font-medium max-w-lg text-base leading-relaxed">
            {t('execution.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className={cn(
            "px-4 sm:px-6 py-2 sm:py-3 rounded-xl border text-[9px] sm:text-[10px] font-bold tracking-[0.1em] uppercase flex items-center gap-2 sm:gap-3 transition-colors",
            isTodayOverloaded ? "border-rose-100 bg-rose-50 text-rose-500" : "border-neutral-100 text-neutral-400"
          )}>
            <Target className="h-4 w-4" />
            <span className="hidden xs:inline">{t('execution.task_load')}:</span> {todayTasks.length} / 5
          </div>
          <button
            onClick={() => setModal({ open: true, task: null })}
            className="btn-minimal btn-primary flex items-center gap-2.5 h-10 sm:h-12 px-6 sm:px-8"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm font-medium">{t('execution.new_task')}</span>
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 items-start">

        {/* Col 1 — Active Projects */}
        <Column label={t('execution.active_projects')} icon={Rocket}>
          <div className="space-y-6">
            {clients.map(client => <ClientMinimalCard key={client.id} client={client} />)}
            {clients.length === 0 && (
              <p className="text-xs text-neutral-300 italic text-center py-20 uppercase tracking-widest">
                {t('execution.no_active_projects')}
              </p>
            )}
          </div>
        </Column>

        {/* Col 2 — Execution Pipeline (Today + This Week) */}
        <Column label={t('execution.weekly_execution')} icon={CalendarDays}>
          <div className="space-y-12">

            {/* TODAY */}
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.1em]">
                  {t('execution.today_tasks')}
                </p>
                <div className="flex items-center gap-2">
                  {isTodayOverloaded && (
                    <span className="text-[8px] font-bold text-rose-500 uppercase">{t('execution.attention_needed')}</span>
                  )}
                  {todayTasks.length > 0 && !rearrangeMode && (
                    <button
                      onClick={() => setRearrangeMode(true)}
                      className="text-[8px] font-bold text-neutral-300 hover:text-neutral-500 uppercase tracking-widest flex items-center gap-1 transition-colors"
                    >
                      <Move className="h-3 w-3" /> Rearrange
                    </button>
                  )}
                  {rearrangeMode && (
                    <button
                      onClick={() => { setRearrangeMode(false); setSelectedTaskIds(new Set()); }}
                      className="text-[8px] font-bold text-neutral-400 hover:text-neutral-600 uppercase tracking-widest flex items-center gap-1 transition-colors"
                    >
                      <X className="h-3 w-3" /> Done
                    </button>
                  )}
                </div>
              </div>

              {/* Hours bar */}
              {todayTotalMinutes > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {formatMinutes(todayRemainingMins)} remaining
                    </span>
                    <span>{completionPct}% done · {formatMinutes(todayTotalMinutes)} total</span>
                  </div>
                  <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--success-green)] rounded-full transition-all duration-700"
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Rearrange controls */}
              {rearrangeMode && (
                <div className="flex items-center gap-3 p-4 bg-amber-50/50 border border-amber-100 rounded-xl animate-in slide-in-from-top-2 duration-300">
                  <Calendar className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <select
                    value={moveTargetDate}
                    onChange={e => setMoveTargetDate(e.target.value)}
                    className="flex-1 bg-white border border-neutral-100 rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500 focus:outline-none"
                  >
                    <option value="">Move to…</option>
                    {weekDaysForPicker.map(d => (
                      <option key={d} value={d}>{formatDayLabel(d, language)}</option>
                    ))}
                  </select>
                  <button
                    onClick={moveSelectedTasks}
                    disabled={!moveTargetDate || selectedTaskIds.size === 0 || moving}
                    className="px-4 py-2 bg-[var(--ink-primary)] text-white rounded-lg text-[9px] font-bold uppercase tracking-widest disabled:opacity-30 transition-all hover:bg-black"
                  >
                    Move {selectedTaskIds.size > 0 ? `(${selectedTaskIds.size})` : ''}
                  </button>
                </div>
              )}

              {/* Today task list */}
              <div className="space-y-4">
                {todayTasks.map(task => (
                  <TaskEditorialCard
                    key={task.id}
                    task={task}
                    onMove={updateTaskBucket}
                    onEdit={tk => setModal({ open: true, task: tk })}
                    onToggleDone={toggleDone}
                    t={t}
                    language={language}
                    PRIORITY_META={PRIORITY_META}
                    rearrangeMode={rearrangeMode}
                    isSelected={selectedTaskIds.has(task.id)}
                    onSelect={() => toggleTaskSelect(task.id)}
                  />
                ))}
                {todayTasks.length === 0 && (
                  <div className="py-20 border-2 border-dashed border-neutral-100 rounded-2xl flex flex-col items-center justify-center text-neutral-200">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] italic">{t('execution.no_today_tasks')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* THIS WEEK — grouped by day */}
            <div className="space-y-6">
              <div className="pb-3 border-b border-neutral-100">
                <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-[0.1em]">{t('execution.weekly_tasks')}</p>
              </div>
              {Object.entries(weekTasksByDay).length === 0 && (
                <p className="text-[10px] text-neutral-200 italic uppercase tracking-widest text-center py-8">No upcoming tasks</p>
              )}
              {Object.entries(weekTasksByDay).map(([dateKey, dayTasks]) => (
                <div key={dateKey} className="space-y-3">
                  <p className="text-[9px] font-bold text-neutral-300 uppercase tracking-[0.15em] flex items-center gap-2">
                    <span className="h-[1px] w-4 bg-neutral-200 inline-block" />
                    {formatDayLabel(dateKey, language)}
                  </p>
                  {dayTasks.map(task => (
                    <TaskEditorialCard
                      key={task.id}
                      task={task}
                      onMove={updateTaskBucket}
                      onEdit={tk => setModal({ open: true, task: tk })}
                      onToggleDone={toggleDone}
                      t={t}
                      language={language}
                      PRIORITY_META={PRIORITY_META}
                      rearrangeMode={false}
                      isSelected={false}
                      onSelect={() => {}}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Column>

        {/* Col 3 — Backlog */}
        <Column label={t('execution.backlog')} icon={Inbox}>
          <div className="space-y-4">
            {backlogTasks.map(task => (
              <TaskEditorialCard
                key={task.id}
                task={task}
                onMove={updateTaskBucket}
                onEdit={tk => setModal({ open: true, task: tk })}
                onToggleDone={toggleDone}
                t={t}
                language={language}
                PRIORITY_META={PRIORITY_META}
                rearrangeMode={false}
                isSelected={false}
                onSelect={() => {}}
              />
            ))}
            {backlogTasks.length === 0 && (
              <div className="py-20 border-2 border-dashed border-neutral-100 rounded-2xl flex items-center justify-center text-neutral-200 uppercase tracking-widest text-[9px] italic">
                {t('execution.backlog_clear')}
              </div>
            )}
          </div>
        </Column>

        {/* Col 4 — Done */}
        <Column label={t('execution.completed')} icon={CheckCircle2}>
          <div className="space-y-4">
            {doneTasks.map(task => (
              <TaskEditorialCard
                key={task.id}
                task={task}
                onMove={updateTaskBucket}
                onEdit={tk => setModal({ open: true, task: tk })}
                onToggleDone={toggleDone}
                t={t}
                language={language}
                PRIORITY_META={PRIORITY_META}
                rearrangeMode={false}
                isSelected={false}
                onSelect={() => {}}
              />
            ))}
            {doneTasks.length === 0 && (
              <div className="py-20 border-2 border-dashed border-neutral-100 rounded-2xl flex items-center justify-center text-neutral-200 uppercase tracking-widest text-[9px] italic">
                {t('execution.no_completions')}
              </div>
            )}
          </div>
        </Column>
      </div>

      {/* Modals */}
      <TaskModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, task: null })}
        editTask={modal.task}
        clients={clients}
        onTaskSaved={() => load(true)}
      />

      <TaskCompletionModal
        isOpen={completionModal.open}
        onClose={() => setCompletionModal({ open: false, task: null })}
        onComplete={completeTask}
        task={completionModal.task}
        t={t}
      />

      <OverloadModal
        isOpen={showOverloadModal}
        taskCount={todayTasks.length}
        onStickToIt={() => {
          localStorage.setItem(`priority_overload_${todayStr()}`, '1');
          setShowOverloadModal(false);
        }}
        onRearrange={() => {
          localStorage.setItem(`priority_overload_${todayStr()}`, '1');
          setShowOverloadModal(false);
          setRearrangeMode(true);
        }}
      />
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Column({ label, icon: Icon, children }) {
  return (
    <div className="space-y-10 min-h-[600px]">
      <div className="flex items-center gap-4">
        <Icon className="h-4 w-4 text-neutral-300" />
        <h2 className="text-xl font-serif text-[var(--ink-primary)]">{label}.</h2>
      </div>
      <div className="px-1">{children}</div>
    </div>
  );
}

function ClientMinimalCard({ client }) {
  return (
    <Link to={`/client/${client.id}`} className="block group">
      <div className="surface-card surface-card-hover p-6 md:p-8 space-y-4 transition-all">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-serif text-[var(--ink-primary)] group-hover:text-black transition-colors truncate">{client.name}</h3>
          <ChevronRight className="h-4 w-4 text-neutral-200 group-hover:text-neutral-400 transition-transform group-hover:translate-x-1" />
        </div>
        {client.next_action && (
          <div className="pt-4 border-t border-neutral-50">
            <p className="text-xs font-medium text-neutral-400 leading-snug italic">{client.next_action}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {client.tags?.slice(0, 2).map(t => <TagBadge key={t} tag={t} />)}
        </div>
      </div>
    </Link>
  );
}

const CLIENT_ACCENTS = [
  'border-indigo-200', 'border-amber-200', 'border-emerald-200',
  'border-rose-200', 'border-fuchsia-200', 'border-cyan-200',
  'border-orange-200', 'border-slate-300'
];

function TaskEditorialCard({ task, onMove, onEdit, onToggleDone, t, language, PRIORITY_META, rearrangeMode, isSelected, onSelect }) {
  const p = PRIORITY_META[task.priority] || PRIORITY_META.low;

  const accentClass = (() => {
    if (!task.client_id) return 'border-neutral-100';
    const sum = task.client_id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return CLIENT_ACCENTS[sum % CLIENT_ACCENTS.length];
  })();

  return (
    <div className={cn(
      "surface-card p-6 flex items-start gap-4 group transition-all border-l-4",
      accentClass,
      task.done && "opacity-40 grayscale-[0.5]",
      isSelected && "ring-2 ring-amber-300 ring-offset-1"
    )}>
      {/* Checkbox: rearrange selector OR done toggle */}
      {rearrangeMode ? (
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className={cn(
            "mt-1 h-5 w-5 rounded border flex items-center justify-center transition-all duration-200 shrink-0",
            isSelected ? "bg-amber-400 border-amber-400" : "border-neutral-200 bg-neutral-50 hover:border-amber-300"
          )}
        >
          {isSelected && <span className="text-white text-[10px] font-black">✓</span>}
        </button>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleDone(task); }}
          className={cn(
            "mt-1 h-5 w-5 rounded border flex items-center justify-center transition-all duration-300 shrink-0",
            task.done
              ? "bg-[var(--success-green)] border-[var(--success-green)]"
              : "border-neutral-200 bg-neutral-50 hover:border-neutral-400"
          )}
        >
          {task.done && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
        </button>
      )}

      <div className="flex-1 min-w-0" onClick={() => !rearrangeMode && onEdit(task)}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className={cn(
            "text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-[0.1em] border transition-all",
            p.bg, p.color, "border-neutral-100"
          )}>
            {p.label}
          </span>
          {!rearrangeMode && (
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {['today', 'this_week', 'backlog'].filter(b => b !== task.bucket).map(b => (
                <button
                  key={b}
                  onClick={(e) => { e.stopPropagation(); onMove(task.id, b); }}
                  className="text-[8px] font-bold text-neutral-400 hover:text-neutral-600 uppercase tracking-widest px-1.5 py-0.5 border border-neutral-100 rounded bg-white shadow-sm"
                >
                  {b === 'this_week' ? t('execution.week_bucket') : b === 'backlog' ? t('execution.archive_bucket') : t('execution.today_bucket')}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className={cn(
          "text-sm font-medium leading-normal tracking-tight transition-all",
          task.done ? "line-through text-neutral-400" : "text-[var(--ink-primary)]"
        )}>{task.title}</p>

        <div className="flex items-center justify-between mt-3 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {task.clients?.name && (
              <p className={cn("text-[9px] font-bold uppercase tracking-widest truncate", task.done ? "text-neutral-300" : "text-neutral-400")}>
                {task.clients.name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {task.created_at && (
              <span className="text-[8px] font-mono text-neutral-300">
                {formatCreatedDate(task.created_at, language)}
              </span>
            )}
            {task.estimated_minutes > 0 && (
              <span className="text-[8px] font-mono text-neutral-300 flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />{formatMinutes(task.estimated_minutes)}
              </span>
            )}
            {task.actual_minutes > 0 && (
              <span className="text-[8px] font-mono text-[var(--success-green)]">
                ✓{task.actual_minutes}m
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Overload Modal ────────────────────────────────────────────────────────────

function OverloadModal({ isOpen, taskCount, onStickToIt, onRearrange }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-white/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md surface-card p-12 space-y-10 shadow-2xl border-neutral-100 animate-in zoom-in-95 duration-400">
        <div className="space-y-4 text-center">
          <div className="h-16 w-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="text-3xl font-serif text-[var(--ink-primary)]">Heavy plate today.</h3>
          <p className="text-sm font-medium text-neutral-500 leading-relaxed">
            You have <strong className="text-[var(--ink-primary)]">{taskCount} tasks</strong> lined up today — more than the recommended 5. Want to power through or shuffle some around?
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={onRearrange}
            className="w-full btn-minimal h-14 bg-[var(--ink-primary)] text-white hover:bg-black flex items-center justify-center gap-3 transition-all"
          >
            <Move className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Let me rearrange</span>
          </button>
          <button
            onClick={onStickToIt}
            className="w-full py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-black transition-all"
          >
            I'll handle all {taskCount} today
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Completion Modal ──────────────────────────────────────────────────────────

function TaskCompletionModal({ isOpen, onClose, onComplete, task, t }) {
  const [minutes, setMinutes] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-white/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-sm surface-card p-12 space-y-10 shadow-2xl border-neutral-100">
        <div className="space-y-4 text-center">
          <div className="h-16 w-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-3xl font-serif text-[var(--ink-primary)]">{t('execution.good_job')}</h3>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t('execution.task_finished')}</p>
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">{t('execution.actual_time_question')}</label>
            <div className="relative">
              <input
                type="number"
                autoFocus
                value={minutes}
                onChange={e => setMinutes(e.target.value)}
                placeholder={t('execution.minutes_placeholder')}
                className="w-full bg-neutral-50/50 border border-neutral-100 rounded-xl px-6 py-4 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-neutral-200 transition-all"
              />
              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-300 uppercase">min</span>
            </div>
          </div>
          <div className="p-6 bg-amber-50/30 border border-amber-100 rounded-xl flex items-start gap-4">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[11px] font-medium text-amber-900 leading-relaxed italic">{t('execution.qa_reminder')}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => { onComplete(task.id, minutes); setMinutes(''); }}
            className="w-full btn-minimal h-14 bg-ink-charcoal text-white hover:bg-black flex items-center justify-center gap-3 transition-all cursor-pointer"
          >
            <span className="text-xs font-bold uppercase tracking-widest">{t('execution.finish_task')}</span>
            <TrendingUp className="h-4 w-4" />
          </button>
          <button onClick={onClose} className="w-full py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-300 hover:text-black transition-all">
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
