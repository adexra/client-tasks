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
        toast.error('Registro não encontrado');
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
      toast.error('Erro de sincronização');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadClientData(); }, [id]);

  async function updateStatus(status) {
    const { error } = await supabase.from('clients').update({ status }).eq('id', id);
    if (!error) { toast.success(`Projeto ${status === 'active' ? 'Ativado' : 'Arquivado'}`); loadClientData(); }
  }

  async function deleteClient() {
    if (!confirm('Excluir permanentemente este registro de projeto?')) return;
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (!error) { toast.success('Projeto excluído'); navigate('/'); }
  }

  async function addPayment(e) {
    e.preventDefault();
    if (!newPayment.amount || !newPayment.description) return toast.error('Verifique os campos');
    
    const { error } = await supabase.from('client_payments').insert([{
      client_id: id,
      amount: parseFloat(newPayment.amount),
      description: newPayment.description,
      currency: newPayment.currency || client.currency,
      is_paid: false
    }]);

    if (!error) {
      toast.success('Tarefa/Cobrança adicionada');
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
      toast.success(currentStatus ? 'Marcado como não pago' : 'Marcado como pago');
      loadClientData();
      window.dispatchEvent(new Event('financial-updated'));
    }
  }

  async function deletePayment(paymentId) {
    if (!confirm('Eliminar este registro?')) return;
    const { error } = await supabase.from('client_payments').delete().eq('id', paymentId);
    if (!error) {
      toast.success('Registro removido');
      loadClientData();
      window.dispatchEvent(new Event('financial-updated'));
    }
  }

  const currentBill = payments.filter(p => !p.is_paid).reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const lifetimeBill = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);


  function getNextAction() {
    // 1. Check if client has a manual next_action set (if it's not the vague placeholder)
    const placeholders = ["Awaiting high-impact trajectory points.", "Awaiting high-impact trajectory points", "Aguardando pontos de trajetória de alto impacto."];
    if (client.next_action && !placeholders.includes(client.next_action)) {
      return client.next_action;
    }

    // 2. Find the first uncompleted phase
    const currentPhase = phases.find(p => !p.completed);
    if (!currentPhase) return "Todas as fases concluídas.";

    // 3. Find first uncompleted task/checkbox in that phase
    const fields = currentPhase.phase_fields || [];
    
    // Check Task Lists (Execution Roadmap / Action Items)
    for (const field of fields) {
      if (field.field_key === 'Execution Roadmap' || field.field_key === 'Action Items' || field.field_key === 'Roteiro de Execução' || field.field_key === 'Itens de Ação') {
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

    return `Fase Atual: ${currentPhase.phase_name.charAt(0).toUpperCase() + currentPhase.phase_name.slice(1)}`;
  }

  if (loading) return (
    <div className="h-96 flex flex-col items-center justify-center gap-4 opacity-50">
      <div className="h-5 w-5 border-2 border-[var(--ink-charcoal)] border-t-transparent rounded-full animate-spin" />
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400">Carregando Projeto...</p>
    </div>
  );

  if (!client) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-6 text-center animate-in zoom-in-95 duration-700">
       <div className="space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-neutral-400">Registro Não Encontrado.</p>
          <h1 className="text-4xl font-serif text-[var(--ink-primary)] italic">Projeto {id?.split('-')[0]} não encontrado.</h1>
       </div>
       <Link to="/" className="btn-minimal btn-primary mt-4">Voltar ao Quadro</Link>
    </div>
  );

  return (
    <div className="space-y-20 animate-in fade-in duration-700">
      {/* Navigation & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-10 border-b border-[var(--border-light)]">
        <Link to="/" className="group flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 hover:text-[var(--ink-primary)] transition-all">
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
          <span className="hidden sm:inline">Voltar ao quadro</span>
          <span className="sm:hidden text-[8px]">Voltar</span>
        </Link>
        
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setIsEditModalOpen(true)} className="btn-minimal bg-white border-[var(--border-light)] text-[var(--ink-primary)] hover:bg-neutral-50 flex items-center gap-2 p-3 sm:px-4">
            <Pencil className="h-3.5 w-3.5" /> 
            <span className="text-[10px] uppercase font-bold tracking-widest hidden sm:inline">Editar Registro</span>
          </button>
          <button onClick={() => updateStatus(client.status === 'active' ? 'archived' : 'active')} className="btn-minimal bg-white border-[var(--border-light)] text-[var(--ink-primary)] hover:bg-neutral-50 flex items-center gap-2 p-3 sm:px-4">
            {client.status === 'active' ? <Archive className="h-3.5 w-3.5" /> : <ArchiveRestore className="h-3.5 w-3.5" />}
            <span className="text-[10px] uppercase font-bold tracking-widest hidden sm:inline">{client.status === 'active' ? 'Arquivar' : 'Reativar'}</span>
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
                   <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Projeto {client.status === 'active' ? 'Ativo' : 'Arquivado'}</span>
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-7xl font-serif text-[var(--ink-primary)] leading-[1.1] tracking-tight break-words">
                  {client.name}.
                </h1>
                <div className="flex flex-wrap gap-8 pt-2">
                   <div className="flex items-center gap-2.5">
                      <Mail className="h-3.5 w-3.5 text-neutral-300" />
                      <span className="text-sm font-medium text-neutral-500 italic">{client.email || 'Nenhum e-mail registrado'}</span>
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
                          Contact Me
                        </a>
                     </div>
                   )}
                   <div className="flex items-center gap-2.5">
                      <Globe className="h-3.5 w-3.5 text-neutral-300" />
                      <span className="text-sm font-medium text-neutral-500 italic">{client.url || 'Nenhuma URL registrada'}</span>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                <div className="space-y-4">
                   <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Target className="h-3.5 w-3.5" /> Escopo do Projeto
                   </label>
                   <div className="surface-card p-6 md:p-8 min-h-[140px] flex items-center italic text-[var(--ink-secondary)] leading-relaxed">
                      {client.what_sold || "Nenhum escopo definido."}
                   </div>
                </div>
                <div className="space-y-4">
                   <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5" /> Próxima Ação
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
                 <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">Cobrança Atual</span>
                 <div className="flex items-baseline gap-2 text-4xl font-serif text-[var(--ink-primary)]">
                    <span className="text-xs font-medium text-neutral-400 not-serif">{CURRENCY_SYMBOLS[client.currency || 'BRL']}</span>
                    {currentBill.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                 </div>
              </div>
              
              <div className="space-y-2">
                 <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">Rendimento Total</span>
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
                    {!client.tags?.length && <span className="text-[10px] text-neutral-300 italic">Nenhuma tag associada.</span>}
                 </div>
              </div>

              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Definição de Conclusão</label>
                    <p className="text-xs font-medium text-neutral-500 leading-relaxed italic">{client.definition_of_done || 'Não definido.'}</p>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Fora do Escopo</label>
                    <p className="text-xs font-medium text-neutral-500 leading-relaxed italic">{client.not_included || 'Nenhum registro.'}</p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <div className="space-y-12 pt-20 border-t border-[var(--border-light)]">
        <div className="flex items-center justify-between">
           <div className="space-y-2">
              <h2 className="text-4xl font-serif text-[var(--ink-primary)]">Roteiro do Projeto.</h2>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Execução passo a passo</p>
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
              <h2 className="text-4xl font-serif text-[var(--ink-primary)]">Rastreador de Cobrança.</h2>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Gestão do fluxo de caixa líquido</p>
            </div>
            <button 
              onClick={() => setShowPaymentForm(!showPaymentForm)}
              className="btn-minimal btn-primary flex items-center gap-2 px-6 h-10"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase font-bold tracking-widest">Adicionar Tarefa Cobrável</span>
            </button>
          </div>

          {showPaymentForm && (
            <div className="surface-card p-10 bg-neutral-50/30 animate-in slide-in-from-top-4 duration-500">
               <form onSubmit={addPayment} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Descrição da Tarefa</label>
                    <input 
                      type="text" 
                      required 
                      value={newPayment.description}
                      onChange={e => setNewPayment({...newPayment, description: e.target.value})}
                      className="w-full bg-white border border-neutral-100 rounded-xl px-4 py-3 text-sm"
                      placeholder="ex: Atualização de Website, Pacote de SEO..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Valor ({client.currency})</label>
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
                    <span className="text-[10px] uppercase font-bold tracking-widest">Gravar Cobrança</span>
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
                             {p.is_paid ? 'Pago' : 'Pendente'}
                           </button>
                        </div>
                     </div>
                     <div>
                        <h4 className="text-base font-serif text-[var(--ink-primary)] leading-tight">{p.description}</h4>
                        <p className="text-[11px] font-medium text-neutral-400 mt-1 italic">Tarefa Cobrável</p>
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
                  Nenhum registro de cobrança encontrado.
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
