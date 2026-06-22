import { useState, useEffect, useCallback } from 'react';
import CustomSelect from '../components/CustomSelect';
import { supabase } from '../lib/supabase';
import {
  Plus,
  Trash2,
  Check,
  X,
  ChevronDown,
  Flag,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Pencil
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

// ── Constants ──────────────────────────────────────────────
const STATUSES = [
  { value: 'healthy',     color: '#22C55E', icon: CheckCircle2, label: { en: 'Healthy',     pt: 'Saudável' } },
  { value: 'at_risk',     color: '#F59E0B', icon: AlertTriangle, label: { en: 'At Risk',    pt: 'Em Risco' } },
  { value: 'blocked',     color: '#FF3B5C', icon: XCircle,       label: { en: 'Blocked',    pt: 'Bloqueado' } },
  { value: 'in_progress', color: '#3362FF', icon: TrendingUp,    label: { en: 'In Progress',pt: 'Em Andamento' } },
  { value: 'done',        color: '#22C55E', icon: CheckCircle2,  label: { en: 'Done',       pt: 'Concluído' } },
  { value: 'not_started', color: '#6B7080', icon: Clock,         label: { en: 'Not Started',pt: 'Não Iniciado' } },
];

function statusMeta(value) {
  return STATUSES.find(s => s.value === value) ?? STATUSES[5];
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

function SelectEl({ children, ...props }) {
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

function StatusBadge({ status }) {
  const meta = statusMeta(status);
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
      style={{ backgroundColor: meta.color + '22', color: meta.color, border: `1px solid ${meta.color}44` }}
    >
      <Icon className="h-2.5 w-2.5" />
      {meta.label}
    </span>
  );
}

function ConfidenceBar({ value }) {
  const color = value >= 70 ? '#22C55E' : value >= 40 ? '#F59E0B' : '#FF3B5C';
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#6B7080' }}>Confidence</span>
        <span className="text-xs font-medium tabular-nums" style={{ color }}>{value}%</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(244,244,246,0.07)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ── Milestone Form ─────────────────────────────────────────
const BLANK = {
  title: '', description: '', status: 'not_started', confidence: 50,
  source_url: '', review_frequency: 'weekly', next_action: '', current_note: '', success_metric: '',
};

function MilestoneForm({ initial, companyId, onSave, onCancel, language }) {
  const [form, setForm] = useState(initial ?? BLANK);
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
      confidence: parseInt(form.confidence) || 50,
      source_url: form.source_url || null,
      review_frequency: form.review_frequency || 'weekly',
      next_action: form.next_action || null,
      current_note: form.current_note || null,
      success_metric: form.success_metric || null,
      company_id: companyId,
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
        <Field label={language === 'pt' ? 'Título' : 'Title'}>
          <Input
            type="text"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder={language === 'pt' ? 'Nome do milestone...' : 'Milestone name...'}
            autoFocus
          />
        </Field>
        <Field label={language === 'pt' ? 'Status' : 'Status'}>
          <CustomSelect value={form.status} onChange={v => set('status', v)} options={STATUSES.map(s => ({ value: s.value, label: s.label[language] }))} />
        </Field>
        <Field label={language === 'pt' ? `Confiança: ${form.confidence}%` : `Confidence: ${form.confidence}%`}>
          <input
            type="range" min="0" max="100" step="5"
            value={form.confidence}
            onChange={e => set('confidence', e.target.value)}
            className="w-full"
            style={{ accentColor: '#3362FF' }}
          />
        </Field>
        <Field label={language === 'pt' ? 'Frequência de revisão' : 'Review frequency'}>
          <CustomSelect value={form.review_frequency} onChange={v => set('review_frequency', v)} options={[
            { value: 'daily', label: language === 'pt' ? 'Diária' : 'Daily' },
            { value: 'weekly', label: language === 'pt' ? 'Semanal' : 'Weekly' },
            { value: 'biweekly', label: language === 'pt' ? 'Quinzenal' : 'Biweekly' },
            { value: 'monthly', label: language === 'pt' ? 'Mensal' : 'Monthly' },
          ]} />
        </Field>
        <Field label={language === 'pt' ? 'Métrica de sucesso' : 'Success metric'}>
          <Input
            type="text"
            value={form.success_metric}
            onChange={e => set('success_metric', e.target.value)}
            placeholder={language === 'pt' ? 'Como medir o sucesso...' : 'How to measure success...'}
          />
        </Field>
        <Field label={language === 'pt' ? 'Link / Fonte' : 'Source URL'}>
          <Input
            type="url"
            value={form.source_url}
            onChange={e => set('source_url', e.target.value)}
            placeholder="https://..."
          />
        </Field>
        <Field label={language === 'pt' ? 'Próxima ação' : 'Next action'}>
          <Input
            type="text"
            value={form.next_action}
            onChange={e => set('next_action', e.target.value)}
            placeholder={language === 'pt' ? 'O que fazer a seguir...' : 'What to do next...'}
          />
        </Field>
        <Field label={language === 'pt' ? 'Nota atual' : 'Current note'}>
          <Textarea
            value={form.current_note}
            onChange={e => set('current_note', e.target.value)}
            placeholder={language === 'pt' ? 'Estado atual, contexto...' : 'Current state, context...'}
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

// ── Main Page ──────────────────────────────────────────────
export default function MoveOn() {
  const { language } = useLanguage();

  const [company, setCompany] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    const { data: co } = await supabase
      .from('companies')
      .select('id, name')
      .eq('name', 'MoveOn')
      .maybeSingle();
    setCompany(co || null);

    if (co) {
      const { data: ms } = await supabase
        .from('company_milestones')
        .select('*')
        .eq('company_id', co.id)
        .order('status')
        .order('title');
      setMilestones(ms || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveMilestone(payload, id) {
    if (id) {
      await supabase.from('company_milestones').update(payload).eq('id', id);
    } else {
      await supabase.from('company_milestones').insert(payload);
    }
    setShowForm(false);
    setEditing(null);
    await load();
  }

  async function deleteMilestone(id) {
    if (!window.confirm(language === 'pt' ? 'Excluir este milestone?' : 'Delete this milestone?')) return;
    await supabase.from('company_milestones').delete().eq('id', id);
    await load();
  }

  async function quickStatusUpdate(milestone, status) {
    await supabase.from('company_milestones')
      .update({ status, last_reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', milestone.id);
    await load();
  }

  async function markReviewed(milestone) {
    await supabase.from('company_milestones')
      .update({ last_reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', milestone.id);
    await load();
  }

  const filtered = statusFilter === 'all'
    ? milestones
    : milestones.filter(m => m.status === statusFilter);

  // Stats
  const healthyCount = milestones.filter(m => m.status === 'healthy').length;
  const atRiskCount  = milestones.filter(m => m.status === 'at_risk' || m.status === 'blocked').length;
  const avgConf      = milestones.length ? Math.round(milestones.reduce((a, m) => a + m.confidence, 0) / milestones.length) : 0;

  return (
    <div className="space-y-10 animate-in fade-in duration-500">

      {/* Header */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: '#6B7080' }}>
          MoveOn
        </p>
        <h1 className="text-3xl font-serif tracking-tight" style={{ color: '#F4F4F6' }}>
          {language === 'pt' ? 'Milestones.' : 'Milestones.'}
        </h1>
        <p className="text-sm mt-2" style={{ color: '#6B7080' }}>
          {language === 'pt'
            ? 'Rastreamento de saúde estratégica — sem tarefas operacionais.'
            : 'Strategic health tracking — no operational tasks.'}
        </p>
      </div>

      {/* Health summary */}
      {milestones.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <CmdCard>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: '#6B7080' }}>
              {language === 'pt' ? 'Saudáveis' : 'Healthy'}
            </p>
            <p className="text-2xl font-serif" style={{ color: '#22C55E' }}>{healthyCount}</p>
          </CmdCard>
          <CmdCard>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: '#6B7080' }}>
              {language === 'pt' ? 'Em Risco' : 'At Risk'}
            </p>
            <p className="text-2xl font-serif" style={{ color: atRiskCount > 0 ? '#FF3B5C' : '#6B7080' }}>{atRiskCount}</p>
          </CmdCard>
          <CmdCard>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: '#6B7080' }}>
              {language === 'pt' ? 'Confiança Média' : 'Avg Confidence'}
            </p>
            <p className="text-2xl font-serif" style={{ color: avgConf >= 70 ? '#22C55E' : avgConf >= 40 ? '#F59E0B' : '#FF3B5C' }}>
              {avgConf}%
            </p>
          </CmdCard>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {['all', ...STATUSES.map(s => s.value)].map(v => {
            const meta = v === 'all' ? { color: '#6B7080', label: { en: 'All', pt: 'Todos' } } : statusMeta(v);
            return (
              <button
                key={v}
                onClick={() => setStatusFilter(v)}
                className="text-[8px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full transition-all"
                style={statusFilter === v
                  ? { backgroundColor: meta.color + '22', color: meta.color, border: `1px solid ${meta.color}44` }
                  : { color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)' }
                }
              >
                {meta.label[language]}
              </button>
            );
          })}
        </div>
        {!showForm && !editing && company && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ backgroundColor: 'rgba(51,98,255,0.15)', color: '#3362FF', border: '1px solid rgba(51,98,255,0.3)' }}
          >
            <Plus className="h-3.5 w-3.5" />
            {language === 'pt' ? 'Novo Milestone' : 'New Milestone'}
          </button>
        )}
      </div>

      {/* New form */}
      {showForm && !editing && company && (
        <MilestoneForm
          companyId={company.id}
          language={language}
          onSave={saveMilestone}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-2 py-6" style={{ color: '#6B7080' }}>
          <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">{language === 'pt' ? 'Carregando...' : 'Loading...'}</span>
        </div>
      ) : filtered.length === 0 ? (
        <CmdCard>
          <div className="flex flex-col items-center py-8 gap-3">
            <Flag className="h-8 w-8" style={{ color: '#6B7080' }} />
            <p className="text-sm" style={{ color: '#6B7080' }}>
              {milestones.length === 0
                ? (language === 'pt' ? 'Nenhum milestone configurado ainda.' : 'No milestones configured yet.')
                : (language === 'pt' ? 'Nenhum milestone com esse filtro.' : 'No milestones with this filter.')}
            </p>
          </div>
        </CmdCard>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => (
            editing?.id === m.id ? (
              <MilestoneForm
                key={m.id}
                initial={editing}
                companyId={company?.id}
                language={language}
                onSave={saveMilestone}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <CmdCard key={m.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Title + status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium" style={{ color: '#F4F4F6' }}>{m.title}</p>
                      <StatusBadge status={m.status} language={language} />
                    </div>

                    {/* Confidence */}
                    <ConfidenceBar value={m.confidence} />

                    {/* Success metric */}
                    {m.success_metric && (
                      <p className="text-xs" style={{ color: '#6B7080' }}>
                        <span style={{ color: '#3362FF' }}>→ </span>{m.success_metric}
                      </p>
                    )}

                    {/* Current note */}
                    {m.current_note && (
                      <p className="text-xs whitespace-pre-line" style={{ color: '#6B7080' }}>{m.current_note}</p>
                    )}

                    {/* Next action */}
                    {m.next_action && (
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#3362FF' }} />
                        <p className="text-xs font-medium" style={{ color: '#F4F4F6' }}>{m.next_action}</p>
                      </div>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {m.review_frequency && (
                        <span className="text-[9px] uppercase tracking-wider" style={{ color: '#6B7080' }}>
                          <RefreshCw className="h-2.5 w-2.5 inline mr-1" />
                          {m.review_frequency}
                        </span>
                      )}
                      {m.last_reviewed_at && (
                        <span className="text-[9px] uppercase tracking-wider" style={{ color: '#6B7080' }}>
                          {language === 'pt' ? 'Revisado' : 'Reviewed'}{' '}
                          {new Date(m.last_reviewed_at).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      {m.source_url && (
                        <a
                          href={m.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] uppercase tracking-wider flex items-center gap-1"
                          style={{ color: '#3362FF' }}
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                          {language === 'pt' ? 'Fonte' : 'Source'}
                        </a>
                      )}
                    </div>

                    {/* Quick status buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {STATUSES.map(s => (
                        <button
                          key={s.value}
                          onClick={() => quickStatusUpdate(m, s.value)}
                          className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full transition-all"
                          style={m.status === s.value
                            ? { backgroundColor: s.color + '22', color: s.color, border: `1px solid ${s.color}44` }
                            : { color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)' }
                          }
                        >
                          {s.label[language]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => markReviewed(m)}
                        title={language === 'pt' ? 'Marcar como revisado' : 'Mark as reviewed'}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)' }}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => { setEditing(m); setShowForm(false); }}
                        className="p-1.5 rounded-lg text-xs font-medium"
                        style={{ color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)' }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteMilestone(m.id)}
                        className="p-1.5 rounded-lg"
                        style={{ color: '#FF3B5C', border: '1px solid rgba(255,59,92,0.2)' }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </CmdCard>
            )
          ))}
        </div>
      )}
    </div>
  );
}
