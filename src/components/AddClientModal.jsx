import { useState, useEffect } from 'react';
import { X, Plus, Target, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { PROJECT_TEMPLATES, PHASE_TEMPLATES } from '../lib/templates';

function parseChecklist(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(i => typeof i === 'string' ? { text: i, done: false } : i);
  } catch { /* intentional — raw value is not valid JSON */ }
  // Legacy plain text — convert each line to a checklist item
  return raw.split('\n').filter(Boolean).map(text => ({ text, done: false }));
}

function serializeChecklist(items) {
  return JSON.stringify(items.filter(i => i.text.trim()));
}

export default function AddClientModal({ isOpen, onClose, onClientAdded, editClient = null }) {
  const { t } = useLanguage();
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', url: '', phase: 'onboarding', revenue: '', currency: 'USD',
    what_sold: '', contact_link: '', main_delivery: 'none',
    is_recurring: false, recurring_start_date: new Date().toISOString().split('T')[0]
  });
  const [nextActions, setNextActions] = useState([]);
  const [doneItems, setDoneItems] = useState([]);
  const [oosItems, setOosItems] = useState([]);
  const [contacts, setContacts] = useState([]);
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
        contact_link: editClient.contact_link || '',
        main_delivery: 'none',
        is_recurring: false,
        recurring_start_date: new Date().toISOString().split('T')[0]
      });
      setNextActions(parseChecklist(editClient.next_action));
      setDoneItems(parseChecklist(editClient.definition_of_done));
      setOosItems(parseChecklist(editClient.not_included));
      setContacts(editClient.contacts || []);
      setTags(editClient.tags || []);
    } else {
      setFormData({
        name: '', email: '', phone: '', url: '', phase: 'onboarding', revenue: '', currency: 'USD',
        what_sold: '', contact_link: '', main_delivery: 'none',
        is_recurring: false, recurring_start_date: new Date().toISOString().split('T')[0]
      });
      setNextActions([]);
      setDoneItems([]);
      setOosItems([]);
      setContacts([]);
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
      contacts,
      revenue: parseFloat(formData.revenue) || 0,
      next_action: serializeChecklist(nextActions),
      definition_of_done: serializeChecklist(doneItems),
      not_included: serializeChecklist(oosItems),
    };

    // remove fields that don't belong to the clients table
    const { main_delivery: _main_delivery, is_recurring: _is_recurring, recurring_start_date: _recurring_start_date, contacts: _contacts, ...clientDBPayload } = dataToSave;

    let error;
    let newClient;
    if (editClient) {
      const { error: err } = await supabase.from('clients').update(clientDBPayload).eq('id', editClient.id);
      error = err;
      if (!err && contacts.length > 0) {
        await supabase.from('contacts').delete().eq('client_id', editClient.id);
        const rows = contacts.filter(c => c.name?.trim()).map(c => ({ ...c, client_id: editClient.id }));
        if (rows.length) await supabase.from('contacts').insert(rows);
      }
    } else {
      const { data, error: err } = await supabase.from('clients').insert([clientDBPayload]).select().single();
      error = err;
      newClient = data;
      if (!err && newClient && contacts.length > 0) {
        const rows = contacts.filter(c => c.name?.trim()).map(c => ({ ...c, client_id: newClient.id }));
        if (rows.length) await supabase.from('contacts').insert(rows);
      }
    }

    // Auto-create the 4 standard phases for new projects
    if (!error && !editClient && newClient) {
      const toTasklist = (items) => JSON.stringify(items.map(text => ({ text, done: false })));
      const phases = [
        { phase_name: 'onboarding', order_index: 0, fields: [
          { field_key: 'Execution Roadmap', field_type: 'tasklist', field_value: toTasklist(PHASE_TEMPLATES.onboarding) },
          { field_key: 'Timeline', field_type: 'date', field_value: '' },
        ]},
        { phase_name: 'delivery', order_index: 1, fields: [
          { field_key: 'Execution Roadmap', field_type: 'tasklist', field_value: toTasklist(PHASE_TEMPLATES.delivery) },
          { field_key: 'Timeline', field_type: 'date', field_value: '' },
        ]},
        { phase_name: 'qa', order_index: 2, fields: [
          { field_key: 'Execution Roadmap', field_type: 'tasklist', field_value: toTasklist(PHASE_TEMPLATES.qa) },
        ]},
        { phase_name: 'update', order_index: 3, fields: [
          { field_key: 'Execution Roadmap', field_type: 'tasklist', field_value: toTasklist(PHASE_TEMPLATES.update) },
          { field_key: 'Timeline', field_type: 'date', field_value: '' },
        ]},
      ];
      for (const p of phases) {
        const { data: phaseRow } = await supabase.from('client_phases')
          .insert([{ client_id: newClient.id, phase_name: p.phase_name, order_index: p.order_index, completed: false }])
          .select('id').single();
        if (phaseRow?.id && p.fields.length) {
          await supabase.from('phase_fields').insert(p.fields.map(f => ({ ...f, phase_id: phaseRow.id })));
        }
      }
    }

    if (!error && !editClient && formData.revenue > 0 && newClient) {
      await supabase.from('client_payments').insert([{
        client_id: newClient.id,
        amount: parseFloat(formData.revenue),
        description: formData.is_recurring ? 'Monthly Retainer' : 'Initial Project Fee',
        currency: formData.currency,
        is_paid: false,
        is_recurring: formData.is_recurring,
        recurring_start_date: formData.is_recurring ? formData.recurring_start_date : null,
      }]);
    } 
    
    // Add template tasks for new clients if selected
    if (!error && !editClient && formData.main_delivery !== 'none' && newClient) {
      const templateTasks = PROJECT_TEMPLATES[formData.main_delivery];
      if (templateTasks) {
        const todayDate = new Date().toISOString().split('T')[0];
        const tasksToInsert = templateTasks.map(({ description, ...task }) => ({
          ...task,
          details: description,
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
      
      <div className="relative bg-white border border-neutral-200 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 max-h-[95vh] flex flex-col">
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
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{t('project_modal.identity_section')}</label>
              <div className="space-y-4">
                 <MinimalInput label={t('project_modal.name_label')} value={formData.name} onChange={v => setFormData({...formData, name: v})} placeholder={t('project_modal.name_placeholder')} />
                 <MinimalInput label={t('project_modal.website_label')} value={formData.url} onChange={v => setFormData({...formData, url: v})} placeholder={t('project_modal.website_placeholder')} />
                 <MinimalInput label={t('project_modal.contact_link_label')} value={formData.contact_link} onChange={v => setFormData({...formData, contact_link: v})} placeholder={t('project_modal.contact_link_placeholder')} />
              </div>

              {/* Contacts */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Contacts / People</label>
                  <button
                    type="button"
                    onClick={() => setContacts([...contacts, { name: '', role: '', email: '', phone: '' }])}
                    className="flex items-center gap-1 text-[9px] font-bold text-neutral-400 hover:text-neutral-700 uppercase tracking-widest transition-colors"
                  >
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>
                {contacts.length === 0 && (
                  <p className="text-[10px] text-neutral-300 italic">No contacts yet. Add the owner, manager, or any relevant person.</p>
                )}
                <div className="space-y-3">
                  {contacts.map((c, i) => (
                    <div key={i} className="bg-white border border-neutral-100 rounded-xl p-4 space-y-2 relative group/contact">
                      <button
                        type="button"
                        onClick={() => setContacts(contacts.filter((_, idx) => idx !== i))}
                        className="absolute top-3 right-3 opacity-0 group-hover/contact:opacity-100 text-neutral-300 hover:text-rose-500 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={c.name}
                          onChange={e => setContacts(contacts.map((x, idx) => idx === i ? {...x, name: e.target.value} : x))}
                          placeholder="Full name"
                          className="col-span-2 bg-neutral-50 border border-neutral-100 rounded-lg px-3 py-2 text-xs font-semibold text-neutral-700 placeholder:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-200"
                        />
                        <input
                          value={c.role}
                          onChange={e => setContacts(contacts.map((x, idx) => idx === i ? {...x, role: e.target.value} : x))}
                          placeholder="Role (Owner, Manager…)"
                          className="bg-neutral-50 border border-neutral-100 rounded-lg px-3 py-2 text-xs text-neutral-600 placeholder:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-200"
                        />
                        <input
                          value={c.phone}
                          onChange={e => setContacts(contacts.map((x, idx) => idx === i ? {...x, phone: e.target.value} : x))}
                          placeholder="Phone / WhatsApp"
                          className="bg-neutral-50 border border-neutral-100 rounded-lg px-3 py-2 text-xs text-neutral-600 placeholder:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-200"
                        />
                        <input
                          value={c.email}
                          onChange={e => setContacts(contacts.map((x, idx) => idx === i ? {...x, email: e.target.value} : x))}
                          placeholder="Email"
                          className="col-span-2 bg-neutral-50 border border-neutral-100 rounded-lg px-3 py-2 text-xs text-neutral-600 placeholder:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-200"
                        />
                      </div>
                    </div>
                  ))}
                </div>
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

                 {/* Recurring toggle */}
                 <div className="space-y-3">
                   <button
                     type="button"
                     onClick={() => setFormData(f => ({...f, is_recurring: !f.is_recurring}))}
                     className={cn(
                       "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all w-full",
                       formData.is_recurring
                         ? "bg-violet-50 border-violet-200 text-violet-600"
                         : "bg-white border-neutral-100 text-neutral-400 hover:border-neutral-200 hover:text-neutral-600"
                     )}
                   >
                     <span className={cn(
                       "h-3.5 w-7 rounded-full transition-colors relative flex-shrink-0",
                       formData.is_recurring ? "bg-violet-400" : "bg-neutral-200"
                     )}>
                       <span className={cn(
                         "absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow transition-all",
                         formData.is_recurring ? "left-[14px]" : "left-0.5"
                       )} />
                     </span>
                     Monthly Recurring Fee
                   </button>

                   {formData.is_recurring && (
                     <div className="flex items-center gap-3 pl-1">
                       <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest whitespace-nowrap">Start Date</label>
                       <input
                         type="date"
                         value={formData.recurring_start_date}
                         onChange={e => setFormData(f => ({...f, recurring_start_date: e.target.value}))}
                         className="bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-700 focus:outline-none focus:ring-1 focus:ring-violet-200"
                       />
                     </div>
                   )}
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

             <MinimalTextarea label={t('project_modal.description_label')} value={formData.what_sold} onChange={v => setFormData({...formData, what_sold: v})} placeholder={t('project_modal.description_placeholder')} />

             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <ChecklistField
                  label={t('project_modal.next_action_label')}
                  items={nextActions}
                  onChange={setNextActions}
                  placeholder={t('project_modal.next_action_placeholder')}
                  variant="violet"
                />
                <ChecklistField
                  label={t('project_modal.dod_label')}
                  items={doneItems}
                  onChange={setDoneItems}
                  placeholder={t('project_modal.dod_placeholder')}
                  variant="emerald"
                />
                <ChecklistField
                  label={t('project_modal.oos_label')}
                  items={oosItems}
                  onChange={setOosItems}
                  placeholder={t('project_modal.oos_placeholder')}
                  variant="rose"
                />
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
             <button type="button" onClick={onClose} className="text-[10px] font-bold text-neutral-400 hover:text-neutral-700 uppercase tracking-widest transition-colors">{t('common.cancel')}</button>
             <button
               type="submit"
               disabled={submitting}
               className="btn-minimal btn-primary px-12 py-5 h-auto text-[10px]"
             >
               {submitting ? t('project_modal.saving') : (editClient ? t('common.save') : t('project_modal.new_title'))}
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
      <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-widest ml-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-neutral-200 rounded-xl px-6 py-4 text-sm font-medium text-[var(--ink-primary)] placeholder:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-300 transition-all"
      />
    </div>
  );
}

function MinimalTextarea({ label, value, onChange, placeholder }) {
  return (
    <div className="space-y-2 group">
      <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-widest ml-1">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full bg-white border border-neutral-200 rounded-xl px-6 py-4 text-sm font-medium text-[var(--ink-secondary)] placeholder:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-300 transition-all leading-relaxed resize-none"
      />
    </div>
  );
}

const FIELD_VARIANTS = {
  violet:  { label: 'text-violet-500',  border: 'border-violet-200',  bg: 'bg-violet-500',  unchecked: 'border-violet-300 hover:border-violet-500',  text: 'text-violet-800'  },
  emerald: { label: 'text-emerald-600', border: 'border-emerald-200', bg: 'bg-emerald-500', unchecked: 'border-emerald-300 hover:border-emerald-500', text: 'text-emerald-800' },
  rose:    { label: 'text-rose-500',    border: 'border-rose-200',    bg: 'bg-rose-400',    unchecked: 'border-rose-300 hover:border-rose-400',       text: 'text-rose-800'    },
  neutral: { label: 'text-neutral-500', border: 'border-neutral-200', bg: 'bg-black',       unchecked: 'border-neutral-300 hover:border-neutral-500', text: 'text-neutral-700' },
};

function ChecklistField({ label, items, onChange, placeholder, variant = 'neutral' }) {
  const [input, setInput] = useState('');
  const v = FIELD_VARIANTS[variant] || FIELD_VARIANTS.neutral;

  function addItem(e) {
    if ((e.key === 'Enter' || e.type === 'click') && input.trim()) {
      e.preventDefault?.();
      onChange([...items, { text: input.trim(), done: false }]);
      setInput('');
    }
  }

  function removeItem(idx) {
    onChange(items.filter((_, i) => i !== idx));
  }

  function toggleItem(idx) {
    onChange(items.map((item, i) => i === idx ? { ...item, done: !item.done } : item));
  }

  return (
    <div className="space-y-2">
      <label className={cn("block text-[9px] font-bold uppercase tracking-widest ml-1", v.label)}>{label}</label>
      <div className={cn("bg-white border rounded-xl overflow-hidden", v.border)}>
        {items.length > 0 && (
          <ul className="divide-y divide-neutral-50 max-h-40 overflow-y-auto">
            {items.map((item, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5 group/item">
                <button
                  type="button"
                  onClick={() => toggleItem(i)}
                  className={cn(
                    "h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
                    item.done ? `${v.bg} border-transparent text-white` : v.unchecked
                  )}
                >
                  {item.done && <svg className="h-2.5 w-2.5" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </button>
                <span className={cn("flex-1 text-xs font-medium leading-snug", item.done ? "line-through text-neutral-300" : v.text)}>{item.text}</span>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="opacity-0 group-hover/item:opacity-100 text-neutral-300 hover:text-rose-500 transition-all"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-neutral-50">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={addItem}
            placeholder={items.length === 0 ? placeholder : '+ Add another...'}
            className="flex-1 bg-transparent text-xs font-medium text-neutral-600 placeholder:text-neutral-300 focus:outline-none"
          />
          <button
            type="button"
            onClick={addItem}
            disabled={!input.trim()}
            className="h-6 w-6 rounded-lg bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors disabled:opacity-30"
          >
            <Plus className="h-3 w-3 text-neutral-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
