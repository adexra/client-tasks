import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Plus,
  Play,
  CheckSquare,
  Square as UncheckedBox,
  AlertTriangle,
  Users,
  Target,
  TrendingUp,
  Pencil,
  Check,
  X,
  Flag,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import AddClientModal from '../components/AddClientModal';
import TaskModal from '../components/TaskModal';
import { useToast } from '../context/ToastContext';
import { useFinancials } from '../context/FinancialContext';
import { useLanguage } from '../context/LanguageContext';
import { useAvailability, availabilityMeta } from '../hooks/useAvailability';

const CUR_SYMBOL = { BRL: 'R$', USD: '$', EUR: '€' };

function greeting(language) {
  const h = new Date().getHours();
  if (language === 'pt') {
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function weekNumber(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

function daysAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  return diff;
}

function SectionLabel({ children }) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-[0.25em] mb-3" style={{ color: '#6B7080' }}>
      {children}
    </p>
  );
}

function CmdCard({ children, className = '', accent = false }) {
  return (
    <div
      className={cn('rounded-xl p-5 transition-all duration-200', className)}
      style={{
        backgroundColor: '#0D0F1E',
        border: accent
          ? '1px solid rgba(51,98,255,0.3)'
          : '1px solid rgba(244,244,246,0.07)'
      }}
    >
      {children}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: { label: 'Pending', color: '#F59E0B' },
    in_progress: { label: 'In Progress', color: '#3362FF' },
    done: { label: 'Done', color: '#22C55E' },
    blocked: { label: 'Blocked', color: '#FF3B5C' },
  };
  const s = map[status] || { label: status, color: '#6B7080' };
  return (
    <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
      style={{ backgroundColor: s.color + '22', color: s.color, border: `1px solid ${s.color}44` }}>
      {s.label}
    </span>
  );
}

export default function Dashboard() {
  const { displayCurrency: currency, toBRL, fromBRL } = useFinancials();
  const { language } = useLanguage();
  const toast = useToast();
  const availRule = useAvailability(todayISO());

  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [clients, setClients] = useState([]);

  // Daily plan
  const [dailyPlan, setDailyPlan] = useState(null);
  const [focusEdit, setFocusEdit] = useState(false);
  const [focusDraft, setFocusDraft] = useState('');

  // Rituals
  const [rituals, setRituals] = useState([]);
  const [ritualChecks, setRitualChecks] = useState({});

  // Deadlines (tasks due in next 3 days)
  const [deadlines, setDeadlines] = useState([]);

  // Top 3 tasks
  const [topTasks, setTopTasks] = useState([]);

  // Client pressure
  const [pressureClients, setPressureClients] = useState([]);

  // Pending payments
  const [pendingPayments, setPendingPayments] = useState([]);

  // MoveOn milestones
  const [milestones, setMilestones] = useState([]);

  // Weekly outcomes
  const [weeklyOutcomes, setWeeklyOutcomes] = useState([]);

  const [loading, setLoading] = useState(true);

  const today = todayISO();
  const dayOfWeek = new Date().getDay();
  const weekNum = weekNumber();

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const threeFromNow = new Date();
      threeFromNow.setDate(threeFromNow.getDate() + 3);
      const threeDays = threeFromNow.toISOString().split('T')[0];

      const monday = new Date();
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      const weekStart = monday.toISOString().split('T')[0];

      const [
        clientsRes,
        planRes,
        ritualsRes,
        deadlinesRes,
        milestonesRes,
        weeklyRes,
        pendingPayRes,
      ] = await Promise.allSettled([
        supabase.from('clients').select('id, name, status, last_contact_at, next_update_due_at').eq('status', 'active'),
        supabase.from('daily_plans').select('*').eq('date', today).maybeSingle(),
        supabase.from('day_rituals').select('*').eq('day_of_week', dayOfWeek).eq('is_active', true),
        supabase.from('tasks').select('*, clients(name)').eq('done', false).gte('due_date', today).lte('due_date', threeDays).order('due_date'),
        supabase.from('company_milestones').select('*, companies(name)').order('next_review_at').limit(5),
        supabase.from('weekly_plans').select('id').eq('week_start', weekStart).maybeSingle(),
        supabase.from('client_payments').select('*, clients(name)').eq('is_paid', false),
      ]);

      if (clientsRes.status === 'fulfilled' && !clientsRes.value.error) {
        const sorted = (clientsRes.value.data || []).sort((a, b) => {
          const aAge = daysAgo(a.last_contact_at) ?? 9999;
          const bAge = daysAgo(b.last_contact_at) ?? 9999;
          return bAge - aAge;
        });
        setClients(clientsRes.value.data || []);
        setPressureClients(sorted.slice(0, 3));
      }

      if (planRes.status === 'fulfilled' && !planRes.value.error) {
        setDailyPlan(planRes.value.data);
        setFocusDraft(planRes.value.data?.focus_note || '');
      }

      if (ritualsRes.status === 'fulfilled' && !ritualsRes.value.error) {
        setRituals(ritualsRes.value.data || []);
      }

      if (deadlinesRes.status === 'fulfilled' && !deadlinesRes.value.error) {
        setDeadlines(deadlinesRes.value.data || []);
      }

      if (milestonesRes.status === 'fulfilled' && !milestonesRes.value.error) {
        setMilestones(milestonesRes.value.data || []);
      }

      if (weeklyRes.status === 'fulfilled' && !weeklyRes.value.error && weeklyRes.value.data?.id) {
        const { data: outcomeData } = await supabase
          .from('weekly_outcomes')
          .select('*')
          .eq('weekly_plan_id', weeklyRes.value.data.id);
        setWeeklyOutcomes(outcomeData || []);
      }

      if (pendingPayRes.status === 'fulfilled' && !pendingPayRes.value.error) {
        setPendingPayments(pendingPayRes.value.data || []);
      }

      // Load top 3 from daily plan tasks if plan exists
      if (planRes.status === 'fulfilled' && planRes.value.data?.id) {
        const { data: taskData } = await supabase
          .from('daily_plan_tasks')
          .select('*, tasks(*, clients(name))')
          .eq('daily_plan_id', planRes.value.data.id)
          .eq('is_top_three', true)
          .limit(3);
        setTopTasks(taskData || []);
      } else {
        // Fallback: high priority tasks
        const { data: fallback } = await supabase
          .from('tasks')
          .select('*, clients(name)')
          .eq('done', false)
          .or('bucket.eq.today,priority.eq.high')
          .order('priority')
          .limit(3);
        setTopTasks((fallback || []).map(t => ({ tasks: t, id: t.id })));
      }
    } catch (e) {
      console.error('Dashboard load error', e);
    }
    setLoading(false);
  }, [today, dayOfWeek]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function startDay() {
    if (dailyPlan) return;
    const { data, error } = await supabase
      .from('daily_plans')
      .insert({ date: today, focus_note: '' })
      .select()
      .single();
    if (!error) {
      setDailyPlan(data);
      toast.success?.('Day started');
    }
  }

  async function saveFocus() {
    if (!dailyPlan) return;
    await supabase.from('daily_plans').update({ focus_note: focusDraft }).eq('id', dailyPlan.id);
    setDailyPlan(prev => ({ ...prev, focus_note: focusDraft }));
    setFocusEdit(false);
  }

  function toggleRitual(id) {
    setRitualChecks(prev => ({ ...prev, [id]: !prev[id] }));
  }

  const totalPending = pendingPayments.reduce((sum, p) => {
    return sum + fromBRL(toBRL(parseFloat(p.amount) || 0, p.currency), currency);
  }, 0);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayNamesPt = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: '#6B7080' }}>
            {language === 'pt' ? dayNamesPt[dayOfWeek] : dayNames[dayOfWeek]}
            {' · '}
            {new Date().toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            {' · '}
            {language === 'pt' ? `Semana ${weekNum}` : `Week ${weekNum}`}
          </p>
          <h1 className="text-3xl font-serif tracking-tight" style={{ color: '#F4F4F6' }}>
            {greeting(language)}, Luan.
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsTaskModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ backgroundColor: 'rgba(51,98,255,0.15)', color: '#3362FF', border: '1px solid rgba(51,98,255,0.3)' }}
          >
            <Plus className="h-4 w-4" />
            {language === 'pt' ? 'Nova Tarefa' : 'Add Task'}
          </button>
          <button
            onClick={startDay}
            disabled={!!dailyPlan}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: dailyPlan ? 'rgba(34,197,94,0.1)' : '#3362FF', color: dailyPlan ? '#22C55E' : '#F4F4F6' }}
          >
            <Play className="h-4 w-4" />
            {dailyPlan
              ? (language === 'pt' ? 'Dia iniciado' : 'Day started')
              : (language === 'pt' ? 'Iniciar dia' : 'Start Day')
            }
          </button>
        </div>
      </div>

      {/* ── AVAILABILITY BANNER ── */}
      {availRule !== undefined && availRule !== null && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            backgroundColor: availabilityMeta(availRule.availability_type).color + '12',
            border: `1px solid ${availabilityMeta(availRule.availability_type).color}33`
          }}
        >
          <Zap className="h-4 w-4 shrink-0" style={{ color: availabilityMeta(availRule.availability_type).color }} />
          <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold" style={{ color: availabilityMeta(availRule.availability_type).color }}>
              {availabilityMeta(availRule.availability_type).label[language]}
            </span>
            {availRule.label && (
              <span className="text-xs" style={{ color: '#F4F4F6' }}>{availRule.label}</span>
            )}
            {availRule.start_time && availRule.end_time && (
              <span className="text-xs" style={{ color: '#6B7080' }}>
                {availRule.start_time.slice(0, 5)} – {availRule.end_time.slice(0, 5)}
              </span>
            )}
            {availRule.company_scope !== 'all' && (
              <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ color: '#6B7080', border: '1px solid rgba(244,244,246,0.12)' }}>
                {availRule.company_scope}
              </span>
            )}
          </div>
          <Link to="/settings/availability" className="text-[9px] font-bold uppercase tracking-wider shrink-0"
            style={{ color: '#6B7080' }}>
            {language === 'pt' ? 'Editar' : 'Edit'}
          </Link>
        </div>
      )}

      {/* ── GRID: TOP ROW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Focus of the Day */}
        <CmdCard className="lg:col-span-2" accent={!!dailyPlan?.focus_note}>
          <SectionLabel>{language === 'pt' ? 'Foco do Dia' : 'Focus of the Day'}</SectionLabel>
          {focusEdit ? (
            <div className="flex items-start gap-3">
              <textarea
                autoFocus
                value={focusDraft}
                onChange={e => setFocusDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveFocus(); } if (e.key === 'Escape') setFocusEdit(false); }}
                className="flex-1 bg-transparent text-lg font-serif resize-none outline-none leading-snug"
                style={{ color: '#F4F4F6', minHeight: '60px' }}
                placeholder={language === 'pt' ? 'Qual é o objetivo principal de hoje?' : 'What is the main objective today?'}
              />
              <div className="flex flex-col gap-1 pt-1">
                <button onClick={saveFocus} className="p-1.5 rounded" style={{ color: '#22C55E' }}><Check className="h-4 w-4" /></button>
                <button onClick={() => setFocusEdit(false)} className="p-1.5 rounded" style={{ color: '#6B7080' }}><X className="h-4 w-4" /></button>
              </div>
            </div>
          ) : (
            <div
              className="group flex items-start gap-3 cursor-pointer"
              onClick={() => { setFocusEdit(true); setFocusDraft(dailyPlan?.focus_note || ''); }}
            >
              <p className={cn(
                "flex-1 text-lg font-serif leading-snug",
                dailyPlan?.focus_note ? '' : 'opacity-30'
              )} style={{ color: '#F4F4F6' }}>
                {dailyPlan?.focus_note || (language === 'pt' ? 'Nenhum foco definido — clique para editar' : 'No focus set — click to edit')}
              </p>
              <Pencil className="h-4 w-4 opacity-0 group-hover:opacity-40 transition-opacity mt-1 shrink-0" style={{ color: '#6B7080' }} />
            </div>
          )}
        </CmdCard>

        {/* Today's Ritual */}
        <CmdCard>
          <SectionLabel>{language === 'pt' ? 'Ritual de Hoje' : "Today's Ritual"}</SectionLabel>
          {rituals.length === 0 ? (
            <p className="text-sm" style={{ color: '#6B7080' }}>
              {language === 'pt' ? 'Nenhum ritual configurado.' : 'No rituals configured.'}
            </p>
          ) : (
            <div className="space-y-2.5">
              {rituals.map(r => (
                <button
                  key={r.id}
                  className="w-full flex items-center gap-3 text-left group"
                  onClick={() => toggleRitual(r.id)}
                >
                  {ritualChecks[r.id]
                    ? <CheckSquare className="h-4 w-4 shrink-0" style={{ color: '#22C55E' }} />
                    : <UncheckedBox className="h-4 w-4 shrink-0" style={{ color: '#6B7080' }} />
                  }
                  <span
                    className={cn("text-sm", ritualChecks[r.id] && 'line-through')}
                    style={{ color: ritualChecks[r.id] ? '#6B7080' : '#F4F4F6' }}
                  >
                    {r.title}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CmdCard>
      </div>

      {/* ── GRID: MIDDLE ROW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top 3 Tasks */}
        <CmdCard>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>{language === 'pt' ? 'Top 3 Tarefas' : 'Top 3 Tasks'}</SectionLabel>
            <Link to="/priority" className="text-[9px] font-bold uppercase tracking-wider transition-colors" style={{ color: '#6B7080' }}>
              {language === 'pt' ? 'Ver todas' : 'View all'}
            </Link>
          </div>
          {topTasks.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm mb-3" style={{ color: '#6B7080' }}>
                {dailyPlan
                  ? (language === 'pt' ? 'Nenhuma tarefa no plano de hoje.' : 'No tasks in today\'s plan.')
                  : (language === 'pt' ? 'Inicie o dia para definir suas top 3.' : 'Start your day to set your top 3.')
                }
              </p>
              {!dailyPlan && (
                <button onClick={startDay} className="text-xs font-medium px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: '#3362FF', color: '#F4F4F6' }}>
                  {language === 'pt' ? 'Iniciar Dia' : 'Start Day'}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {topTasks.map((pt, i) => {
                const task = pt.tasks || pt;
                return (
                  <div key={pt.id} className="flex items-start gap-3">
                    <span className="text-[10px] font-bold w-4 shrink-0 mt-0.5" style={{ color: '#3362FF' }}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#F4F4F6' }}>{task.title}</p>
                      {task.clients?.name && (
                        <p className="text-[10px] mt-0.5 truncate" style={{ color: '#6B7080' }}>{task.clients.name}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CmdCard>

        {/* Deadlines (next 3 days) */}
        <CmdCard>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>{language === 'pt' ? 'Prazos Próximos' : 'Upcoming Deadlines'}</SectionLabel>
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#6B7080' }}>3 days</span>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 py-2" style={{ color: '#6B7080' }}>
              <div className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
              <span className="text-xs">Loading...</span>
            </div>
          ) : deadlines.length === 0 ? (
            <p className="text-sm py-2" style={{ color: '#6B7080' }}>
              {language === 'pt' ? 'Sem prazos nos próximos 3 dias.' : 'No deadlines in the next 3 days.'}
            </p>
          ) : (
            <div className="space-y-2.5">
              {deadlines.map(task => {
                const due = new Date(task.due_date);
                const isToday = task.due_date === today;
                const isTomorrow = daysAgo(task.due_date) === -1;
                return (
                  <div key={task.id} className="flex items-center gap-3">
                    <AlertTriangle
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: isToday ? '#FF3B5C' : isTomorrow ? '#F59E0B' : '#6B7080' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: '#F4F4F6' }}>{task.title}</p>
                      {task.clients?.name && <p className="text-[10px]" style={{ color: '#6B7080' }}>{task.clients.name}</p>}
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider shrink-0 px-2 py-0.5 rounded"
                      style={{
                        color: isToday ? '#FF3B5C' : '#F59E0B',
                        backgroundColor: isToday ? 'rgba(255,59,92,0.1)' : 'rgba(245,158,11,0.1)'
                      }}>
                      {isToday
                        ? (language === 'pt' ? 'Hoje' : 'Today')
                        : due.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CmdCard>
      </div>

      {/* ── GRID: BOTTOM ROW ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* Client Pressure */}
        <CmdCard>
          <SectionLabel>{language === 'pt' ? 'Pressão de Clientes' : 'Client Pressure'}</SectionLabel>
          {pressureClients.length === 0 ? (
            <p className="text-sm" style={{ color: '#6B7080' }}>
              {language === 'pt' ? 'Nenhum cliente ativo.' : 'No active clients.'}
            </p>
          ) : (
            <div className="space-y-3">
              {pressureClients.map(c => {
                const age = daysAgo(c.last_contact_at);
                const overdue = c.next_update_due_at && c.next_update_due_at < today;
                return (
                  <Link key={c.id} to={`/client/${c.id}`} className="flex items-center gap-3 group">
                    <Users className="h-4 w-4 shrink-0" style={{ color: overdue ? '#FF3B5C' : '#6B7080' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:underline" style={{ color: '#F4F4F6' }}>{c.name}</p>
                      <p className="text-[10px]" style={{ color: overdue ? '#FF3B5C' : '#6B7080' }}>
                        {age === null
                          ? (language === 'pt' ? 'Sem contato registrado' : 'No contact recorded')
                          : age === 0
                            ? (language === 'pt' ? 'Contato hoje' : 'Contacted today')
                            : (language === 'pt' ? `${age}d sem contato` : `${age}d no contact`)
                        }
                        {overdue && (language === 'pt' ? ' · Update atrasado' : ' · Update overdue')}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CmdCard>

        {/* Money Tracking */}
        <CmdCard>
          <SectionLabel>{language === 'pt' ? 'Pagamentos Pendentes' : 'Pending Payments'}</SectionLabel>
          {pendingPayments.length === 0 ? (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#22C55E' }} />
              <p className="text-sm" style={{ color: '#22C55E' }}>
                {language === 'pt' ? 'Tudo em dia.' : 'All cleared.'}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl font-serif" style={{ color: '#FF3B5C' }}>
                  {CUR_SYMBOL[currency]} {totalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px]" style={{ color: '#6B7080' }}>
                  {pendingPayments.length} {language === 'pt' ? 'pendente(s)' : 'pending'}
                </span>
              </div>
              <div className="space-y-2">
                {pendingPayments.slice(0, 3).map(p => (
                  <div key={p.id} className="flex items-center justify-between">
                    <p className="text-xs truncate flex-1" style={{ color: '#F4F4F6' }}>{p.clients?.name || '—'}</p>
                    <span className="text-xs font-mono ml-2 shrink-0" style={{ color: '#FF3B5C' }}>
                      {p.currency} {parseFloat(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CmdCard>

        {/* MoveOn Milestones */}
        <CmdCard>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>MoveOn Milestones</SectionLabel>
            <Flag className="h-3.5 w-3.5" style={{ color: '#6B7080' }} />
          </div>
          {milestones.length === 0 ? (
            <p className="text-sm" style={{ color: '#6B7080' }}>
              {language === 'pt' ? 'Nenhum milestone registrado.' : 'No milestones recorded.'}
            </p>
          ) : (
            <div className="space-y-3">
              {milestones.map(m => (
                <div key={m.id} className="flex items-start gap-3">
                  <Target className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: '#3362FF' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: '#F4F4F6' }}>{m.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusBadge status={m.status} />
                      {m.next_review_at && (
                        <span className="text-[9px]" style={{ color: '#6B7080' }}>
                          {new Date(m.next_review_at).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CmdCard>
      </div>

      {/* ── WEEKLY OUTCOMES ── */}
      {weeklyOutcomes.length > 0 && (
        <CmdCard>
          <div className="flex items-center justify-between mb-4">
            <SectionLabel>{language === 'pt' ? 'Resultados da Semana' : 'Weekly Outcomes'}</SectionLabel>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" style={{ color: '#3362FF' }} />
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#6B7080' }}>
                {language === 'pt' ? `Semana ${weekNum}` : `Week ${weekNum}`}
              </span>
            </div>
          </div>
          <div className="space-y-4">
            {weeklyOutcomes.map(o => (
              <div key={o.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium" style={{ color: '#F4F4F6' }}>{o.title}</p>
                  <span className="text-[10px] font-bold font-mono" style={{ color: '#3362FF' }}>
                    {o.progress_percent ?? 0}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(244,244,246,0.07)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${o.progress_percent ?? 0}%`,
                      backgroundColor: (o.progress_percent ?? 0) >= 80 ? '#22C55E' : '#3362FF'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CmdCard>
      )}

      {/* Modals */}
      <AddClientModal isOpen={isAddClientOpen} onClose={() => setIsAddClientOpen(false)} onClientAdded={loadAll} />
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onTaskSaved={() => { loadAll(); window.dispatchEvent(new Event('task-updated')); }}
        clients={clients}
      />
    </div>
  );
}
