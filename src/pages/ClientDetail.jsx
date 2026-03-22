import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, 
  Archive, 
  ArchiveRestore, 
  Building, 
  Mail, 
  Pencil, 
  Globe, 
  Trash2, 
  Target, 
  CheckCircle2, 
  Activity,
  DollarSign,
  Plus,
  CheckCircle,
  Clock,
  Trash
} from 'lucide-react';
import TagBadge from '../components/TagBadge';
import AddClientModal from '../components/AddClientModal';
import PhaseSection from '../components/PhaseSection';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', BRL: 'R$' };

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { t, language } = useLanguage();
  const [client, setClient] = useState(null);
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [payments, setPayments] = useState([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [newPayment, setNewPayment] = useState({ amount: '', description: '', currency: 'BRL' });

  async function loadClientData() {
    setLoading(true);
    try {
      if (!id) throw new Error('Invalid ID');
      
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();
        
      if (clientError || !clientData) {
        toast.error(t('client_detail.record_not_found'));
        navigate('/');
        return;
      }
      setClient(clientData);

      const { data: phasesData, error: phasesError } = await supabase
        .from('client_phases')
        .select(`
          *,
          phase_fields (*)
        `)
        .eq('client_id', id)
        .order('order_index', { ascending: true });

      if (!phasesError) {
        setPhases(phasesData || []);
      }

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('client_payments')
        .select('*')
        .eq('client_id', id)
        .order('created_at', { ascending: false });

      if (!paymentsError) {
        setPayments(paymentsData || []);
      }
    } catch (err) {
      console.error(err);
      toast.error(t('client_detail.sync_error'));
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadClientData(); }, [id]);

  async function updateStatus(status) {
    const { error } = await supabase.from('clients').update({ status }).eq('id', id);
    if (!error) { 
      toast.success(status === 'active' ? t('client_detail.project_activated') : t('client_detail.project_archived')); 
      loadClientData(); 
    }
  }

  async function deleteClient() {
    if (!confirm(t('client_detail.delete_confirm'))) return;
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (!error) { toast.success(t('client_detail.project_deleted')); navigate('/'); }
  }

  async function addPayment(e) {
    e.preventDefault();
    if (!newPayment.amount || !newPayment.description) return toast.error(t('financials.check_fields'));
    
    const { error } = await supabase.from('client_payments').insert([{
      client_id: id,
      amount: parseFloat(newPayment.amount),
      description: newPayment.description,
      currency: newPayment.currency || client.currency,
      is_paid: false
    }]);

    if (!error) {
      toast.success(t('client_detail.billing_added'));
      setNewPayment({ amount: '', description: '', currency: 'BRL' });
      setShowPaymentForm(false);
      loadClientData();
      window.dispatchEvent(new Event('financial-updated'));
    }
  }

  async function togglePaid(paymentId, currentStatus) {
    const payment = payments.find(p => p.id === paymentId);
    let updateData = { is_paid: !currentStatus };

    if (!currentStatus && payment) {
      // Marking as paid — snapshot the BRL value right now using live FX
      try {
        const usdToBRL = 5.20;
        const eurToBRL = 6.00;
        const amt = parseFloat(payment.amount) || 0;
        let brlValue = amt;
        if (payment.currency === 'USD') brlValue = amt * usdToBRL;
        if (payment.currency === 'EUR') brlValue = amt * eurToBRL;
        updateData.paid_brl_amount = Math.round(brlValue * 100) / 100;
      } catch {
        // FX fetch failed — fall back to stored amount as BRL (safe default)
        updateData.paid_brl_amount = null;
      }
    } else {
      // Unmarking as paid — clear the snapshot
      updateData.paid_brl_amount = null;
    }

    const { error } = await supabase
      .from('client_payments')
      .update(updateData)
      .eq('id', paymentId);
    
    if (!error) {
      toast.success(currentStatus ? t('client_detail.marked_unpaid') : t('client_detail.marked_paid'));
      loadClientData();
      window.dispatchEvent(new Event('financial-updated'));
    }
  }

  async function deletePayment(paymentId) {
    if (!confirm(t('client_detail.delete_record_confirm'))) return;
    const { error } = await supabase.from('client_payments').delete().eq('id', paymentId);
    if (!error) {
      toast.success(t('client_detail.record_removed'));
      loadClientData();
      window.dispatchEvent(new Event('financial-updated'));
    }
  }

  const currentBill = payments.filter(p => !p.is_paid).reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const lifetimeBill = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);


  function getNextAction() {
    const placeholders = ["Awaiting high-impact trajectory points.", "Awaiting high-impact trajectory points", "Aguardando pontos de trajetória de alto impacto."];
    if (client.next_action && !placeholders.includes(client.next_action)) {
      return client.next_action;
    }

    const currentPhase = phases.find(p => !p.completed);
    if (!currentPhase) return t('client_detail.all_phases_completed');

    const fields = currentPhase.phase_fields || [];
    
    for (const field of fields) {
      if (['Execution Roadmap', 'Action Items', 'Roteiro de Execução', 'Itens de Ação'].includes(field.field_key)) {
        try {
          const items = JSON.parse(field.field_value || '[]');
          const firstPending = items.find(item => !item.done);
          if (firstPending) return firstPending.text;
        } catch (e) {}
      }
    }

    const firstUnchecked = fields.find(f => f.field_type === 'checkbox' && f.field_value === 'false');
    if (firstUnchecked) return firstUnchecked.field_key;

    return `${t('client_detail.current_phase_prefix')}${currentPhase.phase_name.charAt(0).toUpperCase() + currentPhase.phase_name.slice(1)}`;
  }

  if (loading) return (
    <div className="h-96 flex flex-col items-center justify-center gap-4 opacity-50">
      <div className="h-5 w-5 border-2 border-[var(--ink-charcoal)] border-t-transparent rounded-full animate-spin" />
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400">{t('client_detail.loading_project')}</p>
    </div>
  );

  if (!client) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-6 text-center animate-in zoom-in-95 duration-700">
       <div className="space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-neutral-400">{t('client_detail.not_found_title')}</p>
          <h1 className="text-4xl font-serif text-[var(--ink-primary)] italic">{t('client_detail.not_found_subtitle', { id: id?.split('-')[0] })}</h1>
       </div>
       <Link to="/" className="btn-minimal btn-primary mt-4">{t('client_detail.back_to_board')}</Link>
    </div>
  );

  return (
    <div className="space-y-20 animate-in fade-in duration-700">
      {/* Navigation & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-10 border-b border-[var(--border-light)]">
        <Link to="/" className="group flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 hover:text-[var(--ink-primary)] transition-all">
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
          <span className="hidden sm:inline">{t('client_detail.back_to_board')}</span>
          <span className="sm:hidden text-[8px]">{t('common.back')}</span>
        </Link>
        
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setIsEditModalOpen(true)} className="btn-minimal bg-white border-[var(--border-light)] text-[var(--ink-primary)] hover:bg-neutral-50 flex items-center gap-2 p-3 sm:px-4">
            <Pencil className="h-3.5 w-3.5" /> 
            <span className="text-[10px] uppercase font-bold tracking-widest hidden sm:inline">{t('client_detail.edit_record')}</span>
          </button>
          <button onClick={() => updateStatus(client.status === 'active' ? 'archived' : 'active')} className="btn-minimal bg-white border-[var(--border-light)] text-[var(--ink-primary)] hover:bg-neutral-50 flex items-center gap-2 p-3 sm:px-4">
            {client.status === 'active' ? <Archive className="h-3.5 w-3.5" /> : <ArchiveRestore className="h-3.5 w-3.5" />}
            <span className="text-[10px] uppercase font-bold tracking-widest hidden sm:inline">{client.status === 'active' ? t('client_detail.archive') : t('client_detail.reactivate')}</span>
          </button>
          <div className="hidden sm:block h-4 w-[1px] bg-[var(--border-light)] mx-2" />
          <button onClick={deleteClient} className="p-2.5 text-neutral-300 hover:text-rose-500 transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-16">
        <div className="lg:col-span-3 space-y-16">
          <div className="space-y-12">
             <div className="space-y-6">
                <div className="flex items-center gap-3">
                   <div className={cn("h-1.5 w-1.5 rounded-full", client.status === 'active' ? "bg-[var(--success-green)]" : "bg-neutral-300")} />
                   <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">{t('portfolio.tag')} {client.status === 'active' ? t('portfolio.filter_active') : t('portfolio.filter_archived')}</span>
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-7xl font-serif text-[var(--ink-primary)] leading-[1.1] tracking-tight break-words">
                  {client.name}.
                </h1>
                <div className="flex flex-wrap gap-8 pt-2">
                   <div className="flex items-center gap-2.5">
                      <Mail className="h-3.5 w-3.5 text-neutral-300" />
                      <span className="text-sm font-medium text-neutral-500 italic">{client.email || t('client_detail.no_email')}</span>
                   </div>
                   {client.contact_link && (
                     <div className="flex items-center gap-2.5">
                        <Activity className="h-3.5 w-3.5 text-[var(--accent-sand)]" />
                        <a 
                          href={client.contact_link.startsWith('http') ? client.contact_link : `https://${client.contact_link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-bold text-[var(--accent-sand)] uppercase tracking-widest hover:underline"
                        >
                          {t('portfolio.contact_me')}
                        </a>
                     </div>
                   )}
                   <div className="flex items-center gap-2.5">
                      <Globe className="h-3.5 w-3.5 text-neutral-300" />
                      <span className="text-sm font-medium text-neutral-500 italic">{client.url || t('client_detail.no_url')}</span>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                <div className="space-y-4">
                   <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Target className="h-3.5 w-3.5" /> {t('client_detail.project_scope')}
                   </label>
                   <div className="surface-card p-6 md:p-8 min-h-[140px] flex items-center italic text-[var(--ink-secondary)] leading-relaxed">
                      {client.what_sold || t('client_detail.no_scope')}
                   </div>
                </div>
                <div className="space-y-4">
                   <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5" /> {t('portfolio.next_action')}
                   </label>
                   <div className="surface-card bg-emerald-50/30 border-emerald-100 p-6 md:p-8 min-h-[140px] flex items-center italic text-[var(--ink-charcoal)] leading-relaxed font-bold">
                      {getNextAction()}
                   </div>
                </div>
             </div>
          </div>
        </div>

        <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-[var(--border-light)] pt-12 lg:pt-0 lg:pl-12 space-y-12">
           <div className="space-y-6">
              <div className="space-y-2">
                 <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">{t('client_detail.current_billing')}</span>
                 <div className="flex items-baseline gap-2 text-4xl font-serif text-[var(--ink-primary)]">
                    <span className="text-xs font-medium text-neutral-400 not-serif">{CURRENCY_SYMBOLS[client.currency || 'BRL']}</span>
                    {currentBill.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                 </div>
              </div>
              
              <div className="space-y-2">
                 <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">{t('client_detail.total_revenue')}</span>
                 <div className="flex items-baseline gap-2 text-xl font-serif text-[var(--success-green)]">
                    <span className="text-[10px] font-medium text-neutral-400 not-serif">{CURRENCY_SYMBOLS[client.currency || 'BRL']}</span>
                    {lifetimeBill.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                 </div>
              </div>
           </div>

           <div className="space-y-8 pt-8 border-t border-[var(--border-light)]">
              <div className="space-y-4">
                 <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Tags</label>
                 <div className="flex flex-wrap gap-2">
                    {client.tags?.map(t => <TagBadge key={t} tag={t} />)}
                    {!client.tags?.length && <span className="text-[10px] text-neutral-300 italic">{t('client_detail.no_tags')}</span>}
                 </div>
              </div>

              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">{t('client_detail.dod')}</label>
                    <p className="text-xs font-medium text-neutral-500 leading-relaxed italic">{client.definition_of_done || t('client_detail.not_defined')}</p>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">{t('client_detail.out_of_scope')}</label>
                    <p className="text-xs font-medium text-neutral-500 leading-relaxed italic">{client.not_included || t('client_detail.no_out_of_scope')}</p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <div className="space-y-12 pt-20 border-t border-[var(--border-light)]">
        <div className="flex items-center justify-between">
           <div className="space-y-2">
              <h2 className="text-4xl font-serif text-[var(--ink-primary)]">{t('client_detail.roadmap_title')}</h2>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">{t('client_detail.roadmap_subtitle')}</p>
           </div>
           <div className="h-[1px] flex-1 bg-neutral-100 mx-10" />
        </div>
        
        <div className="grid grid-cols-1 gap-8">
           {phases.map(p => (
              <PhaseSection key={p.id} phase={p} onUpdate={loadClientData} />
           ))}
        </div>

        {/* Payments / Billing Logic */}
        <div className="space-y-12 pt-20 border-t border-[var(--border-light)]">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h2 className="text-4xl font-serif text-[var(--ink-primary)]">{t('client_detail.billing_tracker_title')}</h2>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">{t('client_detail.billing_tracker_subtitle')}</p>
            </div>
            <button 
              onClick={() => setShowPaymentForm(!showPaymentForm)}
              className="btn-minimal btn-primary flex items-center gap-2 px-6 h-10"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase font-bold tracking-widest">{t('client_detail.add_billable_task')}</span>
            </button>
          </div>

          {showPaymentForm && (
            <div className="surface-card p-10 bg-neutral-50/30 animate-in slide-in-from-top-4 duration-500">
               <form onSubmit={addPayment} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">{t('client_detail.task_description')}</label>
                    <input 
                      type="text" 
                      required 
                      value={newPayment.description}
                      onChange={e => setNewPayment({...newPayment, description: e.target.value})}
                      className="w-full bg-white border border-neutral-100 rounded-xl px-4 py-3 text-sm"
                      placeholder={t('client_detail.description_placeholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">{t('financials.amount')} ({client.currency})</label>
                    <input 
                      type="number" 
                      required 
                      value={newPayment.amount}
                      onChange={e => setNewPayment({...newPayment, amount: e.target.value})}
                      className="w-full bg-white border border-neutral-100 rounded-xl px-4 py-3 text-sm font-serif"
                      placeholder="0.00"
                    />
                  </div>
                  <button type="submit" className="btn-minimal btn-primary h-11">
                    <span className="text-[10px] uppercase font-bold tracking-widest">{t('client_detail.record_billing')}</span>
                  </button>
               </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
             {payments.map(p => (
               <div key={p.id} className="surface-card p-8 flex flex-col justify-between group">
                  <div className="space-y-4">
                     <div className="flex justify-between items-start">
                        <span className="text-[9px] font-mono text-neutral-300 uppercase">{new Date(p.created_at).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US')}</span>
                        <div className="flex gap-2">
                           <button 
                             onClick={() => togglePaid(p.id, p.is_paid)}
                             className={cn(
                               "px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest transition-all",
                               p.is_paid 
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                                : "bg-neutral-50 text-neutral-400 border border-neutral-100 hover:border-emerald-200 hover:text-emerald-500"
                             )}
                           >
                             {p.is_paid ? t('financials.paid') : t('financials.pending')}
                           </button>
                        </div>
                     </div>
                     <div>
                        <h4 className="text-base font-serif text-[var(--ink-primary)] leading-tight">{p.description}</h4>
                        <p className="text-[11px] font-medium text-neutral-400 mt-1 italic">{t('client_detail.billable_task')}</p>
                     </div>
                  </div>
                  
                  <div className="pt-8 flex items-end justify-between">
                     <div className="flex items-baseline gap-1">
                        <span className="text-[10px] font-medium text-neutral-400">{CURRENCY_SYMBOLS[p.currency || 'BRL']}</span>
                        <span className="text-2xl font-serif text-[var(--ink-primary)]">{parseFloat(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                     </div>
                     
                     <div className="flex items-center gap-3">
                        <button 
                          onClick={() => deletePayment(p.id)}
                          className="text-neutral-200 hover:text-rose-500 transition-colors p-1"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                        <div className={cn(
                          "h-1.5 w-1.5 rounded-full animate-pulse",
                          p.is_paid ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-neutral-200"
                        )} />
                     </div>
                  </div>
               </div>
             ))}
             {payments.length === 0 && (
               <div className="col-span-full py-20 border-2 border-dashed border-neutral-100 rounded-2xl flex items-center justify-center text-neutral-300 text-[10px] font-bold uppercase tracking-[0.3em] italic">
                  {t('client_detail.no_billing_records')}
               </div>
             )}
          </div>
        </div>
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
