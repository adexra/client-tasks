import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Plus,
  Trash2,
  Check,
  X,
  Clock,
  Calendar,
  Repeat,
  ToggleLeft,
  ToggleRight,
  ChevronDown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';

// ── Constants ──────────────────────────────────────────────
const DAYS = [
  { value: 0, en: 'Sunday',    pt: 'Domingo' },
  { value: 1, en: 'Monday',    pt: 'Segunda' },
  { value: 2, en: 'Tuesday',   pt: 'Terça' },
  { value: 3, en: 'Wednesday', pt: 'Quarta' },
  { value: 4, en: 'Thursday',  pt: 'Quinta' },
  { value: 5, en: 'Friday',    pt: 'Sexta' },
  { value: 6, en: 'Saturday',  pt: 'Sábado' },
];

const AVAILABILITY_TYPES = [
  { value: 'available',   label: { en: 'Available',   pt: 'Disponível' },   color: '#22C55E' },
  { value: 'limited',     label: { en: 'Limited',     pt: 'Limitado' },     color: '#F59E0B' },
  { value: 'unavailable', label: { en: 'Unavailable', pt: 'Indisponível' }, color: '#FF3B5C' },
  { value: 'focus_day',   label: { en: 'Focus Day',   pt: 'Dia de Foco' }, color: '#3362FF' },
];

const RITUAL_TYPES = [
  { value: 'finance',        label: { en: 'Finance',        pt: 'Financeiro' } },
  { value: 'content',        label: { en: 'Content',        pt: 'Conteúdo' } },
  { value: 'client_updates', label: { en: 'Client Updates', pt: 'Updates de Clientes' } },
  { value: 'planning',       label: { en: 'Planning',       pt: 'Planejamento' } },
  { value: 'deep_work',      label: { en: 'Deep Work',      pt: 'Foco Profundo' } },
  { value: 'admin',          label: { en: 'Admin',          pt: 'Administrativo' } },
  { value: 'custom',         label: { en: 'Custom',         pt: 'Personalizado' } },
];

const SCOPES = [
  { value: 'all',     label: { en: 'All',    pt: 'Todos' } },
  { value: 'adexra',  label: { en: 'Adexra', pt: 'Adexra' } },
  { value: 'moveon',  label: { en: 'MoveOn', pt: 'MoveOn' } },
];

// ── Helpers ────────────────────────────────────────────────
function dayLabel(value, language) {
  return DAYS.find(d => d.value === value)?.[language] ?? value;
}

function availLabel(value, language) {
  return AVAILABILITY_TYPES.find(a => a.value === value)?.label[language] ?? value;
}

function availColor(value) {
  return AVAILABILITY_TYPES.find(a => a.value === value)?.color ?? '#6B7080';
}

function ritualTypeLabel(value, language) {
  return RITUAL_TYPES.find(r => r.value === value)?.label[language] ?? value;
}

function scopeLabel(value, language) {
  return SCOPES.find(s => s.value === value)?.label[language] ?? value;
}

// ── Sub-components ─────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-[0.25em] mb-4" style={{ color: '#6B7080' }}>
      {children}
    </p>
  );
}

function CmdCard({ children, className = '' }) {
  return (
    <div
      className={cn('rounded-xl p-5', className)}
      style={{ backgroundColor: '#0D0F1E', border: '1px solid rgba(244,244,246,0.07)' }}
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
      className={cn('w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors', className)}
      style={{
        backgroundColor: 'rgba(244,244,246,0.04)',
        border: '1px solid rgba(244,244,246,0.1)',
        color: '#F4F4F6'
      }}
      {...props}
    />
  );
}

function Select({ children, className = '', ...props }) {
  return (
    <div className="relative">
      <select
        className={cn('w-full px-3 py-2 rounded-lg text-sm outline-none appearance-none transition-colors pr-8', className)}
        style={{
          backgroundColor: 'rgba(244,244,246,0.04)',
          border: '1px solid rgba(244,244,246,0.1)',
          color: '#F4F4F6'
        }}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: '#6B7080' }} />
    </div>
  );
}

function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={cn('w-full px-3 py-2 rounded-lg text-sm outline-none resize-none transition-colors', className)}
      rows={2}
      style={{
        backgroundColor: 'rgba(244,244,246,0.04)',
        border: '1px solid rgba(244,244,246,0.1)',
        color: '#F4F4F6'
      }}
      {...props}
    />
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

// ── Availability Form ──────────────────────────────────────
const AVAIL_BLANK = {
  date: '',
  day_of_week: '',
  availability_type: 'available',
  company_scope: 'all',
  start_time: '',
  end_time: '',
  label: '',
  notes: '',
};

function AvailabilityForm({ initial, onSave, onCancel, language }) {
  const [form, setForm] = useState(initial ?? AVAIL_BLANK);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.availability_type) return;
    if (!form.date && form.day_of_week === '') return;
    setSaving(true);
    const payload = {
      date: form.date || null,
      day_of_week: form.day_of_week !== '' ? parseInt(form.day_of_week) : null,
      availability_type: form.availability_type,
      company_scope: form.company_scope || 'all',
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      label: form.label || null,
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    };
    await onSave(payload, form.id);
    setSaving(false);
  }

  const isEdit = !!form.id;

  return (
    <CmdCard className="border-[rgba(51,98,255,0.3)]" style={{ border: '1px solid rgba(51,98,255,0.3)' }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <Field label={language === 'pt' ? 'Data específica' : 'Specific date'}>
          <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>
        <Field label={language === 'pt' ? 'Dia da semana (recorrente)' : 'Day of week (recurring)'}>
          <Select value={form.day_of_week} onChange={e => set('day_of_week', e.target.value)}>
            <option value="">{language === 'pt' ? '— Nenhum —' : '— None —'}</option>
            {DAYS.map(d => (
              <option key={d.value} value={d.value}>{d[language]}</option>
            ))}
          </Select>
        </Field>
        <Field label={language === 'pt' ? 'Tipo' : 'Type'}>
          <Select value={form.availability_type} onChange={e => set('availability_type', e.target.value)}>
            {AVAILABILITY_TYPES.map(a => (
              <option key={a.value} value={a.value}>{a.label[language]}</option>
            ))}
          </Select>
        </Field>
        <Field label={language === 'pt' ? 'Escopo' : 'Scope'}>
          <Select value={form.company_scope} onChange={e => set('company_scope', e.target.value)}>
            {SCOPES.map(s => (
              <option key={s.value} value={s.value}>{s.label[language]}</option>
            ))}
          </Select>
        </Field>
        <Field label={language === 'pt' ? 'Início' : 'Start time'}>
          <Input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
        </Field>
        <Field label={language === 'pt' ? 'Fim' : 'End time'}>
          <Input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
        </Field>
        <Field label={language === 'pt' ? 'Rótulo' : 'Label'}>
          <Input
            type="text"
            value={form.label}
            onChange={e => set('label', e.target.value)}
            placeholder={language === 'pt' ? 'ex: Sem reuniões' : 'e.g. No meetings'}
          />
        </Field>
        <Field label={language === 'pt' ? 'Notas' : 'Notes'}>
          <Input
            type="text"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder={language === 'pt' ? 'Contexto adicional...' : 'Additional context...'}
          />
        </Field>
      </div>
      <div className="flex items-center gap-2 justify-end">
        <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)' }}>
          <X className="h-3.5 w-3.5" /> {language === 'pt' ? 'Cancelar' : 'Cancel'}
        </button>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
          style={{ backgroundColor: '#3362FF', color: '#F4F4F6' }}>
          <Check className="h-3.5 w-3.5" /> {saving ? '...' : (isEdit ? (language === 'pt' ? 'Atualizar' : 'Update') : (language === 'pt' ? 'Salvar' : 'Save'))}
        </button>
      </div>
    </CmdCard>
  );
}

// ── Ritual Form ────────────────────────────────────────────
const RITUAL_BLANK = {
  title: '',
  description: '',
  day_of_week: '',
  specific_date: '',
  ritual_type: 'custom',
  company_scope: 'all',
  is_active: true,
};

function RitualForm({ initial, onSave, onCancel, language }) {
  const [form, setForm] = useState(initial ?? RITUAL_BLANK);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description || null,
      day_of_week: form.day_of_week !== '' ? parseInt(form.day_of_week) : null,
      specific_date: form.specific_date || null,
      ritual_type: form.ritual_type || 'custom',
      company_scope: form.company_scope || 'all',
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };
    await onSave(payload, form.id);
    setSaving(false);
  }

  const isEdit = !!form.id;

  return (
    <CmdCard style={{ border: '1px solid rgba(51,98,255,0.3)' }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <Field label={language === 'pt' ? 'Título' : 'Title'}>
          <Input
            type="text"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder={language === 'pt' ? 'Nome do ritual...' : 'Ritual name...'}
            autoFocus
          />
        </Field>
        <Field label={language === 'pt' ? 'Tipo' : 'Type'}>
          <Select value={form.ritual_type} onChange={e => set('ritual_type', e.target.value)}>
            {RITUAL_TYPES.map(r => (
              <option key={r.value} value={r.value}>{r.label[language]}</option>
            ))}
          </Select>
        </Field>
        <Field label={language === 'pt' ? 'Dia da semana' : 'Day of week'}>
          <Select value={form.day_of_week} onChange={e => set('day_of_week', e.target.value)}>
            <option value="">{language === 'pt' ? '— Todo dia —' : '— Every day —'}</option>
            {DAYS.map(d => (
              <option key={d.value} value={d.value}>{d[language]}</option>
            ))}
          </Select>
        </Field>
        <Field label={language === 'pt' ? 'Escopo' : 'Scope'}>
          <Select value={form.company_scope} onChange={e => set('company_scope', e.target.value)}>
            {SCOPES.map(s => (
              <option key={s.value} value={s.value}>{s.label[language]}</option>
            ))}
          </Select>
        </Field>
        <Field label={language === 'pt' ? 'Descrição' : 'Description'}>
          <Textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder={language === 'pt' ? 'O que fazer neste ritual...' : 'What to do in this ritual...'}
          />
        </Field>
        <Field label={language === 'pt' ? 'Data específica (opcional)' : 'Specific date (optional)'}>
          <Input type="date" value={form.specific_date} onChange={e => set('specific_date', e.target.value)} />
        </Field>
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer select-none" onClick={() => set('is_active', !form.is_active)}>
          {form.is_active
            ? <ToggleRight className="h-5 w-5" style={{ color: '#22C55E' }} />
            : <ToggleLeft className="h-5 w-5" style={{ color: '#6B7080' }} />
          }
          <span className="text-xs font-medium" style={{ color: form.is_active ? '#22C55E' : '#6B7080' }}>
            {form.is_active ? (language === 'pt' ? 'Ativo' : 'Active') : (language === 'pt' ? 'Inativo' : 'Inactive')}
          </span>
        </label>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)' }}>
            <X className="h-3.5 w-3.5" /> {language === 'pt' ? 'Cancelar' : 'Cancel'}
          </button>
          <button onClick={handleSave} disabled={saving || !form.title.trim()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
            style={{ backgroundColor: '#3362FF', color: '#F4F4F6' }}>
            <Check className="h-3.5 w-3.5" /> {saving ? '...' : (isEdit ? (language === 'pt' ? 'Atualizar' : 'Update') : (language === 'pt' ? 'Salvar' : 'Save'))}
          </button>
        </div>
      </div>
    </CmdCard>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function Availability() {
  const { language } = useLanguage();
  const toast = useToast();

  const [rules, setRules] = useState([]);
  const [rituals, setRituals] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAvailForm, setShowAvailForm] = useState(false);
  const [editingAvail, setEditingAvail] = useState(null);
  const [showRitualForm, setShowRitualForm] = useState(false);
  const [editingRitual, setEditingRitual] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [rulesRes, ritualsRes] = await Promise.all([
      supabase.from('availability_rules').select('*').order('day_of_week').order('date'),
      supabase.from('day_rituals').select('*').order('day_of_week').order('title'),
    ]);
    if (!rulesRes.error) setRules(rulesRes.data || []);
    if (!ritualsRes.error) setRituals(ritualsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Availability CRUD ──
  async function saveAvailRule(payload, id) {
    if (id) {
      const { error } = await supabase.from('availability_rules').update(payload).eq('id', id);
      if (error) { toast.error?.('Failed to update'); return; }
      toast.success?.('Updated');
    } else {
      const { error } = await supabase.from('availability_rules').insert(payload);
      if (error) { toast.error?.('Failed to save'); return; }
      toast.success?.('Saved');
    }
    setEditingAvail(null);
    setShowAvailForm(false);
    await load();
  }

  async function deleteAvailRule(id) {
    if (!window.confirm(language === 'pt' ? 'Excluir esta regra?' : 'Delete this rule?')) return;
    await supabase.from('availability_rules').delete().eq('id', id);
    await load();
  }

  // ── Ritual CRUD ──
  async function saveRitual(payload, id) {
    if (id) {
      const { error } = await supabase.from('day_rituals').update(payload).eq('id', id);
      if (error) { toast.error?.('Failed to update'); return; }
      toast.success?.('Updated');
    } else {
      const { error } = await supabase.from('day_rituals').insert(payload);
      if (error) { toast.error?.('Failed to save'); return; }
      toast.success?.('Saved');
    }
    setEditingRitual(null);
    setShowRitualForm(false);
    await load();
  }

  async function deleteRitual(id) {
    if (!window.confirm(language === 'pt' ? 'Excluir este ritual?' : 'Delete this ritual?')) return;
    await supabase.from('day_rituals').delete().eq('id', id);
    await load();
  }

  async function toggleRitualActive(ritual) {
    await supabase.from('day_rituals')
      .update({ is_active: !ritual.is_active, updated_at: new Date().toISOString() })
      .eq('id', ritual.id);
    await load();
  }

  // ── Render ──
  return (
    <div className="space-y-12 animate-in fade-in duration-500">

      {/* Header */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: '#6B7080' }}>
          {language === 'pt' ? 'Configurações' : 'Settings'}
        </p>
        <h1 className="text-3xl font-serif tracking-tight" style={{ color: '#F4F4F6' }}>
          {language === 'pt' ? 'Disponibilidade & Rituais.' : 'Availability & Rituals.'}
        </h1>
        <p className="text-sm mt-2" style={{ color: '#6B7080' }}>
          {language === 'pt'
            ? 'Configure quando você está disponível e quais rituais acontecem em cada dia.'
            : 'Configure when you are available and which rituals happen each day.'}
        </p>
      </div>

      {/* ── AVAILABILITY RULES ── */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4" style={{ color: '#3362FF' }} />
            <SectionLabel>{language === 'pt' ? 'Regras de Disponibilidade' : 'Availability Rules'}</SectionLabel>
          </div>
          {!showAvailForm && !editingAvail && (
            <button
              onClick={() => setShowAvailForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ backgroundColor: 'rgba(51,98,255,0.15)', color: '#3362FF', border: '1px solid rgba(51,98,255,0.3)' }}
            >
              <Plus className="h-3.5 w-3.5" />
              {language === 'pt' ? 'Nova Regra' : 'New Rule'}
            </button>
          )}
        </div>

        <div className="space-y-3">
          {showAvailForm && !editingAvail && (
            <AvailabilityForm
              language={language}
              onSave={saveAvailRule}
              onCancel={() => setShowAvailForm(false)}
            />
          )}

          {loading ? (
            <div className="flex items-center gap-2 py-4" style={{ color: '#6B7080' }}>
              <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">{language === 'pt' ? 'Carregando...' : 'Loading...'}</span>
            </div>
          ) : rules.length === 0 && !showAvailForm ? (
            <CmdCard>
              <p className="text-sm text-center py-4" style={{ color: '#6B7080' }}>
                {language === 'pt' ? 'Nenhuma regra configurada.' : 'No rules configured yet.'}
              </p>
            </CmdCard>
          ) : (
            rules.map(rule => (
              editingAvail?.id === rule.id ? (
                <AvailabilityForm
                  key={rule.id}
                  initial={editingAvail}
                  language={language}
                  onSave={saveAvailRule}
                  onCancel={() => setEditingAvail(null)}
                />
              ) : (
                <CmdCard key={rule.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="h-2 w-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: availColor(rule.availability_type) }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge color={availColor(rule.availability_type)}>
                            {availLabel(rule.availability_type, language)}
                          </Badge>
                          {rule.day_of_week !== null && (
                            <span className="text-xs font-medium" style={{ color: '#F4F4F6' }}>
                              {dayLabel(rule.day_of_week, language)}
                            </span>
                          )}
                          {rule.date && (
                            <span className="text-xs font-medium" style={{ color: '#F4F4F6' }}>
                              {new Date(rule.date + 'T12:00:00').toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                          <span className="text-[9px] uppercase tracking-wider" style={{ color: '#6B7080' }}>
                            {scopeLabel(rule.company_scope, language)}
                          </span>
                        </div>
                        {rule.label && (
                          <p className="text-sm" style={{ color: '#F4F4F6' }}>{rule.label}</p>
                        )}
                        {(rule.start_time || rule.end_time) && (
                          <p className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: '#6B7080' }}>
                            <Clock className="h-3 w-3" />
                            {rule.start_time ?? '—'} → {rule.end_time ?? '—'}
                          </p>
                        )}
                        {rule.notes && (
                          <p className="text-xs mt-1" style={{ color: '#6B7080' }}>{rule.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => { setEditingAvail(rule); setShowAvailForm(false); }}
                        className="p-1.5 rounded-lg transition-colors text-xs font-medium"
                        style={{ color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)' }}
                      >
                        {language === 'pt' ? 'Editar' : 'Edit'}
                      </button>
                      <button
                        onClick={() => deleteAvailRule(rule.id)}
                        className="p-1.5 rounded-lg transition-colors"
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

      {/* ── DAY RITUALS ── */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Repeat className="h-4 w-4" style={{ color: '#3362FF' }} />
            <SectionLabel>{language === 'pt' ? 'Rituais Diários' : 'Day Rituals'}</SectionLabel>
          </div>
          {!showRitualForm && !editingRitual && (
            <button
              onClick={() => setShowRitualForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ backgroundColor: 'rgba(51,98,255,0.15)', color: '#3362FF', border: '1px solid rgba(51,98,255,0.3)' }}
            >
              <Plus className="h-3.5 w-3.5" />
              {language === 'pt' ? 'Novo Ritual' : 'New Ritual'}
            </button>
          )}
        </div>

        <div className="space-y-3">
          {showRitualForm && !editingRitual && (
            <RitualForm
              language={language}
              onSave={saveRitual}
              onCancel={() => setShowRitualForm(false)}
            />
          )}

          {loading ? (
            <div className="flex items-center gap-2 py-4" style={{ color: '#6B7080' }}>
              <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">{language === 'pt' ? 'Carregando...' : 'Loading...'}</span>
            </div>
          ) : rituals.length === 0 && !showRitualForm ? (
            <CmdCard>
              <p className="text-sm text-center py-4" style={{ color: '#6B7080' }}>
                {language === 'pt' ? 'Nenhum ritual configurado.' : 'No rituals configured yet.'}
              </p>
            </CmdCard>
          ) : (
            <div className="space-y-3">
              {/* Group by day */}
              {DAYS.map(day => {
                const dayRituals = rituals.filter(r => r.day_of_week === day.value);
                if (dayRituals.length === 0) return null;
                return (
                  <div key={day.value}>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2 px-1" style={{ color: '#3362FF' }}>
                      {day[language]}
                    </p>
                    <div className="space-y-2">
                      {dayRituals.map(ritual => (
                        editingRitual?.id === ritual.id ? (
                          <RitualForm
                            key={ritual.id}
                            initial={editingRitual}
                            language={language}
                            onSave={saveRitual}
                            onCancel={() => setEditingRitual(null)}
                          />
                        ) : (
                          <CmdCard key={ritual.id}>
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <button onClick={() => toggleRitualActive(ritual)} className="mt-0.5 shrink-0">
                                  {ritual.is_active
                                    ? <ToggleRight className="h-4 w-4" style={{ color: '#22C55E' }} />
                                    : <ToggleLeft className="h-4 w-4" style={{ color: '#6B7080' }} />
                                  }
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-medium" style={{ color: ritual.is_active ? '#F4F4F6' : '#6B7080' }}>
                                      {ritual.title}
                                    </p>
                                    <Badge color="#3362FF">{ritualTypeLabel(ritual.ritual_type, language)}</Badge>
                                    <span className="text-[9px] uppercase tracking-wider" style={{ color: '#6B7080' }}>
                                      {scopeLabel(ritual.company_scope, language)}
                                    </span>
                                  </div>
                                  {ritual.description && (
                                    <p className="text-xs mt-1" style={{ color: '#6B7080' }}>{ritual.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => { setEditingRitual(ritual); setShowRitualForm(false); }}
                                  className="p-1.5 rounded-lg text-xs font-medium"
                                  style={{ color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)' }}
                                >
                                  {language === 'pt' ? 'Editar' : 'Edit'}
                                </button>
                                <button
                                  onClick={() => deleteRitual(ritual.id)}
                                  className="p-1.5 rounded-lg"
                                  style={{ color: '#FF3B5C', border: '1px solid rgba(255,59,92,0.2)' }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </CmdCard>
                        )
                      ))}
                    </div>
                  </div>
                );
              })}
              {/* Ungrouped (no specific day) */}
              {(() => {
                const ungrouped = rituals.filter(r => r.day_of_week === null);
                if (ungrouped.length === 0) return null;
                return (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2 px-1" style={{ color: '#6B7080' }}>
                      {language === 'pt' ? 'Todo dia' : 'Every day'}
                    </p>
                    <div className="space-y-2">
                      {ungrouped.map(ritual => (
                        editingRitual?.id === ritual.id ? (
                          <RitualForm
                            key={ritual.id}
                            initial={editingRitual}
                            language={language}
                            onSave={saveRitual}
                            onCancel={() => setEditingRitual(null)}
                          />
                        ) : (
                          <CmdCard key={ritual.id}>
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <button onClick={() => toggleRitualActive(ritual)} className="mt-0.5 shrink-0">
                                  {ritual.is_active
                                    ? <ToggleRight className="h-4 w-4" style={{ color: '#22C55E' }} />
                                    : <ToggleLeft className="h-4 w-4" style={{ color: '#6B7080' }} />
                                  }
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-medium" style={{ color: ritual.is_active ? '#F4F4F6' : '#6B7080' }}>
                                      {ritual.title}
                                    </p>
                                    <Badge color="#3362FF">{ritualTypeLabel(ritual.ritual_type, language)}</Badge>
                                    <span className="text-[9px] uppercase tracking-wider" style={{ color: '#6B7080' }}>
                                      {scopeLabel(ritual.company_scope, language)}
                                    </span>
                                  </div>
                                  {ritual.description && (
                                    <p className="text-xs mt-1" style={{ color: '#6B7080' }}>{ritual.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => { setEditingRitual(ritual); setShowRitualForm(false); }}
                                  className="p-1.5 rounded-lg text-xs font-medium"
                                  style={{ color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)' }}
                                >
                                  {language === 'pt' ? 'Editar' : 'Edit'}
                                </button>
                                <button
                                  onClick={() => deleteRitual(ritual.id)}
                                  className="p-1.5 rounded-lg"
                                  style={{ color: '#FF3B5C', border: '1px solid rgba(255,59,92,0.2)' }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </CmdCard>
                        )
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
