import { useState, useEffect } from 'react';
import { X, Clock, Trash2 } from 'lucide-react';
import CustomSelect from './CustomSelect';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { SUBTASK_TEMPLATES } from '../lib/templates';
import { ListTodo, CheckSquare, Square } from 'lucide-react';

const di = {
  width: '100%',
  background: 'rgba(244,244,246,0.04)',
  border: '1px solid rgba(244,244,246,0.1)',
  borderRadius: '12px',
  padding: '14px 20px',
  fontSize: '14px',
  fontWeight: '500',
  color: '#F4F4F6',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const ds = {
  ...di,
  fontSize: '10px',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  cursor: 'pointer',
  appearance: 'none',
  padding: '16px 20px',
};

function DLabel({ children, className = '' }) {
  return (
    <label
      className={cn('text-[10px] font-bold uppercase tracking-widest ml-1 flex items-center gap-1.5', className)}
      style={{ color: '#6B7080' }}
    >
      {children}
    </label>
  );
}

export default function TaskModal({ isOpen, onClose, onTaskSaved, editTask = null, clients = [] }) {
  const { t } = useLanguage();
  const toast = useToast();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    bucket: 'this_week',
    priority: 'medium',
    estimated_minutes: 30,
    client_id: '',
    contact_id: ''
  });
  const [subtasks, setSubtasks] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [clientContacts, setClientContacts] = useState([]);

  useEffect(() => {
    async function fetchSubtasks() {
      if (editTask) {
        const { data, error } = await supabase.from('subtasks').select('*').eq('task_id', editTask.id).order('created_at', { ascending: true });
        if (!error) setSubtasks(data || []);
      } else {
        setSubtasks([]);
      }
    }

    if (editTask) {
      setFormData({
        title: editTask.title || '',
        description: editTask.description || '',
        bucket: editTask.bucket || 'this_week',
        priority: editTask.priority || 'medium',
        estimated_minutes: editTask.estimated_minutes || 30,
        client_id: editTask.client_id || '',
        contact_id: editTask.contact_id || ''
      });
      fetchSubtasks();
    } else {
      setFormData({
        title: '', description: '', bucket: 'this_week', priority: 'medium',
        estimated_minutes: 30, client_id: '', contact_id: ''
      });
      setSubtasks([]);
    }
  }, [editTask, isOpen]);

  useEffect(() => {
    async function loadContacts() {
      if (!formData.client_id) { setClientContacts([]); return; }
      const { data } = await supabase.from('contacts').select('*').eq('client_id', formData.client_id).order('created_at');
      setClientContacts(data || []);
    }
    loadContacts();
  }, [formData.client_id]);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.title.trim()) return toast.error(t('task_modal.title_required'));
    setSubmitting(true);
    const todayDate = new Date().toISOString().split('T')[0];
    let finalScheduledDate = null;
    if (formData.bucket === 'today') {
      finalScheduledDate = todayDate;
    } else if (formData.bucket === 'this_week') {
      finalScheduledDate = (editTask && editTask.bucket === 'this_week' && editTask.scheduled_date) ? editTask.scheduled_date : todayDate;
    }
    const payload = {
      ...formData,
      client_id: formData.client_id || null,
      contact_id: formData.contact_id || null,
      estimated_minutes: parseInt(formData.estimated_minutes) || 30,
      scheduled_date: finalScheduledDate
    };
    try {
      let savedTaskId = editTask ? editTask.id : null;
      if (!editTask) {
        const { data: insertedData, error: fetchError } = await supabase.from('tasks').insert([payload]).select('id').single();
        if (fetchError) console.error('Insert Error:', fetchError);
        else savedTaskId = insertedData.id;
      } else {
        const { error: updateError } = await supabase.from('tasks').update(payload).eq('id', editTask.id);
        if (updateError) console.error('Update Error:', updateError);
      }
      if (savedTaskId) {
        await supabase.from('subtasks').delete().eq('task_id', savedTaskId);
        if (subtasks.length > 0) {
          const subtaskPayload = subtasks.filter(s => s.title.trim()).map(s => ({
            task_id: savedTaskId, title: s.title, done: !!s.done
          }));
          await supabase.from('subtasks').insert(subtaskPayload);
        }
      }
      toast.success(editTask ? t('task_modal.task_updated') : t('task_modal.task_created'));
      onTaskSaved();
      onClose();
    } catch (err) {
      console.error('Task Submission Error:', err);
      toast.error(t('task_modal.sync_failed') + ': ' + (err.message || 'Error'));
    }
    setSubmitting(false);
  }

  async function handleDelete() {
    if (!editTask) return;
    if (!confirm(t('common.confirm_delete'))) return;
    const { error } = await supabase.from('tasks').delete().eq('id', editTask.id);
    if (!error) {
      toast.success(t('task_modal.task_deleted'));
      onTaskSaved();
      onClose();
    }
  }

  const set = (key) => (val) => setFormData(prev => ({ ...prev, [key]: val }));
  const addSubtask = () => setSubtasks([...subtasks, { title: '', done: false }]);
  const updateSubtask = (index, field, value) => {
    const next = [...subtasks];
    next[index][field] = value;
    setSubtasks(next);
  };
  const removeSubtask = (index) => setSubtasks(subtasks.filter((_, i) => i !== index));
  const applyTemplate = (key) => {
    const items = SUBTASK_TEMPLATES[key].map(title => ({ title, done: false }));
    setSubtasks([...subtasks, ...items]);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 backdrop-blur-md"
        style={{ background: 'rgba(1,2,14,0.8)' }}
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col max-h-[90vh] rounded-2xl md:rounded-3xl"
        style={{ background: '#0D0F1E', border: '1px solid rgba(244,244,246,0.08)' }}
      >
        {/* Header */}
        <div
          className="px-6 py-6 md:px-10 md:py-10 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid rgba(244,244,246,0.07)' }}
        >
          <div className="space-y-1">
            <h2 className="text-3xl font-serif" style={{ color: '#F4F4F6' }}>
              {editTask ? t('task_modal.edit_title') : t('task_modal.new_title')}
            </h2>
            <DLabel>{t('task_modal.config')}</DLabel>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full transition-colors"
            style={{ color: '#6B7080' }}
            onMouseEnter={e => e.currentTarget.style.color = '#F4F4F6'}
            onMouseLeave={e => e.currentTarget.style.color = '#6B7080'}
          >
            <X className="h-5 w-5 md:h-6 md:w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-8 overflow-y-auto">
          {/* Title */}
          <div className="space-y-2">
            <DLabel>{t('task_modal.title_label')}</DLabel>
            <input
              autoFocus
              required
              value={formData.title}
              onChange={e => set('title')(e.target.value)}
              placeholder={t('task_modal.title_placeholder')}
              style={di}
              onFocus={e => { e.target.style.borderColor = 'rgba(51,98,255,0.5)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(244,244,246,0.1)'; }}
            />
          </div>

          {/* Bucket + Priority */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <DLabel>{t('task_modal.list_label')}</DLabel>
              <CustomSelect
                value={formData.bucket}
                onChange={v => set('bucket')(v)}
                options={[
                  { value: 'today', label: t('task_modal.buckets.today') },
                  { value: 'this_week', label: t('task_modal.buckets.this_week') },
                  { value: 'backlog', label: t('task_modal.buckets.backlog') },
                ]}
              />
            </div>
            <div className="space-y-2">
              <DLabel>{t('task_modal.priority_label')}</DLabel>
              <CustomSelect
                value={formData.priority}
                onChange={v => set('priority')(v)}
                options={[
                  { value: 'high', label: t('task_modal.priorities.high') },
                  { value: 'medium', label: t('task_modal.priorities.medium') },
                  { value: 'low', label: t('task_modal.priorities.low') },
                  { value: 'very_low', label: t('task_modal.priorities.very_low') },
                ]}
              />
            </div>
          </div>

          {/* Time + Client */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <DLabel><Clock className="h-3.5 w-3.5" /> {t('task_modal.estimated_label')}</DLabel>
              <input
                type="number"
                value={formData.estimated_minutes}
                onChange={e => set('estimated_minutes')(e.target.value)}
                style={{ ...di, fontFamily: 'monospace' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(51,98,255,0.5)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(244,244,246,0.1)'; }}
              />
            </div>
            <div className="space-y-2">
              <DLabel>{t('task_modal.link_project')}</DLabel>
              <CustomSelect
                value={formData.client_id}
                onChange={v => { set('client_id')(v); set('contact_id')(''); }}
                options={[{ value: '', label: t('task_modal.general_task') }, ...clients.map(c => ({ value: c.id, label: c.name }))]}
              />
            </div>
          </div>

          {/* Contact */}
          {clientContacts.length > 0 && (
            <div className="space-y-2">
              <DLabel>Assign Contact</DLabel>
              <CustomSelect
                value={formData.contact_id}
                onChange={v => set('contact_id')(v)}
                options={[{ value: '', label: '— No contact —' }, ...clientContacts.map(c => ({ value: c.id, label: c.name + (c.role ? ` · ${c.role}` : '') }))]}
              />
            </div>
          )}

          {/* Details */}
          <div className="space-y-2">
            <DLabel>{t('task_modal.details_label')}</DLabel>
            <textarea
              value={formData.description}
              onChange={e => set('description')(e.target.value)}
              placeholder={t('task_modal.details_placeholder')}
              rows={3}
              style={{ ...di, resize: 'none', lineHeight: '1.6', fontStyle: 'italic' }}
              onFocus={e => { e.target.style.borderColor = 'rgba(51,98,255,0.5)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(244,244,246,0.1)'; }}
            />
          </div>

          {/* Subtasks */}
          <div
            className="space-y-4 pt-6"
            style={{ borderTop: '1px solid rgba(244,244,246,0.07)' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <DLabel><ListTodo className="h-3.5 w-3.5" /> Sub-tasks</DLabel>
              <div className="flex gap-2 w-full sm:w-auto">
                <CustomSelect
                  value=""
                  onChange={v => { if (v) applyTemplate(v); }}
                  placeholder="Apply Template"
                  options={[{ value: 'automations', label: 'Automations' }]}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={addSubtask}
                  className="flex-1 sm:flex-none text-[9px] font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-all"
                  style={{ background: '#3362FF', color: '#F4F4F6', border: 'none' }}
                >
                  + Add Step
                </button>
              </div>
            </div>

            <div className="space-y-2 mt-2">
              {subtasks.map((st, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 group p-3 rounded-xl transition-all"
                  style={{ background: 'rgba(244,244,246,0.03)', border: '1px solid rgba(244,244,246,0.07)' }}
                >
                  <button
                    type="button"
                    onClick={() => updateSubtask(idx, 'done', !st.done)}
                    className="shrink-0 transition-transform active:scale-90"
                  >
                    {st.done
                      ? <CheckSquare className="h-5 w-5" style={{ color: '#22C55E' }} />
                      : <Square className="h-5 w-5" style={{ color: '#6B7080' }} />
                    }
                  </button>
                  <input
                    value={st.title}
                    onChange={e => updateSubtask(idx, 'title', e.target.value)}
                    placeholder="e.g. Set up n8n trigger..."
                    className="flex-1 bg-transparent border-none p-0 text-sm font-medium focus:ring-0 focus:outline-none transition-all"
                    style={{
                      color: st.done ? '#6B7080' : '#F4F4F6',
                      textDecoration: st.done ? 'line-through' : 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeSubtask(idx)}
                    className="opacity-0 group-hover:opacity-100 p-2 transition-all"
                    style={{ color: '#6B7080' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#FF3B5C'}
                    onMouseLeave={e => e.currentTarget.style.color = '#6B7080'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {subtasks.length === 0 && (
                <p
                  className="text-[11px] font-medium italic py-4 text-center rounded-xl uppercase tracking-widest"
                  style={{
                    color: '#6B7080',
                    border: '2px dashed rgba(244,244,246,0.08)',
                  }}
                >
                  No sub-tasks added yet.
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div
            className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-6 shrink-0"
            style={{ borderTop: '1px solid rgba(244,244,246,0.07)' }}
          >
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
              {editTask && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="p-3 rounded-xl transition-all"
                  style={{ color: '#6B7080', border: '1px solid transparent' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#FF3B5C'; e.currentTarget.style.borderColor = 'rgba(255,59,92,0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#6B7080'; e.currentTarget.style.borderColor = 'transparent'; }}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="sm:hidden text-[10px] font-bold uppercase tracking-widest transition-colors"
                style={{ color: '#6B7080' }}
              >
                {t('common.cancel')}
              </button>
            </div>

            <div className="flex items-center gap-6 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-widest transition-colors"
                style={{ color: '#6B7080' }}
                onMouseEnter={e => e.currentTarget.style.color = '#F4F4F6'}
                onMouseLeave={e => e.currentTarget.style.color = '#6B7080'}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-10 py-4 md:py-5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                style={{
                  background: submitting ? 'rgba(51,98,255,0.4)' : '#3362FF',
                  color: '#F4F4F6',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  border: 'none',
                }}
              >
                {submitting ? t('common.saving') : editTask ? t('task_modal.task_updated') : t('task_modal.task_created')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
