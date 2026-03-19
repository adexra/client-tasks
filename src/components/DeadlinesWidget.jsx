import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CalendarClock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

function categorize(rawValue) {
  if (!rawValue || !rawValue.trim()) return null;
  const text = rawValue.split('–')[0].trim();
  const parsed = new Date(text);
  if (isNaN(parsed.getTime())) return 'later';
  const now = new Date();
  const diffDays = Math.ceil((parsed - now) / 86400000);
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 7) return 'this-week';
  if (diffDays <= 31) return 'this-month';
  return 'later';
}

const BUCKET_META = {
  overdue:    { label: 'Critical / Overdue', color: 'text-rose-500',   dot: 'bg-rose-500' },
  'this-week':  { label: 'Weekly Deadlines',   color: 'text-neutral-500',  dot: 'bg-[var(--accent-sand)]' },
  'this-month': { label: 'Upcoming',         color: 'text-neutral-500',  dot: 'bg-neutral-200' },
  later:      { label: 'Future Tasks',     color: 'text-neutral-300',  dot: 'bg-neutral-100' },
};

export default function DeadlinesWidget() {
  const [buckets, setBuckets] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('clients')
        .select(`id, name, client_phases (phase_name, phase_fields (field_key, field_value))`)
        .eq('status', 'active');

      if (error || !data) { setLoading(false); return; }

      const entries = [];
      for (const client of data) {
        for (const phase of (client.client_phases || [])) {
          for (const field of (phase.phase_fields || [])) {
            if (field.field_key === 'Timeline' && field.field_value?.trim()) {
              const bucket = categorize(field.field_value);
              if (bucket) {
                entries.push({
                  clientId: client.id,
                  clientName: client.name,
                  phaseName: phase.phase_name,
                  value: field.field_value,
                  bucket,
                });
              }
            }
          }
        }
      }

      const grouped = {};
      for (const e of entries) {
        if (!grouped[e.bucket]) grouped[e.bucket] = [];
        grouped[e.bucket].push(e);
      }
      setBuckets(grouped);
      setLoading(false);
    }
    load();
  }, []);

  const orderedKeys = ['overdue', 'this-week', 'this-month', 'later'].filter(k => buckets[k]?.length);

  if (loading || orderedKeys.length === 0) return null;

  return (
    <div className="surface-card p-10 h-full flex flex-col space-y-8">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <CalendarClock className="h-3.5 w-3.5" /> Project Deadlines
        </label>
        <div className="h-1.5 w-1.5 rounded-full bg-neutral-100" />
      </div>

      <div className="space-y-10 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {orderedKeys.map(key => {
          const { label, color, dot } = BUCKET_META[key];
          return (
            <div key={key} className="space-y-4">
              <p className={cn("text-[9px] font-bold uppercase tracking-[0.1em]", color)}>{label}</p>
              <div className="space-y-3">
                {buckets[key].map((e, i) => (
                  <Link
                    key={i}
                    to={`/client/${e.clientId}`}
                    className="flex items-center gap-4 p-4 rounded-xl border border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50 transition-all group"
                  >
                    <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", dot)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xs font-serif text-[var(--ink-primary)] truncate">{e.clientName}</span>
                        <span className="text-[9px] font-bold text-neutral-300 shrink-0 uppercase tracking-tighter tabular-nums">{e.value}</span>
                      </div>
                      <p className="text-[8px] font-bold text-neutral-300 uppercase tracking-widest">{e.phaseName} phase</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
