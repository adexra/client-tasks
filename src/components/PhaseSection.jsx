import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

const di = {
  width: '100%',
  background: 'rgba(244,244,246,0.05)',
  border: '1px solid rgba(244,244,246,0.1)',
  borderRadius: '12px',
  padding: '14px 24px',
  fontSize: '14px',
  fontWeight: '500',
  color: '#F4F4F6',
  outline: 'none',
  transition: 'border-color 0.2s',
};

export default function PhaseSection({ phase, onUpdate }) {
  const { t } = useLanguage();
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [fields, setFields] = useState([]);
  const [savingId, setSavingId] = useState(null);

  const PHASE_META = {
    onboarding: { label: t('project_modal.phases.onboarding') },
    delivery:   { label: t('project_modal.phases.delivery') },
    qa:         { label: t('project_modal.phases.qa') },
    update:     { label: t('project_modal.phases.update') },
  };

  useEffect(() => {
    if (phase?.phase_fields) {
      setFields([...phase.phase_fields]);
    }
  }, [phase?.phase_fields]);

  const meta = PHASE_META[phase?.phase_name] || PHASE_META.onboarding;

  async function handleToggleComplete(e) {
    e.stopPropagation();
    const { error } = await supabase
      .from('client_phases')
      .update({ completed: !phase.completed })
      .eq('id', phase.id);
    if (!error) onUpdate();
    else toast.error(t('phases_ui.update_failed'));
  }

  async function saveField(field) {
    setSavingId(field.id);
    const { error } = await supabase
      .from('phase_fields')
      .update({ field_value: field.field_value })
      .eq('id', field.id);
    setSavingId(null);
    if (error) toast.error(t('phases_ui.sync_failed'));
    else toast.success(t('phases_ui.progress_saved'));
  }

  function updateField(id, val) {
    setFields(prev => prev.map(f => f.id === id ? { ...f, field_value: val } : f));
  }

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        background: phase.completed ? 'rgba(244,244,246,0.02)' : '#0D0F1E',
        border: `1px solid ${phase.completed ? 'rgba(244,244,246,0.05)' : 'rgba(244,244,246,0.08)'}`,
      }}
    >
      {/* Header */}
      <div
        role="button"
        className="w-full flex items-center gap-6 px-8 py-6 text-left transition-colors cursor-pointer"
        style={{ background: 'transparent' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,244,246,0.02)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* Complete toggle */}
        <button
          type="button"
          onClick={handleToggleComplete}
          className="shrink-0 transition-all duration-300"
          style={{ color: phase.completed ? '#22C55E' : 'rgba(244,244,246,0.2)' }}
          onMouseEnter={e => { if (!phase.completed) e.currentTarget.style.color = '#6B7080'; }}
          onMouseLeave={e => { if (!phase.completed) e.currentTarget.style.color = 'rgba(244,244,246,0.2)'; }}
        >
          {phase.completed
            ? <CheckCircle2 className="h-6 w-6" />
            : <Circle className="h-6 w-6" />
          }
        </button>

        <div className="flex-1 space-y-1">
          <span
            className="text-[9px] font-bold uppercase tracking-[0.2em] transition-all"
            style={{ color: phase.completed ? 'rgba(244,244,246,0.2)' : '#6B7080' }}
          >
            {meta.label}
          </span>
          <h4
            className="text-lg font-serif transition-colors"
            style={{
              color: phase.completed ? 'rgba(244,244,246,0.3)' : '#F4F4F6',
              textDecoration: phase.completed ? 'line-through' : 'none',
              fontStyle: phase.completed ? 'italic' : 'normal',
            }}
          >
            {t('phases_ui.module_prefix')}
            {phase.phase_name === 'onboarding' ? t('project_modal.phases.onboarding') :
             phase.phase_name === 'delivery'   ? t('project_modal.phases.delivery')   :
             phase.phase_name === 'qa'         ? t('project_modal.phases.qa')         :
             t('project_modal.phases.update')}
          </h4>
        </div>

        <div className="flex items-center gap-4">
          {phase.completed && (
            <span
              className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
              style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E' }}
            >
              {t('phases_ui.validated')}
            </span>
          )}
          <div className="h-8 w-[1px]" style={{ background: 'rgba(244,244,246,0.07)' }} />
          {isOpen
            ? <ChevronDown className="h-4 w-4" style={{ color: '#6B7080' }} />
            : <ChevronRight className="h-4 w-4" style={{ color: '#6B7080' }} />
          }
        </div>
      </div>

      {/* Expanded */}
      {isOpen && (
        <div
          className="px-10 py-10 space-y-10 animate-in slide-in-from-top-1 duration-300"
          style={{ borderTop: '1px solid rgba(244,244,246,0.07)', background: 'rgba(244,244,246,0.01)' }}
        >
          {fields.length === 0 && (
            <p className="text-xs italic text-center py-4" style={{ color: '#6B7080' }}>
              {t('phases_ui.no_fields')}
            </p>
          )}
          {fields.map(field => (
            <FieldRenderer
              key={field.id}
              field={field}
              saving={savingId === field.id}
              onChange={val => updateField(field.id, val)}
              onBlur={() => saveField(fields.find(f => f.id === field.id))}
              onTaskListChange={items => {
                const updated = { ...field, field_value: JSON.stringify(items) };
                updateField(field.id, JSON.stringify(items));
                saveField(updated);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FieldRenderer({ field, saving, onChange, onBlur, onTaskListChange }) {
  const { t } = useLanguage();
  const isTaskList = field.field_key === 'Execution Roadmap' || field.field_key === 'Action Items' ||
                     field.field_key === 'Roteiro de Execução' || field.field_key === 'Itens de Ação';

  if (isTaskList) {
    let items = [];
    try { items = JSON.parse(field.field_value || '[]'); } catch { items = []; }

    const addItem = () => { const id = Date.now(); onTaskListChange([...items, { id, text: '', done: false }]); };
    const updateItem = (id, patch) => onTaskListChange(items.map(item => item.id === id ? { ...item, ...patch } : item));
    const removeItem = (id) => onTaskListChange(items.filter(item => item.id !== id));

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid rgba(244,244,246,0.07)' }}>
          <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6B7080' }}>
            {field.field_key === 'Execution Roadmap' ? t('phases_ui.add_task').replace('+ ', '') :
             field.field_key === 'Action Items' ? t('execution.task_load') :
             field.field_key}
          </label>
          <button
            type="button"
            onClick={addItem}
            className="text-[9px] font-bold uppercase tracking-widest transition-colors"
            style={{ color: '#6B7080' }}
            onMouseEnter={e => e.currentTarget.style.color = '#3362FF'}
            onMouseLeave={e => e.currentTarget.style.color = '#6B7080'}
          >
            {t('phases_ui.add_task')}
          </button>
        </div>

        <div className="space-y-2">
          {items.map(item => (
            <div
              key={item.id}
              className="group/row flex items-center gap-4 rounded-xl px-4 py-3.5 transition-all"
              style={{
                background: 'rgba(244,244,246,0.03)',
                border: '1px solid rgba(244,244,246,0.07)',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(244,244,246,0.12)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(244,244,246,0.07)'}
            >
              <button
                type="button"
                onClick={() => updateItem(item.id, { done: !item.done })}
                className="h-5 w-5 rounded flex items-center justify-center transition-all duration-300 shrink-0"
                style={item.done
                  ? { background: '#22C55E', border: '1px solid #22C55E' }
                  : { background: 'rgba(244,244,246,0.04)', border: '1px solid rgba(244,244,246,0.15)' }
                }
              >
                {item.done && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
              </button>
              <input
                type="text"
                value={item.text}
                onChange={e => updateItem(item.id, { text: e.target.value })}
                onBlur={() => onTaskListChange(items)}
                placeholder={t('phases_ui.task_placeholder')}
                className="flex-1 bg-transparent border-none p-0 text-sm font-medium focus:ring-0 focus:outline-none transition-all"
                style={{
                  color: item.done ? '#6B7080' : '#F4F4F6',
                  textDecoration: item.done ? 'line-through' : 'none',
                }}
              />
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="transition-colors opacity-0 group-hover/row:opacity-100 p-1"
                style={{ color: '#6B7080' }}
                onMouseEnter={e => e.currentTarget.style.color = '#FF3B5C'}
                onMouseLeave={e => e.currentTarget.style.color = '#6B7080'}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {items.length === 0 && (
            <div
              className="py-12 rounded-2xl flex items-center justify-center"
              style={{ border: '2px dashed rgba(244,244,246,0.08)' }}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest italic" style={{ color: '#6B7080' }}>
                {t('phases_ui.waiting_tasks')}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const InputLayout = ({ children, label, saving }) => (
    <div className="space-y-3 group">
      <div className="flex items-center justify-between ml-1">
        <label className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: '#6B7080' }}>
          {label === 'Timeline' ? t('financials.records') : label}
        </label>
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: '#6B7080' }} />}
      </div>
      {children}
    </div>
  );

  if (field.field_type === 'checkbox') {
    const checked = field.field_value === 'true';
    return (
      <label
        className="flex items-center gap-4 rounded-xl px-6 py-5 cursor-pointer transition-all duration-300"
        style={{
          background: checked ? 'rgba(34,197,94,0.05)' : 'rgba(244,244,246,0.03)',
          border: `1px solid ${checked ? 'rgba(34,197,94,0.2)' : 'rgba(244,244,246,0.08)'}`,
        }}
        onClick={() => {
          onChange(checked ? 'false' : 'true');
          setTimeout(() => onBlur(), 0);
        }}
      >
        <div
          className="h-5 w-5 rounded flex items-center justify-center transition-all duration-300 shrink-0"
          style={checked
            ? { background: '#22C55E', border: '1px solid #22C55E' }
            : { background: 'rgba(244,244,246,0.04)', border: '1px solid rgba(244,244,246,0.15)' }
          }
        >
          {checked && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
        </div>
        <span
          className="text-xs font-medium transition-colors uppercase tracking-widest text-[10px] font-bold"
          style={{
            color: checked ? 'rgba(244,244,246,0.35)' : '#F4F4F6',
            textDecoration: checked ? 'line-through' : 'none',
            fontStyle: checked ? 'italic' : 'normal',
          }}
        >
          {field.field_key}
        </span>
      </label>
    );
  }

  if (field.field_type === 'number') {
    return (
      <InputLayout label={field.field_key} saving={saving}>
        <input
          type="number"
          value={field.field_value || ''}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          style={{ ...di, fontFamily: 'monospace' }}
          onFocus={e => { e.target.style.borderColor = 'rgba(51,98,255,0.5)'; }}
        />
      </InputLayout>
    );
  }

  if (field.field_type === 'date') {
    return (
      <InputLayout label={field.field_key} saving={saving}>
        <input
          type="text"
          value={field.field_value || ''}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={t('phases_ui.timeline_placeholder')}
          style={{ ...di, fontStyle: 'italic' }}
          onFocus={e => { e.target.style.borderColor = 'rgba(51,98,255,0.5)'; }}
        />
      </InputLayout>
    );
  }

  return (
    <InputLayout label={field.field_key} saving={saving}>
      <textarea
        value={field.field_value || ''}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        rows={3}
        placeholder={t('phases_ui.details_placeholder')}
        style={{ ...di, resize: 'none', lineHeight: '1.6', fontStyle: 'italic' }}
        onFocus={e => { e.target.style.borderColor = 'rgba(51,98,255,0.5)'; }}
      />
    </InputLayout>
  );
}
