import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Activity,
  Plus, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Repeat, 
  Trash2,
  Calendar,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from '../context/ToastContext';
import { useFinancials } from '../context/FinancialContext';
import { useLanguage } from '../context/LanguageContext';

export default function Financials() {
  const { 
    expenses, 
    payments, 
    loading: financialsLoading, 
    displayCurrency, 
    toBRL, 
    fromBRL, 
    totals,
    refreshData 
  } = useFinancials();
  
  const { t, language } = useLanguage();
  const [income, setIncome] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const [formData, setFormData] = useState({
    amount: '',
    currency: 'BRL',
    description: '',
    is_repeatable: false
  });

  const loadData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('clients').select('id, name, revenue, currency').eq('status', 'active');
    if (!error) setIncome(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('project-updated', handleUpdate);
    return () => window.removeEventListener('project-updated', handleUpdate);
  }, []);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return toast.error(t('financials.check_fields'));

    const { error } = await supabase.from('expenses').insert([{
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      description: formData.description,
      is_repeatable: formData.is_repeatable
    }]);

    if (!error) {
      toast.success(t('financials.expense_added'));
      setFormData({ amount: '', currency: 'BRL', description: '', is_repeatable: false });
      refreshData(); // Refresh the context
      window.dispatchEvent(new Event('financial-updated'));
    } else {
      toast.error(t('financials.failed_to_add'));
    }
  };

  const deleteExpense = async (id) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) {
      toast.success(t('financials.expense_removed'));
      refreshData(); // Refresh the context
      window.dispatchEvent(new Event('financial-updated'));
    }
  };

  const format = (valBRL) => {
    const symbol = displayCurrency === 'BRL' ? 'R$ ' : displayCurrency === 'USD' ? '$ ' : '€ ';
    return symbol + fromBRL(valBRL, displayCurrency).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-16 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
        <div className="space-y-6">
           <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">{t('financials.intelligence_tag')}</span>
              <div className="h-[1px] w-8 bg-neutral-200" />
           </div>
           <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-[var(--ink-primary)] leading-tight tracking-tight">
             {t('financials.title')}
           </h1>
           <p className="text-neutral-500 font-medium max-w-lg text-base leading-relaxed">
             {t('financials.subtitle')}
           </p>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        <div className="surface-card p-6 md:p-10 space-y-6 border-b-2 border-b-sky-100">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t('financials.bank_balance')}</span>
            <div className="h-10 w-10 rounded-xl bg-neutral-50 flex items-center justify-center border border-neutral-100">
              <TrendingUp className="h-5 w-5 text-sky-600" />
            </div>
          </div>
          <p className={cn(
            "text-4xl font-serif tabular-nums",
            totals.bankBRL >= 0 ? "text-sky-600" : "text-rose-600"
          )}>{format(totals.bankBRL)}</p>
          <div className="h-[1px] w-full bg-neutral-50" />
          <p className="text-[10px] text-neutral-300 uppercase tracking-widest font-bold">{t('financials.cash_in_hand')}</p>
        </div>

        <div className="surface-card p-6 md:p-10 space-y-6 border-b-2 border-b-emerald-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t('financials.total_billed')}</span>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
          <p className="text-3xl md:text-4xl font-serif text-emerald-600 tabular-nums">{format(totals.incomeBRL)}</p>
          <div className="h-[1px] w-full bg-neutral-50" />
          <p className="text-[10px] text-neutral-300 uppercase tracking-widest font-bold">{t('financials.revenue')}</p>
        </div>

        <div className="surface-card p-6 md:p-10 space-y-6 border-b-2 border-b-rose-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t('financials.expenses')}</span>
            <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-rose-500" />
            </div>
          </div>
          <p className="text-3xl md:text-4xl font-serif text-rose-500 tabular-nums">{format(totals.expensesBRL)}</p>
          <div className="h-[1px] w-full bg-neutral-50" />
          <p className="text-[10px] text-neutral-300 uppercase tracking-widest font-bold">{t('financials.operational_cost')}</p>
        </div>

        <div className="surface-card p-6 md:p-10 space-y-6 border-b-2 border-b-[var(--accent-sand)]/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t('financials.net_margin')}</span>
            <div className="h-10 w-10 rounded-xl bg-neutral-50 flex items-center justify-center border border-neutral-100">
              <Activity className="h-5 w-5 text-[var(--ink-primary)]" />
            </div>
          </div>
          <p className={cn(
            "text-3xl md:text-4xl font-serif tabular-nums",
            totals.marginBRL >= 0 ? "text-[var(--ink-primary)]" : "text-rose-600"
          )}>{format(totals.marginBRL)}</p>
          <div className="h-[1px] w-full bg-neutral-50" />
          <p className="text-[10px] text-neutral-300 uppercase tracking-widest font-bold">{t('financials.net_profit')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Left: Income & Form */}
        <div className="lg:col-span-4 space-y-16">
          {/* Add Expense Form */}
          <div className="surface-card p-6 md:p-10 space-y-8 bg-neutral-50/20">
            <div className="space-y-2">
              <h3 className="text-xl font-serif text-[var(--ink-primary)]">{t('financials.add_expense')}</h3>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t('financials.new_cost')}</p>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-1">
                  <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">{t('financials.amount')}</label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-white border border-neutral-100 rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-neutral-200"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2 col-span-1">
                  <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">{t('financials.currency')}</label>
                  <select
                    value={formData.currency}
                    onChange={e => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full bg-white border border-neutral-100 rounded-xl px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-neutral-200"
                  >
                    <option value="BRL">BRL</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">{t('financials.expense_description')}</label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-white border border-neutral-100 rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-neutral-200"
                  placeholder={t('financials.description_placeholder')}
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={cn(
                  "h-5 w-5 rounded border flex items-center justify-center transition-all",
                  formData.is_repeatable ? "bg-black border-black" : "border-neutral-200 bg-white group-hover:border-neutral-300"
                )} onClick={() => setFormData({ ...formData, is_repeatable: !formData.is_repeatable })}>
                  {formData.is_repeatable && <Repeat className="h-3 w-3 text-white" />}
                </div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t('financials.recurring')}</span>
              </label>

              <button type="submit" className="w-full btn-minimal btn-primary h-14 flex items-center justify-center gap-3">
                <Plus className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-widest">{t('financials.add_expense')}</span>
              </button>
            </form>
          </div>

          {/* Income Breakdown */}
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <Briefcase className="h-4 w-4 text-neutral-300" />
              <h3 className="text-xl font-serif text-[var(--ink-primary)]">{t('financials.income_flow')}</h3>
            </div>
            <div className="space-y-4">
              {income.map(proj => (
                <div key={proj.id} className="surface-card p-6 flex items-center justify-between group transition-all hover:bg-neutral-50/50">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-[var(--ink-primary)]">{proj.name}</p>
                    <p className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest">{t('financials.active_project')}</p>
                  </div>
                  <p className="font-serif text-emerald-600">{proj.currency === 'BRL' ? 'R$ ' : proj.currency === 'USD' ? '$ ' : '€ '}{parseFloat(proj.revenue).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Expense Log */}
        <div className="lg:col-span-8 space-y-8">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <TrendingDown className="h-4 w-4 text-neutral-300" />
                <h3 className="text-xl font-serif text-[var(--ink-primary)]">{t('financials.expense_history')}</h3>
              </div>
              <p className="text-[9px] font-bold text-neutral-300 uppercase tracking-[0.2em]">{expenses.length} {t('financials.records')}</p>
           </div>

           <div className="surface-card overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-neutral-50/50 border-b border-neutral-100">
                    <th className="px-8 py-5 text-[9px] font-bold text-neutral-400 uppercase tracking-widest">{t('financials.item_purpose')}</th>
                    <th className="px-8 py-5 text-[9px] font-bold text-neutral-400 uppercase tracking-widest">{t('financials.type')}</th>
                    <th className="px-8 py-5 text-[9px] font-bold text-neutral-400 uppercase tracking-widest">{t('financials.date')}</th>
                    <th className="px-8 py-5 text-[9px] font-bold text-neutral-400 uppercase tracking-widest text-right">{t('financials.value')}</th>
                    <th className="px-8 py-5 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {expenses.map(exp => (
                    <tr key={exp.id} className="group hover:bg-neutral-50/30 transition-colors">
                      <td className="px-8 py-6">
                        <p className="text-sm font-medium text-[var(--ink-primary)]">{exp.description}</p>
                      </td>
                      <td className="px-8 py-6">
                        {exp.is_repeatable ? (
                          <span className="flex items-center gap-1.5 text-[8px] font-bold text-[var(--accent-sand)] uppercase tracking-widest">
                            <Repeat className="h-3 w-3" /> {t('financials.recurrent')}
                          </span>
                        ) : (
                          <span className="text-[8px] font-bold text-neutral-300 uppercase tracking-widest">{t('financials.one_time')}</span>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-[10px] text-neutral-400 font-medium">
                          {new Date(exp.created_at).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US')}
                        </p>
                      </td>
                      <td className="px-8 py-6 text-right font-serif text-[var(--ink-primary)]">
                        {exp.currency === 'BRL' ? 'R$ ' : exp.currency === 'USD' ? '$ ' : '€ '}
                        {parseFloat(exp.amount).toLocaleString()}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => deleteExpense(exp.id)}
                          className="text-neutral-200 hover:text-rose-500 transition-colors p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-8 py-32 text-center space-y-4">
                        <AlertCircle className="h-10 w-10 text-neutral-100 mx-auto" />
                        <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-[0.4em] italic leading-relaxed"> {t('financials.no_expenses')}</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
           </div>
        </div>
      </div>
    </div>
  );
}
