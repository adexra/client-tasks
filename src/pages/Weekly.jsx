import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Plus,
  Trash2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  Calendar,
  Target,
  LayoutList,
  Zap
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useAvailability, availabilityMeta } from '../hooks/useAvailability';

// ── Date helpers ────────────────────────────────────────────
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekEnd(weekStart) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  return d;
}

function toISO(date) {
  return date.toISOString().split('T')[0];
}

function addWeeks(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n * 7);
  return d;
}

function weekLabel(weekStart, language) {
  const end = getWeekEnd(new Date(weekStart + 'T12:00:00'));
  const startDate = new Date(weekStart + 'T12:00:00');
  const fmt = (d) => d.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { month: 'short', day: 'numeric' });
  return `${fmt(startDate)} — ${fmt(end)}`;
}

function weekNumber(weekStart) {
  const d = new Date(weekStart + 'T12:00:00');
  const jan1 = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
}

// ── Constants ──────────────────────────────────────────────
const OUTCOME_STATUSES = [
  { value: 'planned',     color: '#6B7080', label: { en: 'Planned',     pt: 'Planejado' } },
  { value: 'in_progress', color: '#F59E0B', label: { en: 'In Progress', pt: 'Em Andamento' } },
  { value: 'done',        color: '#22C55E', label: { en: 'Done',        pt: 'Concluído' } },
  { value: 'missed',      color: '#FF3B5C', label: { en: 'Missed',      pt: 'Perdido' } },
];

function statusColor(value) {
  return OUTCOME_STATUSES.find(s => s.value === value)?.color ?? '#6B7080';
}

function statusLabel(value, language) {
  return OUTCOME_STATUSES.find(s => s.value === value)?.label[language] ?? value;
}

// ── Sub-components ─────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-[0.25em] mb-4" style={{ color: '#6B7080' }}>
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

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: '#6B7080' }}>{label}</label>
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
      rows={2}
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

function Badge({ color, children }) {
  return (
    <span
      className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
      style={{ backgroundColor: color + '22', color, border: `1px solid ${color}44` }}
    >
      {children}
    </span>
  );
}

function ProgressBar({ value }) {
  const color = value >= 80 ? '#22C55E' : value >= 40 ? '#F59E0B' : '#3362FF';
  return (
    <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(244,244,246,0.07)' }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ── Outcome Form ───────────────────────────────────────────
const OUTCOME_BLANK = {
  title: '',
  description: '',
  status: 'planned',
  success_metric: '',
  progress_percent: 0,
};

function OutcomeForm({ initial, onSave, onCancel, language }) {
  const [form, setForm] = useState(initial ?? OUTCOME_BLANK);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isEdit = !!form.id;

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    await onSave({
      title: form.title.trim(),
      description: form.description || null,
      status: form.status,
      success_metric: form.success_metric || null,
      progress_percent: parseInt(form.progress_percent) || 0,
      updated_at: new Date().toISOString(),
    }, form.id);
    setSaving(false);
  }

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{ backgroundColor: '#0D0F1E', border: '1px solid rgba(51,98,255,0.3)' }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={language === 'pt' ? 'Resultado' : 'Outcome'}>
          <Input
            type="text"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder={language === 'pt' ? 'O que precisa acontecer...' : 'What needs to happen...'}
            autoFocus
          />
        </Field>
        <Field label={language === 'pt' ? 'Status' : 'Status'}>
          <Select value={form.status} onChange={e => set('status', e.target.value)}>
            {OUTCOME_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label[language]}</option>
            ))}
          </Select>
        </Field>
        <Field label={language === 'pt' ? 'Métrica de sucesso' : 'Success metric'}>
          <Input
            type="text"
            value={form.success_metric}
            onChange={e => set('success_metric', e.target.value)}
            placeholder={language === 'pt' ? 'Como medir o sucesso...' : 'How to measure success...'}
          />
        </Field>
        <Field label={language === 'pt' ? `Progresso: ${form.progress_percent}%` : `Progress: ${form.progress_percent}%`}>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={form.progress_percent}
            onChange={e => set('progress_percent', e.target.value)}
            className="w-full accent-blue-500"
            style={{ accentColor: '#3362FF' }}
          />
        </Field>
        <Field label={language === 'pt' ? 'Descrição (opcional)' : 'Description (optional)'} >
          <Textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder={language === 'pt' ? 'Contexto adicional...' : 'Additional context...'}
          />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)' }}
        >
          <X className="h-3.5 w-3.5" /> {language === 'pt' ? 'Cancelar' : 'Cancel'}
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !form.title.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
          style={{ backgroundColor: '#3362FF', color: '#F4F4F6' }}
        >
          <Check className="h-3.5 w-3.5" />
          {saving ? '...' : isEdit ? (language === 'pt' ? 'Atualizar' : 'Update') : (language === 'pt' ? 'Adicionar' : 'Add')}
        </button>
      </div>
    </div>
  );
}

// ── Weekly Plan Form ───────────────────────────────────────
function PlanForm({ weekStart, existing, onSave, language }) {
  const [theme, setTheme] = useState(existing?.theme ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTheme(existing?.theme ?? '');
    setNotes(existing?.notes ?? '');
  }, [existing]);

  async function handleSave() {
    setSaving(true);
    const weekEnd = toISO(getWeekEnd(new Date(weekStart + 'T12:00:00')));
    const payload = { week_start: weekStart, week_end: weekEnd, theme: theme || null, notes: notes || null, updated_at: new Date().toISOString() };
    await onSave(payload, existing?.id);
    setSaving(false);
  }

  return (
    <CmdCard>
      <SectionLabel>{language === 'pt' ? 'Plano da Semana' : 'Week Plan'}</SectionLabel>
      <div className="space-y-3">
        <Field label={language === 'pt' ? 'Tema da semana' : 'Week theme'}>
          <Input
            type="text"
            value={theme}
            onChange={e => setTheme(e.target.value)}
            placeholder={language === 'pt' ? 'ex: Fechar novos clientes, Estabilidade técnica...' : 'e.g. Close new clients, Technical stability...'}
          />
        </Field>
        <Field label={language === 'pt' ? 'Notas' : 'Notes'}>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={language === 'pt' ? 'Contexto, bloqueios, intenções...' : 'Context, blockers, intentions...'}
          />
        </Field>
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 transition-all"
            style={{ backgroundColor: '#3362FF', color: '#F4F4F6' }}
          >
            <Check className="h-3.5 w-3.5" />
            {saving ? '...' : existing ? (language === 'pt' ? 'Salvar' : 'Save') : (language === 'pt' ? 'Criar Semana' : 'Create Week')}
          </button>
        </div>
      </div>
    </CmdCard>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function Weekly() {
  const { language } = useLanguage();
  const toast = useToast();

  const todayWeekStart = toISO(getWeekStart());
  const fridayISO = toISO((() => { const d = new Date(todayWeekStart + 'T12:00:00'); d.setDate(d.getDate() + 4); return d; })());
  const fridayAvail = useAvailability(fridayISO);
  const [currentWeekStart, setCurrentWeekStart] = useState(todayWeekStart);

  const [plan, setPlan] = useState(null);
  const [outcomes, setOutcomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOutcomeForm, setShowOutcomeForm] = useState(false);
  const [editingOutcome, setEditingOutcome] = useState(null);

  const isCurrentWeek = currentWeekStart === todayWeekStart;

  const load = useCallback(async () => {
    setLoading(true);
    const { data: planData } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('week_start', currentWeekStart)
      .maybeSingle();

    setPlan(planData || null);

    if (planData) {
      const { data: outData } = await supabase
        .from('weekly_outcomes')
        .select('*')
        .eq('weekly_plan_id', planData.id)
        .order('created_at');
      setOutcomes(outData || []);
    } else {
      setOutcomes([]);
    }
    setLoading(false);
  }, [currentWeekStart]);

  useEffect(() => { load(); }, [load]);

  // Navigate weeks
  const prevWeek = () => setCurrentWeekStart(toISO(addWeeks(new Date(currentWeekStart + 'T12:00:00'), -1)));
  const nextWeek = () => setCurrentWeekStart(toISO(addWeeks(new Date(currentWeekStart + 'T12:00:00'), 1)));
  const goToThisWeek = () => setCurrentWeekStart(todayWeekStart);

  // Plan CRUD
  async function savePlan(payload, id) {
    if (id) {
      const { error } = await supabase.from('weekly_plans').update(payload).eq('id', id);
      if (error) { toast.error?.('Failed'); return; }
    } else {
      const { data, error } = await supabase.from('weekly_plans').insert(payload).select().single();
      if (error) { toast.error?.('Failed'); return; }
      setPlan(data);
    }
    toast.success?.('Saved');
    await load();
  }

  // Outcome CRUD
  async function saveOutcome(payload, id) {
    if (!plan) return;
    if (id) {
      await supabase.from('weekly_outcomes').update(payload).eq('id', id);
    } else {
      await supabase.from('weekly_outcomes').insert({ ...payload, weekly_plan_id: plan.id });
    }
    setShowOutcomeForm(false);
    setEditingOutcome(null);
    await load();
  }

  async function deleteOutcome(id) {
    if (!window.confirm(language === 'pt' ? 'Excluir este resultado?' : 'Delete this outcome?')) return;
    await supabase.from('weekly_outcomes').delete().eq('id', id);
    await load();
  }

  async function updateOutcomeStatus(outcome, status) {
    await supabase.from('weekly_outcomes')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', outcome.id);
    await load();
  }

  async function updateOutcomeProgress(outcome, progress_percent) {
    await supabase.from('weekly_outcomes')
      .update({ progress_percent, updated_at: new Date().toISOString() })
      .eq('id', outcome.id);
    await load();
  }

  // Summary stats
  const doneCount = outcomes.filter(o => o.status === 'done').length;
  const avgProgress = outcomes.length
    ? Math.round(outcomes.reduce((a, o) => a + o.progress_percent, 0) / outcomes.length)
    : 0;

  return (
    <div className="space-y-10 animate-in fade-in duration-500">

      {/* Header */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: '#6B7080' }}>
          {language === 'pt' ? 'Planejamento' : 'Planning'}
        </p>
        <h1 className="text-3xl font-serif tracking-tight" style={{ color: '#F4F4F6' }}>
          {language === 'pt' ? 'Semana.' : 'Weekly.'}
        </h1>
      </div>

      {/* Week Navigator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={prevWeek}
            className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)', backgroundColor: '#0D0F1E' }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: '#F4F4F6' }}>
              {weekLabel(currentWeekStart, language)}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color: '#6B7080' }}>
              {language === 'pt' ? `Semana ${weekNumber(currentWeekStart)}` : `Week ${weekNumber(currentWeekStart)}`}
              {isCurrentWeek && (
                <span className="ml-2" style={{ color: '#3362FF' }}>
                  {language === 'pt' ? '— esta semana' : '— this week'}
                </span>
              )}
            </p>
          </div>

          <button
            onClick={nextWeek}
            className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)', backgroundColor: '#0D0F1E' }}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {!isCurrentWeek && (
          <button
            onClick={goToThisWeek}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ color: '#3362FF', border: '1px solid rgba(51,98,255,0.3)', backgroundColor: 'rgba(51,98,255,0.08)' }}
          >
            <Calendar className="h-3.5 w-3.5" />
            {language === 'pt' ? 'Esta semana' : 'This week'}
          </button>
        )}
      </div>

      {/* Availability warning for this week's Friday */}
      {fridayAvail && (fridayAvail.availability_type === 'limited' || fridayAvail.availability_type === 'unavailable') && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            backgroundColor: availabilityMeta(fridayAvail.availability_type).color + '12',
            border: `1px solid ${availabilityMeta(fridayAvail.availability_type).color}33`
          }}
        >
          <Zap className="h-4 w-4 shrink-0" style={{ color: availabilityMeta(fridayAvail.availability_type).color }} />
          <p className="text-xs" style={{ color: '#F4F4F6' }}>
            <span className="font-bold" style={{ color: availabilityMeta(fridayAvail.availability_type).color }}>
              {language === 'pt' ? 'Aviso: ' : 'Warning: '}
            </span>
            {language === 'pt'
              ? `Sexta-feira é ${availabilityMeta(fridayAvail.availability_type).label.pt.toLowerCase()}${fridayAvail.label ? ` (${fridayAvail.label})` : ''}. Planeje prazos com antecedência.`
              : `Friday is ${availabilityMeta(fridayAvail.availability_type).label.en.toLowerCase()}${fridayAvail.label ? ` (${fridayAvail.label})` : ''}. Plan delivery deadlines ahead of time.`
            }
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-6" style={{ color: '#6B7080' }}>
          <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">{language === 'pt' ? 'Carregando...' : 'Loading...'}</span>
        </div>
      ) : (
        <>
          {/* Plan meta */}
          <PlanForm
            weekStart={currentWeekStart}
            existing={plan}
            onSave={savePlan}
            language={language}
          />

          {/* Outcomes section */}
          {plan && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Target className="h-4 w-4" style={{ color: '#3362FF' }} />
                  <SectionLabel>{language === 'pt' ? 'Resultados da Semana' : 'Weekly Outcomes'}</SectionLabel>
                </div>
                {!showOutcomeForm && !editingOutcome && (
                  <button
                    onClick={() => setShowOutcomeForm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ backgroundColor: 'rgba(51,98,255,0.15)', color: '#3362FF', border: '1px solid rgba(51,98,255,0.3)' }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {language === 'pt' ? 'Novo Resultado' : 'New Outcome'}
                  </button>
                )}
              </div>

              {/* Summary bar */}
              {outcomes.length > 0 && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" style={{ color: '#22C55E' }} />
                    <span className="text-xs font-medium" style={{ color: '#6B7080' }}>
                      {doneCount}/{outcomes.length} {language === 'pt' ? 'concluídos' : 'done'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" style={{ color: '#3362FF' }} />
                    <span className="text-xs font-medium" style={{ color: '#6B7080' }}>
                      {avgProgress}% {language === 'pt' ? 'progresso médio' : 'avg progress'}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {showOutcomeForm && !editingOutcome && (
                  <OutcomeForm
                    language={language}
                    onSave={saveOutcome}
                    onCancel={() => setShowOutcomeForm(false)}
                  />
                )}

                {outcomes.length === 0 && !showOutcomeForm ? (
                  <CmdCard>
                    <div className="flex flex-col items-center py-6 gap-3">
                      <LayoutList className="h-8 w-8" style={{ color: '#6B7080' }} />
                      <p className="text-sm text-center" style={{ color: '#6B7080' }}>
                        {language === 'pt'
                          ? 'Nenhum resultado definido para esta semana.'
                          : 'No outcomes defined for this week yet.'}
                      </p>
                      <button
                        onClick={() => setShowOutcomeForm(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium mt-1"
                        style={{ backgroundColor: 'rgba(51,98,255,0.15)', color: '#3362FF', border: '1px solid rgba(51,98,255,0.3)' }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {language === 'pt' ? 'Adicionar resultado' : 'Add outcome'}
                      </button>
                    </div>
                  </CmdCard>
                ) : (
                  outcomes.map(outcome => (
                    editingOutcome?.id === outcome.id ? (
                      <OutcomeForm
                        key={outcome.id}
                        initial={editingOutcome}
                        language={language}
                        onSave={saveOutcome}
                        onCancel={() => setEditingOutcome(null)}
                      />
                    ) : (
                      <CmdCard key={outcome.id}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium" style={{ color: '#F4F4F6' }}>{outcome.title}</p>
                              <Badge color={statusColor(outcome.status)}>
                                {statusLabel(outcome.status, language)}
                              </Badge>
                            </div>

                            {outcome.success_metric && (
                              <p className="text-xs" style={{ color: '#6B7080' }}>
                                <span className="font-bold" style={{ color: '#3362FF' }}>→ </span>
                                {outcome.success_metric}
                              </p>
                            )}

                            {outcome.description && (
                              <p className="text-xs" style={{ color: '#6B7080' }}>{outcome.description}</p>
                            )}

                            {/* Progress bar + slider */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#6B7080' }}>
                                  {language === 'pt' ? 'Progresso' : 'Progress'}
                                </span>
                                <span className="text-xs font-medium tabular-nums" style={{ color: '#F4F4F6' }}>
                                  {outcome.progress_percent}%
                                </span>
                              </div>
                              <ProgressBar value={outcome.progress_percent} />
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={outcome.progress_percent}
                                onChange={e => updateOutcomeProgress(outcome, parseInt(e.target.value))}
                                className="w-full h-1 cursor-pointer"
                                style={{ accentColor: '#3362FF' }}
                              />
                            </div>

                            {/* Status quick-set */}
                            <div className="flex items-center gap-1.5 flex-wrap pt-1">
                              {OUTCOME_STATUSES.map(s => (
                                <button
                                  key={s.value}
                                  onClick={() => updateOutcomeStatus(outcome, s.value)}
                                  className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full transition-all"
                                  style={outcome.status === s.value
                                    ? { backgroundColor: s.color + '22', color: s.color, border: `1px solid ${s.color}44` }
                                    : { color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)' }
                                  }
                                >
                                  {s.label[language]}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => { setEditingOutcome(outcome); setShowOutcomeForm(false); }}
                              className="p-1.5 rounded-lg text-xs font-medium"
                              style={{ color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)' }}
                            >
                              {language === 'pt' ? 'Editar' : 'Edit'}
                            </button>
                            <button
                              onClick={() => deleteOutcome(outcome.id)}
                              className="p-1.5 rounded-lg"
                              style={{ color: '#FF3B5C', border: '1px solid rgba(255,59,92,0.2)' }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </CmdCard>
                    )
                  ))
                )}
              </div>
            </section>
          )}

          {/* No plan yet */}
          {!plan && (
            <CmdCard>
              <div className="flex flex-col items-center py-8 gap-3">
                <Calendar className="h-10 w-10" style={{ color: '#6B7080' }} />
                <p className="text-sm font-medium" style={{ color: '#F4F4F6' }}>
                  {language === 'pt' ? 'Semana ainda não planejada.' : 'This week has no plan yet.'}
                </p>
                <p className="text-xs text-center" style={{ color: '#6B7080' }}>
                  {language === 'pt'
                    ? 'Define o tema e cria os resultados que você quer alcançar esta semana.'
                    : 'Set a theme and define the outcomes you want to achieve this week.'}
                </p>
              </div>
            </CmdCard>
          )}
        </>
      )}
    </div>
  );
}
