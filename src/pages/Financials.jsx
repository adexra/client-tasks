import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Repeat,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  ChevronDown,
  Check,
  AlertCircle,
  Activity,
  BarChart2,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useFinancials } from '../context/FinancialContext';
import { useLanguage } from '../context/LanguageContext';

// ── Helpers ────────────────────────────────────────────────
const CURRENCY_SYMBOLS = { BRL: 'R$', USD: '$', EUR: '€' };

function CmdCard({ children, style = {}, className = '' }) {
  return (
    <div
      className={`rounded-xl p-5 ${className}`}
      style={{ backgroundColor: '#0D0F1E', border: '1px solid rgba(244,244,246,0.07)', ...style }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-[0.25em] mb-3" style={{ color: '#6B7080' }}>
      {children}
    </p>
  );
}

function DarkInput({ className = '', style = {}, ...props }) {
  return (
    <input
      className={`w-full px-3 py-2.5 rounded-lg text-sm outline-none ${className}`}
      style={{ backgroundColor: 'rgba(244,244,246,0.04)', border: '1px solid rgba(244,244,246,0.1)', color: '#F4F4F6', ...style }}
      {...props}
    />
  );
}

function DarkSelect({ children, style = {}, ...props }) {
  return (
    <div className="relative">
      <select
        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none appearance-none pr-8"
        style={{ backgroundColor: 'rgba(244,244,246,0.04)', border: '1px solid rgba(244,244,246,0.1)', color: '#F4F4F6', ...style }}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: '#6B7080' }} />
    </div>
  );
}

function Blurred({ children, hide }) {
  return (
    <span style={{ filter: hide ? 'blur(8px)' : 'none', transition: 'filter 0.2s', userSelect: hide ? 'none' : 'auto' }}>
      {children}
    </span>
  );
}

// ── Stat card ──────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon: Icon, hide }) {
  return (
    <CmdCard>
      <div className="flex items-start justify-between mb-4">
        <SectionLabel>{label}</SectionLabel>
        {Icon && <Icon className="h-4 w-4" style={{ color: color ?? '#6B7080' }} />}
      </div>
      <p className="text-3xl font-serif" style={{ color: color ?? '#F4F4F6' }}>
        <Blurred hide={hide}>{value}</Blurred>
      </p>
      {sub && <p className="text-[9px] font-bold uppercase tracking-widest mt-2" style={{ color: '#6B7080' }}>{sub}</p>}
    </CmdCard>
  );
}

// ── Monthly bar chart (pure CSS) ──────────────────────────
function MonthBar({ label, paid, pending, max }) {
  const paidPct = max > 0 ? (paid / max) * 100 : 0;
  const pendingPct = max > 0 ? (pending / max) * 100 : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-end gap-0.5 h-16">
        <div className="flex-1 flex flex-col justify-end gap-0.5">
          {pendingPct > 0 && (
            <div className="w-full rounded-t-sm" style={{ height: `${pendingPct}%`, backgroundColor: 'rgba(51,98,255,0.25)', minHeight: '2px' }} />
          )}
          {paidPct > 0 && (
            <div className="w-full rounded-t-sm" style={{ height: `${paidPct}%`, backgroundColor: '#22C55E', minHeight: '2px' }} />
          )}
        </div>
      </div>
      <p className="text-[8px] font-bold text-center uppercase tracking-wider truncate" style={{ color: '#6B7080' }}>{label}</p>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────
export default function Financials() {
  const {
    payments,
    expenses,
    displayCurrency,
    changeCurrency,
    fromBRL,
    toBRL,
    totals,
    refreshData,
    showPrivacy,
    togglePrivacy,
  } = useFinancials();

  const { t, language } = useLanguage();
  const toast = useToast();

  const [clientNames, setClientNames] = useState({});
  const [tab, setTab] = useState('overview'); // overview | payments | expenses
  const [expenseForm, setExpenseForm] = useState({ amount: '', currency: 'BRL', description: '', is_repeatable: false });

  useEffect(() => {
    supabase.from('clients').select('id, name').then(({ data }) => {
      if (data) setClientNames(Object.fromEntries(data.map(c => [c.id, c.name])));
    });
  }, []);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);

  // ── Format helper ──
  function fmt(brlAmount) {
    const sym = CURRENCY_SYMBOLS[displayCurrency] ?? 'R$';
    const val = fromBRL(brlAmount, displayCurrency);
    return `${sym} ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // ── Monthly breakdown ──
  const monthlyData = useMemo(() => {
    const map = {};
    payments.forEach(p => {
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { month: 'short' });
      if (!map[key]) map[key] = { key, label, paid: 0, pending: 0 };
      const brl = toBRL(parseFloat(p.amount) || 0, p.currency);
      if (p.is_paid) map[key].paid += brl;
      else map[key].pending += brl;
    });
    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key)).slice(-6);
  }, [payments, toBRL, language]);

  const maxMonth = useMemo(() => Math.max(...monthlyData.map(m => m.paid + m.pending), 1), [monthlyData]);

  // ── Per-client billing ──
  const clientTotals = useMemo(() => {
    const map = {};
    payments.forEach(p => {
      if (!p.client_id) return;
      if (!map[p.client_id]) map[p.client_id] = { name: clientNames[p.client_id] || p.client_id, billed: 0, paid: 0, pending: 0 };
      const brl = toBRL(parseFloat(p.amount) || 0, p.currency);
      map[p.client_id].billed += brl;
      if (p.is_paid) map[p.client_id].paid += brl;
      else map[p.client_id].pending += brl;
    });
    return Object.values(map).sort((a, b) => b.billed - a.billed);
  }, [payments, toBRL, clientNames]);

  // ── Pending payments ──
  const pendingPayments = useMemo(() =>
    payments.filter(p => !p.is_paid).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [payments]
  );

  // ── Expense actions ──
  async function addExpense(e) {
    e.preventDefault();
    if (!expenseForm.amount || !expenseForm.description) return toast.error(t('financials.check_fields'));
    setSavingExpense(true);
    const { error } = await supabase.from('expenses').insert([{
      amount: parseFloat(expenseForm.amount),
      currency: expenseForm.currency,
      description: expenseForm.description,
      is_repeatable: expenseForm.is_repeatable,
    }]);
    setSavingExpense(false);
    if (!error) {
      toast.success(t('financials.expense_added'));
      setExpenseForm({ amount: '', currency: 'BRL', description: '', is_repeatable: false });
      setShowExpenseForm(false);
      refreshData();
      window.dispatchEvent(new Event('financial-updated'));
    } else {
      toast.error(t('financials.failed_to_add'));
    }
  }

  async function deleteExpense(id) {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) {
      toast.success(t('financials.expense_removed'));
      refreshData();
      window.dispatchEvent(new Event('financial-updated'));
    }
  }

  async function togglePaid(p) {
    const update = { is_paid: !p.is_paid };
    if (!p.is_paid) {
      const brl = toBRL(parseFloat(p.amount) || 0, p.currency);
      update.paid_brl_amount = Math.round(brl * 100) / 100;
    } else {
      update.paid_brl_amount = null;
    }
    await supabase.from('client_payments').update(update).eq('id', p.id);
    refreshData();
    window.dispatchEvent(new Event('financial-updated'));
  }

  const TABS = [
    { key: 'overview', label: language === 'pt' ? 'Visão Geral' : 'Overview' },
    { key: 'payments', label: language === 'pt' ? 'Recebimentos' : 'Payments' },
    { key: 'expenses', label: language === 'pt' ? 'Despesas' : 'Expenses' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.3em] mb-2" style={{ color: '#6B7080' }}>
            {language === 'pt' ? 'Inteligência Financeira' : 'Finance Intelligence'}
          </p>
          <h1 className="text-4xl font-serif" style={{ color: '#F4F4F6' }}>
            {t('financials.title')}.
          </h1>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {/* Privacy toggle */}
          <button
            onClick={togglePrivacy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)' }}
            title={showPrivacy ? 'Show amounts' : 'Hide amounts'}
          >
            {showPrivacy ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {showPrivacy ? (language === 'pt' ? 'Mostrar' : 'Show') : (language === 'pt' ? 'Ocultar' : 'Hide')}
          </button>
          {/* Currency switcher */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(244,244,246,0.07)' }}>
            {['BRL', 'USD', 'EUR'].map(c => (
              <button
                key={c}
                onClick={() => changeCurrency(c)}
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all"
                style={displayCurrency === c
                  ? { backgroundColor: '#3362FF', color: '#F4F4F6' }
                  : { color: '#6B7080' }
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={language === 'pt' ? 'Saldo em Caixa' : 'Cash Balance'}
          value={fmt(totals.bankBRL)}
          sub={language === 'pt' ? 'Recebido − Despesas' : 'Collected − Expenses'}
          color={totals.bankBRL >= 0 ? '#22C55E' : '#FF3B5C'}
          icon={totals.bankBRL >= 0 ? TrendingUp : TrendingDown}
          hide={showPrivacy}
        />
        <StatCard
          label={language === 'pt' ? 'Total Faturado' : 'Total Billed'}
          value={fmt(totals.incomeBRL)}
          sub={language === 'pt' ? 'Todos os pagamentos' : 'All payment records'}
          color="#3362FF"
          icon={DollarSign}
          hide={showPrivacy}
        />
        <StatCard
          label={language === 'pt' ? 'Total Recebido' : 'Collected'}
          value={fmt(totals.paidBRL)}
          sub={`${payments.filter(p => p.is_paid).length} ${language === 'pt' ? 'pagamentos' : 'payments'}`}
          color="#22C55E"
          icon={Check}
          hide={showPrivacy}
        />
        <StatCard
          label={language === 'pt' ? 'Despesas' : 'Expenses'}
          value={fmt(totals.expensesBRL)}
          sub={`${expenses.length} ${language === 'pt' ? 'registros' : 'records'}`}
          color="#FF3B5C"
          icon={TrendingDown}
          hide={showPrivacy}
        />
      </div>

      {/* ── MONTHLY CHART ── */}
      {monthlyData.length > 0 && (
        <CmdCard>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4" style={{ color: '#3362FF' }} />
              <SectionLabel>{language === 'pt' ? 'Receita por Mês (últimos 6)' : 'Revenue by Month (last 6)'}</SectionLabel>
            </div>
            <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: '#22C55E' }} />
                <span style={{ color: '#6B7080' }}>{language === 'pt' ? 'Recebido' : 'Paid'}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: 'rgba(51,98,255,0.4)' }} />
                <span style={{ color: '#6B7080' }}>{language === 'pt' ? 'Pendente' : 'Pending'}</span>
              </span>
            </div>
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${monthlyData.length}, 1fr)` }}>
            {monthlyData.map(m => (
              <MonthBar key={m.key} label={m.label} paid={m.paid} pending={m.pending} max={maxMonth} />
            ))}
          </div>
        </CmdCard>
      )}

      {/* ── TABS ── */}
      <div className="flex gap-1" style={{ borderBottom: '1px solid rgba(244,244,246,0.07)' }}>
        {TABS.map(tab_ => (
          <button
            key={tab_.key}
            onClick={() => setTab(tab_.key)}
            className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-all"
            style={tab === tab_.key
              ? { color: '#F4F4F6', borderBottom: '2px solid #3362FF', marginBottom: '-1px' }
              : { color: '#6B7080' }
            }
          >
            {tab_.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Pending payments */}
          <CmdCard>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" style={{ color: '#F59E0B' }} />
                <SectionLabel>{language === 'pt' ? 'Aguardando Pagamento' : 'Awaiting Payment'}</SectionLabel>
              </div>
              {pendingPayments.length > 0 && (
                <span className="text-xs font-serif" style={{ color: '#FF3B5C' }}>
                  <Blurred hide={showPrivacy}>{fmt(pendingPayments.reduce((s, p) => s + toBRL(parseFloat(p.amount) || 0, p.currency), 0))}</Blurred>
                </span>
              )}
            </div>
            {pendingPayments.length === 0 ? (
              <p className="text-sm py-6 text-center" style={{ color: '#6B7080' }}>
                {language === 'pt' ? 'Tudo em dia.' : 'All caught up.'}
              </p>
            ) : (
              <div className="space-y-2">
                {pendingPayments.slice(0, 8).map(p => (
                  <div key={p.id} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid rgba(244,244,246,0.04)' }}>
                    <button
                      onClick={() => togglePaid(p)}
                      className="h-4 w-4 rounded border shrink-0 flex items-center justify-center transition-all"
                      style={{ borderColor: 'rgba(51,98,255,0.4)', backgroundColor: 'transparent' }}
                    />
                    <p className="flex-1 text-sm truncate" style={{ color: '#F4F4F6' }}>{p.description}</p>
                    <span className="text-xs font-serif shrink-0" style={{ color: '#F4F4F6' }}>
                      <Blurred hide={showPrivacy}>
                        {CURRENCY_SYMBOLS[p.currency] ?? 'R$'} {parseFloat(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Blurred>
                    </span>
                  </div>
                ))}
                {pendingPayments.length > 8 && (
                  <button onClick={() => setTab('payments')} className="text-[10px] font-bold uppercase tracking-wider mt-2" style={{ color: '#3362FF' }}>
                    +{pendingPayments.length - 8} {language === 'pt' ? 'mais' : 'more'} →
                  </button>
                )}
              </div>
            )}
          </CmdCard>

          {/* Per-client billing */}
          <CmdCard>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4" style={{ color: '#3362FF' }} />
              <SectionLabel>{language === 'pt' ? 'Por Cliente' : 'By Client'}</SectionLabel>
            </div>
            {clientTotals.length === 0 ? (
              <p className="text-sm py-6 text-center" style={{ color: '#6B7080' }}>{language === 'pt' ? 'Nenhum dado.' : 'No data.'}</p>
            ) : (
              <div className="space-y-3">
                {clientTotals.map((c, i) => {
                  const paidPct = c.billed > 0 ? (c.paid / c.billed) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs truncate" style={{ color: '#F4F4F6' }}>{c.name}</p>
                        <p className="text-xs font-serif shrink-0 ml-4" style={{ color: '#22C55E' }}>
                          <Blurred hide={showPrivacy}>{fmt(c.paid)}</Blurred>
                          {c.pending > 0 && (
                            <span style={{ color: '#6B7080' }}> / <Blurred hide={showPrivacy}>{fmt(c.billed)}</Blurred></span>
                          )}
                        </p>
                      </div>
                      <div className="h-1 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(244,244,246,0.07)' }}>
                        <div className="h-full rounded-full" style={{ width: `${paidPct}%`, backgroundColor: '#22C55E' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CmdCard>
        </div>
      )}

      {/* ── PAYMENTS TAB ── */}
      {tab === 'payments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em]" style={{ color: '#6B7080' }}>
              {payments.length} {language === 'pt' ? 'registros' : 'records'} · {payments.filter(p => !p.is_paid).length} {language === 'pt' ? 'pendentes' : 'pending'}
            </p>
          </div>
          <div className="space-y-2">
            {payments.length === 0 && (
              <CmdCard>
                <p className="text-sm text-center py-8" style={{ color: '#6B7080' }}>{language === 'pt' ? 'Sem pagamentos.' : 'No payments yet.'}</p>
              </CmdCard>
            )}
            {payments.map(p => (
              <CmdCard key={p.id} style={p.is_paid ? {} : { borderColor: 'rgba(255,59,92,0.2)' }}>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => togglePaid(p)}
                    className="h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all"
                    style={p.is_paid
                      ? { backgroundColor: '#22C55E', borderColor: '#22C55E' }
                      : { borderColor: 'rgba(244,244,246,0.2)' }
                    }
                  >
                    {p.is_paid && <Check className="h-3 w-3" style={{ color: '#01020E' }} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#F4F4F6' }}>{p.description}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#6B7080' }}>
                      {new Date(p.created_at).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US')}
                      {p.is_recurring && <span style={{ color: '#3362FF' }}> · {language === 'pt' ? 'Recorrente' : 'Recurring'}</span>}
                      {p.is_paid && p.paid_brl_amount && <span style={{ color: '#22C55E' }}> · {language === 'pt' ? 'Pago' : 'Paid'}</span>}
                    </p>
                  </div>
                  <p className="text-base font-serif shrink-0" style={{ color: p.is_paid ? '#22C55E' : '#FF3B5C' }}>
                    <Blurred hide={showPrivacy}>
                      {CURRENCY_SYMBOLS[p.currency] ?? 'R$'} {parseFloat(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Blurred>
                  </p>
                </div>
              </CmdCard>
            ))}
          </div>
        </div>
      )}

      {/* ── EXPENSES TAB ── */}
      {tab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em]" style={{ color: '#6B7080' }}>
              {expenses.length} {language === 'pt' ? 'registros' : 'records'}
            </p>
            <button
              onClick={() => setShowExpenseForm(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ backgroundColor: 'rgba(51,98,255,0.15)', color: '#3362FF', border: '1px solid rgba(51,98,255,0.3)' }}
            >
              <Plus className="h-3.5 w-3.5" /> {language === 'pt' ? 'Nova Despesa' : 'Add Expense'}
            </button>
          </div>

          {showExpenseForm && (
            <CmdCard>
              <SectionLabel>{language === 'pt' ? 'Nova Despesa' : 'New Expense'}</SectionLabel>
              <form onSubmit={addExpense} className="space-y-3">
                <DarkInput
                  type="text"
                  required
                  autoFocus
                  value={expenseForm.description}
                  onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
                  placeholder={t('financials.description_placeholder')}
                />
                <div className="flex gap-3">
                  <DarkInput
                    type="number"
                    required
                    value={expenseForm.amount}
                    onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    className="flex-1"
                  />
                  <DarkSelect
                    value={expenseForm.currency}
                    onChange={e => setExpenseForm(f => ({ ...f, currency: e.target.value }))}
                    style={{ width: '90px' }}
                  >
                    <option>BRL</option>
                    <option>USD</option>
                    <option>EUR</option>
                  </DarkSelect>
                </div>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={expenseForm.is_repeatable}
                      onChange={e => setExpenseForm(f => ({ ...f, is_repeatable: e.target.checked }))}
                      style={{ accentColor: '#3362FF' }}
                    />
                    <span className="text-xs flex items-center gap-1.5" style={{ color: '#F4F4F6' }}>
                      <Repeat className="h-3 w-3" style={{ color: '#6B7080' }} /> {t('financials.recurring')}
                    </span>
                  </label>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={() => setShowExpenseForm(false)}
                      className="px-3 py-1.5 rounded-lg text-xs"
                      style={{ color: '#6B7080', border: '1px solid rgba(244,244,246,0.07)' }}
                    >
                      {language === 'pt' ? 'Cancelar' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={savingExpense}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                      style={{ backgroundColor: '#3362FF', color: '#F4F4F6' }}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {savingExpense ? '...' : (language === 'pt' ? 'Salvar' : 'Save')}
                    </button>
                  </div>
                </div>
              </form>
            </CmdCard>
          )}

          <div className="space-y-2">
            {expenses.length === 0 && (
              <CmdCard>
                <p className="text-sm text-center py-8" style={{ color: '#6B7080' }}>{t('financials.no_expenses')}</p>
              </CmdCard>
            )}
            {expenses.map(exp => (
              <CmdCard key={exp.id}>
                <div className="flex items-center gap-4">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: exp.is_repeatable ? 'rgba(51,98,255,0.12)' : 'rgba(244,244,246,0.05)' }}>
                    {exp.is_repeatable
                      ? <Repeat className="h-3.5 w-3.5" style={{ color: '#3362FF' }} />
                      : <TrendingDown className="h-3.5 w-3.5" style={{ color: '#6B7080' }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#F4F4F6' }}>{exp.description}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#6B7080' }}>
                      {new Date(exp.created_at).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US')}
                      {exp.is_repeatable && <span style={{ color: '#3362FF' }}> · {t('financials.recurrent')}</span>}
                    </p>
                  </div>
                  <p className="text-base font-serif shrink-0" style={{ color: '#FF3B5C' }}>
                    <Blurred hide={showPrivacy}>
                      {CURRENCY_SYMBOLS[exp.currency] ?? 'R$'} {parseFloat(exp.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Blurred>
                  </p>
                  <button
                    onClick={() => deleteExpense(exp.id)}
                    className="p-1.5 rounded-lg transition-colors shrink-0"
                    style={{ color: '#6B7080' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#FF3B5C'}
                    onMouseLeave={e => e.currentTarget.style.color = '#6B7080'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CmdCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
