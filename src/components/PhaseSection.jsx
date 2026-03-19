import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Trash2, Loader2, GripVertical } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { cn } from '../lib/utils';

const PHASE_META = {
  onboarding: { label: 'Integração', color: 'text-neutral-500',  bg: 'bg-neutral-50',  border: 'border-neutral-200'  },
  delivery:   { label: 'Entrega',   color: 'text-neutral-500',  bg: 'bg-neutral-50',  border: 'border-neutral-200' },
  qa:         { label: 'Garantia de Qualidade', color: 'text-neutral-500', bg: 'bg-neutral-50',  border: 'border-neutral-200' },
  update:     { label: 'Atualizações',     color: 'text-neutral-500', bg: 'bg-neutral-50',  border: 'border-neutral-200' },
};

export default function PhaseSection({ phase, onUpdate }) {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [fields, setFields] = useState([]);
  const [savingId, setSavingId] = useState(null);

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
    else toast.error('Falha na atualização.');
  }

  async function saveField(field) {
    setSavingId(field.id);
    const { error } = await supabase
      .from('phase_fields')
      .update({ field_value: field.field_value })
      .eq('id', field.id);
    setSavingId(null);
    if (error) toast.error('Falha na sincronização.');
    else toast.success('Progresso salvo.');
  }

  function updateField(id, val) {
    setFields(prev => prev.map(f => f.id === id ? { ...f, field_value: val } : f));
  }

  return (
    <div className={cn(
      'rounded-2xl border transition-all duration-300 overflow-hidden group/phase',
      phase.completed
        ? 'border-neutral-100 bg-white/50'
        : 'border-neutral-200 bg-white shadow-sm'
    )}>
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-center gap-6 px-8 py-6 text-left hover:bg-neutral-50/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <button
          type="button"
          onClick={handleToggleComplete}
          className={cn(
            'shrink-0 transition-all duration-300',
            phase.completed ? 'text-[var(--success-green)]' : 'text-neutral-200 hover:text-neutral-400'
          )}
        >
          {phase.completed
            ? <CheckCircle2 className="h-6 w-6" />
            : <Circle className="h-6 w-6" />}
        </button>

        <div className="flex-1 space-y-1">
          <span className={cn(
            'text-[9px] font-bold uppercase tracking-[0.2em] transition-all', 
            phase.completed ? "text-neutral-300" : "text-neutral-400"
          )}>
            {meta.label}
          </span>
          <h4 className={cn(
            "text-lg font-serif transition-colors",
            phase.completed ? "text-neutral-400 italic line-through" : "text-[var(--ink-primary)]"
          )}>
            Módulo de {phase.phase_name === 'onboarding' ? 'Integração' : phase.phase_name === 'delivery' ? 'Entrega' : phase.phase_name === 'qa' ? 'QA' : 'Atualizações'}
          </h4>
        </div>

        <div className="flex items-center gap-4">
           {phase.completed && (
             <span className="text-[9px] text-[var(--success-green)] font-bold uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded">Validado</span>
           )}
           <div className="h-8 w-[1px] bg-neutral-100" />
           {isOpen
             ? <ChevronDown className="h-4 w-4 text-neutral-300" />
             : <ChevronRight className="h-4 w-4 text-neutral-300" />
           }
        </div>
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div className="border-t border-neutral-100 px-10 py-10 space-y-10 bg-neutral-50/30 animate-in slide-in-from-top-1 duration-300">
          {fields.length === 0 && (
            <p className="text-xs text-neutral-400 italic text-center py-4">Nenhum campo de diretriz inicializado para este módulo.</p>
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

function FieldRenderer({ field, saving, onChange, onBlur, onTaskListChange } ) {
  const isTaskList = field.field_key === 'Execution Roadmap' || field.field_key === 'Action Items' || field.field_key === 'Roteiro de Execução' || field.field_key === 'Itens de Ação';

  if (isTaskList) {
    let items = [];
    try { items = JSON.parse(field.field_value || '[]'); } catch { items = []; }

    const addItem = () => onTaskListChange([...items, { id: Date.now(), text: '', done: false }]);
    const updateItem = (id, patch) => onTaskListChange(items.map(item => item.id === id ? { ...item, ...patch } : item));
    const removeItem = (id) => onTaskListChange(items.filter(item => item.id !== id));

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
            {field.field_key === 'Execution Roadmap' ? 'Roteiro de Execução' : field.field_key === 'Action Items' ? 'Itens de Ação' : field.field_key}
          </label>
          <button type="button" onClick={addItem} className="text-[9px] font-bold uppercase text-[var(--ink-charcoal)] hover:underline underline-offset-4 decoration-neutral-300">
            + Adicionar Tarefa
          </button>
        </div>
        <div className="space-y-3">
          {items.map(item => (
            <div
              key={item.id}
              className="group/row flex items-center gap-4 bg-white border border-neutral-100 rounded-xl px-4 py-3.5 transition-all hover:border-neutral-200 shadow-sm"
            >
              <button 
                type="button"
                onClick={() => updateItem(item.id, { done: !item.done })}
                className={cn(
                  "h-5 w-5 rounded border flex items-center justify-center transition-all duration-300",
                  item.done ? "bg-[var(--success-green)] border-[var(--success-green)]" : "border-neutral-200 bg-neutral-50"
                )}
              >
                {item.done && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
              </button>
              <input
                type="text"
                value={item.text}
                onChange={e => updateItem(item.id, { text: e.target.value })}
                onBlur={() => onTaskListChange(items)}
                placeholder="O que precisa ser feito?"
                className={cn(
                  "flex-1 bg-transparent border-none p-0 text-sm font-medium focus:ring-0 placeholder:text-neutral-200 transition-all",
                  item.done ? "line-through text-neutral-300" : "text-[var(--ink-primary)]"
                )}
              />
              <button type="button" onClick={() => removeItem(item.id)} className="text-neutral-200 hover:text-rose-500 transition-colors opacity-0 group-hover/row:opacity-100 p-1">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {items.length === 0 && (
            <div className="py-12 border border-dashed border-neutral-100 rounded-2xl flex items-center justify-center">
               <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest italic">Aguardando definição de tarefas.</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const InputLayout = ({ children, label, saving }) => (
    <div className="space-y-3 group">
      <div className="flex items-center justify-between ml-1">
        <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-[0.1em]">{label === 'Timeline' ? 'Cronograma' : label}</label>
        {saving && <Loader2 className="h-3.5 w-3.5 text-neutral-300 animate-spin" />}
      </div>
      {children}
    </div>
  );

  if (field.field_type === 'checkbox') {
    const checked = field.field_value === 'true';
    return (
      <label
        className={cn(
          "flex items-center gap-4 bg-white border border-neutral-100 rounded-xl px-6 py-5 cursor-pointer transition-all duration-300 group",
          checked ? "bg-neutral-50/50" : "hover:border-neutral-200 hover:shadow-sm"
        )}
        onClick={() => {
          onChange(checked ? 'false' : 'true');
          setTimeout(() => onBlur(), 0);
        }}
      >
        <div className={cn(
          "h-5 w-5 rounded border flex items-center justify-center transition-all duration-300",
          checked ? "bg-[var(--success-green)] border-[var(--success-green)]" : "border-neutral-200 bg-neutral-50"
        )}>
          {checked && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
        </div>
        <span className={cn("text-xs font-medium transition-colors", checked ? "text-neutral-300 italic line-through" : "text-[var(--ink-secondary)] uppercase tracking-widest text-[10px] font-bold")}>
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
          className="w-full bg-white border border-neutral-200 rounded-xl px-6 py-4 text-sm font-medium text-[var(--ink-primary)] focus:outline-none focus:ring-1 focus:ring-neutral-200 focus:border-neutral-400 transition-all font-mono"
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
          placeholder="Declarar Cronograma..."
          className="w-full bg-white border border-neutral-200 rounded-xl px-6 py-4 text-sm font-medium text-[var(--ink-primary)] placeholder:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-200 transition-all italic"
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
        placeholder="Insira os detalhes..."
        className="w-full bg-white border border-neutral-200 rounded-xl px-6 py-4 text-sm font-medium text-[var(--ink-secondary)] placeholder:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-200 transition-all resize-none italic leading-relaxed"
      />
    </InputLayout>
  );
}
