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
import { cn } from '../lib/utils';

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', BRL: 'R$' };

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
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
        toast.error('Record not found');
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
      toast.error('Sync error');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadClientData(); }, [id]);

  async function updateStatus(status) {
    const { error } = await supabase.from('clients').update({ status }).eq('id', id);
    if (!error) { toast.success(`Project ${status}`); loadClientData(); }
  }

  async function deleteClient() {
    if (!confirm('Permanently delete this project record?')) return;
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (!error) { toast.success('Project deleted'); navigate('/'); }
  }

  async function addPayment(e) {
    e.preventDefault();
    if (!newPayment.amount || !newPayment.description) return toast.error('Check fields');
    
    const { error } = await supabase.from('client_payments').insert([{
      client_id: id,
      amount: parseFloat(newPayment.amount),
      description: newPayment.description,
      currency: newPayment.currency || client.currency,
      is_paid: false
    }]);

    if (!error) {
      toast.success('Task/Bill added');
      setNewPayment({ amount: '', description: '', currency: 'BRL' });
      setShowPaymentForm(false);
      loadClientData();
      window.dispatchEvent(new Event('financial-updated'));
    }
  }

  async function togglePaid(paymentId, currentStatus) {
    const { error } = await supabase
      .from('client_payments')
      .update({ is_paid: !currentStatus })
      .eq('id', paymentId);
    
    if (!error) {
      toast.success(currentStatus ? 'Marked as unpaid' : 'Marked as paid');
      loadClientData();
      window.dispatchEvent(new Event('financial-updated'));
    }
  }

  async function deletePayment(paymentId) {
    if (!confirm('Eliminate this record?')) return;
    const { error } = await supabase.from('client_payments').delete().eq('id', paymentId);
    if (!error) {
      toast.success('Record removed');
      loadClientData();
      window.dispatchEvent(new Event('financial-updated'));
    }
  }

  const currentBill = payments.filter(p => !p.is_paid).reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const lifetimeBill = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);


  function getNextAction() {
    // 1. Check if client has a manual next_action set (if it's not the vague placeholder)
    const placeholders = ["Awaiting high-impact trajectory points.", "Awaiting high-impact trajectory points"];
    if (client.next_action && !placeholders.includes(client.next_action)) {
      return client.next_action;
    }

    // 2. Find the first uncompleted phase
    const currentPhase = phases.find(p => !p.completed);
    if (!currentPhase) return "All phases completed.";

    // 3. Find first uncompleted task/checkbox in that phase
    const fields = currentPhase.phase_fields || [];
    
    // Check Task Lists (Execution Roadmap / Action Items)
    for (const field of fields) {
      if (field.field_key === 'Execution Roadmap' || field.field_key === 'Action Items') {
        try {
          const items = JSON.parse(field.field_value || '[]');
          const firstPending = items.find(item => !item.done);
          if (firstPending) return firstPending.text;
        } catch (e) {}
      }
    }

    // Check Checkboxes
    const firstUnchecked = fields.find(f => f.field_type === 'checkbox' && f.field_value === 'false');
    if (firstUnchecked) return firstUnchecked.field_key;

    return `Current Phase: ${currentPhase.phase_name.charAt(0).toUpperCase() + currentPhase.phase_name.slice(1)}`;
  }

  if (loading) return (
    <div className="h-96 flex flex-col items-center justify-center gap-4 opacity-50">
      <div className="h-5 w-5 border-2 border-[var(--ink-charcoal)] border-t-transparent rounded-full animate-spin" />
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400">Loading Project...</p>
    </div>
  );

  if (!client) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-6 text-center animate-in zoom-in-95 duration-700">
       <div className="space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-neutral-400">Record Not Found.</p>
          <h1 className="text-4xl font-serif text-[var(--ink-primary)] italic">Project {id?.split('-')[0]} not found.</h1>
       </div>
       <Link to="/" className="btn-minimal btn-primary mt-4">Return to Board</Link>
    </div>
  );

  return (
    <div className="space-y-20 animate-in fade-in duration-700">
      {/* Navigation & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-10 border-b border-[var(--border-light)]">
        <Link to="/" className="group flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 hover:text-[var(--ink-primary)] transition-all">
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
          <span className="hidden sm:inline">Back to board</span>
          <span className="sm:hidden text-[8px]">Back</span>
        </Link>
        
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setIsEditModalOpen(true)} className="btn-minimal bg-white border-[var(--border-light)] text-[var(--ink-primary)] hover:bg-neutral-50 flex items-center gap-2 p-3 sm:px-4">
            <Pencil className="h-3.5 w-3.5" /> 
            <span className="text-[10px] uppercase font-bold tracking-widest hidden sm:inline">Edit Record</span>
          </button>
          <button onClick={() => updateStatus(client.status === 'active' ? 'archived' : 'active')} className="btn-minimal bg-white border-[var(--border-light)] text-[var(--ink-primary)] hover:bg-neutral-50 flex items-center gap-2 p-3 sm:px-4">
            {client.status === 'active' ? <Archive className="h-3.5 w-3.5" /> : <ArchiveRestore className="h-3.5 w-3.5" />}
            <span className="text-[10px] uppercase font-bold tracking-widest hidden sm:inline">{client.status === 'active' ? 'Archive' : 'Reactivate'}</span>
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
                   <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Active Project</span>
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-7xl font-serif text-[var(--ink-primary)] leading-[1.1] tracking-tight break-words">
                  {client.name}.
                </h1>
                <div className="flex flex-wrap gap-8 pt-2">
                   <div className="flex items-center gap-2.5">
                      <Mail className="h-3.5 w-3.5 text-neutral-300" />
                      <span className="text-sm font-medium text-neutral-500 italic">{client.email || 'No email recorded'}</span>
                   </div>
                   <div className="flex items-center gap-2.5">
                      <Globe className="h-3.5 w-3.5 text-neutral-300" />
                      <span className="text-sm font-medium text-neutral-500 italic">{client.url || 'No URL recorded'}</span>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                <div className="space-y-4">
                   <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Target className="h-3.5 w-3.5" /> Project Scope
                   </label>
                   <div className="surface-card p-6 md:p-8 min-h-[140px] flex items-center italic text-[var(--ink-secondary)] leading-relaxed">
                      {client.what_sold || "No scope defined."}
                   </div>
                </div>
                <div className="space-y-4">
                   <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5" /> Next Action
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
                 <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">Current Bill</span>
                 <div className="flex items-baseline gap-2 text-4xl font-serif text-[var(--ink-primary)]">
                    <span className="text-xs font-medium text-neutral-400 not-serif">{CURRENCY_SYMBOLS[client.currency || 'BRL']}</span>
                    {currentBill.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                 </div>
              </div>
              
              <div className="space-y-2">
                 <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">Lifetime Yield</span>
                 <div className="flex items-baseline gap-2 text-xl font-serif text-[var(--success-green)]">
                    <span className="text-[10px] font-medium text-neutral-400 not-serif">{CURRENCY_SYMBOLS[client.currency || 'BRL']}</span>
                    {lifetimeBill.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                 </div>
              </div>
           </div>

           <div className="space-y-8 pt-8 border-t border-[var(--border-light)]">
              <div className="space-y-4">
                 <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Tags</label>
                 <div className="flex flex-wrap gap-2">
                    {client.tags?.map(t => <TagBadge key={t} tag={t} />)}
                    {!client.tags?.length && <span className="text-[10px] text-neutral-300 italic">No tags associated.</span>}
                 </div>
              </div>

              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Definition of Done</label>
                    <p className="text-xs font-medium text-neutral-500 leading-relaxed italic">{client.definition_of_done || 'Not defined.'}</p>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Out of Scope</label>
                    <p className="text-xs font-medium text-neutral-500 leading-relaxed italic">{client.not_included || 'None recorded.'}</p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <div className="space-y-12 pt-20 border-t border-[var(--border-light)]">
        <div className="flex items-center justify-between">
           <div className="space-y-2">
              <h2 className="text-4xl font-serif text-[var(--ink-primary)]">Project Roadmap.</h2>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Step-by-step execution</p>
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
              <h2 className="text-4xl font-serif text-[var(--ink-primary)]">Billing Tracker.</h2>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Management of liquid cash flow</p>
            </div>
            <button 
              onClick={() => setShowPaymentForm(!showPaymentForm)}
              className="btn-minimal btn-primary flex items-center gap-2 px-6 h-10"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase font-bold tracking-widest">Add Billable Task</span>
            </button>
          </div>

          {showPaymentForm && (
            <div className="surface-card p-10 bg-neutral-50/30 animate-in slide-in-from-top-4 duration-500">
               <form onSubmit={addPayment} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Task Description</label>
                    <input 
                      type="text" 
                      required 
                      value={newPayment.description}
                      onChange={e => setNewPayment({...newPayment, description: e.target.value})}
                      className="w-full bg-white border border-neutral-100 rounded-xl px-4 py-3 text-sm"
                      placeholder="e.g. Website Update, SEO Package..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Amount ({client.currency})</label>
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
                    <span className="text-[10px] uppercase font-bold tracking-widest">Record Bill</span>
                  </button>
               </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
             {payments.map(p => (
               <div key={p.id} className="surface-card p-8 flex flex-col justify-between group">
                  <div className="space-y-4">
                     <div className="flex justify-between items-start">
                        <span className="text-[9px] font-mono text-neutral-300 uppercase">{new Date(p.created_at).toLocaleDateString()}</span>
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
                             {p.is_paid ? 'Paid' : 'Pending'}
                           </button>
                        </div>
                     </div>
                     <div>
                        <h4 className="text-base font-serif text-[var(--ink-primary)] leading-tight">{p.description}</h4>
                        <p className="text-[11px] font-medium text-neutral-400 mt-1 italic">Billable Task</p>
                     </div>
                  </div>
                  
                  <div className="pt-8 flex items-end justify-between">
                     <div className="flex items-baseline gap-1">
                        <span className="text-[10px] font-medium text-neutral-400">{CURRENCY_SYMBOLS[p.currency || 'BRL']}</span>
                        <span className="text-2xl font-serif text-[var(--ink-primary)]">{parseFloat(p.amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
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
                  No billing records found.
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
