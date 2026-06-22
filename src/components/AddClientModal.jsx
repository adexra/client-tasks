import { useState, useEffect } from 'react';
import { X, Plus, Target, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { PROJECT_TEMPLATES, PHASE_TEMPLATES } from '../lib/templates';

function parseChecklist(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(i => typeof i === 'string' ? { text: i, done: false } : i);
  } catch { /* intentional — raw value is not valid JSON */ }
  return raw.split('\n').filter(Boolean).map(text => ({ text, done: false }));
}

function serializeChecklist(items) {
  return JSON.stringify(items.filter(i => i.text.trim()));
}

const di = {
  width: '100%',
  background: 'rgba(244,244,246,0.05)',
  border: '1px solid rgba(244,244,246,0.12)',
  borderRadius: '12px',
  padding: '14px 24px',
  fontSize: '14px',
  fontWeight: '500',
  color: '#F4F4F6',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const ds = { ...di, fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', appearance: 'none', colorScheme: 'dark' };

function DLabel({ children }) {
  return (
    <label className="block text-[9px] font-bold uppercase tracking-widest ml-1" style={{ color: '#6B7080' }}>
      {children}
    </label>
  );
}

export default function AddClientModal({ isOpen, onClose, onClientAdded, editClient = null }) {
  const { t } = useLanguage();
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '', business_name: '', email: '', phone: '', url: '', phase: 'onboarding', revenue: '', currency: 'USD',
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
        business_name: editClient.business_name || '',
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
        name: '', business_name: '', email: '', phone: '', url: '', phase: 'onboarding', revenue: '', currency: 'USD',
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

  const removeTag = (tg) => setTags(tags.filter(tag => tag !== tg));

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!formData.name) return toast.error(t('project_modal.name_required'));
    setSubmitting(true);
    const dataToSave = {
      ...formData, tags, contacts,
      revenue: parseFloat(formData.revenue) || 0,
      next_action: serializeChecklist(nextActions),
      definition_of_done: serializeChecklist(doneItems),
      not_included: serializeChecklist(oosItems),
    };
    const { main_delivery: _main_delivery, is_recurring: _is_recurring, recurring_start_date: _recurring_start_date, contacts: _contacts, ...clientDBPayload } = dataToSave;
    let error, newClient;
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
        client_id: newClient.id, amount: parseFloat(formData.revenue),
        description: formData.is_recurring ? 'Monthly Retainer' : 'Initial Project Fee',
        currency: formData.currency, is_paid: false,
        is_recurring: formData.is_recurring,
        recurring_start_date: formData.is_recurring ? formData.recurring_start_date : null,
      }]);
    }
    if (!error && !editClient && formData.main_delivery !== 'none' && newClient) {
      const templateTasks = PROJECT_TEMPLATES[formData.main_delivery];
      if (templateTasks) {
        const todayDate = new Date().toISOString().split('T')[0];
        const tasksToInsert = templateTasks.map(({ description, ...task }) => ({
          ...task, details: description, client_id: newClient.id, scheduled_date: todayDate, created_at: new Date().toISOString()
        }));
        const { error: tasksError } = await supabase.from('tasks').insert(tasksToInsert);
        if (tasksError) toast.error('Warning: Client created, but failed to insert templates.');
      }
    }
    if (!error && editClient) {
      if (parseFloat(formData.revenue) !== parseFloat(editClient.revenue || 0)) {
        const { data: existing } = await supabase.from('client_payments')
          .select('id').eq('client_id', editClient.id).eq('description', 'Initial Project Fee');
        if (existing && existing.length > 0) {
          await supabase.from('client_payments').update({ amount: parseFloat(formData.revenue) || 0, currency: formData.currency }).eq('id', existing[0].id);
        } else if (parseFloat(formData.revenue) > 0) {
          await supabase.from('client_payments').insert([{
            client_id: editClient.id, amount: parseFloat(formData.revenue),
            description: 'Initial Project Fee', currency: formData.currency, is_paid: false
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

  const focusStyle = (e) => { e.target.style.borderColor = 'rgba(51,98,255,0.5)'; };
  const blurStyle = (e) => { e.target.style.borderColor = 'rgba(244,244,246,0.12)'; };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 backdrop-blur-md"
        style={{ background: 'rgba(1,2,14,0.8)' }}
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-5xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 max-h-[95vh] flex flex-col rounded-3xl"
        style={{ background: '#0D0F1E', border: '1px solid rgba(244,244,246,0.08)' }}
      >
        {/* Header */}
        <div
          className="p-10 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid rgba(244,244,246,0.07)' }}
        >
          <div className="space-y-1">
            <h2 className="text-3xl font-serif" style={{ color: '#F4F4F6' }}>
              {editClient ? t('project_modal.edit_title') : t('project_modal.new_title')}
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#6B7080' }}>
              {t('project_modal.tagline')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full transition-colors"
            style={{ color: '#6B7080' }}
            onMouseEnter={e => e.currentTarget.style.color = '#F4F4F6'}
            onMouseLeave={e => e.currentTarget.style.color = '#6B7080'}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 overflow-y-auto space-y-12">
          {/* Identity + Financials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Left: Identity */}
            <div className="space-y-6">
              <DLabel>{t('project_modal.identity_section')}</DLabel>
              <div className="space-y-4">
                <MinimalInput label={t('project_modal.name_label')} value={formData.name} onChange={v => setFormData({...formData, name: v})} placeholder={t('project_modal.name_placeholder')} />
                <MinimalInput label={t('project_modal.business_name_label')} value={formData.business_name} onChange={v => setFormData({...formData, business_name: v})} placeholder={t('project_modal.business_name_placeholder')} />
                <MinimalInput label={t('project_modal.website_label')} value={formData.url} onChange={v => setFormData({...formData, url: v})} placeholder={t('project_modal.website_placeholder')} />
                <MinimalInput label={t('project_modal.contact_link_label')} value={formData.contact_link} onChange={v => setFormData({...formData, contact_link: v})} placeholder={t('project_modal.contact_link_placeholder')} />
              </div>

              {/* Contacts */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <DLabel>Contacts / People</DLabel>
                  <button
                    type="button"
                    onClick={() => setContacts([...contacts, { name: '', role: '', email: '', phone: '' }])}
                    className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest transition-colors"
                    style={{ color: '#6B7080' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#3362FF'}
                    onMouseLeave={e => e.currentTarget.style.color = '#6B7080'}
                  >
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>
                {contacts.length === 0 && (
                  <p className="text-[10px] italic" style={{ color: '#6B7080' }}>
                    No contacts yet. Add the owner, manager, or any relevant person.
                  </p>
                )}
                <div className="space-y-3">
                  {contacts.map((c, i) => (
                    <div
                      key={i}
                      className="rounded-xl p-4 space-y-2 relative group/contact"
                      style={{ background: 'rgba(244,244,246,0.03)', border: '1px solid rgba(244,244,246,0.08)' }}
                    >
                      <button
                        type="button"
                        onClick={() => setContacts(contacts.filter((_, idx) => idx !== i))}
                        className="absolute top-3 right-3 opacity-0 group-hover/contact:opacity-100 transition-all"
                        style={{ color: '#6B7080' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#FF3B5C'}
                        onMouseLeave={e => e.currentTarget.style.color = '#6B7080'}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: 'name', placeholder: 'Full name', colSpan: 2 },
                          { key: 'role', placeholder: 'Role (Owner, Manager…)', colSpan: 1 },
                          { key: 'phone', placeholder: 'Phone / WhatsApp', colSpan: 1 },
                          { key: 'email', placeholder: 'Email', colSpan: 2 },
                        ].map(({ key, placeholder, colSpan }) => (
                          <input
                            key={key}
                            value={c[key]}
                            onChange={e => setContacts(contacts.map((x, idx) => idx === i ? {...x, [key]: e.target.value} : x))}
                            placeholder={placeholder}
                            className={colSpan === 2 ? 'col-span-2' : ''}
                            style={{ ...di, padding: '8px 12px', fontSize: '12px' }}
                            onFocus={focusStyle}
                            onBlur={blurStyle}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Financials */}
            <div className="space-y-6">
              <DLabel>{t('project_modal.financial_section')}</DLabel>
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1 space-y-2">
                    <DLabel>{t('project_modal.currency_label')}</DLabel>
                    <select
                      value={formData.currency}
                      onChange={e => setFormData({...formData, currency: e.target.value})}
                      style={ds}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
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
                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all w-full"
                    style={formData.is_recurring
                      ? { background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa' }
                      : { background: 'rgba(244,244,246,0.04)', border: '1px solid rgba(244,244,246,0.1)', color: '#6B7080' }
                    }
                  >
                    <span
                      className="h-3.5 w-7 rounded-full transition-colors relative flex-shrink-0"
                      style={{ background: formData.is_recurring ? '#8b5cf6' : 'rgba(244,244,246,0.15)' }}
                    >
                      <span
                        className="absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow transition-all"
                        style={{ left: formData.is_recurring ? '14px' : '2px' }}
                      />
                    </span>
                    Monthly Recurring Fee
                  </button>
                  {formData.is_recurring && (
                    <div className="flex items-center gap-3 pl-1">
                      <span className="text-[9px] font-bold uppercase tracking-widest whitespace-nowrap" style={{ color: '#6B7080' }}>Start Date</span>
                      <input
                        type="date"
                        value={formData.recurring_start_date}
                        onChange={e => setFormData(f => ({...f, recurring_start_date: e.target.value}))}
                        style={{ ...di, padding: '8px 12px', fontSize: '12px' }}
                        onFocus={focusStyle}
                        onBlur={blurStyle}
                      />
                    </div>
                  )}
                </div>

                {!editClient && (
                  <div className="space-y-2">
                    <DLabel>{t('project_modal.main_delivery_label')}</DLabel>
                    <select
                      value={formData.main_delivery}
                      onChange={e => setFormData({...formData, main_delivery: e.target.value})}
                      style={ds}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    >
                      <option value="none">{t('project_modal.main_delivery.none')}</option>
                      <option value="framer_site">{t('project_modal.main_delivery.framer_site')}</option>
                      <option value="automation">{t('project_modal.main_delivery.automation')}</option>
                      <option value="whatsapp_bot">{t('project_modal.main_delivery.whatsapp_bot')}</option>
                      <option value="advertising">{t('project_modal.main_delivery.advertising')}</option>
                      <option value="update">{t('project_modal.main_delivery.update')}</option>
                    </select>
                  </div>
                )}

                <div className="space-y-3">
                  <DLabel>{t('project_modal.phase_label')}</DLabel>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {[
                      { id: 'onboarding', label: t('project_modal.phases.onboarding') },
                      { id: 'delivery',   label: t('project_modal.phases.delivery') },
                      { id: 'qa',         label: t('project_modal.phases.qa') },
                      { id: 'update',     label: t('project_modal.phases.update') },
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setFormData({...formData, phase: p.id})}
                        className="px-3 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-tight transition-all"
                        style={formData.phase === p.id
                          ? { background: '#3362FF', border: '1px solid #3362FF', color: '#F4F4F6' }
                          : { background: 'rgba(244,244,246,0.04)', border: '1px solid rgba(244,244,246,0.1)', color: '#6B7080' }
                        }
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Strategic Scope */}
          <div className="space-y-10 pt-10" style={{ borderTop: '1px solid rgba(244,244,246,0.07)' }}>
            <div className="flex items-center gap-3">
              <Target className="h-4 w-4" style={{ color: '#3362FF' }} />
              <DLabel>{t('project_modal.scope_section')}</DLabel>
            </div>
            <MinimalTextarea label={t('project_modal.description_label')} value={formData.what_sold} onChange={v => setFormData({...formData, what_sold: v})} placeholder={t('project_modal.description_placeholder')} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <ChecklistField label={t('project_modal.next_action_label')} items={nextActions} onChange={setNextActions} placeholder={t('project_modal.next_action_placeholder')} variant="violet" />
              <ChecklistField label={t('project_modal.dod_label')} items={doneItems} onChange={setDoneItems} placeholder={t('project_modal.dod_placeholder')} variant="emerald" />
              <ChecklistField label={t('project_modal.oos_label')} items={oosItems} onChange={setOosItems} placeholder={t('project_modal.oos_placeholder')} variant="rose" />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-6 pt-10" style={{ borderTop: '1px solid rgba(244,244,246,0.07)' }}>
            <DLabel>{t('project_modal.tags_label')}</DLabel>
            <div
              className="rounded-2xl p-6 space-y-4"
              style={{ background: 'rgba(244,244,246,0.03)', border: '1px solid rgba(244,244,246,0.08)' }}
            >
              <div className="flex flex-wrap gap-2">
                {tags.map(tg => (
                  <div
                    key={tg}
                    className="px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase flex items-center gap-2"
                    style={{ background: 'rgba(51,98,255,0.1)', border: '1px solid rgba(51,98,255,0.2)', color: '#818cf8' }}
                  >
                    {tg}
                    <button type="button" onClick={() => removeTag(tg)} className="transition-colors" style={{ color: 'rgba(129,140,248,0.6)' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#FF3B5C'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(129,140,248,0.6)'}
                    >×</button>
                  </div>
                ))}
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={addTag}
                  placeholder={t('project_modal.add_tag_placeholder')}
                  className="bg-transparent border-none p-0 text-[10px] font-bold uppercase tracking-widest focus:ring-0 focus:outline-none mt-0.5"
                  style={{ color: '#6B7080' }}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end items-center gap-8 pt-10">
            <button
              type="button"
              onClick={onClose}
              className="text-[10px] font-bold uppercase tracking-widest transition-colors"
              style={{ color: '#6B7080' }}
              onMouseEnter={e => e.currentTarget.style.color = '#F4F4F6'}
              onMouseLeave={e => e.currentTarget.style.color = '#6B7080'}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-12 py-5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
              style={{
                background: submitting ? 'rgba(51,98,255,0.4)' : '#3362FF',
                color: '#F4F4F6',
                cursor: submitting ? 'not-allowed' : 'pointer',
                border: 'none',
              }}
            >
              {submitting ? t('project_modal.saving') : (editClient ? t('common.save') : t('project_modal.new_title'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MinimalInput({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div className="space-y-2">
      <label className="block text-[9px] font-bold uppercase tracking-widest ml-1" style={{ color: '#6B7080' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          background: 'rgba(244,244,246,0.05)',
          border: '1px solid rgba(244,244,246,0.12)',
          borderRadius: '12px',
          padding: '14px 24px',
          fontSize: '14px',
          fontWeight: '500',
          color: '#F4F4F6',
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
        onFocus={e => { e.target.style.borderColor = 'rgba(51,98,255,0.5)'; }}
        onBlur={e => { e.target.style.borderColor = 'rgba(244,244,246,0.12)'; }}
      />
    </div>
  );
}

function MinimalTextarea({ label, value, onChange, placeholder }) {
  return (
    <div className="space-y-2">
      <label className="block text-[9px] font-bold uppercase tracking-widest ml-1" style={{ color: '#6B7080' }}>{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        style={{
          width: '100%',
          background: 'rgba(244,244,246,0.05)',
          border: '1px solid rgba(244,244,246,0.12)',
          borderRadius: '12px',
          padding: '14px 24px',
          fontSize: '14px',
          fontWeight: '500',
          color: '#F4F4F6',
          outline: 'none',
          resize: 'none',
          lineHeight: '1.6',
          fontStyle: 'italic',
          transition: 'border-color 0.2s',
        }}
        onFocus={e => { e.target.style.borderColor = 'rgba(51,98,255,0.5)'; }}
        onBlur={e => { e.target.style.borderColor = 'rgba(244,244,246,0.12)'; }}
      />
    </div>
  );
}

const FIELD_VARIANTS = {
  violet:  { label: '#a78bfa', border: 'rgba(139,92,246,0.3)',  bg: '#8b5cf6', checkColor: 'rgba(139,92,246,0.3)' },
  emerald: { label: '#34d399', border: 'rgba(52,211,153,0.3)',  bg: '#10b981', checkColor: 'rgba(52,211,153,0.3)' },
  rose:    { label: '#fb7185', border: 'rgba(251,113,133,0.3)', bg: '#f43f5e', checkColor: 'rgba(251,113,133,0.3)' },
  neutral: { label: '#6B7080', border: 'rgba(244,244,246,0.12)', bg: '#3362FF', checkColor: 'rgba(244,244,246,0.15)' },
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

  function removeItem(idx) { onChange(items.filter((_, i) => i !== idx)); }
  function toggleItem(idx) { onChange(items.map((item, i) => i === idx ? { ...item, done: !item.done } : item)); }

  return (
    <div className="space-y-2">
      <label className="block text-[9px] font-bold uppercase tracking-widest ml-1" style={{ color: v.label }}>{label}</label>
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${v.border}`, background: 'rgba(244,244,246,0.02)' }}>
        {items.length > 0 && (
          <ul className="max-h-40 overflow-y-auto" style={{ borderBottom: '1px solid rgba(244,244,246,0.06)' }}>
            {items.map((item, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5 group/item" style={{ borderBottom: '1px solid rgba(244,244,246,0.04)' }}>
                <button
                  type="button"
                  onClick={() => toggleItem(i)}
                  className="h-4 w-4 rounded flex-shrink-0 flex items-center justify-center transition-colors"
                  style={item.done
                    ? { background: v.bg, border: '1px solid transparent' }
                    : { background: 'transparent', border: `1px solid ${v.checkColor}` }
                  }
                >
                  {item.done && <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </button>
                <span
                  className="flex-1 text-xs font-medium leading-snug"
                  style={{
                    color: item.done ? 'rgba(244,244,246,0.3)' : '#F4F4F6',
                    textDecoration: item.done ? 'line-through' : 'none',
                  }}
                >
                  {item.text}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="opacity-0 group-hover/item:opacity-100 transition-all"
                  style={{ color: '#6B7080' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#FF3B5C'}
                  onMouseLeave={e => e.currentTarget.style.color = '#6B7080'}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-2 px-4 py-2.5">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={addItem}
            placeholder={items.length === 0 ? placeholder : '+ Add another...'}
            className="flex-1 bg-transparent text-xs font-medium focus:outline-none"
            style={{ color: '#F4F4F6', border: 'none' }}
          />
          <button
            type="button"
            onClick={addItem}
            disabled={!input.trim()}
            className="h-6 w-6 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
            style={{ background: 'rgba(244,244,246,0.07)', color: '#6B7080' }}
            onMouseEnter={e => { if (input.trim()) e.currentTarget.style.background = '#3362FF'; }}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(244,244,246,0.07)'}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
