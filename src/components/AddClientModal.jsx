import { useState, useEffect } from 'react';
import { X, Search, Plus, UserPlus, Target, Mail, Globe, Phone, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { cn } from '../lib/utils';

export default function AddClientModal({ isOpen, onClose, onClientAdded, editClient = null }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', url: '', phase: 'onboarding', revenue: '', currency: 'USD',
    what_sold: '', next_action: '', definition_of_done: '', not_included: '', contact_link: ''
  });
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editClient) {
      setFormData({
        name: editClient.name || '',
        email: editClient.email || '',
        phone: editClient.phone || '',
        url: editClient.url || '',
        phase: editClient.phase || 'onboarding',
        revenue: editClient.revenue || '',
        currency: editClient.currency || 'USD',
        what_sold: editClient.what_sold || '',
        next_action: editClient.next_action || '',
        definition_of_done: editClient.definition_of_done || '',
        not_included: editClient.not_included || '',
        contact_link: editClient.contact_link || ''
      });
      setTags(editClient.tags || []);
    } else {
      setFormData({ 
        name: '', email: '', phone: '', url: '', phase: 'onboarding', revenue: '', currency: 'USD',
        what_sold: '', next_action: '', definition_of_done: '', not_included: '', contact_link: ''
      });
      setTags([]);
    }
  }, [editClient, isOpen]);

  const addTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (t) => setTags(tags.filter(tag => tag !== t));

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!formData.name) return toast.error('Nome do cliente é obrigatório');
    
    setSubmitting(true);
    const dataToSave = { 
      ...formData, 
      tags, 
      revenue: parseFloat(formData.revenue) || 0 
    };

    let error;
    let newClient;
    if (editClient) {
      const { error: err } = await supabase.from('clients').update(dataToSave).eq('id', editClient.id);
      error = err;
    } else {
      const { data, error: err } = await supabase.from('clients').insert([dataToSave]).select().single();
      error = err;
      newClient = data;
    }

    if (!error && !editClient && formData.revenue > 0 && newClient) {
      await supabase.from('client_payments').insert([{
        client_id: newClient.id,
        amount: parseFloat(formData.revenue),
        description: 'Taxa Inicial do Projeto',
        currency: formData.currency,
        is_paid: true
      }]);
    } else if (!error && editClient) {
      // If editing, check if they changed the revenue value
      if (parseFloat(formData.revenue) !== parseFloat(editClient.revenue || 0)) {
        const { data: existing } = await supabase.from('client_payments')
          .select('id').eq('client_id', editClient.id).eq('description', 'Taxa Inicial do Projeto');

        if (existing && existing.length > 0) {
           await supabase.from('client_payments')
             .update({ amount: parseFloat(formData.revenue) || 0, currency: formData.currency })
             .eq('id', existing[0].id);
        } else if (parseFloat(formData.revenue) > 0) {
           await supabase.from('client_payments').insert([{
             client_id: editClient.id,
             amount: parseFloat(formData.revenue),
             description: 'Initial Project Fee',
             currency: formData.currency,
             is_paid: true
           }]);
        }
      }
    }

    if (error) {
      console.error(error);
      toast.error('Falha na sincronização');
    } else {
      toast.success(editClient ? 'Projeto atualizado' : 'Projeto criado');
      if (onClientAdded) onClientAdded();
      window.dispatchEvent(new Event('project-updated'));
      window.dispatchEvent(new Event('financial-updated'));
      onClose();
    }
    setSubmitting(false);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-white border border-neutral-200 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 max-h-[95vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-10 border-b border-neutral-100 flex items-center justify-between">
           <div className="space-y-1">
              <h2 className="text-3xl font-serif text-[var(--ink-primary)]">{editClient ? 'Editar Projeto' : 'Novo Projeto'}</h2>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Configuração do Projeto</p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-neutral-50 rounded-full transition-colors text-neutral-300 hover:text-neutral-500">
             <X className="h-6 w-6" />
           </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 overflow-y-auto custom-scrollbar space-y-12 bg-neutral-50/20">
          {/* Identity Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Identidade do Projeto</label>
              <div className="space-y-4">
                 <MinimalInput label="Nome do Projeto" value={formData.name} onChange={v => setFormData({...formData, name: v})} placeholder="Nome do Cliente" />
                 <MinimalInput label="E-mail de Contato" value={formData.email} onChange={v => setFormData({...formData, email: v})} placeholder="contato@entidade.com" />
                 <MinimalInput label="Link de Contato" value={formData.contact_link} onChange={v => setFormData({...formData, contact_link: v})} placeholder="WhatsApp, Calendly, etc." />
                 <MinimalInput label="URL do Website" value={formData.url} onChange={v => setFormData({...formData, url: v})} placeholder="https://entidade.com" />
              </div>
            </div>

            <div className="space-y-6">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Financeiro do Projeto</label>
              <div className="space-y-6">
                 <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                       <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">Moeda</label>
                       <select 
                         value={formData.currency} 
                         onChange={e => setFormData({...formData, currency: e.target.value})}
                         className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3.5 text-xs font-bold text-[var(--ink-primary)] focus:outline-none focus:ring-1 focus:ring-neutral-200"
                       >
                         <option value="USD">USD ($)</option>
                         <option value="EUR">EUR (€)</option>
                         <option value="BRL">BRL (R$)</option>
                       </select>
                    </div>
                     <div className="col-span-2">
                        <MinimalInput label="Taxa / Faturamento Inicial" value={formData.revenue} onChange={v => setFormData({...formData, revenue: v})} placeholder="0.00" type="number" />
                     </div>
                 </div>
                 
                 <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-3 ml-1">Fase Atual</label>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                       {[
                         {id: 'onboarding', label: 'Integração'}, 
                         {id: 'delivery', label: 'Entrega'}, 
                         {id: 'qa', label: 'QA'}, 
                         {id: 'update', label: 'Atualizações'}
                       ].map(p => (
                         <button
                           key={p.id}
                           type="button"
                           onClick={() => setFormData({...formData, phase: p.id})}
                           className={cn(
                             "px-3 py-2.5 rounded-xl border text-[9px] font-bold uppercase tracking-tight transition-all",
                             formData.phase === p.id 
                               ? "bg-[var(--ink-charcoal)] border-[var(--ink-charcoal)] text-white shadow-md" 
                               : "bg-white border-neutral-100 text-neutral-400 hover:text-neutral-600 hover:border-neutral-200"
                           )}
                         >
                           {p.label}
                         </button>
                       ))}
                    </div>
                 </div>
              </div>
            </div>
          </div>

          {/* Strategic Scope Section */}
          <div className="space-y-10 pt-10 border-t border-neutral-100">
             <div className="flex items-center gap-3">
                <Target className="h-4 w-4 text-[var(--accent-sand)]" />
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Escopo do Projeto e Próxima Ação</label>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <MinimalTextarea label="Descrição do Projeto" value={formData.what_sold} onChange={v => setFormData({...formData, what_sold: v})} placeholder="Defina os objetivos principais..." />
                <MinimalTextarea label="Próxima Ação Imediata" value={formData.next_action} onChange={v => setFormData({...formData, next_action: v})} placeholder="Próximo passo imediato..." />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <MinimalTextarea label="Definição de Concluído" value={formData.definition_of_done} onChange={v => setFormData({...formData, definition_of_done: v})} placeholder="Critérios para conclusão..." />
                <MinimalTextarea label="Fora do Escopo" value={formData.not_included} onChange={v => setFormData({...formData, not_included: v})} placeholder="Limites explícitos..." />
             </div>
          </div>

          {/* Classification Tags */}
          <div className="space-y-6 pt-10 border-t border-neutral-100">
             <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Tags do Projeto</label>
             <div className="bg-white border border-neutral-100 rounded-2xl p-6 space-y-4">
                <div className="flex flex-wrap gap-2">
                   {tags.map(t => (
                     <div key={t} className="px-3 py-1.5 bg-neutral-50 border border-neutral-100 text-neutral-500 rounded-lg text-[9px] font-bold uppercase flex items-center gap-2">
                        {t}
                        <button type="button" onClick={() => removeTag(t)} className="hover:text-rose-500 transition-colors">×</button>
                     </div>
                   ))}
                   <input
                     value={tagInput}
                     onChange={e => setTagInput(e.target.value)}
                     onKeyDown={addTag}
                     placeholder="+ Adicionar tag..."
                     className="bg-transparent border-none p-0 text-[10px] font-bold text-neutral-300 placeholder:text-neutral-100 focus:ring-0 uppercase tracking-widest mt-0.5"
                   />
                </div>
             </div>
          </div>

          {/* Submit Actions */}
          <div className="flex justify-end items-center gap-8 pt-10">
             <button type="button" onClick={onClose} className="text-[10px] font-bold text-neutral-300 hover:text-neutral-500 uppercase tracking-widest transition-colors">Cancelar</button>
             <button
               type="submit"
               disabled={submitting}
               className="btn-minimal btn-primary px-12 py-5 h-auto text-[10px]"
             >
               {submitting ? 'Salvando...' : (editClient ? 'Atualizar Projeto' : 'Criar Projeto')}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MinimalInput({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="space-y-2 group">
      <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-neutral-200 rounded-xl px-6 py-4 text-sm font-medium text-[var(--ink-primary)] placeholder:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-200 transition-all"
      />
    </div>
  );
}

function MinimalTextarea({ label, value, onChange, placeholder }) {
  return (
    <div className="space-y-2 group">
      <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full bg-white border border-neutral-200 rounded-xl px-6 py-4 text-sm font-medium text-[var(--ink-secondary)] placeholder:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-200 transition-all italic leading-relaxed resize-none"
      />
    </div>
  );
}
