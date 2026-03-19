import { useState, useEffect } from 'react';
import { X, Clock, Trash2, Rocket, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { cn } from '../lib/utils';

export default function TaskModal({ isOpen, onClose, onTaskSaved, editTask = null, clients = [] }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    bucket: 'this_week',
    priority: 'medium',
    estimated_minutes: 30,
    client_id: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editTask) {
      setFormData({
        title: editTask.title || '',
        description: editTask.description || '',
        bucket: editTask.bucket || 'this_week',
        priority: editTask.priority || 'medium',
        estimated_minutes: editTask.estimated_minutes || 30,
        client_id: editTask.client_id || ''
      });
    } else {
      setFormData({
        title: '', description: '', bucket: 'this_week', priority: 'medium', estimated_minutes: 30, client_id: ''
      });
    }
  }, [editTask, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e) {
      e.preventDefault();
      if (!formData.title.trim()) return toast.error('O título da tarefa é obrigatório');
      
      setSubmitting(true);
      const payload = {
        ...formData,
        client_id: formData.client_id || null,
        estimated_minutes: parseInt(formData.estimated_minutes) || 30
      };

      let error;
      try {
        if (editTask) {
          const { error: err } = await supabase.from('tasks').update(payload).eq('id', editTask.id);
          error = err;
        } else {
          const { error: err } = await supabase.from('tasks').insert([payload]);
          error = err;
        }
      } catch (err) {
        error = err;
      }

      if (error) {
        console.error('Task Submission Error:', error);
        toast.error('Falha na sincronização: ' + (error.message || 'Erro desconhecido'));
      } else {
        toast.success(editTask ? 'Tarefa atualizada' : 'Tarefa criada');
        onTaskSaved();
        onClose();
      }
      setSubmitting(false);
  }

  async function handleDelete() {
    if (!editTask) return;
    if (!confirm('Excluir permanentemente esta tarefa?')) return;
    const { error } = await supabase.from('tasks').delete().eq('id', editTask.id);
    if (!error) {
      toast.success('Tarefa excluída');
      onTaskSaved();
      onClose();
    }
  }

  const set = (key) => (val) => setFormData(prev => ({ ...prev, [key]: val }));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-white border border-neutral-200 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col">
        {/* Header */}
        <div className="px-10 py-10 border-b border-neutral-100 flex items-center justify-between">
           <div className="space-y-1">
              <h2 className="text-3xl font-serif text-[var(--ink-primary)]">{editTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Configuração da Tarefa</p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-neutral-50 rounded-full transition-colors text-neutral-300 hover:text-neutral-500">
             <X className="h-6 w-6" />
           </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-10 bg-neutral-50/20">
          <div className="space-y-8">
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Título da Tarefa</label>
              <input
                autoFocus
                required
                value={formData.title}
                onChange={e => set('title')(e.target.value)}
                className="w-full bg-white border border-border-light rounded-xl px-4 py-3.5 text-sm font-medium text-ink-primary placeholder:text-ink-placeholder focus:outline-none focus:ring-1 focus:ring-slate-200 transition-all font-sans"
                placeholder="O que exatamente precisa ser feito?"
              />
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Lista de Tarefas</label>
                <select
                  value={formData.bucket}
                  onChange={e => set('bucket')(e.target.value)}
                  className="w-full bg-white border border-border-light rounded-xl px-4 py-4 text-[10px] font-bold text-ink-secondary focus:outline-none focus:ring-1 focus:ring-slate-200 uppercase tracking-widest transition-all appearance-none cursor-pointer"
                >
                  <option value="today">Hoje</option>
                  <option value="this_week">Esta Semana</option>
                  <option value="backlog">Backlog</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Prioridade</label>
                <select
                  value={formData.priority}
                  onChange={e => set('priority')(e.target.value)}
                  className="w-full bg-white border border-border-light rounded-xl px-4 py-4 text-[10px] font-bold text-ink-secondary focus:outline-none focus:ring-1 focus:ring-slate-200 uppercase tracking-widest transition-all appearance-none cursor-pointer"
                >
                  <option value="high">Crítica</option>
                  <option value="medium">Prioritária</option>
                  <option value="low">Suporte</option>
                  <option value="very_low">Mínima</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Tempo Estimado (Min)
                </label>
                <input
                  type="number"
                  value={formData.estimated_minutes}
                  onChange={e => set('estimated_minutes')(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-6 py-4 text-sm font-medium text-[var(--ink-primary)] focus:outline-none focus:ring-1 focus:ring-neutral-200 font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Vincular ao Projeto</label>
                <select
                  value={formData.client_id}
                  onChange={e => set('client_id')(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-4 text-[10px] font-bold text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-200 uppercase tracking-widest italic"
                >
                  <option value="">Tarefa Geral</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Detalhes da Tarefa</label>
              <textarea
                value={formData.description}
                onChange={e => set('description')(e.target.value)}
                placeholder="Detalhes para esta tarefa..."
                rows={3}
                className="w-full bg-white border border-border-light rounded-xl px-6 py-4 text-sm font-medium text-ink-secondary placeholder:text-ink-placeholder focus:outline-none focus:ring-1 focus:ring-slate-200 transition-all resize-none italic leading-relaxed font-sans"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-8 border-t border-neutral-100">
             {editTask ? (
               <button type="button" onClick={handleDelete} className="p-3 text-neutral-300 hover:text-rose-500 transition-colors">
                 <Trash2 className="h-5 w-5" />
               </button>
             ) : <div />}
             
             <div className="flex gap-8 items-center">
                <button type="button" onClick={onClose} className="text-[10px] font-bold text-neutral-300 hover:text-neutral-500 uppercase tracking-widest transition-colors">Cancelar</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-minimal btn-primary px-10 py-5 h-auto text-[10px]"
                >
                  {submitting ? 'Salvando...' : editTask ? 'Atualizar Tarefa' : 'Criar Tarefa'}
                </button>
             </div>
          </div>
        </form>
      </div>
    </div>
  );
}
