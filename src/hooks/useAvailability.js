import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Returns the effective availability rule for a given date.
// Priority: specific date rule > day_of_week rule.
// Returns null if no rule found (treat as available).
export function useAvailability(dateISO) {
  const [rule, setRule] = useState(undefined); // undefined = loading
  const dayOfWeek = new Date(dateISO + 'T12:00:00').getDay();

  useEffect(() => {
    async function load() {
      // 1. Specific-date rule takes priority
      const { data: dateRule } = await supabase
        .from('availability_rules')
        .select('*')
        .eq('date', dateISO)
        .maybeSingle();

      if (dateRule) { setRule(dateRule); return; }

      // 2. Recurring day-of-week rule
      const { data: dowRule } = await supabase
        .from('availability_rules')
        .select('*')
        .eq('day_of_week', dayOfWeek)
        .is('date', null)
        .maybeSingle();

      setRule(dowRule || null);
    }
    load();
  }, [dateISO, dayOfWeek]);

  return rule; // undefined=loading, null=no rule (available), object=rule
}

export const AVAIL_META = {
  available:   { color: '#22C55E', label: { en: 'Available',   pt: 'Disponível' } },
  limited:     { color: '#F59E0B', label: { en: 'Limited',     pt: 'Limitado' } },
  unavailable: { color: '#FF3B5C', label: { en: 'Unavailable', pt: 'Indisponível' } },
  focus_day:   { color: '#3362FF', label: { en: 'Focus Day',   pt: 'Dia de Foco' } },
};

export function availabilityMeta(type) {
  return AVAIL_META[type] ?? AVAIL_META.available;
}
