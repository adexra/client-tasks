import { useState, useEffect } from 'react';
import { X, Clock, Trash2, Rocket, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { SUBTASK_TEMPLATES } from '../lib/templates';
import { ListTodo, CheckSquare, Square } from 'lucide-react';

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
        title: '', description: '', bucket: 'this_week', priority: 'medium', estimated_minutes: 30, client_id: '', contact_id: ''
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

      let error;
      try {
        let savedTaskId = editTask ? editTask.id : null;
        
        if (!editTask) {
          const { data: insertedData, error: fetchError } = await supabase.from('tasks').insert([payload]).select('id').single();
          if (fetchError) {
             console.error('Insert Fetch Error:', fetchError);
          } else {
             savedTaskId = insertedData.id;
          }
        } else {
          const { error: updateError } = await supabase.from('tasks').update(payload).eq('id', editTask.id);
          if (updateError) console.error('Update Error:', updateError);
        }
        
        if (savedTaskId) {
          // Handle Subtasks
          // Delete existing for this task ID and re-insert
          await supabase.from('subtasks').delete().eq('task_id', savedTaskId);
          
          if (subtasks.length > 0) {
            const subtaskPayload = subtasks.filter(s => s.title.trim()).map(s => ({
              task_id: savedTaskId,
              title: s.title,
              done: !!s.done
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
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-white border border-neutral-200 rounded-2xl md:rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-6 md:px-10 md:py-10 border-b border-neutral-100 flex items-center justify-between bg-white shrink-0">
           <div className="space-y-1">
              <h2 className="text-3xl font-serif text-[var(--ink-primary)]">
                {editTask ? t('task_modal.edit_title') : t('task_modal.new_title')}
              </h2>
              <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest ml-1">{t('task_modal.config')}</label>
            </div>
           <button onClick={onClose} className="p-2 hover:bg-neutral-50 rounded-full transition-colors text-neutral-300 hover:text-neutral-500">
             <X className="h-5 w-5 md:h-6 md:w-6" />
           </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-8 md:space-y-10 bg-neutral-50/20 overflow-y-auto">
          <div className="space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest ml-1">{t('task_modal.title_label')}</label>
              <input
                autoFocus
                required
                value={formData.title}
                onChange={e => set('title')(e.target.value)}
                className="w-full bg-white border border-border-light rounded-xl px-4 py-3.5 text-sm font-medium text-ink-primary placeholder:text-ink-placeholder focus:outline-none focus:ring-1 focus:ring-slate-200 transition-all font-sans"
                placeholder={t('task_modal.title_placeholder')}
              />
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest ml-1">{t('task_modal.list_label')}</label>
                <select
                  value={formData.bucket}
                  onChange={e => set('bucket')(e.target.value)}
                  className="w-full bg-white border border-border-light rounded-xl px-4 py-4 text-[10px] font-bold text-ink-secondary focus:outline-none focus:ring-1 focus:ring-slate-200 uppercase tracking-widest transition-all appearance-none cursor-pointer"
                >
                  <option value="today">{t('task_modal.buckets.today')}</option>
                  <option value="this_week">{t('task_modal.buckets.this_week')}</option>
                  <option value="backlog">{t('task_modal.buckets.backlog')}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest ml-1">{t('task_modal.priority_label')}</label>
                <select
                  value={formData.priority}
                  onChange={e => set('priority')(e.target.value)}
                  className="w-full bg-white border border-border-light rounded-xl px-4 py-4 text-[10px] font-bold text-ink-secondary focus:outline-none focus:ring-1 focus:ring-slate-200 uppercase tracking-widest transition-all appearance-none cursor-pointer"
                >
                  <option value="high">{t('task_modal.priorities.high')}</option>
                  <option value="medium">{t('task_modal.priorities.medium')}</option>
                  <option value="low">{t('task_modal.priorities.low')}</option>
                  <option value="very_low">{t('task_modal.priorities.very_low')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest ml-1 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> {t('task_modal.estimated_label')}
                </label>
                <input
                  type="number"
                  value={formData.estimated_minutes}
                  onChange={e => set('estimated_minutes')(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-6 py-4 text-sm font-medium text-[var(--ink-primary)] focus:outline-none focus:ring-1 focus:ring-neutral-200 font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest ml-1">{t('task_modal.link_project')}</label>
                <select
                  value={formData.client_id}
                  onChange={e => { set('client_id')(e.target.value); set('contact_id')(''); }}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-4 text-[10px] font-bold text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-200 uppercase tracking-widest italic"
                >
                  <option value="">{t('task_modal.general_task')}</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {clientContacts.length > 0 && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest ml-1">Assign Contact</label>
                <select
                  value={formData.contact_id}
                  onChange={e => set('contact_id')(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-4 text-[10px] font-bold text-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-200 tracking-widest"
                >
                  <option value="">— No contact —</option>
                  {clientContacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.role ? ` · ${c.role}` : ''}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest ml-1">{t('task_modal.details_label')}</label>
              <textarea
                value={formData.description}
                onChange={e => set('description')(e.target.value)}
                placeholder={t('task_modal.details_placeholder')}
                rows={3}
                className="w-full bg-white border border-border-light rounded-xl px-6 py-4 text-sm font-medium text-ink-secondary placeholder:text-ink-placeholder focus:outline-none focus:ring-1 focus:ring-slate-200 transition-all resize-none italic leading-relaxed font-sans"
              />
            </div>

            {/* Subtasks Section */}
            <div className="space-y-4 pt-4 border-t border-neutral-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest ml-1 flex items-center gap-2">
                  <ListTodo className="h-3.5 w-3.5" /> Sub-tasks
                </label>
                <div className="flex gap-2 w-full sm:w-auto">
                  <select 
                    onChange={(e) => {
                      if (e.target.value) {
                        applyTemplate(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="flex-1 sm:flex-none text-[9px] font-bold uppercase tracking-widest text-ink-secondary bg-white px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none shadow-sm cursor-pointer"
                  >
                    <option value="">Apply Template</option>
                    <option value="automations">Automations</option>
                  </select>
                  <button 
                    type="button" 
                    onClick={addSubtask}
                    className="flex-1 sm:flex-none text-[9px] font-bold uppercase tracking-widest text-white bg-ink-charcoal px-4 py-2 rounded-lg hover:bg-black transition-all shadow-sm"
                  >
                    + Add Step
                  </button>
                </div>
              </div>
              
              <div className="space-y-3 mt-4">
                {subtasks.map((st, idx) => (
                  <div key={idx} className="flex items-center gap-3 group bg-white p-3 rounded-xl border border-neutral-50 shadow-sm transition-all hover:border-neutral-200">
                    <button
                      type="button"
                      onClick={() => updateSubtask(idx, 'done', !st.done)}
                      className="shrink-0 transition-transform active:scale-90"
                    >
                      {st.done ? <CheckSquare className="h-5 w-5 text-emerald-600" /> : <Square className="h-5 w-5 text-neutral-400" />}
                    </button>
                    <input
                      value={st.title}
                      onChange={e => updateSubtask(idx, 'title', e.target.value)}
                      placeholder="e.g. Set up n8n trigger..."
                      className={cn(
                        "flex-1 bg-transparent border-none p-0 text-sm font-medium focus:ring-0 placeholder:text-neutral-300 transition-all",
                        st.done ? "line-through text-neutral-400" : "text-ink-primary"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => removeSubtask(idx)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-neutral-400 hover:text-rose-500 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {subtasks.length === 0 && (
                  <p className="text-[11px] font-medium text-neutral-400 italic py-4 text-center bg-neutral-50/50 rounded-xl border border-dashed border-neutral-200 uppercase tracking-widest">
                    No sub-tasks added yet.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-8 border-t border-neutral-100 shrink-0">
             <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
               {editTask && (
                 <button type="button" onClick={handleDelete} className="p-3 text-neutral-400 hover:text-rose-500 transition-colors border border-transparent hover:border-rose-100 rounded-xl">
                   <Trash2 className="h-5 w-5" />
                 </button>
               )}
               <button type="button" onClick={onClose} className="sm:hidden text-[10px] font-bold text-ink-muted hover:text-ink-primary uppercase tracking-widest transition-colors">
                 {t('common.cancel')}
               </button>
             </div>
             
             <div className="flex items-center gap-6 w-full sm:w-auto">
                <button type="button" onClick={onClose} className="hidden sm:inline-block text-[10px] font-bold text-ink-muted hover:text-ink-primary uppercase tracking-widest transition-colors">
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto btn-minimal btn-primary px-10 py-4 md:py-5 h-auto text-[10px] shadow-lg shadow-black/5"
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
