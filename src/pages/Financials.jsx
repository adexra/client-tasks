import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
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

export default function Financials() {
  const [income, setIncome] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fxRates, setFxRates] = useState({ USD: 6.12, EUR: 6.64 });
  const [displayCurrency, setDisplayCurrency] = useState(() => localStorage.getItem('displayCurrency') || 'BRL');
  const toast = useToast();

  const [formData, setFormData] = useState({
    amount: '',
    currency: 'BRL',
    description: '',
    is_repeatable: false
  });

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

  const loadData = async () => {
    setLoading(true);
    const [incRes, expRes, payRes] = await Promise.all([
      supabase.from('clients').select('id, name, revenue, currency').eq('status', 'active'),
      supabase.from('expenses').select('*').order('created_at', { ascending: false }),
      supabase.from('client_payments').select('*')
    ]);
    
    if (!incRes.error) setIncome(incRes.data || []);
    if (!expRes.error) setExpenses(expRes.data || []);
    if (!payRes.error) setPayments(payRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchFX();
    loadData();
    
    const handleUpdate = () => loadData();
    window.addEventListener('project-updated', handleUpdate);
    window.addEventListener('financial-updated', handleUpdate);
    return () => {
      window.removeEventListener('project-updated', handleUpdate);
      window.removeEventListener('financial-updated', handleUpdate);
    };
  }, []);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return toast.error('Check fields');

    const { error } = await supabase.from('expenses').insert([{
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      description: formData.description,
      is_repeatable: formData.is_repeatable
    }]);

    if (!error) {
      toast.success('Expense recorded');
      setFormData({ amount: '', currency: 'BRL', description: '', is_repeatable: false });
      loadData();
      window.dispatchEvent(new Event('financial-updated'));
    } else {
      toast.error('Record failed');
    }
  };

  const deleteExpense = async (id) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) {
      toast.success('Expense removed');
      loadData();
      window.dispatchEvent(new Event('financial-updated'));
    }
  };

  const toBRL = (amount, curr) => {
    if (curr === 'BRL') return amount;
    if (curr === 'EUR') return amount * fxRates.EUR;
    return amount * fxRates.USD;
  };

  const convert = (amountBRL) => {
    if (displayCurrency === 'USD') return amountBRL / fxRates.USD;
    if (displayCurrency === 'EUR') return amountBRL / fxRates.EUR;
    return amountBRL;
  };

  const totalBilledBRL = payments.reduce((sum, item) => sum + toBRL(parseFloat(item.amount) || 0, item.currency), 0);
  const totalPaidBRL = payments.filter(p => p.is_paid).reduce((sum, item) => sum + toBRL(parseFloat(item.amount) || 0, item.currency), 0);
  const totalExpensesBRL = expenses.reduce((sum, item) => sum + toBRL(parseFloat(item.amount) || 0, item.currency), 0);
  const liquidMoneyBRL = totalPaidBRL - totalExpensesBRL;
  const netProfitBRL = totalBilledBRL - totalExpensesBRL;

  const format = (val) => {
    const symbol = displayCurrency === 'BRL' ? 'R$ ' : displayCurrency === 'USD' ? '$ ' : '€ ';
    return symbol + convert(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <div className="space-y-16 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
        <div className="space-y-6">
           <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Financial Intelligence</span>
              <div className="h-[1px] w-8 bg-neutral-200" />
           </div>
           <h1 className="text-6xl font-serif text-[var(--ink-primary)] leading-tight tracking-tight">
             Financials.
           </h1>
           <p className="text-neutral-500 font-medium max-w-lg text-base leading-relaxed">
             Real-time monitoring of project revenue vs. operational costs. 
             Ensuring margin precision across the entire portfolio.
           </p>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="surface-card p-10 space-y-6 border-b-2 border-b-cyan-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Liquid Cash</span>
            <div className="h-10 w-10 rounded-xl bg-cyan-50 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-cyan-500" />
            </div>
          </div>
          <p className={cn(
            "text-4xl font-serif tabular-nums",
            liquidMoneyBRL >= 0 ? "text-cyan-600" : "text-rose-600"
          )}>{format(liquidMoneyBRL)}</p>
          <div className="h-[1px] w-full bg-neutral-50" />
          <p className="text-[10px] text-neutral-300 uppercase tracking-widest font-bold">Available Funds</p>
        </div>

        <div className="surface-card p-10 space-y-6 border-b-2 border-b-emerald-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Total Billed</span>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
          <p className="text-4xl font-serif text-emerald-600 tabular-nums">{format(totalBilledBRL)}</p>
          <div className="h-[1px] w-full bg-neutral-50" />
          <p className="text-[10px] text-neutral-300 uppercase tracking-widest font-bold">Lifetime Revenue</p>
        </div>

        <div className="surface-card p-10 space-y-6 border-b-2 border-b-rose-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Total Expenses</span>
            <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-rose-500" />
            </div>
          </div>
          <p className="text-4xl font-serif text-rose-500 tabular-nums">{format(totalExpensesBRL)}</p>
          <div className="h-[1px] w-full bg-neutral-50" />
          <p className="text-[10px] text-neutral-300 uppercase tracking-widest font-bold">Operational Drift</p>
        </div>

        <div className="surface-card p-10 space-y-6 border-b-2 border-b-[var(--accent-sand)]/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Net Margin</span>
            <div className="h-10 w-10 rounded-xl bg-neutral-50 flex items-center justify-center border border-neutral-100">
              <Activity className="h-5 w-5 text-[var(--ink-primary)]" />
            </div>
          </div>
          <p className={cn(
            "text-4xl font-serif tabular-nums",
            netProfitBRL >= 0 ? "text-[var(--ink-primary)]" : "text-rose-600"
          )}>{format(netProfitBRL)}</p>
          <div className="h-[1px] w-full bg-neutral-50" />
          <p className="text-[10px] text-neutral-300 uppercase tracking-widest font-bold">Book Earnings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Left: Income & Form */}
        <div className="lg:col-span-4 space-y-16">
          {/* Add Expense Form */}
          <div className="surface-card p-10 space-y-8 bg-neutral-50/20">
            <div className="space-y-2">
              <h3 className="text-xl font-serif text-[var(--ink-primary)]">Log Expense</h3>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Record new operational cost</p>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-1">
                  <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Amount</label>
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
                  <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Currency</label>
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
                <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">The "Why"</label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-white border border-neutral-100 rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-neutral-200"
                  placeholder="Subscription, Hardware, etc."
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={cn(
                  "h-5 w-5 rounded border flex items-center justify-center transition-all",
                  formData.is_repeatable ? "bg-[var(--ink-primary)] border-[var(--ink-primary)]" : "border-neutral-200 bg-white group-hover:border-neutral-300"
                )} onClick={() => setFormData({ ...formData, is_repeatable: !formData.is_repeatable })}>
                  {formData.is_repeatable && <Repeat className="h-3 w-3 text-white" />}
                </div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Monthly Repeatable</span>
              </label>

              <button type="submit" className="w-full btn-minimal btn-primary h-14 flex items-center justify-center gap-3">
                <Plus className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Record Expense</span>
              </button>
            </form>
          </div>

          {/* Income Breakdown */}
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <Briefcase className="h-4 w-4 text-neutral-300" />
              <h3 className="text-xl font-serif text-[var(--ink-primary)]">Income Streams</h3>
            </div>
            <div className="space-y-4">
              {income.map(proj => (
                <div key={proj.id} className="surface-card p-6 flex items-center justify-between group transition-all hover:bg-neutral-50/50">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-[var(--ink-primary)]">{proj.name}</p>
                    <p className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest">Active Project</p>
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
                <h3 className="text-xl font-serif text-[var(--ink-primary)]">Expense Log</h3>
              </div>
              <p className="text-[9px] font-bold text-neutral-300 uppercase tracking-[0.2em]">{expenses.length} Records</p>
           </div>

           <div className="surface-card overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50/50 border-b border-neutral-100">
                    <th className="px-8 py-5 text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Item / Purpose</th>
                    <th className="px-8 py-5 text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Type</th>
                    <th className="px-8 py-5 text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Date</th>
                    <th className="px-8 py-5 text-[9px] font-bold text-neutral-400 uppercase tracking-widest text-right">Amount</th>
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
                            <Repeat className="h-3 w-3" /> Recurring
                          </span>
                        ) : (
                          <span className="text-[8px] font-bold text-neutral-300 uppercase tracking-widest">One-time</span>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-[10px] text-neutral-400 font-medium">
                          {new Date(exp.created_at).toLocaleDateString()}
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
                        <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-[0.4em] italic leading-relaxed"> No operational costs recorded.</p>
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
