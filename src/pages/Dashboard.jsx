import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Plus, 
  TrendingUp, 
  Target, 
  Building2, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  ChevronRight,
  Archive,
  BarChart3,
  Cpu,
  Globe,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import TagBadge from '../components/TagBadge';
import AddClientModal from '../components/AddClientModal';
import DeadlinesWidget from '../components/DeadlinesWidget';
import { useToast } from '../context/ToastContext';
import { useFinancials } from '../context/FinancialContext';

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', BRL: 'R$' };

export default function Dashboard() {
  const { payments, displayCurrency: currency, changeCurrency, toBRL, fromBRL, loading: financialsLoading } = useFinancials();
  const [clients, setClients] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const toast = useToast();

  async function loadData() {
    setLoading(true);
    const [cRes, tRes] = await Promise.all([
      supabase.from('clients').select('*').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*, clients(name)').eq('done', false).or('bucket.eq.today,priority.eq.high')
    ]);
    
    if (!cRes.error) setClients(cRes.data || []);
    if (!tRes.error) {
      // Sort: high priority first
      const sorted = (tRes.data || []).sort((a,b) => {
        const pMap = { high: 3, medium: 2, low: 1, very_low: 0 };
        return (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
      });
      setTodayTasks(sorted.slice(0, 3)); // Show top 3
    }
    setLoading(false);
  }

  useEffect(() => { 
    loadData(); 
  }, []);

  const filteredClients = clients.filter(c => showArchived ? c.status === 'archived' : c.status === 'active');
  
  const displayedTotal = useMemo(() => {
    const totalBRL = payments.reduce((sum, p) => {
      const client = clients.find(c => c.id === p.client_id);
      if (client && client.status === (showArchived ? 'archived' : 'active')) {
        return sum + toBRL(parseFloat(p.amount) || 0, p.currency);
      }
      return sum;
    }, 0);
    return fromBRL(totalBRL, currency);
  }, [payments, clients, showArchived, toBRL, fromBRL, currency]);

  return (
    <div className="space-y-20 animate-in fade-in duration-700">
      {/* Editorial Hero */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
        <div className="space-y-6">
           <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Painel de Controle</span>
              <div className="h-[1px] w-8 bg-neutral-200" />
           </div>
           <h1 className="text-3xl xs:text-4xl md:text-5xl lg:text-6xl font-serif text-[var(--ink-primary)] leading-tight tracking-tight break-words">
             Portfólio de Execução.
           </h1>
           <p className="text-neutral-500 font-medium max-w-lg text-base leading-relaxed">
             Gestão de precisão para projetos de nível premium. 
             Acompanhamento de velocidade e marcos.
           </p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-minimal btn-primary flex items-center gap-2.5 h-12 px-8"
        >
          <Plus className="h-4 w-4" /> 
          <span className="text-sm font-medium">Novo Projeto</span>
        </button>
      </div>

      {/* Primary Intelligence Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatsCard 
          label="Faturamento Total" 
          value={`${CURRENCY_SYMBOLS[currency]} ${displayedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          subtext="Portfólio Atual"
        />
        <StatsCard 
          label="Projetos Ativos" 
          value={clients.filter(c => c.status === 'active').length} 
          subtext="Carga de Execução"
        />
        <div className="md:col-span-2">
          {todayTasks.length > 0 ? (
            <div className="surface-card p-6 md:p-8 flex flex-col justify-between h-full bg-neutral-900 text-white border-none shadow-2xl">
               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                     <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Prioridades de Hoje</span>
                     <Link to="/execution" className="text-[9px] font-bold text-neutral-500 hover:text-white uppercase tracking-widest flex items-center gap-1.5 transition-colors">
                        Ver Todos <ArrowRight className="h-3 w-3" />
                     </Link>
                  </div>
                  <div className="space-y-4">
                     {todayTasks.map(task => (
                       <div key={task.id} className="flex items-start gap-3 group px-2 py-1">
                          <div className={cn(
                            "h-2 w-2 rounded-full mt-1.5 shrink-0",
                            task.priority === 'high' ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" : "bg-neutral-600"
                          )} />
                          <div>
                            <p className="text-sm font-medium tracking-tight group-hover:text-neutral-200 transition-colors">{task.title}</p>
                            <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest mt-0.5">{task.clients?.name}</p>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
          ) : (
            <DeadlinesWidget />
          )}
        </div>
      </div>

      {/* Operational Interface */}
      <div className="space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--border-light)] pb-8 gap-6">
           <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
              <h2 className="text-xl font-serif text-[var(--ink-primary)]">Quadro de registros.</h2>
              
              <div className="flex bg-[var(--accent-sand)]/40 p-1 rounded-lg">
                 {['USD', 'EUR', 'BRL'].map(c => (
                   <button
                     key={c}
                     onClick={() => changeCurrency(c)}
                     className={cn(
                       "px-5 py-1.5 rounded-md text-[10px] font-bold tracking-widest uppercase transition-all duration-200",
                       currency === c 
                         ? "bg-white text-[var(--ink-primary)] shadow-sm" 
                         : "text-neutral-400 hover:text-neutral-600"
                     )}
                   >
                     {c}
                   </button>
                 ))}
              </div>
           </div>

           <button
             onClick={() => setShowArchived(!showArchived)}
             className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 hover:text-neutral-600 uppercase tracking-widest transition-colors"
           >
             <Archive className="h-3.5 w-3.5" />
             {showArchived ? 'Projetos ativos' : 'Registros arquivados'}
           </button>
        </div>

        {loading ? (
          <div className="py-40 flex flex-col items-center justify-center gap-4 opacity-50">
            <div className="h-4 w-4 border-2 border-[var(--ink-charcoal)] border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400">Carregando Projetos...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredClients.map(client => (
              <ClientEditorialCard 
                key={client.id} 
                client={client} 
                payments={payments.filter(p => p.client_id === client.id)}
                currency={currency} 
              />
            ))}
            {!loading && filteredClients.length === 0 && (
              <div className="col-span-full py-40 border-2 border-dashed border-neutral-100 rounded-2xl flex flex-col items-center justify-center text-center">
                 <h3 className="text-xl font-serif text-neutral-300">Nenhum projeto ativo encontrado.</h3>
                 <p className="text-[10px] font-bold text-neutral-300 mt-2 uppercase tracking-[0.2em]">Inicie um novo projeto ou ajuste os filtros.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <AddClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onClientAdded={loadData} />
    </div>
  );
}

function StatsCard({ label, value, subtext }) {
  return (
    <div className="surface-card p-6 md:p-10 space-y-6">
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">{label}</p>
        <p className="text-[9px] font-medium text-neutral-300 uppercase tracking-[0.1em]">{subtext}</p>
      </div>
      <h3 className="text-xl sm:text-2xl lg:text-3xl font-serif text-ink-primary tracking-tight tabular-nums leading-tight break-words">
        {value}
      </h3>
    </div>
  );
}

function ClientEditorialCard({ client, payments, currency }) {
  const { toBRL, fromBRL } = useFinancials();
  const totalBilled = payments.reduce((sum, p) => sum + toBRL(parseFloat(p.amount) || 0, p.currency), 0);
  const displayRevenue = fromBRL(totalBilled, currency);

  return (
    <Link to={`/client/${client.id}`} className="group block">
      <div className="surface-card surface-card-hover p-6 md:p-10 h-full flex flex-col justify-between">
        <div className="space-y-8">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className={cn("h-1.5 w-1.5 rounded-full", client.status === 'active' ? "bg-[var(--success-green)]" : "bg-neutral-300")} />
              <span className={cn("text-[9px] font-bold uppercase tracking-widest", client.status === 'active' ? "text-[var(--success-green)]" : "text-neutral-400")}>
                {client.status === 'active' ? 'Ativo' : 'Arquivado'}
              </span>
            </div>
            <span className="text-[9px] font-mono text-neutral-300 uppercase">ID / {client.id.split('-')[0]}</span>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-serif text-[var(--ink-primary)] group-hover:text-black transition-colors leading-tight">
              {client.name}
            </h3>
            <div className="flex flex-col gap-1">
              {client.contact_link && (
                <a 
                  href={client.contact_link.startsWith('http') ? client.contact_link : `https://${client.contact_link}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block text-[10px] font-bold text-[var(--accent-sand)] hover:underline uppercase tracking-widest mt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  Contact Me
                </a>
              )}
              <p className="text-xs font-medium text-neutral-400 tracking-tight flex items-center gap-2">
                 {client.email || 'Nenhum contato registrado'}
              </p>
            </div>
          </div>

          {client.next_action && (
             <div className="pt-6 border-t border-neutral-50 flex items-start gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent-sand)] mt-1.5 shrink-0" />
                <p className="text-[13px] font-medium text-neutral-500 leading-snug">
                   {client.next_action}
                </p>
             </div>
          )}
        </div>

        <div className="pt-10 flex items-end justify-between">
           <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest">Faturamento</span>
                <span className={cn(
                  "text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                  payments.length === 0 ? "bg-neutral-50 text-neutral-400" :
                  payments.every(p => p.is_paid) ? "bg-emerald-50 text-emerald-600" :
                  payments.some(p => p.is_paid) ? "bg-amber-50 text-amber-600" :
                  "bg-rose-50 text-rose-600"
                )}>
                  {payments.length === 0 ? 'Sem Cobrança' : 
                   payments.every(p => p.is_paid) ? 'Pago' : 
                   payments.some(p => p.is_paid) ? 'Pago + Pendente' : 'Não Pago'}
                </span>
              </div>
              <div className="text-xl font-serif text-success-green flex items-center gap-2 whitespace-nowrap">
                <span className="text-[10px] font-medium text-neutral-400 not-serif">{CURRENCY_SYMBOLS[currency]}</span>
                {displayRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
           </div>
           
           <div className="flex flex-col items-end gap-2">
              <p className="text-[8px] text-neutral-200/50 font-medium whitespace-nowrap">Criado em {new Date(client.created_at).toLocaleDateString()}</p>
              <div className="flex flex-wrap gap-1.5 justify-end">
                 {client.tags?.slice(0, 2).map(t => (
                   <span key={t} className="px-2 py-0.5 bg-neutral-50 border border-neutral-100 text-neutral-400 rounded-md text-[8px] font-bold uppercase tracking-wider">{t}</span>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </Link>
  );
}
