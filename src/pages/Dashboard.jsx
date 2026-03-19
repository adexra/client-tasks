import { useState, useEffect } from 'react';
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

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', BRL: 'R$' };

export default function Dashboard() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [fxRates, setFxRates] = useState({ USD: 6.12, EUR: 6.64 });
  const [showArchived, setShowArchived] = useState(false);
  const [payments, setPayments] = useState([]);
  const toast = useToast();

  async function loadClients() {
    setLoading(true);
    const [clientsRes, paymentsRes] = await Promise.all([
      supabase.from('clients').select('*').order('created_at', { ascending: false }),
      supabase.from('client_payments').select('*')
    ]);
    
    if (!clientsRes.error) setClients(clientsRes.data || []);
    if (!paymentsRes.error) setPayments(paymentsRes.data || []);
    setLoading(false);
  }

  const fetchFX = async () => {
    try {
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await res.json();
      if (data && data.rates) {
        setFxRates({
          USD: data.rates.BRL || 6.12,
          EUR: (data.rates.BRL / data.rates.EUR) || 6.64
        });
      }
    } catch (e) {
      console.warn("FX fetch failed, using fallback.");
    }
  };

  useEffect(() => { 
    loadClients(); 
    fetchFX();
  }, []);

  const filteredClients = clients.filter(c => showArchived ? c.status === 'archived' : c.status === 'active');
  
  const convertToBRL = (amount, from) => {
    if (from === 'BRL') return amount;
    if (from === 'EUR') return amount * fxRates.EUR;
    return amount * fxRates.USD;
  };

  const convertFromBRL = (amountBRL, to) => {
    if (to === 'BRL') return amountBRL;
    if (to === 'EUR') return amountBRL / fxRates.EUR;
    return amountBRL / fxRates.USD;
  };

  const totalBalance = payments.reduce((sum, p) => {
    const client = clients.find(c => c.id === p.client_id);
    if (client && client.status === (showArchived ? 'archived' : 'active')) {
      return sum + convertToBRL(parseFloat(p.amount) || 0, p.currency);
    }
    return sum;
  }, 0);

  const displayedTotal = convertFromBRL(totalBalance, currency);

  return (
    <div className="space-y-20 animate-in fade-in duration-700">
      {/* Editorial Hero */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
        <div className="space-y-6">
           <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Project Board</span>
              <div className="h-[1px] w-8 bg-neutral-200" />
           </div>
           <h1 className="text-6xl font-serif text-[var(--ink-primary)] leading-tight tracking-tight">
             Execution Portfolio.
           </h1>
           <p className="text-neutral-500 font-medium max-w-lg text-base leading-relaxed">
             Precision management for high-end projects. 
             Tracking execution velocity and project milestones.
           </p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-minimal btn-primary flex items-center gap-2.5 h-12 px-8"
        >
          <Plus className="h-4 w-4" /> 
          <span className="text-sm font-medium">New Project</span>
        </button>
      </div>

      {/* Primary Intelligence Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatsCard 
          label="Total Revenue" 
          value={`${CURRENCY_SYMBOLS[currency]} ${displayedTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} 
          subtext="Current Portfolio"
        />
        <StatsCard 
          label="Active Projects" 
          value={clients.filter(c => c.status === 'active').length} 
          subtext="Execution Load"
        />
        <div className="md:col-span-2">
          <DeadlinesWidget />
        </div>
      </div>

      {/* Operational Interface */}
      <div className="space-y-12">
        <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-8">
           <div className="flex items-center gap-10">
              <h2 className="text-xl font-serif text-[var(--ink-primary)]">Registry board.</h2>
              
              <div className="flex bg-[var(--accent-sand)]/40 p-1 rounded-lg">
                 {['USD', 'EUR', 'BRL'].map(c => (
                   <button
                     key={c}
                     onClick={() => setCurrency(c)}
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
             {showArchived ? 'Active projects' : 'Archived records'}
           </button>
        </div>

        {loading ? (
          <div className="py-40 flex flex-col items-center justify-center gap-4 opacity-50">
            <div className="h-4 w-4 border-2 border-[var(--ink-charcoal)] border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400">Loading Projects...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredClients.map(client => (
              <ClientEditorialCard 
                key={client.id} 
                client={client} 
                payments={payments.filter(p => p.client_id === client.id)}
                currency={currency} 
                convertToBRL={convertToBRL}
                convertFromBRL={convertFromBRL}
              />
            ))}
            {!loading && filteredClients.length === 0 && (
              <div className="col-span-full py-40 border-2 border-dashed border-neutral-100 rounded-2xl flex flex-col items-center justify-center text-center">
                 <h3 className="text-xl font-serif text-neutral-300">No active projects found.</h3>
                 <p className="text-[10px] font-bold text-neutral-300 mt-2 uppercase tracking-[0.2em]">Start a new project or adjust filters.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <AddClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onClientAdded={loadClients} />
    </div>
  );
}

function StatsCard({ label, value, subtext }) {
  return (
    <div className="surface-card p-10 space-y-6">
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">{label}</p>
        <p className="text-[9px] font-medium text-neutral-300 uppercase tracking-[0.1em]">{subtext}</p>
      </div>
      <h3 className="text-5xl font-serif text-ink-primary tracking-tight tabular-nums leading-none whitespace-nowrap">
        {value}
      </h3>
    </div>
  );
}

function ClientEditorialCard({ client, payments, currency, convertToBRL, convertFromBRL }) {
  const totalBilled = payments.reduce((sum, p) => sum + convertToBRL(parseFloat(p.amount) || 0, p.currency), 0);
  const displayRevenue = convertFromBRL(totalBilled, currency);

  return (
    <Link to={`/client/${client.id}`} className="group block">
      <div className="surface-card surface-card-hover p-10 h-full flex flex-col justify-between">
        <div className="space-y-8">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className={cn("h-1.5 w-1.5 rounded-full", client.status === 'active' ? "bg-[var(--success-green)]" : "bg-neutral-300")} />
              <span className={cn("text-[9px] font-bold uppercase tracking-widest", client.status === 'active' ? "text-[var(--success-green)]" : "text-neutral-400")}>
                {client.status === 'active' ? 'Active' : 'Archived'}
              </span>
            </div>
            <span className="text-[9px] font-mono text-neutral-300 uppercase">ID / {client.id.split('-')[0]}</span>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-serif text-[var(--ink-primary)] group-hover:text-black transition-colors leading-tight">
              {client.name}
            </h3>
            <p className="text-xs font-medium text-neutral-400 tracking-tight flex items-center gap-2">
               {client.email || 'No contact recorded'}
            </p>
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
              <span className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest">Revenue</span>
              <div className="text-xl font-serif text-success-green flex items-center gap-2 whitespace-nowrap">
                <span className="text-[10px] font-medium text-neutral-400 not-serif">{CURRENCY_SYMBOLS[currency]}</span>
                {displayRevenue?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
           </div>
           
           <div className="flex flex-wrap gap-1.5 justify-end">
              {client.tags?.slice(0, 2).map(t => (
                <span key={t} className="px-2 py-0.5 bg-neutral-50 border border-neutral-100 text-neutral-400 rounded-md text-[8px] font-bold uppercase tracking-wider">{t}</span>
              ))}
           </div>
        </div>
      </div>
    </Link>
  );
}
