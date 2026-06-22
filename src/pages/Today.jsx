import { useState, useEffect, useCallback, useRef } from 'react';
import CustomSelect from '../components/CustomSelect';
import { supabase } from '../lib/supabase';
import {
  Plus,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Circle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ChevronDown,
  GripVertical,
  BookOpen,
  Zap
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useAvailability, availabilityMeta } from '../hooks/useAvailability';

// ── Helpers ────────────────────────────────────────────────
function toISO(date = new Date()) {
  return date.toISOString().split('T')[0];
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return toISO(d);
}

function dayLabel(dateStr, language) {
  const d = new Date(dateStr + 'T12:00:00');
  const today = toISO();
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  if (dateStr === today) return language === 'pt' ? 'Hoje' : 'Today';
  if (dateStr === yesterday) return language === 'pt' ? 'Ontem' : 'Yesterday';
  if (dateStr === tomorrow) return language === 'pt' ? 'Amanhã' : 'Tomorrow';
  return d.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function weekdayIndex(dateStr) {
  return new Date(dateStr + 'T12:00:00').getDay();
}

const PRIORITIES = [
  { value: 'high',    color: '#FF3B5C', label: { en: 'High',    pt: 'Alta' } },
  { value: 'medium',  color: '#F59E0B', label: { en: 'Medium',  pt: 'Média' } },
  { value: 'low',     color: '#3362FF', label: { en: 'Low',     pt: 'Baixa' } },
  { value: 'very_low',color: '#6B7080', label: { en: 'Very low',pt: 'Muito baixa' } },
];

function priorityColor(p) {
  return PRIORITIES.find(x => x.value === p)?.color ?? '#6B7080';
}

// ── Sub-components ─────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-[0.25em] mb-3" style={{ color: '#6B7080' }}>
      {children}
    </p>
  );
}

function CmdCard({ children, className = '', style = {} }) {
  return (
    <div
      className={cn('rounded-xl p-5', className)}
      style={{ backgroundColor: '#0D0F1E', border: '1px solid rgba(244,244,246,0.07)', ...style }}
    >
      {children}
    </div>
  );
}

function Input({ className = '', ...props }) {
  return (
    <input
      className={cn('w-full px-3 py-2 rounded-lg text-sm outline-none', className)}
      style={{ backgroundColor: 'rgba(244,244,246,0.04)', border: '1px solid rgba(244,244,246,0.1)', color: '#F4F4F6' }}
      {...props}
    />
  );
}

function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={cn('w-full px-3 py-2 rounded-lg text-sm outline-none resize-none', className)}
      rows={3}
      style={{ backgroundColor: 'rgba(244,244,246,0.04)', border: '1px solid rgba(244,244,246,0.1)', color: '#F4F4F6' }}
      {...props}
    />
  );
}

function Select({ children, ...props }) {
  return (
    <div className="relative">
      <select
        className="w-full px-3 py-2 rounded-lg text-sm outline-none appearance-none pr-8"
        style={{ backgroundColor: 'rgba(244,244,246,0.04)', border: '1px solid rgba(244,244,246,0.1)', color: '#F4F4F6' }}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: '#6B7080' }} />
    </div>
  );
}

// ── Focus inline editor ────────────────────────────────────
function FocusEditor({ plan, onSave, language }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(plan?.focus_note ?? '');
  const ref = useRef(null);

  useEffect(() => { setText(plan?.focus_note ?? ''); }, [plan]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  async function save() {
    setEditing(false);
    if (!plan) return;
    await supabase.from('daily_plans').update({ focus_note: text, updated_at: new Date().toISOString() }).eq('id', plan.id);
    onSave(text);
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <textarea
          ref={ref}
          value={text}
          onChange={e => setText(e.target.value)}
          rows={2}
          className="w-full px-0 py-0 bg-transparent text-lg font-serif outline-none resize-none"
          style={{ color: '#F4F4F6', borderBottom: '1px solid rgba(51,98,255,0.4)' }}
          onBlur={save}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); } if (e.key === 'Escape') { setEditing(false); } }}
        />
        <p className="text-[9px]" style={{ color: '#6B7080' }}>
          {language === 'pt' ? 'Enter para salvar · Esc para cancelar' : 'Enter to save · Esc to cancel'}
        </p>
      </div>
    );
  }

  return (
    <div
      className="group cursor-text"
      onClick={() => plan && setEditing(true)}
    >
      {text ? (
        <div className="flex items-start gap-2">
          <p className="text-lg font-serif flex-1" style={{ color: '#F4F4F6' }}>{text}</p>
          {plan && <Pencil className="h-3.5 w-3.5 mt-1 opacity-0 group-hover:opacity-40 transition-opacity shrink-0" style={{ color: '#6B7080' }} />}
        </div>
      ) : (
        <p className="text-sm italic" style={{ color: '#6B7080' }}>
          {plan
            ? (language === 'pt' ? 'Clique para definir o foco do dia...' : 'Click to set today\'s focus...')
            : (language === 'pt' ? 'Inicie o dia para definir o foco.' : 'Start the day to set a focus.')
          }
        </p>
      )}
    </div>
  );
}

// ── Task picker (tasks not yet in today's plan) ────────────
function TaskPicker({ existingTaskIds, onAdd, onClose, language }) {
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('tasks')
        .select('id, title, priority, client_id, clients(name)')
        .eq('done', false)
        .not('id', 'in', existingTaskIds.length > 0 ? `(${existingTaskIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)')
        .order('priority')
        .limit(50);
      setTasks(data || []);
      setLoading(false);
    }
    fetch();
  }, [existingTaskIds]);

  const filtered = tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <CmdCard style={{ border: '1px solid rgba(51,98,255,0.3)' }}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold" style={{ color: '#F4F4F6' }}>
            {language === 'pt' ? 'Adicionar tarefa ao dia' : 'Add task to today'}
          </p>
          <button onClick={onClose} style={{ color: '#6B7080' }}><X className="h-4 w-4" /></button>
        </div>
        <Input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={language === 'pt' ? 'Buscar tarefas...' : 'Search tasks...'}
          autoFocus
        />
        {loading ? (
          <div className="flex items-center gap-2 py-2" style={{ color: '#6B7080' }}>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="text-xs">{language === 'pt' ? 'Carregando...' : 'Loading...'}</span>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-xs py-2" style={{ color: '#6B7080' }}>
            {language === 'pt' ? 'Nenhuma tarefa encontrada.' : 'No tasks found.'}
          </p>
        ) : (
          <div className="space-y-1 max-h-52 overflow-y-auto">
            {filtered.map(task => (
              <button
                key={task.id}
                onClick={() => onAdd(task)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors hover:bg-[rgba(244,244,246,0.04)]"
              >
                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: priorityColor(task.priority) }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: '#F4F4F6' }}>{task.title}</p>
                  {task.clients?.name && (
                    <p className="text-[9px]" style={{ color: '#6B7080' }}>{task.clients.name}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </CmdCard>
  );
}

// ── Quick-create task form ─────────────────────────────────
function QuickTaskForm({ planId, clients, onSaved, onClose, language }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [clientId, setClientId] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({ title: title.trim(), priority, client_id: clientId || null, bucket: 'today', done: false })
      .select()
      .single();
    if (!error && task) {
      const existingCount = await supabase
        .from('daily_plan_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('daily_plan_id', planId);
      await supabase.from('daily_plan_tasks').insert({
        daily_plan_id: planId,
        task_id: task.id,
        sort_order: (existingCount.count || 0) + 1,
        is_top_three: false,
      });
      onSaved();
    }
    setSaving(false);
    onClose();
  }

  return (
    <CmdCard style={{ border: '1px solid rgba(51,98,255,0.3)' }}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold" style={{ color: '#F4F4F6' }}>
            {language === 'pt' ? 'Nova tarefa para hoje' : 'New task for today'}
          </p>
          <button onClick={onClose} style={{ color: '#6B7080' }}><X className="h-4 w-4" /></button>
        </div>
        <Input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={language === 'pt' ? 'O que precisa ser feito...' : 'What needs to be done...'}
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onClose(); }}
        />
        <div className="flex gap-2">
          <div className="flex-1">
            <CustomSelect value={priority} onChange={v => setPriority(v)} options={PRIORITIES.map(p => ({ value: p.value, label: p.label[language] }))} />
          </div>
          <div className="flex-1">
            <CustomSelect value={clientId} onChange={v => setClientId(v)} options={[{ value: '', label: language === 'pt' ? 'Sem cliente' : 'No client' }, ...clients.map(c => ({ value: c.id, label: c.name }))]} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)' }}
          >
            {language === 'pt' ? 'Cancelar' : 'Cancel'}
          </button>
          <button
            onClick={save}
            disabled={saving || !title.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
            style={{ backgroundColor: '#3362FF', color: '#F4F4F6' }}
          >
            <Check className="h-3.5 w-3.5" />
            {saving ? '...' : (language === 'pt' ? 'Criar' : 'Create')}
          </button>
        </div>
      </div>
    </CmdCard>
  );
}

// ── Review form ────────────────────────────────────────────
function ReviewForm({ plan, existing, onSaved, onClose, language }) {
  const [form, setForm] = useState({
    completed_summary: existing?.completed_summary ?? '',
    slipped_summary: existing?.slipped_summary ?? '',
    blocker_summary: existing?.blocker_summary ?? '',
    tomorrow_note: existing?.tomorrow_note ?? '',
    ritual_completed: existing?.ritual_completed ?? false,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    if (!plan) return;
    setSaving(true);
    const payload = { daily_plan_id: plan.id, ...form };
    if (existing) {
      await supabase.from('daily_reviews').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('daily_reviews').insert(payload);
    }
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <CmdCard style={{ border: '1px solid rgba(51,98,255,0.3)' }}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold" style={{ color: '#F4F4F6' }}>
            {language === 'pt' ? 'Revisão do Dia' : 'Day Review'}
          </p>
          <button onClick={onClose} style={{ color: '#6B7080' }}><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#22C55E' }}>
              {language === 'pt' ? 'O que foi feito' : 'What got done'}
            </p>
            <Textarea
              value={form.completed_summary}
              onChange={e => set('completed_summary', e.target.value)}
              placeholder={language === 'pt' ? 'Conquistas do dia...' : 'Today\'s accomplishments...'}
            />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#F59E0B' }}>
              {language === 'pt' ? 'O que escorregou' : 'What slipped'}
            </p>
            <Textarea
              value={form.slipped_summary}
              onChange={e => set('slipped_summary', e.target.value)}
              placeholder={language === 'pt' ? 'Tarefas não concluídas...' : 'Uncompleted tasks...'}
            />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#FF3B5C' }}>
              {language === 'pt' ? 'Bloqueios' : 'Blockers'}
            </p>
            <Textarea
              value={form.blocker_summary}
              onChange={e => set('blocker_summary', e.target.value)}
              placeholder={language === 'pt' ? 'O que impediu o progresso...' : 'What blocked progress...'}
            />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#3362FF' }}>
              {language === 'pt' ? 'Amanhã' : 'Tomorrow'}
            </p>
            <Textarea
              value={form.tomorrow_note}
              onChange={e => set('tomorrow_note', e.target.value)}
              placeholder={language === 'pt' ? 'Foco de amanhã...' : 'Tomorrow\'s focus...'}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.ritual_completed}
              onChange={e => set('ritual_completed', e.target.checked)}
              className="rounded"
              style={{ accentColor: '#3362FF' }}
            />
            <span className="text-xs" style={{ color: '#F4F4F6' }}>
              {language === 'pt' ? 'Ritual do dia concluído' : 'Day ritual completed'}
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)' }}
          >
            {language === 'pt' ? 'Cancelar' : 'Cancel'}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
            style={{ backgroundColor: '#3362FF', color: '#F4F4F6' }}
          >
            <Check className="h-3.5 w-3.5" />
            {saving ? '...' : (language === 'pt' ? 'Salvar Revisão' : 'Save Review')}
          </button>
        </div>
      </div>
    </CmdCard>
  );
}

// ── Task row ───────────────────────────────────────────────
function TaskRow({ planTask, onToggle, onRemove, onToggleTop3, language }) {
  const { task } = planTask;
  if (!task) return null;
  const done = task.done;

  return (
    <div className="flex items-center gap-3 py-2 group">
      <GripVertical className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-30" style={{ color: '#6B7080' }} />
      <button onClick={() => onToggle(planTask)} className="shrink-0">
        {done
          ? <CheckCircle2 className="h-4 w-4" style={{ color: '#22C55E' }} />
          : <Circle className="h-4 w-4" style={{ color: '#6B7080' }} />
        }
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: done ? '#6B7080' : '#F4F4F6', textDecoration: done ? 'line-through' : 'none' }}>
          {task.title}
        </p>
        {task.clients?.name && (
          <p className="text-[9px]" style={{ color: '#6B7080' }}>{task.clients.name}</p>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => onToggleTop3(planTask)}
          title={planTask.is_top_three ? 'Remove from Top 3' : 'Add to Top 3'}
          className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={planTask.is_top_three
            ? { backgroundColor: 'rgba(51,98,255,0.2)', color: '#3362FF' }
            : { color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)' }
          }
        >
          {language === 'pt' ? 'top 3' : 'top 3'}
        </button>
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: priorityColor(task.priority) }} />
        <button onClick={() => onRemove(planTask)} className="p-1 rounded transition-colors" style={{ color: '#6B7080' }}>
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function Today() {
  const { language } = useLanguage();
  const toast = useToast();

  const [currentDate, setCurrentDate] = useState(toISO());
  const availRule = useAvailability(currentDate);
  const isToday = currentDate === toISO();

  const [plan, setPlan] = useState(null);
  const [planTasks, setPlanTasks] = useState([]);
  const [rituals, setRituals] = useState([]);
  const [review, setReview] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [showQuickTask, setShowQuickTask] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const weekday = weekdayIndex(currentDate);

    const [planRes, ritualsRes, clientsRes] = await Promise.all([
      supabase.from('daily_plans').select('*').eq('date', currentDate).maybeSingle(),
      supabase.from('day_rituals').select('*').eq('day_of_week', weekday).eq('is_active', true).order('title'),
      supabase.from('clients').select('id, name').eq('status', 'active').order('name'),
    ]);

    const planData = planRes.data;
    setPlan(planData || null);
    setRituals(ritualsRes.data || []);
    setClients(clientsRes.data || []);

    if (planData) {
      const [ptRes, revRes] = await Promise.all([
        supabase
          .from('daily_plan_tasks')
          .select('*, task:tasks(id, title, done, priority, client_id, clients(name))')
          .eq('daily_plan_id', planData.id)
          .order('is_top_three', { ascending: false })
          .order('sort_order'),
        supabase
          .from('daily_reviews')
          .select('*')
          .eq('daily_plan_id', planData.id)
          .maybeSingle(),
      ]);
      setPlanTasks(ptRes.data || []);
      setReview(revRes.data || null);
    } else {
      setPlanTasks([]);
      setReview(null);
    }
    setLoading(false);
  }, [currentDate]);

  useEffect(() => { load(); }, [load]);

  // Navigate days
  const prevDay = () => setCurrentDate(d => addDays(d, -1));
  const nextDay = () => setCurrentDate(d => addDays(d, 1));
  const goToToday = () => setCurrentDate(toISO());

  // Start day
  async function startDay() {
    if (plan) return;
    setStarting(true);
    const { data, error } = await supabase
      .from('daily_plans')
      .insert({ date: currentDate, focus_note: '' })
      .select()
      .single();
    if (!error) { setPlan(data); toast.success?.('Day started'); }
    setStarting(false);
  }

  // Toggle task done
  async function toggleTask(planTask) {
    const newDone = !planTask.task.done;
    await supabase.from('tasks').update({ done: newDone, updated_at: new Date().toISOString() }).eq('id', planTask.task.id);
    await load();
  }

  // Remove task from plan (doesn't delete task)
  async function removeFromPlan(planTask) {
    await supabase.from('daily_plan_tasks').delete().eq('id', planTask.id);
    await load();
  }

  // Toggle top 3
  async function toggleTop3(planTask) {
    await supabase
      .from('daily_plan_tasks')
      .update({ is_top_three: !planTask.is_top_three })
      .eq('id', planTask.id);
    await load();
  }

  // Add existing task to plan
  async function addTaskToPlan(task) {
    if (!plan) return;
    await supabase.from('daily_plan_tasks').insert({
      daily_plan_id: plan.id,
      task_id: task.id,
      sort_order: planTasks.length + 1,
      is_top_three: false,
    });
    setShowTaskPicker(false);
    await load();
  }

  // Derived
  const top3 = planTasks.filter(pt => pt.is_top_three);
  const _rest = planTasks.filter(pt => !pt.is_top_three);
  const doneCount = planTasks.filter(pt => pt.task?.done).length;
  const existingTaskIds = planTasks.map(pt => pt.task?.id).filter(Boolean);

  // Ritual local check state
  const [checkedRituals, setCheckedRituals] = useState({});
  const toggleRitual = (id) => setCheckedRituals(s => ({ ...s, [id]: !s[id] }));

  return (
    <div className="space-y-10 animate-in fade-in duration-500">

      {/* Header */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: '#6B7080' }}>
          {language === 'pt' ? 'Planejamento' : 'Planning'}
        </p>
        <h1 className="text-3xl font-serif tracking-tight" style={{ color: '#F4F4F6' }}>
          {language === 'pt' ? 'Hoje.' : 'Today.'}
        </h1>
      </div>

      {/* Day navigator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={prevDay}
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)', backgroundColor: '#0D0F1E' }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: '#F4F4F6' }}>{dayLabel(currentDate, language)}</p>
            <p className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: '#6B7080' }}>
              {new Date(currentDate + 'T12:00:00').toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
          <button
            onClick={nextDay}
            disabled={currentDate >= addDays(toISO(), 1)}
            className="h-8 w-8 rounded-lg flex items-center justify-center disabled:opacity-30"
            style={{ color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)', backgroundColor: '#0D0F1E' }}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {!isToday && (
            <button
              onClick={goToToday}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ color: '#3362FF', border: '1px solid rgba(51,98,255,0.3)', backgroundColor: 'rgba(51,98,255,0.08)' }}
            >
              <RotateCcw className="h-3 w-3" /> {language === 'pt' ? 'Hoje' : 'Today'}
            </button>
          )}
          {plan && isToday && !showReview && (
            <button
              onClick={() => setShowReview(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)', backgroundColor: '#0D0F1E' }}
            >
              <BookOpen className="h-3.5 w-3.5" /> {language === 'pt' ? 'Revisão' : 'Review'}
            </button>
          )}
        </div>
      </div>

      {/* Availability banner */}
      {availRule !== undefined && availRule !== null && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            backgroundColor: availabilityMeta(availRule.availability_type).color + '12',
            border: `1px solid ${availabilityMeta(availRule.availability_type).color}33`
          }}
        >
          <Zap className="h-4 w-4 shrink-0" style={{ color: availabilityMeta(availRule.availability_type).color }} />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold" style={{ color: availabilityMeta(availRule.availability_type).color }}>
              {availabilityMeta(availRule.availability_type).label[language]}
            </span>
            {availRule.label && (
              <span className="text-xs ml-2" style={{ color: '#F4F4F6' }}>{availRule.label}</span>
            )}
            {availRule.start_time && availRule.end_time && (
              <span className="text-xs ml-2" style={{ color: '#6B7080' }}>
                {availRule.start_time.slice(0, 5)} – {availRule.end_time.slice(0, 5)}
              </span>
            )}
            {availRule.notes && (
              <span className="text-xs ml-2 truncate" style={{ color: '#6B7080' }}>{availRule.notes}</span>
            )}
          </div>
          {availRule.company_scope !== 'all' && (
            <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
              style={{ color: '#6B7080', border: '1px solid rgba(244,244,246,0.12)' }}>
              {availRule.company_scope}
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-6" style={{ color: '#6B7080' }}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span className="text-xs">{language === 'pt' ? 'Carregando...' : 'Loading...'}</span>
        </div>
      ) : !plan ? (
        /* No plan yet */
        <CmdCard>
          <div className="flex flex-col items-center py-8 gap-4">
            <p className="text-sm font-medium" style={{ color: '#F4F4F6' }}>
              {language === 'pt' ? 'Dia ainda não iniciado.' : 'Day not started yet.'}
            </p>
            <p className="text-xs text-center" style={{ color: '#6B7080' }}>
              {language === 'pt'
                ? 'Inicie o dia para definir o foco e selecionar as tarefas.'
                : 'Start the day to set your focus and pick your tasks.'}
            </p>
            {isToday && (
              <button
                onClick={startDay}
                disabled={starting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-all"
                style={{ backgroundColor: '#3362FF', color: '#F4F4F6' }}
              >
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {language === 'pt' ? 'Iniciar o Dia' : 'Start the Day'}
              </button>
            )}
          </div>
        </CmdCard>
      ) : (
        <div className="space-y-6">
          {/* Focus */}
          <CmdCard>
            <SectionLabel>{language === 'pt' ? 'Foco do Dia' : 'Focus of the Day'}</SectionLabel>
            <FocusEditor
              plan={plan}
              language={language}
              onSave={(text) => setPlan(p => ({ ...p, focus_note: text }))}
            />
          </CmdCard>

          {/* Rituals */}
          {rituals.length > 0 && (
            <CmdCard>
              <SectionLabel>{language === 'pt' ? 'Rituais de Hoje' : 'Today\'s Rituals'}</SectionLabel>
              <div className="space-y-2">
                {rituals.map(ritual => (
                  <label key={ritual.id} className="flex items-center gap-3 cursor-pointer group">
                    <button
                      onClick={() => toggleRitual(ritual.id)}
                      className="shrink-0"
                    >
                      {checkedRituals[ritual.id]
                        ? <CheckCircle2 className="h-4 w-4" style={{ color: '#22C55E' }} />
                        : <Circle className="h-4 w-4" style={{ color: '#6B7080' }} />
                      }
                    </button>
                    <div>
                      <p className="text-sm" style={{ color: checkedRituals[ritual.id] ? '#6B7080' : '#F4F4F6', textDecoration: checkedRituals[ritual.id] ? 'line-through' : 'none' }}>
                        {ritual.title}
                      </p>
                      {ritual.description && (
                        <p className="text-[9px]" style={{ color: '#6B7080' }}>{ritual.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </CmdCard>
          )}

          {/* Top 3 */}
          <CmdCard>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>{language === 'pt' ? 'Top 3 Tarefas' : 'Top 3 Tasks'}</SectionLabel>
              {planTasks.length > 0 && (
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#6B7080' }}>
                  {doneCount}/{planTasks.length} {language === 'pt' ? 'feitas' : 'done'}
                </span>
              )}
            </div>
            {top3.length === 0 ? (
              <p className="text-xs" style={{ color: '#6B7080' }}>
                {language === 'pt'
                  ? 'Marque até 3 tarefas como "top 3" abaixo.'
                  : 'Mark up to 3 tasks as "top 3" below.'}
              </p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(244,244,246,0.05)' }}>
                {top3.map(pt => (
                  <TaskRow key={pt.id} planTask={pt} onToggle={toggleTask} onRemove={removeFromPlan} onToggleTop3={toggleTop3} language={language} />
                ))}
              </div>
            )}
          </CmdCard>

          {/* All tasks */}
          <CmdCard>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>{language === 'pt' ? 'Todas as Tarefas' : 'All Tasks'}</SectionLabel>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowTaskPicker(true); setShowQuickTask(false); }}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium"
                  style={{ color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)' }}
                >
                  <Plus className="h-3 w-3" /> {language === 'pt' ? 'Existente' : 'Existing'}
                </button>
                <button
                  onClick={() => { setShowQuickTask(true); setShowTaskPicker(false); }}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium"
                  style={{ backgroundColor: 'rgba(51,98,255,0.15)', color: '#3362FF', border: '1px solid rgba(51,98,255,0.3)' }}
                >
                  <Plus className="h-3 w-3" /> {language === 'pt' ? 'Nova' : 'New'}
                </button>
              </div>
            </div>

            {showTaskPicker && (
              <div className="mb-3">
                <TaskPicker existingTaskIds={existingTaskIds} onAdd={addTaskToPlan} onClose={() => setShowTaskPicker(false)} language={language} />
              </div>
            )}
            {showQuickTask && (
              <div className="mb-3">
                <QuickTaskForm planId={plan.id} clients={clients} onSaved={load} onClose={() => setShowQuickTask(false)} language={language} />
              </div>
            )}

            {planTasks.length === 0 ? (
              <p className="text-xs py-2" style={{ color: '#6B7080' }}>
                {language === 'pt' ? 'Nenhuma tarefa adicionada ainda.' : 'No tasks added yet.'}
              </p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(244,244,246,0.05)' }}>
                {planTasks.map(pt => (
                  <TaskRow key={pt.id} planTask={pt} onToggle={toggleTask} onRemove={removeFromPlan} onToggleTop3={toggleTop3} language={language} />
                ))}
              </div>
            )}
          </CmdCard>

          {/* Review (existing) */}
          {review && !showReview && (
            <CmdCard>
              <div className="flex items-center justify-between mb-3">
                <SectionLabel>{language === 'pt' ? 'Revisão do Dia' : 'Day Review'}</SectionLabel>
                <button
                  onClick={() => setShowReview(true)}
                  className="text-xs font-medium"
                  style={{ color: '#3362FF' }}
                >
                  {language === 'pt' ? 'Editar' : 'Edit'}
                </button>
              </div>
              {review.completed_summary && (
                <div className="mb-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: '#22C55E' }}>
                    {language === 'pt' ? 'Feito' : 'Done'}
                  </p>
                  <p className="text-sm whitespace-pre-line" style={{ color: '#F4F4F6' }}>{review.completed_summary}</p>
                </div>
              )}
              {review.tomorrow_note && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: '#3362FF' }}>
                    {language === 'pt' ? 'Amanhã' : 'Tomorrow'}
                  </p>
                  <p className="text-sm whitespace-pre-line" style={{ color: '#F4F4F6' }}>{review.tomorrow_note}</p>
                </div>
              )}
            </CmdCard>
          )}

          {/* Review form */}
          {showReview && (
            <ReviewForm
              plan={plan}
              existing={review}
              language={language}
              onSaved={load}
              onClose={() => setShowReview(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
