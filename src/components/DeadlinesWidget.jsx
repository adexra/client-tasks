import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CalendarClock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

function categorize(rawValue) {
  if (!rawValue || !rawValue.trim()) return null;
  const text = rawValue.split('–')[0].trim();
  const parsed = new Date(text);
  if (isNaN(parsed.getTime())) return 'later';
  const now = new Date();
  const diffDays = Math.ceil((parsed - now) / 86400000);
  if (diffDays < 0) return 'vencido';
  if (diffDays <= 7) return 'esta-semana';
  if (diffDays <= 31) return 'este-mes';
  return 'depois';
}

export default function DeadlinesWidget() {
  const { t } = useLanguage();
  const [buckets, setBuckets] = useState({});
  const [loading, setLoading] = useState(true);

  const BUCKET_META = {
    vencido:       { label: t('deadlines.vencido'),    color: '#FF3B5C', dot: '#FF3B5C' },
    'esta-semana': { label: t('deadlines.esta_semana'), color: '#F4F4F6', dot: '#3362FF' },
    'este-mes':    { label: t('deadlines.este_mes'),    color: '#6B7080', dot: 'rgba(244,244,246,0.2)' },
    depois:        { label: t('deadlines.depois'),      color: '#6B7080', dot: 'rgba(244,244,246,0.1)' },
  };

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

  const orderedKeys = ['vencido', 'esta-semana', 'este-mes', 'depois'].filter(k => buckets[k]?.length);

  if (loading || orderedKeys.length === 0) return null;

  return (
    <div className="surface-card p-10 h-full flex flex-col space-y-8">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <CalendarClock className="h-3.5 w-3.5" /> {t('deadlines.tag')}
        </label>
        <div className="h-1.5 w-1.5 rounded-full bg-neutral-100" />
      </div>

      <div className="space-y-10 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {orderedKeys.map(key => {
          const { label, color, dot } = BUCKET_META[key];
          return (
            <div key={key} className="space-y-4">
              <p style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', color }}>{label}</p>
              <div className="space-y-3">
                {buckets[key].map((e, i) => (
                  <Link
                    key={i}
                    to={`/client/${e.clientId}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '12px', border: '1px solid rgba(244,244,246,0.07)', background: 'rgba(244,244,246,0.02)', textDecoration: 'none', transition: 'border-color 0.15s, background 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(244,244,246,0.14)'; e.currentTarget.style.background = 'rgba(244,244,246,0.04)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(244,244,246,0.07)'; e.currentTarget.style.background = 'rgba(244,244,246,0.02)'; }}
                  >
                    <div style={{ height: '6px', width: '6px', borderRadius: '99px', flexShrink: 0, background: dot }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontFamily: 'serif', color: '#F4F4F6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.clientName}</span>
                        <span style={{ fontSize: '9px', fontWeight: '700', color: '#6B7080', flexShrink: 0, textTransform: 'uppercase', fontVariantNumeric: 'tabular-nums' }}>{e.value}</span>
                      </div>
                      <p style={{ fontSize: '8px', fontWeight: '700', color: '#6B7080', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                        {t('deadlines.phase_prefix')}
                        {e.phaseName === 'onboarding' ? t('project_modal.phases.onboarding') :
                         e.phaseName === 'delivery' ? t('project_modal.phases.delivery') :
                         e.phaseName === 'qa' ? t('project_modal.phases.qa') :
                         t('project_modal.phases.update')}
                      </p>
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
