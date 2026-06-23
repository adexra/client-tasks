import { useState, useEffect, useMemo } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import {
  BarChart3,
  Users,
  Settings,
  Search,
  Target,
  RefreshCcw,
  LogOut,
  CalendarClock,
  Wallet,
  Menu,
  X,
  Eye,
  EyeOff,
  Megaphone,
  Bot,
  BookOpen,
  Database,
  CalendarDays,
  ListChecks,
  Flag,
  Kanban,
  Calendar,
  MapPin,
  Trophy,
  Columns3,
  LayoutGrid,
  ExternalLink,
  Plus,
  Star,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import FocusTimer from './FocusTimer';
import TaskModal from './TaskModal';
import { useFinancials } from '../context/FinancialContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', icon: BarChart3, key: 'nav.dashboard' },
  { to: '/clients', icon: Users, key: 'nav.portfolio' },
  { to: '/priority', icon: Target, key: 'nav.execution' },
  { to: '/financials', icon: Wallet, key: 'nav.financials' },
  { to: '/ads', icon: Megaphone, label: 'Ads Planning' },
  { to: '/agents', icon: Bot, label: 'Agents' },
  { to: '/memory', icon: BookOpen, label: 'Memory' },
  { to: '/rag', icon: Database, label: 'RAG Docs' },
];

const PLANNING_NAV_ITEMS_SOON = [];

const CUR_SYMBOL = { BRL: 'R$ ', USD: '$ ', EUR: '€ ' };

export default function Layout() {
  const { signOut } = useAuth();
  const { totals, displayCurrency, changeCurrency, fromBRL, showPrivacy, togglePrivacy } = useFinancials();
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

  const cycleCurrency = () => {
    const opts = ['BRL', 'USD', 'EUR'];
    changeCurrency(opts[(opts.indexOf(displayCurrency) + 1) % opts.length]);
  };

  const fmt = (val) => showPrivacy ? '***' : val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="flex min-h-screen font-sans antialiased overflow-x-hidden" style={{ backgroundColor: '#01020E', color: '#F4F4F6' }}>
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ backgroundColor: 'rgba(13,15,30,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 w-64 flex flex-col z-50 transition-transform duration-300 ease-in-out lg:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ backgroundColor: '#0D0F1E', borderRight: '1px solid rgba(244,244,246,0.07)' }}
      >
        <div className="p-8 pt-10">
          <Link to="/" className="group block">
            <h1 className="text-2xl font-serif tracking-tighter mb-1 font-normal italic" style={{ color: '#F4F4F6' }}>Adexra.</h1>
            <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: '#6B7080' }}>
              {language === 'pt' ? 'Plataforma de Execução' : 'Execution Platform'}
            </p>
          </Link>
        </div>

        <nav className="flex-1 px-3 mt-2 space-y-5 overflow-y-auto pb-4">

          {/* ── TASKS — command center, top priority ── */}
          <section>
            <div className="mb-1 px-2">
              <div className="flex items-center justify-between px-2 py-2 rounded-xl"
                style={{ background: 'linear-gradient(135deg, rgba(51,98,255,0.18) 0%, rgba(9,161,229,0.10) 100%)', border: '1px solid rgba(51,98,255,0.25)' }}>
                <div className="flex items-center gap-2">
                  <Kanban className="h-3.5 w-3.5" style={{ color: '#3362FF' }} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: '#A0AECF' }}>Tasks</span>
                </div>
                <Link to="/tasks/new" onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-colors hover:opacity-80"
                  style={{ backgroundColor: 'rgba(51,98,255,0.3)', color: '#93AAFF', border: '1px solid rgba(51,98,255,0.4)' }}>
                  <Plus className="h-2.5 w-2.5" /> New
                </Link>
              </div>
            </div>
            <div className="space-y-0.5 pl-2">
              {[
                { to: '/tasks/hoje',     icon: Calendar,    label: 'Hoje' },
                { to: '/tasks/sprint',   icon: Flag,        label: 'Sprint' },
                { to: '/tasks/backlog',  icon: LayoutGrid,  label: 'Backlog' },
                { to: '/tasks/mapa',     icon: MapPin,      label: 'Mapa do mês' },
                { to: '/tasks/historico',icon: Trophy,      label: 'Histórico' },
                { to: '/tasks/avancado', icon: Columns3,    label: 'Avançado' },
                { to: '/results',        icon: Star,        label: 'Resultados' },
              ].map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-150",
                    isActive ? "border" : "hover:bg-[rgba(244,244,246,0.04)]"
                  )}
                  style={({ isActive }) => isActive
                    ? { backgroundColor: 'rgba(51,98,255,0.12)', color: '#F4F4F6', borderColor: 'rgba(51,98,255,0.25)' }
                    : { color: '#6B7080' }
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-3.5 w-3.5" style={isActive ? { color: '#3362FF' } : {}} />
                        <span className="text-xs font-medium tracking-tight">{label}</span>
                      </div>
                      {isActive && <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#3362FF' }} />}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </section>

          {/* ── CLIENTS & FINANCIALS ── */}
          <section>
            <p className="px-4 mb-2 text-[9px] font-bold uppercase tracking-[0.3em]" style={{ color: '#3D4257' }}>
              {language === 'pt' ? 'Clientes & Finanças' : 'Clients & Finance'}
            </p>
            <div className="space-y-0.5">
              {[
                { to: '/',           icon: BarChart3,  label: t('nav.dashboard'), end: true },
                { to: '/clients',    icon: Users,      label: t('nav.portfolio') },
                { to: '/financials', icon: Wallet,     label: t('nav.financials') },
              ].map(({ to, icon: Icon, label, end }) => (
                <NavLink key={to} to={to} end={end} onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200",
                    isActive ? "border" : "hover:bg-[rgba(244,244,246,0.04)]"
                  )}
                  style={({ isActive }) => isActive
                    ? { backgroundColor: 'rgba(51,98,255,0.15)', color: '#F4F4F6', borderColor: 'rgba(51,98,255,0.3)' }
                    : { color: '#6B7080' }
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4" style={isActive ? { color: '#3362FF' } : {}} />
                        <span className="text-xs font-medium tracking-tight">{label}</span>
                      </div>
                      {isActive && <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#3362FF' }} />}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </section>

          {/* ── ADS / AGENTS / MEMORY / RAG ── */}
          <section>
            <p className="px-4 mb-2 text-[9px] font-bold uppercase tracking-[0.3em]" style={{ color: '#3D4257' }}>
              {language === 'pt' ? 'Crescimento & IA' : 'Growth & AI'}
            </p>
            <div className="space-y-0.5">
              {[
                { to: '/ads',    icon: Megaphone, label: 'Ads Planning' },
                { to: '/agents', icon: Bot,       label: 'Agents' },
                { to: '/memory', icon: BookOpen,  label: 'Memory' },
                { to: '/rag',    icon: Database,  label: 'RAG Docs' },
              ].map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200",
                    isActive ? "border" : "hover:bg-[rgba(244,244,246,0.04)]"
                  )}
                  style={({ isActive }) => isActive
                    ? { backgroundColor: 'rgba(51,98,255,0.15)', color: '#F4F4F6', borderColor: 'rgba(51,98,255,0.3)' }
                    : { color: '#6B7080' }
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4" style={isActive ? { color: '#3362FF' } : {}} />
                        <span className="text-xs font-medium tracking-tight">{label}</span>
                      </div>
                      {isActive && <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#3362FF' }} />}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </section>

          {/* ── MOVEON + SETTINGS ── */}
          <section>
            <p className="px-4 mb-2 text-[9px] font-bold uppercase tracking-[0.3em]" style={{ color: '#3D4257' }}>
              MoveOn
            </p>
            <div className="space-y-0.5">
              <NavLink to="/moveon" onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => cn(
                  "flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200",
                  isActive ? "border" : "hover:bg-[rgba(244,244,246,0.04)]"
                )}
                style={({ isActive }) => isActive
                  ? { backgroundColor: 'rgba(51,98,255,0.15)', color: '#F4F4F6', borderColor: 'rgba(51,98,255,0.3)' }
                  : { color: '#6B7080' }
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Flag className="h-4 w-4" style={isActive ? { color: '#3362FF' } : {}} />
                      <span className="text-xs font-medium tracking-tight">Milestones</span>
                    </div>
                    {isActive && <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#3362FF' }} />}
                  </>
                )}
              </NavLink>
              <a
                href="https://admin.moveonmobilidade.com.br/admin/tarefas"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 hover:bg-[rgba(244,244,246,0.04)]"
                style={{ color: '#6B7080' }}
              >
                <div className="flex items-center gap-3">
                  <Kanban className="h-4 w-4" />
                  <span className="text-xs font-medium tracking-tight">Admin Tarefas</span>
                </div>
                <ExternalLink className="h-3 w-3 opacity-50" />
              </a>
              <NavLink to="/account" onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => cn(
                  "flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200",
                  isActive ? "border" : "hover:bg-[rgba(244,244,246,0.04)]"
                )}
                style={({ isActive }) => isActive
                  ? { backgroundColor: 'rgba(51,98,255,0.15)', color: '#F4F4F6', borderColor: 'rgba(51,98,255,0.3)' }
                  : { color: '#6B7080' }
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Settings className="h-4 w-4" style={isActive ? { color: '#3362FF' } : {}} />
                      <span className="text-xs font-medium tracking-tight">{t('nav.settings')}</span>
                    </div>
                    {isActive && <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#3362FF' }} />}
                  </>
                )}
              </NavLink>
            </div>
          </section>

        </nav>

        <div className="p-8 mt-auto" style={{ borderTop: '1px solid rgba(244,244,246,0.04)' }}>
          <p className="text-[9px] leading-relaxed font-mono" style={{ color: '#6B7080' }}>
            ROI Acceleration System
          </p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 lg:ml-64 transition-all duration-500 min-h-screen">
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-6 md:px-10 gap-x-4"
          style={{
            minHeight: '4.5rem',
            paddingTop: '0.75rem',
            paddingBottom: '0.75rem',
            backgroundColor: 'rgba(1,2,14,0.88)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(244,244,246,0.07)'
          }}
        >
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 -ml-2 rounded-md transition-colors shrink-0"
              style={{ color: '#6B7080' }}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="hidden sm:flex items-center gap-3 flex-1">
                <Search className="h-4 w-4 shrink-0" style={{ color: '#6B7080' }} />
                <input
                  type="text"
                  placeholder={language === 'pt' ? 'Pesquisar projetos...' : 'Search projects...'}
                  className="bg-transparent border-none text-sm font-medium focus:outline-none w-full max-w-xs"
                  style={{ color: '#F4F4F6' }}
                />
              </div>
              <FocusTimer onLog={(data) => {
                setSessionTask({ title: data.title, estimated_minutes: data.minutes, priority: 'medium', bucket: 'today' });
                setIsTaskModalOpen(true);
              }} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={togglePrivacy}
              className="p-2 rounded-lg transition-colors"
              style={{ color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)' }}
              title={showPrivacy ? 'Show Finances' : 'Hide Finances'}
            >
              {showPrivacy ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>

            <div
              className="flex items-center rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(244,244,246,0.07)', backgroundColor: '#0D0F1E' }}
            >
              <div
                className="hidden md:flex flex-col items-end px-4 py-2 gap-0.5 cursor-pointer group transition-colors select-none"
                style={{ borderRight: '1px solid rgba(244,244,246,0.07)' }}
                onClick={cycleCurrency}
                title="Click to change currency"
              >
                <span className="text-[9px] font-bold uppercase tracking-[0.12em] leading-none flex items-center gap-1" style={{ color: '#6B7080' }}>
                  {t('financials.total_billed')}
                  <RefreshCcw className="h-2 w-2 opacity-0 group-hover:opacity-60 transition-opacity" />
                </span>
                <span className="text-sm font-serif tabular-nums whitespace-nowrap leading-snug" style={{ color: '#22C55E' }}>
                  {CUR_SYMBOL[displayCurrency]}{fmt(displayedTotal)}
                </span>
              </div>

              <div
                className="hidden sm:flex flex-col items-end px-4 py-2 gap-0.5"
                style={{ borderRight: '1px solid rgba(244,244,246,0.07)' }}
              >
                <span className="text-[9px] font-bold uppercase tracking-[0.12em] leading-none" style={{ color: '#6B7080' }}>{t('financials.expenses')}</span>
                <span className="text-sm font-serif tabular-nums whitespace-nowrap leading-snug" style={{ color: '#FF3B5C' }}>
                  {CUR_SYMBOL[displayCurrency]}{fmt(displayedExpenses)}
                </span>
              </div>

              <div
                className="hidden lg:flex flex-col items-end px-4 py-2 gap-0.5"
                style={{ borderRight: '1px solid rgba(244,244,246,0.07)' }}
              >
                <span className="text-[9px] font-bold uppercase tracking-[0.12em] leading-none" style={{ color: '#6B7080' }}>{t('financials.net_margin')}</span>
                <span className="text-sm font-serif tabular-nums whitespace-nowrap leading-snug"
                  style={{ color: totals.marginBRL >= 0 ? '#22C55E' : '#FF3B5C' }}>
                  {CUR_SYMBOL[displayCurrency]}{fmt(fromBRL(totals.marginBRL, displayCurrency))}
                </span>
              </div>

              <div className="flex flex-col items-end px-4 py-2 gap-0.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.12em] leading-none" style={{ color: '#6B7080' }}>{t('nav.bank')}</span>
                <span className="text-sm font-serif tabular-nums whitespace-nowrap leading-snug"
                  style={{ color: totals.bankBRL >= 0 ? '#F4F4F6' : '#FF3B5C' }}>
                  {CUR_SYMBOL[displayCurrency]}{fmt(fromBRL(totals.bankBRL, displayCurrency))}
                </span>
              </div>
            </div>

            <div className="hidden sm:flex items-center pl-1">
              <button
                onClick={signOut}
                title="Sign Out"
                className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-all"
                style={{ color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)', backgroundColor: 'transparent' }}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="p-6 md:p-10 lg:p-14 max-w-[1440px] pb-32 lg:pb-16">
          <Outlet />
        </div>

        {/* Mobile Bottom Nav */}
        <div
          className="fixed bottom-0 left-0 right-0 z-40 lg:hidden px-4 py-3 pb-8 flex items-center justify-around"
          style={{ backgroundColor: '#0D0F1E', borderTop: '1px solid rgba(244,244,246,0.07)' }}
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className="flex flex-col items-center gap-1 transition-all duration-200"
              style={({ isActive }) => ({ color: isActive ? '#3362FF' : '#6B7080' })}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[9px] font-bold uppercase tracking-wider">{item.key ? t(item.key) : item.label}</span>
            </NavLink>
          ))}
          <NavLink
            to="/account"
            className="flex flex-col items-center gap-1 transition-all duration-200"
            style={({ isActive }) => ({ color: isActive ? '#3362FF' : '#6B7080' })}
          >
            <Settings className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">{t('nav.settings')}</span>
          </NavLink>
        </div>

        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => { setIsTaskModalOpen(false); setSessionTask(null); }}
          onTaskSaved={() => window.dispatchEvent(new Event('task-updated'))}
          editTask={sessionTask}
          clients={clients}
        />
      </main>
    </div>
  );
}
