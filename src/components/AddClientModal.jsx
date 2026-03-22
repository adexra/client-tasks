import { useState, useEffect } from 'react';
import { X, Search, Plus, UserPlus, Target, Mail, Globe, Phone, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { PROJECT_TEMPLATES } from '../lib/templates';

export default function AddClientModal({ isOpen, onClose, onClientAdded, editClient = null }) {
  const { t } = useLanguage();
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', url: '', phase: 'onboarding', revenue: '', currency: 'USD',
    what_sold: '', next_action: '', definition_of_done: '', not_included: '', contact_link: '', main_delivery: 'none'
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
        what_sold: '', next_action: '', definition_of_done: '', not_included: '', contact_link: '', main_delivery: 'none'
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
    if (!formData.name) return toast.error(t('project_modal.name_required'));
    
    setSubmitting(true);
    const dataToSave = { 
      ...formData, 
      tags, 
      revenue: parseFloat(formData.revenue) || 0 
    };
    
    // remove main_delivery as it doesn't belong to the clients table
    const { main_delivery, ...clientDBPayload } = dataToSave;

    let error;
    let newClient;
    if (editClient) {
      const { error: err } = await supabase.from('clients').update(clientDBPayload).eq('id', editClient.id);
      error = err;
    } else {
      const { data, error: err } = await supabase.from('clients').insert([clientDBPayload]).select().single();
      error = err;
      newClient = data;
    }

    if (!error && !editClient && formData.revenue > 0 && newClient) {
      await supabase.from('client_payments').insert([{
        client_id: newClient.id,
        amount: parseFloat(formData.revenue),
        description: 'Initial Project Fee',
        currency: formData.currency,
        is_paid: false
      }]);
    } 
    
    // Add template tasks for new clients if selected
    if (!error && !editClient && formData.main_delivery !== 'none' && newClient) {
      const templateTasks = PROJECT_TEMPLATES[formData.main_delivery];
      if (templateTasks) {
        const todayDate = new Date().toISOString().split('T')[0];
        const tasksToInsert = templateTasks.map(task => ({
          ...task,
          client_id: newClient.id,
          scheduled_date: todayDate,
          created_at: new Date().toISOString()
        }));
        
        const { error: tasksError } = await supabase.from('tasks').insert(tasksToInsert);
        if (tasksError) {
          console.error("Failed to insert template tasks:", tasksError);
          toast.error("Warning: Client created, but failed to insert templates.");
        }
      }
    }
    
    if (!error && editClient) {
      if (parseFloat(formData.revenue) !== parseFloat(editClient.revenue || 0)) {
        const { data: existing } = await supabase.from('client_payments')
          .select('id').eq('client_id', editClient.id).eq('description', 'Initial Project Fee');

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
             is_paid: false
           }]);
        }
      }
    }

    if (error) {
      console.error(error);
      toast.error(t('project_modal.sync_failed'));
    } else {
      toast.success(editClient ? t('project_modal.updated') : t('project_modal.created'));
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
              <h2 className="text-3xl font-serif text-[var(--ink-primary)]">
                {editClient ? t('project_modal.edit_title') : t('project_modal.new_title')}
              </h2>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">{t('project_modal.tagline')}</p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-neutral-50 rounded-full transition-colors text-neutral-300 hover:text-neutral-500">
             <X className="h-6 w-6" />
           </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 overflow-y-auto custom-scrollbar space-y-12 bg-neutral-50/20">
          {/* Identity Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t('project_modal.identity_section')}</label>
              <div className="space-y-4">
                 <MinimalInput label={t('project_modal.name_label')} value={formData.name} onChange={v => setFormData({...formData, name: v})} placeholder={t('project_modal.name_placeholder')} />
                 <MinimalInput label={t('project_modal.email_label')} value={formData.email} onChange={v => setFormData({...formData, email: v})} placeholder={t('project_modal.email_placeholder')} />
                 <MinimalInput label={t('project_modal.contact_link_label')} value={formData.contact_link} onChange={v => setFormData({...formData, contact_link: v})} placeholder={t('project_modal.contact_link_placeholder')} />
                 <MinimalInput label={t('project_modal.website_label')} value={formData.url} onChange={v => setFormData({...formData, url: v})} placeholder={t('project_modal.website_placeholder')} />
              </div>
            </div>

            <div className="space-y-6">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t('project_modal.financial_section')}</label>
              <div className="space-y-6">
                 <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                       <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">{t('project_modal.currency_label')}</label>
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
                        <MinimalInput label={t('project_modal.revenue_label')} value={formData.revenue} onChange={v => setFormData({...formData, revenue: v})} placeholder="0.00" type="number" />
                     </div>
                 </div>

                 {!editClient && (
                    <div>
                        <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">{t('project_modal.main_delivery_label')}</label>
                        <select 
                          value={formData.main_delivery} 
                          onChange={e => setFormData({...formData, main_delivery: e.target.value})}
                          className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3.5 text-xs font-bold text-[var(--ink-secondary)] focus:outline-none focus:ring-1 focus:ring-neutral-200"
                        >
                          <option value="none">{t('project_modal.main_delivery.none')}</option>
                          <option value="framer_site">{t('project_modal.main_delivery.framer_site')}</option>
                          <option value="automation">{t('project_modal.main_delivery.automation')}</option>
                          <option value="advertising">{t('project_modal.main_delivery.advertising')}</option>
                          <option value="update">{t('project_modal.main_delivery.update')}</option>
                        </select>
                    </div>
                 )}
                 
                 <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-3 ml-1">{t('project_modal.phase_label')}</label>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                       {[
                         {id: 'onboarding', label: t('project_modal.phases.onboarding')}, 
                         {id: 'delivery', label: t('project_modal.phases.delivery')}, 
                         {id: 'qa', label: t('project_modal.phases.qa')}, 
                         {id: 'update', label: t('project_modal.phases.update')}
                       ].map(p => (
                         <button
                           key={p.id}
                           type="button"
                           onClick={() => setFormData({...formData, phase: p.id})}
                           className={cn(
                             "px-3 py-2.5 rounded-xl border text-[9px] font-bold uppercase tracking-tight transition-all",
                             formData.phase === p.id 
                               ? "bg-black border-black text-white shadow-md" 
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
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">{t('project_modal.scope_section')}</label>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <MinimalTextarea label={t('project_modal.description_label')} value={formData.what_sold} onChange={v => setFormData({...formData, what_sold: v})} placeholder={t('project_modal.description_placeholder')} />
                <MinimalTextarea label={t('project_modal.next_action_label')} value={formData.next_action} onChange={v => setFormData({...formData, next_action: v})} placeholder={t('project_modal.next_action_placeholder')} />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <MinimalTextarea label={t('project_modal.dod_label')} value={formData.definition_of_done} onChange={v => setFormData({...formData, definition_of_done: v})} placeholder={t('project_modal.dod_placeholder')} />
                <MinimalTextarea label={t('project_modal.oos_label')} value={formData.not_included} onChange={v => setFormData({...formData, not_included: v})} placeholder={t('project_modal.oos_placeholder')} />
             </div>
          </div>

          {/* Classification Tags */}
          <div className="space-y-6 pt-10 border-t border-neutral-100">
             <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t('project_modal.tags_label')}</label>
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
                     placeholder={t('project_modal.add_tag_placeholder')}
                     className="bg-transparent border-none p-0 text-[10px] font-bold text-neutral-300 placeholder:text-neutral-100 focus:ring-0 uppercase tracking-widest mt-0.5"
                   />
                </div>
             </div>
          </div>

          {/* Submit Actions */}
          <div className="flex justify-end items-center gap-8 pt-10">
             <button type="button" onClick={onClose} className="text-[10px] font-bold text-neutral-300 hover:text-neutral-500 uppercase tracking-widest transition-colors">{t('common.cancel')}</button>
             <button
               type="submit"
               disabled={submitting}
               className="btn-minimal btn-primary px-12 py-5 h-auto text-[10px]"
             >
               {submitting ? t('project_modal.saving') : (editClient ? t('project_modal.updated') : t('project_modal.created'))}
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
