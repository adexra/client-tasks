import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';

const FinancialContext = createContext();

export function FinancialProvider({ children }) {
  const [fxRates, setFxRates] = useState({ USD: 6.12, EUR: 6.64 });
  const [displayCurrency, setDisplayCurrency] = useState(() => localStorage.getItem('displayCurrency') || 'BRL');
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFX = useCallback(async () => {
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

  const totals = useMemo(() => {
    const incomeBRL = payments.reduce((sum, p) => sum + toBRL(parseFloat(p.amount) || 0, p.currency), 0);
    const expensesBRL = expenses.reduce((sum, e) => sum + toBRL(parseFloat(e.amount) || 0, e.currency), 0);
    const paidBRL = payments.filter(p => p.is_paid).reduce((sum, p) => sum + toBRL(parseFloat(p.amount) || 0, p.currency), 0);
    
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
    totals
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
