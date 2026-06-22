import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft,
  Archive,
  ArchiveRestore,
  Mail,
  Pencil,
  Globe,
  Trash2,
  Target,
  CheckCircle2,
  Activity,
  Plus,
  CheckCircle,
  Clock,
  Trash,
  Cpu,
  Heart,
  Phone,
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  X,
  Check
} from 'lucide-react';
import TagBadge from '../components/TagBadge';
import AddClientModal from '../components/AddClientModal';
import PhaseSection from '../components/PhaseSection';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';

// ── Constants ──────────────────────────────────────────────
const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', BRL: 'R$' };

const SERVICE_TYPES = [
  'Landing Page',
  'Website',
  'WhatsApp Ads Management',
  'WhatsApp Chatbot',
  'Maintenance',
  'Consultation',
  'Custom',
];

const HEALTH_COLORS = {
  1: '#FF3B5C',
  2: '#FF3B5C',
  3: '#F59E0B',
  4: '#22C55E',
  5: '#22C55E',
};

const PHASES_PIPELINE = ['onboarding', 'delivery', 'review', 'done', 'churned'];

// ── Sub-components ─────────────────────────────────────────
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

function SectionLabel({ children }) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-[0.25em] mb-3" style={{ color: '#6B7080' }}>
      {children}
    </p>
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

function DarkInput({ className = '', ...props }) {
  return (
    <input
      className={cn('w-full px-3 py-2 rounded-lg text-sm outline-none', className)}
      style={{ backgroundColor: 'rgba(244,244,246,0.04)', border: '1px solid rgba(244,244,246,0.1)', color: '#F4F4F6' }}
      {...props}
    />
  );
}

function DarkTextarea({ className = '', ...props }) {
  return (
    <textarea
      className={cn('w-full px-3 py-2 rounded-lg text-sm outline-none resize-none', className)}
      style={{ backgroundColor: 'rgba(244,244,246,0.04)', border: '1px solid rgba(244,244,246,0.1)', color: '#F4F4F6' }}
      {...props}
    />
  );
}

function DarkSelect({ children, ...props }) {
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

function HealthDots({ score, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange?.(n)}
          className="h-3 w-3 rounded-full transition-all hover:scale-125"
          style={{ backgroundColor: n <= score ? HEALTH_COLORS[score] : 'rgba(244,244,246,0.12)' }}
          title={`Health: ${n}/5`}
        />
      ))}
    </div>
  );
}

function PhasePill({ phase, current, onClick }) {
  const isActive = phase === current;
  const isDone = PHASES_PIPELINE.indexOf(phase) < PHASES_PIPELINE.indexOf(current);
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all"
      style={isActive
        ? { backgroundColor: '#3362FF', color: '#F4F4F6' }
        : isDone
          ? { backgroundColor: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }
          : { color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)' }
      }
    >
      {phase}
    </button>
  );
}

// ── Inline field editor ────────────────────────────────────
function InlineEdit({ value, onSave, placeholder, multiline = false, className = '' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');

  useEffect(() => { setDraft(value || ''); }, [value]);

  async function save() {
    setEditing(false);
    if (draft !== value) await onSave(draft);
  }

  if (editing) {
    const props = {
      autoFocus: true,
      value: draft,
      onChange: e => setDraft(e.target.value),
      onBlur: save,
      onKeyDown: e => {
        if (!multiline && e.key === 'Enter') { e.preventDefault(); save(); }
        if (e.key === 'Escape') { setEditing(false); setDraft(value || ''); }
      },
      className,
    };
    return multiline
      ? <DarkTextarea rows={3} {...props} />
      : <DarkInput type="text" {...props} placeholder={placeholder} />;
  }

  return (
    <div
      className={cn('group cursor-text flex items-start gap-2', className)}
      onClick={() => setEditing(true)}
    >
      <span className="flex-1 text-sm leading-relaxed" style={{ color: draft ? '#F4F4F6' : '#6B7080' }}>
        {draft || placeholder}
      </span>
      <Pencil className="h-3 w-3 mt-0.5 opacity-0 group-hover:opacity-40 transition-opacity shrink-0" style={{ color: '#6B7080' }} />
    </div>
  );
}

// ── Checklist display (Next Action / DoD) ─────────────────
function parseChecklist(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* raw text */ }
  return raw.split('\n').filter(Boolean).map(text => ({ text, done: false }));
}

function ChecklistDisplay({ raw, fallback, fieldKey, clientId, accentColor = '#3362FF' }) {
  const [items, setItems] = useState([]);
  useEffect(() => { setItems(parseChecklist(raw)); }, [raw]);

  async function toggle(i) {
    const next = items.map((item, idx) => idx === i ? { ...item, done: !item.done } : item);
    setItems(next);
    await supabase.from('clients').update({ [fieldKey]: JSON.stringify(next) }).eq('id', clientId);
  }

  if (!items.length) {
    return <p className="text-sm italic" style={{ color: '#6B7080' }}>{fallback}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <button
            onClick={() => toggle(i)}
            className="mt-0.5 h-3.5 w-3.5 rounded border flex-shrink-0 flex items-center justify-center transition-all"
            style={item.done
              ? { backgroundColor: accentColor, borderColor: accentColor }
              : { borderColor: accentColor + '66' }
            }
          >
            {item.done && <Check className="h-2 w-2" style={{ color: '#F4F4F6' }} />}
          </button>
          <span className="text-sm leading-snug select-none" style={{ color: item.done ? '#6B7080' : '#F4F4F6', textDecoration: item.done ? 'line-through' : 'none' }}>
            {item.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

function OosDisplay({ raw, empty }) {
  const items = parseChecklist(raw);
  if (!items.length) return <p className="text-xs italic" style={{ color: '#6B7080' }}>{empty}</p>;
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        <div key={i} className="px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(255,59,92,0.08)', border: '1px solid rgba(255,59,92,0.2)' }}>
          <span className="text-xs" style={{ color: '#FF3B5C' }}>{item.text}</span>
        </div>
      ))}
    </div>
  );
}

// ── Task row ───────────────────────────────────────────────
function TaskRow({ task, onToggle, onDelete }) {
  const PRIO_COLORS = { high: '#FF3B5C', medium: '#F59E0B', low: '#3362FF', very_low: '#6B7080' };
  return (
    <div className="flex items-center gap-3 py-2 group" style={{ borderBottom: '1px solid rgba(244,244,246,0.04)' }}>
      <button onClick={onToggle} className="shrink-0">
        {task.done
          ? <CheckCircle2 className="h-4 w-4" style={{ color: '#22C55E' }} />
          : <Clock className="h-4 w-4" style={{ color: '#6B7080' }} />
        }
      </button>
      <p className="flex-1 text-sm truncate" style={{ color: task.done ? '#6B7080' : '#F4F4F6', textDecoration: task.done ? 'line-through' : 'none' }}>
        {task.title}
      </p>
      {task.priority && !task.done && (
        <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: PRIO_COLORS[task.priority] ?? '#6B7080' }} />
      )}
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 shrink-0"
        style={{ color: '#FF3B5C' }}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// ── Add Task form (inline) ─────────────────────────────────
function AddTaskForm({ clientId, onSaved, onClose, language }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    await supabase.from('tasks').insert({ title: title.trim(), client_id: clientId, priority, bucket: 'this_week', done: false });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <DarkInput
        type="text"
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder={language === 'pt' ? 'Nova tarefa...' : 'New task...'}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onClose(); }}
        className="flex-1"
      />
      <DarkSelect value={priority} onChange={e => setPriority(e.target.value)} style={{ width: '120px' }}>
        <option value="high">{language === 'pt' ? 'Alta' : 'High'}</option>
        <option value="medium">{language === 'pt' ? 'Média' : 'Medium'}</option>
        <option value="low">{language === 'pt' ? 'Baixa' : 'Low'}</option>
      </DarkSelect>
      <button onClick={save} disabled={saving || !title.trim()} className="p-2 rounded-lg disabled:opacity-50" style={{ backgroundColor: '#3362FF', color: '#F4F4F6' }}>
        <Check className="h-4 w-4" />
      </button>
      <button onClick={onClose} className="p-2 rounded-lg" style={{ color: '#6B7080' }}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Payment form (inline) ──────────────────────────────────
function PaymentForm({ clientId, clientCurrency, onSaved, onClose, language }) {
  const [form, setForm] = useState({ amount: '', description: '', currency: clientCurrency || 'BRL', is_recurring: false, recurring_start_date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save(e) {
    e.preventDefault();
    if (!form.amount || !form.description) return;
    setSaving(true);
    await supabase.from('client_payments').insert({
      client_id: clientId,
      amount: parseFloat(form.amount),
      description: form.description,
      currency: form.currency,
      is_paid: false,
      is_recurring: form.is_recurring,
      recurring_start_date: form.is_recurring ? form.recurring_start_date : null,
    });
    setSaving(false);
    onSaved();
    onClose();
    window.dispatchEvent(new Event('financial-updated'));
  }

  return (
    <form onSubmit={save} className="space-y-3 mt-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <DarkInput type="text" required value={form.description} onChange={e => set('description', e.target.value)}
            placeholder={language === 'pt' ? 'Descrição...' : 'Description...'} autoFocus />
        </div>
        <div className="flex gap-2">
          <DarkInput type="number" required value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" className="flex-1" />
          <DarkSelect value={form.currency} onChange={e => set('currency', e.target.value)} style={{ width: '80px' }}>
            <option>BRL</option><option>USD</option><option>EUR</option>
          </DarkSelect>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_recurring} onChange={e => set('is_recurring', e.target.checked)} style={{ accentColor: '#3362FF' }} />
          <span className="text-xs" style={{ color: '#F4F4F6' }}>{language === 'pt' ? 'Recorrente' : 'Recurring'}</span>
        </label>
        {form.is_recurring && (
          <DarkInput type="date" value={form.recurring_start_date} onChange={e => set('recurring_start_date', e.target.value)} style={{ width: '160px' }} />
        )}
        <div className="flex items-center gap-2 ml-auto">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)' }}>
            {language === 'pt' ? 'Cancelar' : 'Cancel'}
          </button>
          <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50" style={{ backgroundColor: '#3362FF', color: '#F4F4F6' }}>
            <Check className="h-3.5 w-3.5" /> {saving ? '...' : (language === 'pt' ? 'Adicionar' : 'Add')}
          </button>
        </div>
      </div>
    </form>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { t, language } = useLanguage();

  const [client, setClient] = useState(null);
  const [phases, setPhases] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [payments, setPayments] = useState([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);

  async function loadClientData(showSpinner = false) {
    if (showSpinner) setLoading(true);
    try {
      if (!id) throw new Error('Invalid ID');

      const { data: clientData, error: clientError } = await supabase
        .from('clients').select('*').eq('id', id).single();
      if (clientError || !clientData) { navigate('/'); return; }
      setClient(clientData);

      const [phasesRes, paymentsRes, contactsRes, tasksRes] = await Promise.all([
        supabase.from('client_phases').select('*, phase_fields(*)').eq('client_id', id).order('order_index'),
        supabase.from('client_payments').select('*').eq('client_id', id).order('created_at', { ascending: false }),
        supabase.from('contacts').select('*').eq('client_id', id).order('created_at'),
        supabase.from('tasks').select('*').eq('client_id', id).order('created_at'),
      ]);

      if (!phasesRes.error) setPhases(phasesRes.data || []);
      if (!paymentsRes.error) setPayments(paymentsRes.data || []);
      setContacts(contactsRes.data || []);
      setTasks(tasksRes.data || []);
    } catch (err) {
      console.error(err);
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadClientData(true); }, [id]);

  // ── Quick-update single field ──
  async function updateField(field, value) {
    await supabase.from('clients').update({ [field]: value }).eq('id', id);
    setClient(c => ({ ...c, [field]: value }));
  }

  // ── Track last contact ──
  async function markContacted() {
    const now = new Date().toISOString();
    await updateField('last_contact_at', now);
    toast.success?.(language === 'pt' ? 'Contato registrado.' : 'Contact recorded.');
  }

  // ── Status (active / archived) ──
  async function updateStatus(status) {
    const { error } = await supabase.from('clients').update({ status }).eq('id', id);
    if (!error) { toast.success?.(status === 'active' ? 'Activated' : 'Archived'); loadClientData(); }
  }

  // ── Delete client ──
  async function deleteClient() {
    if (!window.confirm(t('client_detail.delete_confirm'))) return;
    await supabase.from('clients').delete().eq('id', id);
    navigate('/');
  }

  // ── Payment helpers ──
  async function togglePaid(paymentId, current) {
    const payment = payments.find(p => p.id === paymentId);
    let update = { is_paid: !current };
    if (!current && payment) {
      const amt = parseFloat(payment.amount) || 0;
      const usdToBRL = 5.20; const eurToBRL = 6.00;
      let brl = payment.currency === 'USD' ? amt * usdToBRL : payment.currency === 'EUR' ? amt * eurToBRL : amt;
      update.paid_brl_amount = Math.round(brl * 100) / 100;
    } else {
      update.paid_brl_amount = null;
    }
    await supabase.from('client_payments').update(update).eq('id', paymentId);
    loadClientData();
    window.dispatchEvent(new Event('financial-updated'));
  }

  async function deletePayment(paymentId) {
    if (!window.confirm(t('client_detail.delete_record_confirm'))) return;
    await supabase.from('client_payments').delete().eq('id', paymentId);
    loadClientData();
    window.dispatchEvent(new Event('financial-updated'));
  }

  async function terminateRecurring(paymentId) {
    if (!window.confirm('Terminate this recurring fee?')) return;
    await supabase.from('client_payments').update({ terminated_at: new Date().toISOString() }).eq('id', paymentId);
    loadClientData();
    window.dispatchEvent(new Event('financial-updated'));
  }

  // ── Task helpers ──
  async function toggleTask(task) {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: !t.done } : t));
    await supabase.from('tasks').update({ done: !task.done }).eq('id', task.id);
  }

  async function deleteTask(taskId) {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    await supabase.from('tasks').delete().eq('id', taskId);
  }

  function monthsActive(startDate, terminatedAt) {
    const start = new Date(startDate);
    const end = terminatedAt ? new Date(terminatedAt) : new Date();
    return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24 * 30.44)));
  }

  function daysAgo(dateStr) {
    if (!dateStr) return null;
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  }

  // ── Derived ──
  const pendingTotal = payments.filter(p => !p.is_paid).reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const lifetimeTotal = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const openTasks = tasks.filter(t => !t.done);
  const lastContactAge = daysAgo(client?.last_contact_at);
  const updateDue = client?.next_update_due_at ? daysUntil(client.next_update_due_at) : null;
  const isUpdateOverdue = updateDue !== null && updateDue <= 0;

  if (loading) return (
    <div className="h-96 flex flex-col items-center justify-center gap-4" style={{ color: '#6B7080' }}>
      <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      <p className="text-[10px] font-bold uppercase tracking-[0.3em]">{t('client_detail.loading_project')}</p>
    </div>
  );

  if (!client) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <p className="text-sm" style={{ color: '#6B7080' }}>{t('client_detail.not_found_title')}</p>
      <Link to="/" className="text-xs font-bold" style={{ color: '#3362FF' }}>{t('client_detail.back_to_board')}</Link>
    </div>
  );

  const currency = CURRENCY_SYMBOLS[client.currency || 'BRL'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* ── NAV BAR ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link
          to="/"
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors"
          style={{ color: '#6B7080' }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('client_detail.back_to_board')}
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/briefing/${id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ backgroundColor: 'rgba(51,98,255,0.15)', color: '#3362FF', border: '1px solid rgba(51,98,255,0.3)' }}
          >
            <Cpu className="h-3.5 w-3.5" /> Brain
          </Link>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)' }}
          >
            <Pencil className="h-3.5 w-3.5" /> {t('client_detail.edit_record')}
          </button>
          <button
            onClick={() => updateStatus(client.status === 'active' ? 'archived' : 'active')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)' }}
          >
            {client.status === 'active'
              ? <><Archive className="h-3.5 w-3.5" /> {t('client_detail.archive')}</>
              : <><ArchiveRestore className="h-3.5 w-3.5" /> {t('client_detail.reactivate')}</>
            }
          </button>
          <button onClick={deleteClient} className="p-2 rounded-lg transition-colors" style={{ color: '#6B7080' }}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── HERO ── */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: client.status === 'active' ? '#22C55E' : '#6B7080' }} />
          <span className="text-[9px] font-bold uppercase tracking-[0.3em]" style={{ color: '#6B7080' }}>
            {client.status === 'active' ? 'Active' : 'Archived'}
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-serif tracking-tight" style={{ color: '#F4F4F6' }}>
          {client.name}.
        </h1>
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {client.email && (
            <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 text-xs" style={{ color: '#6B7080' }}>
              <Mail className="h-3.5 w-3.5" /> {client.email}
            </a>
          )}
          {client.phone && (
            <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 text-xs" style={{ color: '#6B7080' }}>
              <Phone className="h-3.5 w-3.5" /> {client.phone}
            </a>
          )}
          {client.url && (
            <a href={client.url.startsWith('http') ? client.url : `https://${client.url}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs" style={{ color: '#3362FF' }}>
              <Globe className="h-3.5 w-3.5" /> {client.url}
            </a>
          )}
        </div>
      </div>

      {/* ── OPERATIONAL STATUS BAR ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

        {/* Health score */}
        <CmdCard>
          <SectionLabel>{language === 'pt' ? 'Saúde' : 'Health'}</SectionLabel>
          <HealthDots
            score={client.health_score || 3}
            onChange={v => updateField('health_score', v)}
          />
          <p className="text-xs mt-2" style={{ color: HEALTH_COLORS[client.health_score || 3] }}>
            {client.health_score >= 4 ? (language === 'pt' ? 'Ótimo' : 'Good') :
             client.health_score >= 3 ? (language === 'pt' ? 'Estável' : 'Stable') :
             (language === 'pt' ? 'Atenção' : 'Attention')}
          </p>
        </CmdCard>

        {/* Last contact */}
        <CmdCard>
          <SectionLabel>{language === 'pt' ? 'Último Contato' : 'Last Contact'}</SectionLabel>
          <p className="text-xl font-serif" style={{ color: lastContactAge === null ? '#6B7080' : lastContactAge > 7 ? '#FF3B5C' : lastContactAge > 3 ? '#F59E0B' : '#22C55E' }}>
            {lastContactAge === null ? '—' : lastContactAge === 0 ? (language === 'pt' ? 'Hoje' : 'Today') : `${lastContactAge}d`}
          </p>
          <button onClick={markContacted} className="text-[9px] mt-2 font-bold uppercase tracking-wider" style={{ color: '#3362FF' }}>
            {language === 'pt' ? '+ Registrar' : '+ Log now'}
          </button>
        </CmdCard>

        {/* Update due */}
        <CmdCard>
          <SectionLabel>{language === 'pt' ? 'Update Due' : 'Update Due'}</SectionLabel>
          <p className="text-xl font-serif" style={{ color: isUpdateOverdue ? '#FF3B5C' : '#F4F4F6' }}>
            {updateDue === null ? '—' : updateDue === 0 ? (language === 'pt' ? 'Hoje' : 'Today') : updateDue < 0 ? `${Math.abs(updateDue)}d late` : `${updateDue}d`}
          </p>
          {isUpdateOverdue && (
            <p className="text-[9px] mt-1 font-bold uppercase tracking-wider" style={{ color: '#FF3B5C' }}>
              {language === 'pt' ? 'Atrasado' : 'Overdue'}
            </p>
          )}
        </CmdCard>

        {/* Pipeline phase */}
        <CmdCard>
          <SectionLabel>{language === 'pt' ? 'Fase' : 'Phase'}</SectionLabel>
          <div className="flex flex-wrap gap-1 mt-1">
            {PHASES_PIPELINE.map(p => (
              <PhasePill key={p} phase={p} current={client.phase || 'onboarding'} onClick={() => updateField('phase', p)} />
            ))}
          </div>
        </CmdCard>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: Next Action (most prominent) */}
        <div className="lg:col-span-2 space-y-4">
          <CmdCard style={{ border: '1px solid rgba(51,98,255,0.25)' }}>
            <SectionLabel>{language === 'pt' ? 'Próxima Ação' : 'Next Action'}</SectionLabel>
            <InlineEdit
              value={typeof client.next_action === 'string' && client.next_action.startsWith('[') ? '' : client.next_action}
              onSave={v => updateField('next_action', v)}
              placeholder={language === 'pt' ? 'O que fazer agora com este cliente...' : 'What to do next for this client...'}
              multiline
            />
            {client.next_action && client.next_action.startsWith('[') && (
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(244,244,246,0.07)' }}>
                <ChecklistDisplay
                  raw={client.next_action}
                  fallback=""
                  fieldKey="next_action"
                  clientId={id}
                  accentColor="#3362FF"
                />
              </div>
            )}
          </CmdCard>

          {/* Blocker */}
          <CmdCard>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-3.5 w-3.5" style={{ color: client.blocker_reason ? '#FF3B5C' : '#6B7080' }} />
              <SectionLabel>{language === 'pt' ? 'Bloqueio' : 'Blocker'}</SectionLabel>
            </div>
            <InlineEdit
              value={client.blocker_reason}
              onSave={v => updateField('blocker_reason', v)}
              placeholder={language === 'pt' ? 'Algum bloqueio? Clique para registrar...' : 'Any blocker? Click to record...'}
            />
          </CmdCard>

          {/* What sold + Service type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CmdCard>
              <SectionLabel>{language === 'pt' ? 'Serviço Contratado' : 'Contracted Service'}</SectionLabel>
              <DarkSelect
                value={client.what_sold || ''}
                onChange={e => updateField('what_sold', e.target.value)}
              >
                <option value="">{language === 'pt' ? '— Selecionar serviço —' : '— Select service —'}</option>
                {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </DarkSelect>
            </CmdCard>
            <CmdCard>
              <SectionLabel>{language === 'pt' ? 'Definição de Pronto' : 'Definition of Done'}</SectionLabel>
              <ChecklistDisplay
                raw={client.definition_of_done}
                fallback={t('client_detail.not_defined')}
                fieldKey="definition_of_done"
                clientId={id}
                accentColor="#22C55E"
              />
            </CmdCard>
          </div>

          {/* Out of scope */}
          <CmdCard>
            <SectionLabel>{language === 'pt' ? 'Fora do Escopo' : 'Out of Scope'}</SectionLabel>
            <OosDisplay raw={client.not_included} empty={t('client_detail.no_out_of_scope')} />
          </CmdCard>
        </div>

        {/* RIGHT: Billing summary + contacts */}
        <div className="space-y-4">
          {/* Billing summary */}
          <CmdCard>
            <SectionLabel>{language === 'pt' ? 'Financeiro' : 'Financials'}</SectionLabel>
            <div className="space-y-3">
              <div>
                <p className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: '#6B7080' }}>{t('client_detail.current_billing')}</p>
                <p className="text-2xl font-serif" style={{ color: pendingTotal > 0 ? '#FF3B5C' : '#22C55E' }}>
                  {currency} {pendingTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: '#6B7080' }}>{t('client_detail.total_revenue')}</p>
                <p className="text-lg font-serif" style={{ color: '#22C55E' }}>
                  {currency} {lifetimeTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CmdCard>

          {/* Contacts */}
          {contacts.length > 0 && (
            <CmdCard>
              <SectionLabel>{language === 'pt' ? 'Contatos' : 'Contacts'}</SectionLabel>
              <div className="space-y-2">
                {contacts.map(c => (
                  <div key={c.id} className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(244,244,246,0.04)', border: '1px solid rgba(244,244,246,0.07)' }}>
                    {c.name && <p className="text-xs font-bold" style={{ color: '#F4F4F6' }}>{c.name}{c.role ? <span className="font-normal ml-1" style={{ color: '#6B7080' }}>· {c.role}</span> : ''}</p>}
                    {c.phone && <p className="text-[10px] mt-0.5" style={{ color: '#6B7080' }}>{c.phone}</p>}
                    {c.email && <p className="text-[10px] mt-0.5" style={{ color: '#6B7080' }}>{c.email}</p>}
                  </div>
                ))}
              </div>
            </CmdCard>
          )}

          {/* Tags */}
          {client.tags?.length > 0 && (
            <CmdCard>
              <SectionLabel>Tags</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {client.tags.map(tag => <TagBadge key={tag} tag={tag} />)}
              </div>
            </CmdCard>
          )}

          {/* Next update due — edit */}
          <CmdCard>
            <SectionLabel>{language === 'pt' ? 'Próximo Update' : 'Next Update Due'}</SectionLabel>
            <DarkInput
              type="date"
              value={client.next_update_due_at ? client.next_update_due_at.split('T')[0] : ''}
              onChange={e => updateField('next_update_due_at', e.target.value || null)}
            />
          </CmdCard>
        </div>
      </div>

      {/* ── TASKS ── */}
      <CmdCard>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4" style={{ color: '#3362FF' }} />
            <SectionLabel>{t('client_detail.tasks_title')}</SectionLabel>
            {openTasks.length > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(51,98,255,0.15)', color: '#3362FF' }}>
                {openTasks.length} {language === 'pt' ? 'abertas' : 'open'}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowAddTask(v => !v)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
            style={{ color: '#3362FF', border: '1px solid rgba(51,98,255,0.3)' }}
          >
            <Plus className="h-3 w-3" /> {language === 'pt' ? 'Tarefa' : 'Task'}
          </button>
        </div>

        {showAddTask && (
          <AddTaskForm clientId={id} onSaved={loadClientData} onClose={() => setShowAddTask(false)} language={language} />
        )}

        {tasks.length === 0 && !showAddTask ? (
          <p className="text-sm py-2" style={{ color: '#6B7080' }}>{language === 'pt' ? 'Sem tarefas.' : 'No tasks yet.'}</p>
        ) : (
          <div className="mt-3">
            {tasks.map(task => (
              <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task)} onDelete={() => deleteTask(task.id)} />
            ))}
          </div>
        )}
      </CmdCard>

      {/* ── DELIVERY ROADMAP (phases) ── */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-serif" style={{ color: '#F4F4F6' }}>{t('client_detail.roadmap_title')}</h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mt-1" style={{ color: '#6B7080' }}>{t('client_detail.roadmap_subtitle')}</p>
          </div>
        </div>
        <div className="space-y-4">
          {phases.map(p => (
            <PhaseSection key={p.id} phase={p} onUpdate={loadClientData} />
          ))}
        </div>
      </div>

      {/* ── BILLING ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-serif" style={{ color: '#F4F4F6' }}>{t('client_detail.billing_tracker_title')}</h2>
          <button
            onClick={() => setShowPaymentForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ backgroundColor: 'rgba(51,98,255,0.15)', color: '#3362FF', border: '1px solid rgba(51,98,255,0.3)' }}
          >
            <Plus className="h-3.5 w-3.5" /> {t('client_detail.add_billable_task')}
          </button>
        </div>

        {showPaymentForm && (
          <CmdCard className="mb-4">
            <PaymentForm clientId={id} clientCurrency={client.currency} onSaved={loadClientData} onClose={() => setShowPaymentForm(false)} language={language} />
          </CmdCard>
        )}

        {payments.length === 0 ? (
          <CmdCard>
            <p className="text-sm text-center py-4" style={{ color: '#6B7080' }}>{t('client_detail.no_billing_records')}</p>
          </CmdCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {payments.map(p => {
              const months = p.is_recurring && p.recurring_start_date ? monthsActive(p.recurring_start_date, p.terminated_at) : null;
              const total = months ? parseFloat(p.amount) * months : null;
              const isTerminated = !!p.terminated_at;
              return (
                <CmdCard key={p.id} className={isTerminated ? 'opacity-50' : ''}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {p.is_recurring && (
                        <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={isTerminated
                            ? { color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)' }
                            : { backgroundColor: 'rgba(51,98,255,0.15)', color: '#3362FF' }
                          }>
                          {isTerminated ? 'Ended' : 'Monthly'}
                        </span>
                      )}
                      <span className="text-[9px] font-mono" style={{ color: '#6B7080' }}>
                        {new Date(p.created_at).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!p.is_recurring && (
                        <button
                          onClick={() => togglePaid(p.id, p.is_paid)}
                          className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={p.is_paid
                            ? { backgroundColor: 'rgba(34,197,94,0.15)', color: '#22C55E' }
                            : { color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)' }
                          }
                        >
                          {p.is_paid ? t('financials.paid') : t('financials.pending')}
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-sm font-medium mb-1" style={{ color: '#F4F4F6' }}>{p.description}</p>
                  {p.is_recurring && p.recurring_start_date && (
                    <p className="text-[10px] mb-2" style={{ color: '#6B7080' }}>
                      {language === 'pt' ? 'Desde' : 'Since'} {new Date(p.recurring_start_date).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US')}
                      {isTerminated && ` · ${language === 'pt' ? 'Encerrado' : 'Ended'} ${new Date(p.terminated_at).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US')}`}
                      {!isTerminated && <span style={{ color: '#3362FF' }}> · {months}{language === 'pt' ? ' meses' : 'mo'}</span>}
                    </p>
                  )}

                  <div className="flex items-end justify-between pt-3" style={{ borderTop: '1px solid rgba(244,244,246,0.07)' }}>
                    <div>
                      <p className="text-2xl font-serif" style={{ color: '#F4F4F6' }}>
                        {CURRENCY_SYMBOLS[p.currency || 'BRL']} {parseFloat(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        {p.is_recurring && <span className="text-sm font-sans ml-1" style={{ color: '#6B7080' }}>/mo</span>}
                      </p>
                      {total !== null && (
                        <p className="text-[10px]" style={{ color: '#6B7080' }}>
                          {CURRENCY_SYMBOLS[p.currency || 'BRL']} {total.toLocaleString(undefined, { minimumFractionDigits: 2 })} total
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {p.is_recurring && !isTerminated && (
                        <button onClick={() => terminateRecurring(p.id)} className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg" style={{ color: '#FF3B5C', border: '1px solid rgba(255,59,92,0.2)' }}>
                          {language === 'pt' ? 'Encerrar' : 'Terminate'}
                        </button>
                      )}
                      <button onClick={() => deletePayment(p.id)} className="p-1 rounded" style={{ color: '#6B7080' }}>
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </CmdCard>
              );
            })}
          </div>
        )}
      </div>

      <AddClientModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onClientAdded={loadClientData}
        editClient={client}
      />
    </div>
  );
}
