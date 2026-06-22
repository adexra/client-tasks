import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';

const FinancialContext = createContext();

export function FinancialProvider({ children }) {
  const [fxRates, setFxRates] = useState({ USD: 5.20, EUR: 6.00 });
  const [displayCurrency, setDisplayCurrency] = useState(() => localStorage.getItem('displayCurrency') || 'BRL');
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPrivacy, setShowPrivacy] = useState(() => localStorage.getItem('showPrivacy') === 'true');

  const fetchFX = useCallback(async () => {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/BRL');
      if (!res.ok) throw new Error('FX fetch failed');
      const json = await res.json();
      // API returns rates relative to BRL base: BRL→X
      // We need X→BRL: invert the rate
      const usdRate = json.rates?.USD ? 1 / json.rates.USD : 5.20;
      const eurRate = json.rates?.EUR ? 1 / json.rates.EUR : 6.00;
      setFxRates({ USD: usdRate, EUR: eurRate });
    } catch {
      // Fall back to hardcoded rates if API is unavailable
      setFxRates({ USD: 5.20, EUR: 6.00 });
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [payRes, expRes] = await Promise.all([
      supabase.from('client_payments').select('*'),
      supabase.from('expenses').select('*')
    ]);
    
    if (!payRes.error) setPayments(payRes.data || []);
    if (!expRes.error) setExpenses(expRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFX();
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('financial-updated', handleUpdate);
    window.addEventListener('project-updated', handleUpdate);

    const interval = setInterval(fetchFX, 300000); // 5 mins

    return () => {
      window.removeEventListener('financial-updated', handleUpdate);
      window.removeEventListener('project-updated', handleUpdate);
      clearInterval(interval);
    };
  }, [fetchFX, loadData]);

  const toBRL = useCallback((amount, from) => {
    if (from === 'BRL') return amount;
    if (from === 'EUR') return amount * fxRates.EUR;
    return amount * fxRates.USD;
  }, [fxRates]);

  const fromBRL = useCallback((amountBRL, to) => {
    if (to === 'BRL') return amountBRL;
    if (to === 'EUR') return amountBRL / fxRates.EUR;
    return amountBRL / fxRates.USD;
  }, [fxRates]);

  const changeCurrency = (curr) => {
    setDisplayCurrency(curr);
    localStorage.setItem('displayCurrency', curr);
  };

  const togglePrivacy = () => {
    setShowPrivacy(prev => {
      const next = !prev;
      localStorage.setItem('showPrivacy', String(next));
      return next;
    });
  };

  const totals = useMemo(() => {
    const incomeBRL = payments.reduce((sum, p) => sum + toBRL(parseFloat(p.amount) || 0, p.currency), 0);
    const expensesBRL = expenses.reduce((sum, e) => sum + toBRL(parseFloat(e.amount) || 0, e.currency), 0);
    // Use paid_brl_amount (frozen at time of payment) to prevent FX drift.
    // Fall back to live conversion only if snapshot is missing.
    const paidBRL = payments
      .filter(p => p.is_paid)
      .reduce((sum, p) => {
        const frozen = parseFloat(p.paid_brl_amount);
        return sum + (isNaN(frozen) ? toBRL(parseFloat(p.amount) || 0, p.currency) : frozen);
      }, 0);
    
    return {
      incomeBRL,
      expensesBRL,
      paidBRL,
      marginBRL: incomeBRL - expensesBRL,
      bankBRL: paidBRL - expensesBRL
    };
  }, [payments, expenses, toBRL]);

  const value = {
    fxRates,
    displayCurrency,
    changeCurrency,
    payments,
    expenses,
    loading,
    refreshData: loadData,
    toBRL,
    fromBRL,
    totals,
    showPrivacy,
    togglePrivacy
  };

  return (
    <FinancialContext.Provider value={value}>
      {children}
    </FinancialContext.Provider>
  );
}

export const useFinancials = () => {
  const context = useContext(FinancialContext);
  if (!context) throw new Error('useFinancials must be used within FinancialProvider');
  return context;
};
