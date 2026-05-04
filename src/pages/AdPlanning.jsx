import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { cn } from '../lib/utils';
import { Megaphone, Copy, ExternalLink, Trash2, Check, AlertTriangle } from 'lucide-react';

const SYM = { BRL: 'R$', USD: '$', EUR: '€' };
const money = (n, sym) => `${sym} ${(parseFloat(n)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

function setNested(obj, path, val) {
  const keys = path.split('.');
  const next = JSON.parse(JSON.stringify(obj));
  let o = next;
  for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
  o[keys[keys.length - 1]] = val;
  return next;
}

const STAGES = ['tofu', 'mofu', 'bofu'];
const PLATFORMS = [
  { key: 'google', label: 'Google Ads', color: 'bg-blue-500' },
  { key: 'meta', label: 'Meta Ads', color: 'bg-indigo-500' },
  { key: 'tiktok', label: 'TikTok Ads', color: 'bg-pink-500' },
  { key: 'linkedin', label: 'LinkedIn Ads', color: 'bg-sky-600' },
];

// When one stage's % changes, redistribute the delta to others proportionally
function autoBalance(funnel, changedStage, newPct) {
  const f = JSON.parse(JSON.stringify(funnel));
  const clamped = Math.max(0, Math.min(100, Math.round(newPct)));
  const others = STAGES.filter(s => s !== changedStage && f[s].enabled);
  if (others.length === 0) { f[changedStage].budget_pct = 100; return f; }
  const remaining = 100 - clamped;
  const othersTotal = others.reduce((sum, s) => sum + f[s].budget_pct, 0);
  let distributed = 0;
  others.forEach((s, i) => {
    const share = i === others.length - 1
      ? remaining - distributed
      : othersTotal > 0
        ? Math.round(remaining * f[s].budget_pct / othersTotal)
        : Math.round(remaining / others.length);
    f[s].budget_pct = Math.max(0, share);
    distributed += f[s].budget_pct;
  });
  f[changedStage].budget_pct = clamped;
  return f;
}

// When a stage is toggled, normalize all enabled stages to sum to 100
function toggleStage(funnel, stage) {
  const f = JSON.parse(JSON.stringify(funnel));
  const wouldDisable = f[stage].enabled;
  const enabledCount = STAGES.filter(s => f[s].enabled).length;
  if (wouldDisable && enabledCount === 1) return f; // keep at least one
  f[stage].enabled = !f[stage].enabled;
  const enabled = STAGES.filter(s => f[s].enabled);
  const total = enabled.reduce((sum, s) => sum + f[s].budget_pct, 0);
  if (total === 0) {
    const equal = Math.floor(100 / enabled.length);
    enabled.forEach((s, i) => { f[s].budget_pct = i === enabled.length - 1 ? 100 - equal * (enabled.length - 1) : equal; });
  } else {
    let distributed = 0;
    enabled.forEach((s, i) => {
      const share = i === enabled.length - 1 ? 100 - distributed : Math.round(f[s].budget_pct * 100 / total);
      f[s].budget_pct = Math.max(0, share);
      distributed += f[s].budget_pct;
    });
  }
  return f;
}

const F = ({ label, children }) => (
  <div className="space-y-1.5">
    <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">{label}</p>
    {children}
  </div>
);
const ic = 'w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm font-medium text-ink-primary focus:outline-none focus:ring-1 focus:ring-neutral-300';
const sc = ic + ' cursor-pointer appearance-none';

// Extracted OUTSIDE the parent component to prevent remount on every render
function Toggle({ checked, onChange }) {
  return (
    <div onClick={onChange} className={cn('h-5 w-9 rounded-full transition-all relative cursor-pointer shrink-0', checked ? 'bg-ink-charcoal' : 'bg-neutral-200')}>
      <div className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', checked ? 'left-4' : 'left-0.5')} />
    </div>
  );
}

function FunnelCard({ stage, label, color, stageData, budget, daily, sym, onToggle, onPctChange, onFieldChange }) {
  const s = stageData;
  return (
    <div className={cn('surface-card p-6 space-y-5 border-t-2', color)}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">{label}</p>
          <p className="text-sm font-semibold text-ink-primary mt-0.5">{s.focus}</p>
        </div>
        <Toggle checked={s.enabled} onChange={onToggle} />
      </div>
      {s.enabled && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <input
              type="number" min={0} max={100} value={s.budget_pct}
              onChange={e => onPctChange(+e.target.value)}
              className="w-20 bg-white border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-mono text-center focus:outline-none focus:ring-1 focus:ring-neutral-300"
            />
            <div className="text-xs text-neutral-400 font-medium leading-relaxed">
              <span>% of budget</span><br />
              <span className="text-ink-primary font-semibold">
                {sym} {(budget * s.budget_pct / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total
                &nbsp;·&nbsp;
                {sym} {(daily * s.budget_pct / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/day
              </span>
            </div>
          </div>
          {stage === 'tofu' && <>
            <F label="Audience Definition"><input value={s.audience} onChange={e => onFieldChange('audience', e.target.value)} className={ic} placeholder="Demographics, interests, lookalikes..." /></F>
            <F label="Keywords / Search Terms"><textarea value={s.keywords} onChange={e => onFieldChange('keywords', e.target.value)} rows={2} className={ic + ' resize-none'} placeholder="Brand terms, informational queries..." /></F>
          </>}
          {stage === 'mofu' && <>
            <F label="Remarketing Logic"><textarea value={s.remarketing_logic} onChange={e => onFieldChange('remarketing_logic', e.target.value)} rows={2} className={ic + ' resize-none'} placeholder="e.g. Visited landing page but did not convert..." /></F>
          </>}
          {stage === 'bofu' && <>
            <F label="Conversion Flow Path"><textarea value={s.conversion_flow} onChange={e => onFieldChange('conversion_flow', e.target.value)} rows={2} className={ic + ' resize-none'} placeholder="Ex: Pesquisa Google → Página do Produto → Compra → Obrigado → Tracking" /></F>
            <F label="High-Intent Keywords"><textarea value={s.keywords} onChange={e => onFieldChange('keywords', e.target.value)} rows={2} className={ic + ' resize-none'} placeholder="Buy now, best price, hire now, compare..." /></F>
          </>}
        </div>
      )}
    </div>
  );
}

const DEFAULT = {
  name: '', client_id: '', currency: 'BRL', total_budget: '', days: 30, start_date: '',
  target_kpi: { type: 'CPA', value: '' },
  mediums: { google: true, meta: false, tiktok: false, linkedin: false },
  funnel: {
    tofu: { enabled: true, focus: 'Brand Awareness / Traffic', audience: '', keywords: '', budget_pct: 40 },
    mofu: { enabled: true, focus: 'Consideration / Engagement', remarketing_logic: '', budget_pct: 30 },
    bofu: { enabled: true, focus: 'Direct Response / Conversion', conversion_flow: '', keywords: '', budget_pct: 30 },
  },
  conversion: { goal: 'Lead', flow: '', attribution: 'Data-Driven', tracking: 'GA4 + GTM' },
  audience: { age: '', gender: 'All', location: '', interests: '', devices: 'All Devices' },
  creative: { formats: '', hook: '', cta: '', landing_page: '' },
};

export default function AdPlanning() {
  const toast = useToast();
  const [tab, setTab] = useState('builder');
  const [form, setForm] = useState(DEFAULT);
  const [plans, setPlans] = useState([]);
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const makeFunnelHandlers = (stage) => ({
    onToggle: () => setForm(f => ({ ...f, funnel: toggleStage(f.funnel, stage) })),
    onPctChange: (v) => setForm(f => ({ ...f, funnel: autoBalance(f.funnel, stage, v) })),
    onFieldChange: (field, v) => setForm(f => ({ ...f, funnel: { ...f.funnel, [stage]: { ...f.funnel[stage], [field]: v } } })),
  });

  useEffect(() => {
    supabase.from('clients').select('id,name').eq('status', 'active').then(({ data }) => setClients(data || []));
    loadPlans();
  }, []);

  const loadPlans = async () => {
    const { data } = await supabase.from('ad_plans').select('*').order('created_at', { ascending: false });
    setPlans(data || []);
  };

  const set = (path, val) => setForm(f => setNested(f, path, val));

  const budget = parseFloat(form.total_budget) || 0;
  const days = parseInt(form.days) || 1;
  const daily = budget / days;
  const sym = SYM[form.currency] || 'R$';
  const { tofu, mofu, bofu } = form.funnel;
  const totalPct = (tofu.enabled ? tofu.budget_pct : 0) + (mofu.enabled ? mofu.budget_pct : 0) + (bofu.enabled ? bofu.budget_pct : 0);
  const kpiVal = parseFloat(form.target_kpi.value) || 0;
  const projConversions = form.target_kpi.type === 'CPA' && kpiVal > 0 ? Math.floor((budget * bofu.budget_pct / 100) / kpiVal) : null;
  const projROAS = form.target_kpi.type === 'ROAS' && kpiVal > 0 ? (budget * bofu.budget_pct / 100) * kpiVal : null;

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Plan name is required');
    if (totalPct !== 100) return toast.error('Funnel budget must sum to exactly 100%');
    setSaving(true);
    const { data, error } = await supabase.from('ad_plans').insert([{
      name: form.name, client_id: form.client_id || null, currency: form.currency,
      total_budget: budget, days, start_date: form.start_date || null,
      target_kpi: form.target_kpi, funnel: form.funnel, mediums: form.mediums,
      conversion: form.conversion, audience: form.audience, creative: form.creative,
    }]).select('id').single();
    setSaving(false);
    if (error) return toast.error('Failed to save: ' + error.message);
    toast.success('Plan saved! Link copied to clipboard.');
    loadPlans();
    setTab('plans');
    copyLink(data.id);
  };

  const copyLink = (id) => {
    navigator.clipboard.writeText(window.location.origin + '/plan/' + id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const deletePlan = async (id) => {
    if (!confirm('Delete this plan?')) return;
    await supabase.from('ad_plans').delete().eq('id', id);
    toast.success('Plan deleted');
    loadPlans();
  };


  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-24">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Advertising Intelligence</span>
          <div className="h-px w-8 bg-neutral-200" />
        </div>
        <h1 className="text-5xl font-serif text-ink-primary tracking-tight">Ads Planning</h1>
        <p className="text-neutral-500 text-base max-w-xl">Build structured campaign briefs. Share a live plan URL with clients — no login required.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border-light">
        {[{ id: 'builder', label: 'New Plan' }, { id: 'plans', label: `Saved Plans (${plans.length})` }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('px-6 py-3 text-[11px] font-bold uppercase tracking-widest border-b-2 -mb-px transition-all',
              tab === t.id ? 'border-ink-charcoal text-ink-primary' : 'border-transparent text-neutral-400 hover:text-neutral-600')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Saved Plans Tab */}
      {tab === 'plans' && (
        <div className="space-y-4">
          {plans.length === 0 && (
            <div className="surface-card p-20 text-center space-y-4">
              <Megaphone className="h-8 w-8 text-neutral-200 mx-auto" />
              <p className="text-[11px] font-bold text-neutral-300 uppercase tracking-widest">No plans saved yet</p>
              <button onClick={() => setTab('builder')} className="btn-minimal btn-primary text-xs mt-2">Create Your First Plan</button>
            </div>
          )}
          {plans.map(p => (
            <div key={p.id} className="surface-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-base font-semibold text-ink-primary">{p.name}</p>
                <p className="text-[10px] text-neutral-400 font-medium">
                  {SYM[p.currency] || 'R$'} {parseFloat(p.total_budget).toLocaleString()} · {p.days} days · Created {new Date(p.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => copyLink(p.id)}
                  className="flex items-center gap-2 text-[10px] font-bold text-neutral-500 hover:text-ink-primary border border-border-light rounded-lg px-3 py-2 transition-all hover:border-neutral-300">
                  {copiedId === p.id ? <><Check className="h-3.5 w-3.5 text-emerald-500" />Copied!</> : <><Copy className="h-3.5 w-3.5" />Copy Link</>}
                </button>
                <a href={`/plan/${p.id}`} target="_blank" rel="noreferrer"
                  className="p-2 text-neutral-400 hover:text-ink-primary border border-border-light rounded-lg transition-all hover:border-neutral-300">
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button onClick={() => deletePlan(p.id)} className="p-2 text-neutral-300 hover:text-rose-500 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Builder Tab */}
      {tab === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Form */}
          <div className="lg:col-span-2 space-y-8">

            {/* A: Meta */}
            <div className="surface-card p-8 space-y-6">
              <div>
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Section A</p>
                <h3 className="text-xl font-serif text-ink-primary mt-1">Campaign Meta & Financials</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <F label="Plan / Campaign Name">
                  <input value={form.name} onChange={e => set('name', e.target.value)} className={ic} placeholder="Q2 Lead Gen — Brand X" />
                </F>
                <F label="Client">
                  <select value={form.client_id} onChange={e => set('client_id', e.target.value)} className={sc}>
                    <option value="">— General / No client —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </F>
                <F label="Total Budget">
                  <div className="flex gap-2">
                    <select value={form.currency} onChange={e => set('currency', e.target.value)} className="bg-white border border-neutral-200 rounded-xl px-3 py-3 text-[10px] font-bold uppercase focus:outline-none w-24 cursor-pointer">
                      {['BRL', 'USD', 'EUR'].map(c => <option key={c}>{c}</option>)}
                    </select>
                    <input type="number" value={form.total_budget} onChange={e => set('total_budget', e.target.value)} className={ic} placeholder="5000.00" />
                  </div>
                </F>
                <F label="Campaign Duration (Days)">
                  <input type="number" min={1} value={form.days} onChange={e => set('days', e.target.value)} className={ic} placeholder="30" />
                </F>
                <F label="Start Date">
                  <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={ic} />
                </F>
                <F label="Target KPI">
                  <div className="flex gap-2">
                    <select value={form.target_kpi.type} onChange={e => set('target_kpi.type', e.target.value)} className="bg-white border border-neutral-200 rounded-xl px-3 py-3 text-[10px] font-bold uppercase focus:outline-none w-32 cursor-pointer">
                      {['CPA', 'ROAS', 'Leads', 'CPL'].map(t => <option key={t}>{t}</option>)}
                    </select>
                    <input type="number" value={form.target_kpi.value} onChange={e => set('target_kpi.value', e.target.value)} className={ic} placeholder={form.target_kpi.type === 'ROAS' ? 'e.g. 4' : 'e.g. 50'} />
                  </div>
                </F>
              </div>
            </div>

            {/* A2: Advertising Mediums */}
            <div className="surface-card p-8 space-y-5">
              <div>
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Section A2</p>
                <h3 className="text-xl font-serif text-ink-primary mt-1">Advertising Mediums</h3>
                <p className="text-xs text-neutral-400 mt-1">Select every platform this campaign will run on.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PLATFORMS.map(p => {
                  const active = form.mediums?.[p.key];
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, mediums: { ...f.mediums, [p.key]: !f.mediums?.[p.key] } }))}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all',
                        active
                          ? 'bg-ink-charcoal text-white border-ink-charcoal shadow-sm'
                          : 'bg-white text-neutral-400 border-neutral-200 hover:border-neutral-300'
                      )}
                    >
                      <div className={cn('h-2 w-2 rounded-full shrink-0', active ? 'bg-white' : 'bg-neutral-200')} />
                      <span className="text-[11px] font-bold uppercase tracking-widest leading-tight">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>


            <div className="space-y-3">
              <div>
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Section B</p>
                <h3 className="text-xl font-serif text-ink-primary mt-1">Funnel Architecture & Allocation</h3>
              </div>
              <div className={cn('text-[10px] font-bold rounded-xl px-4 py-3 flex items-center gap-2',
                totalPct === 100 ? 'bg-emerald-50 text-emerald-700' : totalPct > 100 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-700')}>
                {totalPct !== 100 && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                {totalPct === 100 ? '✓ Budget fully allocated (100%)' : totalPct > 100 ? `Over-allocated by ${totalPct - 100}% — reduce allocation` : `${100 - totalPct}% unallocated — assign remaining budget`}
              </div>
              {[{stage:'tofu',label:'TOFU — Top of Funnel (Cold Audience)',color:'border-t-sky-300'},{stage:'mofu',label:'MOFU — Middle of Funnel (Remarketing)',color:'border-t-violet-400'},{stage:'bofu',label:'BOFU — Bottom of Funnel (Conversion)',color:'border-t-emerald-400'}].map(cfg => (
                <FunnelCard
                  key={cfg.stage}
                  stage={cfg.stage} label={cfg.label} color={cfg.color}
                  stageData={form.funnel[cfg.stage]}
                  budget={budget} daily={daily} sym={sym}
                  {...makeFunnelHandlers(cfg.stage)}
                />
              ))}
            </div>

            {/* C: Conversion */}
            <div className="surface-card p-8 space-y-6">
              <div>
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Section C</p>
                <h3 className="text-xl font-serif text-ink-primary mt-1">Conversion Flow</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <F label="Primary Goal">
                  <select value={form.conversion.goal} onChange={e => set('conversion.goal', e.target.value)} className={sc}>
                    {['Lead', 'Purchase', 'Call', 'Form Submit', 'App Install'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </F>
                <F label="Attribution Model">
                  <select value={form.conversion.attribution} onChange={e => set('conversion.attribution', e.target.value)} className={sc}>
                    {['Data-Driven', 'Last Click', 'Linear', 'First Click', 'Time Decay'].map(a => <option key={a}>{a}</option>)}
                  </select>
                </F>
                <F label="Tracking Setup">
                  <select value={form.conversion.tracking} onChange={e => set('conversion.tracking', e.target.value)} className={sc}>
                    {['GA4 + GTM', 'Meta Pixel', 'GA4 Only', 'GTM Only', 'Custom'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </F>
                <F label="Conversion Flow Path">
                  <input value={form.conversion.flow} onChange={e => set('conversion.flow', e.target.value)} className={ic} placeholder="Ex: Pesquisa Google → Página do Produto → Compra → Obrigado → Tracking" />
                </F>
              </div>
            </div>

            {/* D: Audience */}
            <div className="surface-card p-8 space-y-6">
              <div>
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Section D</p>
                <h3 className="text-xl font-serif text-ink-primary mt-1">Audience Targeting</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <F label="Age Range"><input value={form.audience.age} onChange={e => set('audience.age', e.target.value)} className={ic} placeholder="25–54" /></F>
                <F label="Gender">
                  <select value={form.audience.gender} onChange={e => set('audience.gender', e.target.value)} className={sc}>
                    {['All', 'Male', 'Female'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </F>
                <F label="Location"><input value={form.audience.location} onChange={e => set('audience.location', e.target.value)} className={ic} placeholder="São Paulo, SP — Brazil" /></F>
                <F label="Devices">
                  <select value={form.audience.devices} onChange={e => set('audience.devices', e.target.value)} className={sc}>
                    {['All Devices', 'Mobile Only', 'Desktop Only', 'Mobile + Tablet'].map(d => <option key={d}>{d}</option>)}
                  </select>
                </F>
                <div className="sm:col-span-2">
                  <F label="Interests & Intent Audiences">
                    <textarea value={form.audience.interests} onChange={e => set('audience.interests', e.target.value)} rows={2} className={ic + ' resize-none'} placeholder="In-market: Real Estate, Business Services, Financial Products..." />
                  </F>
                </div>
              </div>
            </div>

            {/* E: Creative */}
            <div className="surface-card p-8 space-y-6">
              <div>
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Section E</p>
                <h3 className="text-xl font-serif text-ink-primary mt-1">Creative Notes</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <F label="Ad Formats"><input value={form.creative.formats} onChange={e => set('creative.formats', e.target.value)} className={ic} placeholder="Responsive Search, Display Banners, Video" /></F>
                <F label="Landing Page URL"><input value={form.creative.landing_page} onChange={e => set('creative.landing_page', e.target.value)} className={ic} placeholder="https://..." /></F>
                <F label="Key Hook / Message">
                  <textarea value={form.creative.hook} onChange={e => set('creative.hook', e.target.value)} rows={2} className={ic + ' resize-none'} placeholder="The main angle or headline idea..." />
                </F>
                <F label="CTA Text"><input value={form.creative.cta} onChange={e => set('creative.cta', e.target.value)} className={ic} placeholder="Get a Free Quote · Book Now" /></F>
              </div>
            </div>

            <button onClick={handleSave} disabled={saving}
              className="w-full btn-minimal btn-primary h-16 flex items-center justify-center gap-3 text-[11px] font-bold uppercase tracking-widest shadow-lg shadow-black/5">
              {saving ? 'Saving...' : 'Save Plan & Generate Share Link'}
            </button>
          </div>

          {/* Calc Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 space-y-6">
              <div className="surface-card p-6 space-y-6">
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Live Budget Breakdown</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-end border-b border-neutral-50 pb-3">
                    <span className="text-xs text-neutral-500">Total</span>
                    <span className="font-serif text-2xl text-ink-primary">{money(budget, sym)}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-neutral-500">Daily</span>
                    <span className="font-serif text-xl text-ink-primary">{money(daily, sym)}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-neutral-500">Duration</span>
                    <span className="text-sm font-medium text-ink-primary">{days} days</span>
                  </div>
                </div>
                <div className="space-y-3 pt-2 border-t border-border-light">
                  {[
                    { stage: 'tofu', label: 'TOFU', color: 'bg-sky-400' },
                    { stage: 'mofu', label: 'MOFU', color: 'bg-violet-400' },
                    { stage: 'bofu', label: 'BOFU', color: 'bg-emerald-500' },
                  ].map(({ stage, label, color }) => {
                    const s = form.funnel[stage];
                    if (!s.enabled) return null;
                    return (
                      <div key={stage} className="space-y-1.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="font-bold text-neutral-600">{label} ({s.budget_pct}%)</span>
                          <span className="text-neutral-400">{money(daily * s.budget_pct / 100, sym)}/day</span>
                        </div>
                        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full', color)} style={{ width: `${Math.min(s.budget_pct, 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {(projConversions || projROAS) && (
                <div className="surface-card p-6 space-y-4">
                  <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Projections</p>
                  {projConversions && (
                    <div className="space-y-1">
                      <p className="text-3xl font-serif text-emerald-600">{projConversions.toLocaleString()}</p>
                      <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-widest">Est. Conversions (BOFU @ {sym}{kpiVal} CPA)</p>
                    </div>
                  )}
                  {projROAS && (
                    <div className="space-y-1">
                      <p className="text-3xl font-serif text-emerald-600">{money(projROAS, sym)}</p>
                      <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-widest">Est. Revenue (BOFU @ {kpiVal}x ROAS)</p>
                    </div>
                  )}
                </div>
              )}

              <div className="surface-card p-6 space-y-3 bg-neutral-50/50">
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">How Sharing Works</p>
                <p className="text-xs text-neutral-500 leading-relaxed">After saving, you get a unique URL your client can open — no login required. The plan is read-only and renders as a premium branded brief.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
