import { useState, useEffect, useRef, useMemo } from 'react';
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
  TrendingDown,
  Menu,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import FocusTimer from './FocusTimer';
import TaskModal from './TaskModal';
import { useFinancials } from '../context/FinancialContext';
import { useLanguage } from '../context/LanguageContext';

const NAV_ITEMS = [
  { to: '/', icon: BarChart3, key: 'nav.dashboard' },
  { to: '/clients', icon: Users, key: 'nav.portfolio' },
  { to: '/priority', icon: Target, key: 'nav.execution' },
  { to: '/financials', icon: Wallet, key: 'nav.financials' },
];

export default function Layout() {
  const { totals, displayCurrency, changeCurrency, fromBRL } = useFinancials();
  const { t, language } = useLanguage();
  const [clients, setClients] = useState([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [sessionTask, setSessionTask] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, name').eq('status', 'active');
    setClients(data || []);
  };

  useEffect(() => {
    fetchClients();
    const handleUpdate = () => fetchClients();
    window.addEventListener('project-updated', handleUpdate);
    return () => window.removeEventListener('project-updated', handleUpdate);
  }, []);

  const displayedTotal = useMemo(() => fromBRL(totals.incomeBRL, displayCurrency), [totals.incomeBRL, displayCurrency, fromBRL]);
  const displayedExpenses = useMemo(() => fromBRL(totals.expensesBRL, displayCurrency), [totals.expensesBRL, displayCurrency, fromBRL]);

  return (
    <div className="flex min-h-screen bg-bg-paper text-ink-primary font-sans antialiased overflow-x-hidden">
      {/* Editorial Sidebar Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-ink-charcoal/40 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Editorial Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 bg-ink-charcoal flex flex-col z-50 shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-10 pt-12">
          <Link to="/" className="group block">
            <h1 className="text-3xl font-serif text-white tracking-tighter mb-1 font-normal italic">Adexra.</h1>
            <p className="text-[8px] font-bold text-neutral-300 uppercase tracking-widest">{language === 'pt' ? 'Plataforma de Execução' : 'Execution Platform'}</p>
          </Link>
        </div>

        <nav className="flex-1 px-4 mt-8 space-y-12">
          <section>
            <p className="px-6 mb-6 text-[9px] font-bold text-neutral-600 uppercase tracking-[0.3em]">{language === 'pt' ? 'Gestão' : 'Management'}</p>
            <div className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
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
                        <span className="text-xs font-medium tracking-tight">{t(item.key)}</span>
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
              <CalendarClock className="h-3.5 w-3.5" /> {language === 'pt' ? 'Prazos e Metas' : 'Deadlines & Goals'}
            </label>
            <div className="space-y-1">
              <NavLink
                to="/account"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => cn(
                  "group flex items-center justify-between px-6 py-3.5 rounded-lg transition-all duration-200",
                  isActive 
                    ? "bg-white text-ink-charcoal shadow-sm" 
                    : "text-neutral-500 hover:text-neutral-200"
                )}
              >
                <div className="flex items-center gap-3">
                  <Settings className="h-4 w-4" />
                  <span className="text-xs font-medium tracking-tight">{t('nav.settings')}</span>
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
      <main className="flex-1 lg:ml-72 transition-all duration-500 min-h-screen">
        <header className="sticky top-0 z-30 min-h-[5rem] py-4 bg-bg-paper/80 backdrop-blur-md border-b border-border-light flex items-center justify-between px-6 md:px-12 gap-x-4">
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 -ml-2 text-ink-charcoal hover:bg-neutral-100 rounded-md transition-colors shrink-0"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <div className="flex items-center gap-2 sm:gap-4 md:gap-8 flex-1 min-w-0">
              <div className="hidden sm:flex items-center gap-4 flex-1">
                <Search className="h-4 w-4 text-neutral-400 shrink-0" />
                <input 
                  type="text" 
                  placeholder={language === 'pt' ? 'Pesquisar projetos...' : 'Search projects...'}
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
          </div>

          <div className="flex items-center gap-3">
            {/* Financial Stats Pill Group */}
            <div className="flex items-center divide-x divide-border-light border border-border-light rounded-xl overflow-hidden bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              {/* Income — md+ */}
              <div
                className="hidden md:flex flex-col items-end px-4 py-2 gap-0.5 cursor-pointer group hover:bg-neutral-50 transition-colors select-none"
                onClick={() => {
                  const options = ['BRL', 'USD', 'EUR'];
                  const next = options[(options.indexOf(displayCurrency) + 1) % options.length];
                  changeCurrency(next);
                }}
                title="Click to change currency"
              >
                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-[0.12em] leading-none flex items-center gap-1">
                  {t('financials.total_billed')}
                  <RefreshCcw className="h-2 w-2 opacity-0 group-hover:opacity-60 transition-opacity" />
                </span>
                <span className="text-sm font-serif text-emerald-600 tabular-nums whitespace-nowrap leading-snug">
                  {displayCurrency === 'BRL' ? 'R$\u00A0' : displayCurrency === 'USD' ? '$\u00A0' : '€\u00A0'}
                  {displayedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Expenses — sm+ */}
              <div className="hidden sm:flex flex-col items-end px-4 py-2 gap-0.5">
                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-[0.12em] leading-none">{t('financials.expenses')}</span>
                <span className="text-sm font-serif text-rose-500 tabular-nums whitespace-nowrap leading-snug">
                  {displayCurrency === 'BRL' ? 'R$\u00A0' : displayCurrency === 'USD' ? '$\u00A0' : '€\u00A0'}
                  {displayedExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Net Margin — lg+ */}
              <div className="hidden lg:flex flex-col items-end px-4 py-2 gap-0.5">
                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-[0.12em] leading-none">{t('financials.net_margin')}</span>
                <span className={cn(
                  "text-sm font-serif tabular-nums whitespace-nowrap leading-snug",
                  totals.marginBRL >= 0 ? "text-emerald-500" : "text-rose-500"
                )}>
                  {displayCurrency === 'BRL' ? 'R$\u00A0' : displayCurrency === 'USD' ? '$\u00A0' : '€\u00A0'}
                  {fromBRL(totals.marginBRL, displayCurrency).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Bank — always visible */}
              <div className="flex flex-col items-end px-4 py-2 gap-0.5">
                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-[0.12em] leading-none">{t('nav.bank')}</span>
                <span className={cn(
                  "text-sm font-serif tabular-nums whitespace-nowrap leading-snug",
                  totals.bankBRL >= 0 ? "text-ink-primary" : "text-rose-600"
                )}>
                  {displayCurrency === 'BRL' ? 'R$\u00A0' : displayCurrency === 'USD' ? '$\u00A0' : '€\u00A0'}
                  {fromBRL(totals.bankBRL, displayCurrency).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Operator Avatar — sm+ */}
            <div className="hidden sm:flex items-center gap-2.5 pl-1">
              <div className="h-9 w-9 rounded-lg bg-accent-sand flex items-center justify-center border border-border-light text-ink-charcoal shrink-0">
                <Cpu className="h-4 w-4" />
              </div>
            </div>
          </div>
        </header>

        <div className="p-6 md:p-12 lg:p-16 max-w-[1400px] pb-32 lg:pb-16">
          <Outlet />
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border-light z-40 lg:hidden px-4 py-3 pb-8 flex items-center justify-around translate-y-0 transition-transform shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                "flex flex-col items-center gap-1 transition-all duration-200",
                isActive ? "text-ink-charcoal" : "text-neutral-400"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[9px] font-bold uppercase tracking-wider">{t(item.key)}</span>
            </NavLink>
          ))}
          <NavLink
            to="/account"
            className={({ isActive }) => cn(
              "flex flex-col items-center gap-1 transition-all duration-200",
              isActive ? "text-ink-charcoal" : "text-neutral-400"
            )}
          >
            <Settings className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">{t('nav.settings')}</span>
          </NavLink>
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
