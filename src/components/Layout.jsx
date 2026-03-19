import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { 
  BarChart3, 
  Users, 
  Settings, 
  Search,
  Target,
  RefreshCcw,
  Cpu,
  ChevronRight,
  CalendarClock,
  Wallet,
  TrendingDown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import FocusTimer from './FocusTimer';
import TaskModal from './TaskModal';

const NAV_ITEMS = [
  { to: '/', icon: BarChart3, label: 'Dashboard' },
  { to: '/clients', icon: Users, label: 'Portfolio' },
  { to: '/priority', icon: Target, label: 'Execution Board' },
  { to: '/financials', icon: Wallet, label: 'Financials' },
];

export default function Layout() {
  const [rawTotalBRL, setRawTotalBRL] = useState(0);
  const [rawExpensesBRL, setRawExpensesBRL] = useState(0);
  const [fxRates, setFxRates] = useState({ USD: 6.12, EUR: 6.64 });
  const [displayCurrency, setDisplayCurrency] = useState(() => localStorage.getItem('displayCurrency') || 'BRL');
  const [clients, setClients] = useState([]);
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [sessionTask, setSessionTask] = useState(null);

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, name').eq('status', 'active');
    setClients(data || []);
  };

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

  const calculateTotal = async () => {
    // 1. Fetch Income (Clients)
    const { data: clientsData } = await supabase.from('clients').select('revenue, currency').eq('status', 'active');
    if (clientsData) {
      const totalInBRL = clientsData.reduce((sum, c) => {
        let value = parseFloat(c.revenue) || 0;
        if (c.currency === 'BRL') return sum + value;
        if (c.currency === 'EUR') value = value * fxRates.EUR;
        else value = value * fxRates.USD;
        return sum + value;
      }, 0);
      setRawTotalBRL(totalInBRL);
    }

    // 2. Fetch Expenses
    const { data: expensesData } = await supabase.from('expenses').select('amount, currency');
    if (expensesData) {
      const totalExpBRL = expensesData.reduce((sum, e) => {
        let value = parseFloat(e.amount) || 0;
        if (e.currency === 'BRL') return sum + value;
        if (e.currency === 'EUR') value = value * fxRates.EUR;
        else value = value * fxRates.USD;
        return sum + value;
      }, 0);
      setRawExpensesBRL(totalExpBRL);
    }
  };

  const changeCurrency = (curr) => {
    setDisplayCurrency(curr);
    localStorage.setItem('displayCurrency', curr);
  };

  useEffect(() => {
    fetchFX().then(calculateTotal);
    fetchClients();
    
    const handleUpdate = () => {
      calculateTotal();
      fetchClients();
    };
    window.addEventListener('project-updated', handleUpdate);
    window.addEventListener('financial-updated', handleUpdate);
    
    const interval = setInterval(() => {
      fetchFX().then(calculateTotal);
    }, 60000);

    return () => {
      window.removeEventListener('project-updated', handleUpdate);
      window.removeEventListener('financial-updated', handleUpdate);
      clearInterval(interval);
    };
  }, [fxRates]); // Removed displayCurrency from deps as it's handled in render

  const displayedTotal = (() => {
    if (displayCurrency === 'USD') return rawTotalBRL / fxRates.USD;
    if (displayCurrency === 'EUR') return rawTotalBRL / fxRates.EUR;
    return rawTotalBRL;
  })();

  const displayedExpenses = (() => {
    if (displayCurrency === 'USD') return rawExpensesBRL / fxRates.USD;
    if (displayCurrency === 'EUR') return rawExpensesBRL / fxRates.EUR;
    return rawExpensesBRL;
  })();

  return (
    <div className="flex min-h-screen bg-bg-paper text-ink-primary font-sans antialiased">
      {/* Editorial Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-72 bg-ink-charcoal flex flex-col z-40 shadow-2xl">
        <div className="p-10 pt-12">
          <Link to="/" className="group block">
            <h1 className="text-3xl font-serif text-white tracking-tighter mb-1 font-normal italic">Adexra.</h1>
            <p className="text-[8px] font-bold text-neutral-300 uppercase tracking-widest">Execution Platform</p>
          </Link>
        </div>

        <nav className="flex-1 px-4 mt-8 space-y-12">
          <section>
            <p className="px-6 mb-6 text-[9px] font-bold text-neutral-600 uppercase tracking-[0.3em]">Execution</p>
            <div className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => cn(
                    "group flex items-center justify-between px-6 py-3.5 rounded-lg transition-all duration-200",
                    isActive 
                      ? "bg-white text-ink-charcoal" 
                      : "text-neutral-500 hover:text-neutral-200"
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        <span className="text-xs font-medium tracking-tight">{item.label}</span>
                      </div>
                      <ChevronRight className={cn("h-3 w-3 transition-transform opacity-0 group-hover:opacity-40", isActive && "opacity-20")} />
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </section>

          <section>
            <label className="px-6 mb-6 text-[9px] font-bold text-neutral-600 uppercase tracking-[0.3em] flex items-center gap-2">
              <CalendarClock className="h-3.5 w-3.5" /> Project Deadlines
            </label>
            <div className="space-y-1">
              <NavLink
                to="/account"
                className={({ isActive }) => cn(
                  "group flex items-center justify-between px-6 py-3.5 rounded-lg transition-all duration-200",
                  isActive 
                    ? "bg-white text-ink-charcoal shadow-sm" 
                    : "text-neutral-500 hover:text-neutral-200"
                )}
              >
                <div className="flex items-center gap-3">
                  <Settings className="h-4 w-4" />
                  <span className="text-xs font-medium tracking-tight">System Settings</span>
                </div>
                <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-40" />
              </NavLink>
            </div>
          </section>
        </nav>

        <div className="p-10 mt-auto border-t border-white/[0.03]">
           <p className="text-[10px] text-neutral-600 italic leading-relaxed">
             Advertising Data Experts in ROI Acceleration.
           </p>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 ml-72 transition-all duration-500 min-h-screen">
        <header className="sticky top-0 z-30 h-20 bg-bg-paper/80 backdrop-blur-md border-b border-border-light flex items-center justify-between px-12">
          <div className="flex items-center gap-8 flex-1">
            <div className="flex items-center gap-4">
              <Search className="h-4 w-4 text-neutral-400" />
              <input 
                type="text" 
                placeholder="Search projects..." 
                className="bg-transparent border-none text-sm font-medium text-ink-primary placeholder:text-neutral-400 focus:ring-0 w-full max-w-xs transition-all"
              />
            </div>
            <FocusTimer onLog={(data) => {
              setSessionTask({
                title: data.title,
                estimated_minutes: data.minutes,
                priority: 'medium',
                bucket: 'today'
              });
              setIsTaskModalOpen(true);
            }} />
          </div>

          <div className="flex items-center gap-10">
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1 px-1">Income</p>
                <div 
                  className="flex items-center gap-2 group cursor-pointer select-none" 
                  onClick={() => {
                    const options = ['BRL', 'USD', 'EUR'];
                    const next = options[(options.indexOf(displayCurrency) + 1) % options.length];
                    changeCurrency(next);
                  }}
                >
                  <p className="text-sm font-serif text-success-green tabular-nums whitespace-nowrap">
                    {displayCurrency === 'BRL' ? 'R$ ' : displayCurrency === 'USD' ? '$ ' : '€ '}
                    {displayedTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <RefreshCcw className="h-2.5 w-2.5 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              <div className="text-right">
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1 px-1">Expenses</p>
                <p className="text-sm font-serif text-rose-500 tabular-nums whitespace-nowrap">
                  {displayCurrency === 'BRL' ? 'R$ ' : displayCurrency === 'USD' ? '$ ' : '€ '}
                  {displayedExpenses.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
              
              <div className="h-4 w-[1px] bg-border-light" />
              
              <div className="text-right">
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1">Net Margin</p>
                <p className={cn(
                  "text-[10px] font-mono",
                  displayedTotal - displayedExpenses >= 0 ? "text-emerald-500" : "text-rose-500"
                )}>
                  {displayCurrency === 'BRL' ? 'R$ ' : displayCurrency === 'USD' ? '$ ' : '€ '}
                  {(displayedTotal - displayedExpenses).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            <div className="h-8 w-[1px] bg-border-light" />

            <div className="flex items-center gap-3 py-1">
              <div className="text-right">
                <p className="text-[10px] text-neutral-400 font-medium leading-none mb-1">Operator</p>
                <p className="text-xs font-semibold text-ink-primary tracking-tight">System Operator</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-accent-sand flex items-center justify-center border border-border-light text-ink-charcoal">
                 <Cpu className="h-4 w-4" />
              </div>
            </div>
          </div>
        </header>

        <div className="p-16 max-w-[1400px]">
          <Outlet />
        </div>

        <TaskModal 
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            setSessionTask(null);
          }}
          onTaskSaved={() => {
            window.dispatchEvent(new Event('task-updated'));
          }}
          editTask={sessionTask}
          clients={clients}
        />
      </main>
    </div>
  );
}
