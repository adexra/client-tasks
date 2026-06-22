import { useState, useEffect } from 'react';
import CustomSelect from '../components/CustomSelect';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { cn } from '../lib/utils';
import { Megaphone, Copy, ExternalLink, Trash2, Check, AlertTriangle, Lock, LockOpen } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

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

// Smart lock-order balance:
// The changed stage locks in. Only UNLOCKED stages absorb the remainder.
// If all are locked, the changed stage is clamped to what's available.
function smartBalance(funnel, changedStage, newPct) {
  const f = JSON.parse(JSON.stringify(funnel));
  const enabled = STAGES.filter(s => f[s].enabled);

  // Lock the changed stage
  f[changedStage].locked = true;

  // Other stages that are already locked (not the one being changed)
  const otherLocked = enabled.filter(s => s !== changedStage && f[s].locked);
  const unlocked = enabled.filter(s => s !== changedStage && !f[s].locked);

  // How much budget the other locked stages consume
  const otherLockedTotal = otherLocked.reduce((sum, s) => sum + f[s].budget_pct, 0);

  // Clamp the new value so we can't exceed what's left after other locked stages
  const available = 100 - otherLockedTotal;
  const clamped = Math.min(Math.max(0, Math.round(newPct)), available);
  f[changedStage].budget_pct = clamped;

  const remaining = available - clamped;

  if (unlocked.length === 0) return f; // all locked — just take the clamped value

  // Distribute remainder to unlocked stages proportionally
  const unlockedTotal = unlocked.reduce((sum, s) => sum + f[s].budget_pct, 0);
  let distributed = 0;
  unlocked.forEach((s, i) => {
    const isLast = i === unlocked.length - 1;
    const share = isLast
      ? remaining - distributed
      : unlockedTotal > 0
        ? Math.round(remaining * f[s].budget_pct / unlockedTotal)
        : Math.round(remaining / unlocked.length);
    f[s].budget_pct = Math.max(0, share);
    distributed += f[s].budget_pct;
  });

  return f;
}

// When a stage is toggled on/off, reset ALL locks and redistribute evenly
function toggleStage(funnel, stage) {
  const f = JSON.parse(JSON.stringify(funnel));
  const wouldDisable = f[stage].enabled;
  const enabledCount = STAGES.filter(s => f[s].enabled).length;
  if (wouldDisable && enabledCount === 1) return f;
  f[stage].enabled = !f[stage].enabled;
  // Reset all locks so the user starts fresh
  STAGES.forEach(s => { f[s].locked = false; });
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
    <p className="text-[9px] font-bold uppercase tracking-widest ml-1" style={{ color: '#6B7080' }}>{label}</p>
    {children}
  </div>
);

const ic = 'w-full bg-[rgba(244,244,246,0.04)] border border-[rgba(244,244,246,0.1)] rounded-xl px-4 py-3 text-sm font-medium text-[#F4F4F6] focus:outline-none focus:ring-1 focus:ring-[rgba(244,244,246,0.2)]';
const sc = ic + ' cursor-pointer appearance-none';

// Extracted OUTSIDE the parent component to prevent remount on every render
function Toggle({ checked, onChange }) {
  return (
    <div
      onClick={onChange}
      className="h-5 w-9 rounded-full transition-all relative cursor-pointer shrink-0"
      style={{ background: checked ? '#3362FF' : 'rgba(244,244,246,0.1)' }}
    >
      <div
        className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
        style={{ left: checked ? '16px' : '2px' }}
      />
    </div>
  );
}

function FunnelCard({ stage, label, color, stageData, budget, daily, sym, onToggle, onPctChange, onUnlock, onFieldChange, onPlatformToggle }) {
  const s = stageData;
  return (
    <div className={cn('p-6 space-y-5 border-t-2 rounded-2xl', color)} style={{ background: '#0D0F1E', border: '1px solid rgba(244,244,246,0.07)', borderTopWidth: '2px' }}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#6B7080' }}>{label}</p>
          <p className="text-sm font-semibold mt-0.5" style={{ color: '#F4F4F6' }}>{s.focus}</p>
        </div>
        <Toggle checked={s.enabled} onChange={onToggle} />
      </div>
      {s.enabled && (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <input
              type="number" min={0} max={100} value={s.budget_pct}
              onChange={e => onPctChange(+e.target.value)}
              className="w-20 rounded-xl px-3 py-2.5 text-sm font-mono text-center focus:outline-none focus:ring-1 transition-all"
              style={s.locked
                ? { background: '#3362FF', color: '#fff', border: '1px solid #3362FF', fontWeight: 'bold' }
                : { background: 'rgba(244,244,246,0.04)', border: '1px solid rgba(244,244,246,0.1)', color: '#F4F4F6' }
              }
            />
            <button
              onClick={onUnlock}
              title={s.locked ? 'Locked — click to unlock and make auto' : 'Unlocked — auto-adjusts'}
              className="p-1.5 rounded-lg transition-all shrink-0"
              style={{ color: s.locked ? '#F4F4F6' : '#6B7080' }}
            >
              {s.locked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
            </button>
            <div className="text-xs font-medium leading-relaxed" style={{ color: '#6B7080' }}>
              {!s.locked && <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#F59E0B' }}>auto · </span>}
              <span className="font-semibold" style={{ color: '#F4F4F6' }}>
                {sym} {(budget * s.budget_pct / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total
                &nbsp;·&nbsp;
                {sym} {(daily * s.budget_pct / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/day
              </span>
            </div>
          </div>

          <F label="Canais Ativos">
            <div className="flex flex-wrap gap-2 mt-1">
              {PLATFORMS.map(p => {
                const active = s.platforms?.[p.key];
                return (
                  <button
                    key={p.key}
                    onClick={() => onPlatformToggle?.(p.key)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-bold transition-all border',
                      active
                        ? cn(p.color, 'text-white border-transparent shadow-sm')
                        : ''
                    )}
                    style={!active ? { background: 'rgba(244,244,246,0.04)', border: '1px solid rgba(244,244,246,0.1)', color: '#6B7080' } : {}}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </F>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <F label="Objetivo da Etapa"><input value={s.objective || ''} onChange={e => onFieldChange('objective', e.target.value)} className={ic} placeholder="Ex: Reconhecimento, Captura..." /></F>
            <F label="Tipo de Campanha">
              <CustomSelect
                value={s.campaign_type || ''}
                onChange={v => onFieldChange('campaign_type', v)}
                placeholder="Selecione..."
                options={[
                  { value: 'Pesquisa (Search)', label: 'Pesquisa (Search)' },
                  { value: 'Performance Max', label: 'Performance Max' },
                  { value: 'Display / Rede de Display', label: 'Display / Rede de Display' },
                  { value: 'Vídeo (YouTube / Reels)', label: 'Vídeo (YouTube / Reels)' },
                  { value: 'Shopping / E-commerce', label: 'Shopping / E-commerce' },
                  { value: 'Engajamento (Social)', label: 'Engajamento (Social)' },
                  { value: 'Geração de Cadastros (Lead)', label: 'Geração de Cadastros (Lead)' },
                  { value: 'Mensagens (WhatsApp)', label: 'Mensagens (WhatsApp)' },
                  { value: 'Remarketing Dinâmico', label: 'Remarketing Dinâmico' },
                ]}
              />
            </F>
            <F label="Tipo de Criativo"><input value={s.creative_type || ''} onChange={e => onFieldChange('creative_type', e.target.value)} className={ic} placeholder="Ex: Vídeo Reels, Banner Estático..." /></F>
            <F label="Ação de Conversão"><input value={s.conversion_action || ''} onChange={e => onFieldChange('conversion_action', e.target.value)} className={ic} placeholder="Ex: Clique no Link, Compra..." /></F>
          </div>

          {stage === 'tofu' && <>
            <F label="Definição de Público"><input value={s.audience} onChange={e => onFieldChange('audience', e.target.value)} className={ic} placeholder="Demografia, interesses, lookalikes..." /></F>
            <F label="Palavras-chave / Termos"><textarea value={s.keywords} onChange={e => onFieldChange('keywords', e.target.value)} rows={2} className={ic + ' resize-none'} placeholder="Termos de marca, buscas informativas..." /></F>
          </>}
          {stage === 'mofu' && <>
            <F label="Lógica de Remarketing"><textarea value={s.remarketing_logic} onChange={e => onFieldChange('remarketing_logic', e.target.value)} rows={2} className={ic + ' resize-none'} placeholder="Ex: Visitou a página mas não comprou..." /></F>
          </>}
          {stage === 'bofu' && <>
            <F label="Palavras-chave de Alta Intenção"><textarea value={s.keywords} onChange={e => onFieldChange('keywords', e.target.value)} rows={2} className={ic + ' resize-none'} placeholder="Comprar agora, melhor preço, contratar..." /></F>
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
  keywords: { primary: '', secondary: '', negative: '' },
  market_data: { potential_volume: 50000 },
  funnel: {
    tofu: { enabled: true, locked: false, platforms: { google: true, meta: true, tiktok: false, linkedin: false }, focus: 'Brand Awareness / Traffic', audience: '', keywords: '', budget_pct: 40, objective: 'Descoberta', creative_type: 'Vídeos / Reels', conversion_action: 'Visualização / Clique', campaign_type: 'Display / Social' },
    mofu: { enabled: true, locked: false, platforms: { google: true, meta: true, tiktok: false, linkedin: false }, focus: 'Consideration / Engagement', remarketing_logic: '', budget_pct: 30, objective: 'Retenção / Consideração', creative_type: 'Carrossel / Depoimentos', conversion_action: 'Visita à Landing Page', campaign_type: 'Remarketing' },
    bofu: { enabled: true, locked: false, platforms: { google: true, meta: true, tiktok: false, linkedin: false }, focus: 'Direct Response / Conversion', conversion_flow: '', keywords: '', budget_pct: 30, objective: 'Conversão Direta', creative_type: 'Oferta / Escassez', conversion_action: 'Compra / Lead', campaign_type: 'Pesquisa / Shopping' },
  },
  conversion: { goal: 'Lead', flow: '', attribution: 'Data-Driven', tracking: 'GA4 + GTM' },
  audience: { age: '', gender: 'All', location: '', interests: '', devices: 'All Devices', potential_volume: 50000 },
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
  const [editingId, setEditingId] = useState(null);

  const makeFunnelHandlers = (stage) => ({
    onToggle: () => setForm(f => ({ ...f, funnel: toggleStage(f.funnel, stage) })),
    onPctChange: (v) => setForm(f => ({ ...f, funnel: smartBalance(f.funnel, stage, v) })),
    onUnlock: () => setForm(f => ({ ...f, funnel: { ...f.funnel, [stage]: { ...f.funnel[stage], locked: false } } })),
    onFieldChange: (field, v) => setForm(f => ({ ...f, funnel: { ...f.funnel, [stage]: { ...f.funnel[stage], [field]: v } } })),
    onPlatformToggle: (plat) => setForm(f => {
      const stagePlats = f.funnel[stage].platforms || { google: false, meta: false, tiktok: false, linkedin: false };
      return {
        ...f,
        funnel: {
          ...f.funnel,
          [stage]: {
            ...f.funnel[stage],
            platforms: {
              ...stagePlats,
              [plat]: !stagePlats[plat]
            }
          }
        }
      };
    }),
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

    const payload = {
      name: form.name, client_id: form.client_id || null, currency: form.currency,
      total_budget: Math.round(budget * 100) / 100,
      days, start_date: form.start_date || null,
      target_kpi: { type: form.target_kpi.type, value: Number(form.target_kpi.value) },
      funnel: form.funnel, mediums: form.mediums,
      keywords: form.keywords,
      conversion: { ...form.conversion, _creative: form.creative },
      audience: { ...form.audience, potential_volume: Number(form.audience?.potential_volume || 50000) },
    };

    let data, error;
    if (editingId) {
      const res = await supabase.from('ad_plans').update(payload).eq('id', editingId).select('id').single();
      data = res.data; error = res.error;
    } else {
      const res = await supabase.from('ad_plans').insert([payload]).select('id').single();
      data = res.data; error = res.error;
    }

    setSaving(false);
    if (error) return toast.error('Failed to save: ' + error.message);
    toast.success(editingId ? 'Plan updated! Link copied to clipboard.' : 'Plan saved! Link copied to clipboard.');
    setEditingId(null);
    loadPlans();
    setTab('plans');
    copyLink(data.id);
  };

  const toggleActive = async (id, current) => {
    await supabase.from('ad_plans').update({ is_active: !current }).eq('id', id);
    loadPlans();
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

  const handleEdit = (plan) => {
    // Restore creative from conversion JSONB if it exists there to fix legacy schema mismatch
    if (plan.conversion && plan.conversion._creative) {
      plan.creative = plan.conversion._creative;
    }
    // Restore potential_volume from market_data if it exists there
    if (plan.market_data?.potential_volume && !plan.audience?.potential_volume) {
      if (!plan.audience) plan.audience = {};
      plan.audience.potential_volume = plan.market_data.potential_volume;
    }
    setForm(plan);
    setEditingId(plan.id);
    setTab('builder');
  };

  const handleCreateNew = () => {
    setForm(DEFAULT);
    setEditingId(null);
    setTab('builder');
  };


  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-24">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#6B7080' }}>Advertising Intelligence</span>
          <div className="h-px w-8" style={{ background: 'rgba(244,244,246,0.1)' }} />
        </div>
        <h1 className="text-5xl font-serif tracking-tight" style={{ color: '#F4F4F6' }}>Ads Planning</h1>
        <p className="text-base max-w-xl" style={{ color: '#6B7080' }}>Build structured campaign briefs. Share a live plan URL with clients — no login required.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1" style={{ borderBottom: '1px solid rgba(244,244,246,0.07)' }}>
        <button onClick={handleCreateNew}
          className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest border-b-2 -mb-px transition-all"
          style={tab === 'builder' && !editingId
            ? { borderColor: '#3362FF', color: '#F4F4F6' }
            : { borderColor: 'transparent', color: '#6B7080' }
          }>
          New Plan
        </button>
        {editingId && (
          <button onClick={() => setTab('builder')}
            className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest border-b-2 -mb-px transition-all"
            style={tab === 'builder' && editingId
              ? { borderColor: '#F59E0B', color: '#F59E0B' }
              : { borderColor: 'transparent', color: 'rgba(245,158,11,0.6)' }
            }>
            Edit Plan
          </button>
        )}
        <button onClick={() => setTab('plans')}
          className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest border-b-2 -mb-px transition-all"
          style={tab === 'plans'
            ? { borderColor: '#3362FF', color: '#F4F4F6' }
            : { borderColor: 'transparent', color: '#6B7080' }
          }>
          Saved Plans ({plans.length})
        </button>
      </div>

      {/* Saved Plans Tab */}
      {tab === 'plans' && (
        <div className="space-y-4">
          {plans.length === 0 && (
            <div className="p-20 text-center space-y-4 rounded-2xl" style={{ background: '#0D0F1E', border: '1px solid rgba(244,244,246,0.07)' }}>
              <Megaphone className="h-8 w-8 mx-auto" style={{ color: 'rgba(244,244,246,0.15)' }} />
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(244,244,246,0.2)' }}>No plans saved yet</p>
              <button
                onClick={() => setTab('builder')}
                className="text-xs mt-2 px-6 py-3 rounded-xl transition-all"
                style={{ background: '#3362FF', color: '#F4F4F6', border: 'none' }}
              >
                Create Your First Plan
              </button>
            </div>
          )}
          {plans.map(p => (
            <div key={p.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl" style={{ background: '#0D0F1E', border: '1px solid rgba(244,244,246,0.07)' }}>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ background: p.is_active ? '#22C55E' : 'rgba(244,244,246,0.2)' }} />
                  <p className="text-base font-semibold" style={{ color: '#F4F4F6' }}>{p.name}</p>
                </div>
                <p className="text-[10px] font-medium" style={{ color: '#6B7080' }}>
                  {SYM[p.currency] || 'R$'} {parseFloat(p.total_budget).toLocaleString()} · {p.days} days · Created {new Date(p.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleActive(p.id, p.is_active)}
                  title={p.is_active ? 'Link is active — click to deactivate' : 'Link is inactive — click to activate'}
                  className="text-[10px] font-bold px-3 py-2 rounded-lg transition-all"
                  style={p.is_active
                    ? { color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)' }
                    : { color: '#6B7080', border: '1px solid rgba(244,244,246,0.1)', background: 'rgba(244,244,246,0.04)' }
                  }>
                  {p.is_active ? 'Link Active' : 'Link Off'}
                </button>
                <button onClick={() => copyLink(p.id)}
                  className="flex items-center gap-2 text-[10px] font-bold rounded-lg px-3 py-2 transition-all"
                  style={{ color: '#6B7080', border: '1px solid rgba(244,244,246,0.1)', background: 'rgba(244,244,246,0.04)' }}>
                  {copiedId === p.id ? <><Check className="h-3.5 w-3.5" style={{ color: '#22C55E' }} />Copied!</> : <><Copy className="h-3.5 w-3.5" />Copy Link</>}
                </button>
                <button onClick={() => handleEdit(p)} className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold rounded-lg transition-all" style={{ color: '#818cf8', border: '1px solid rgba(129,140,248,0.3)', background: 'rgba(129,140,248,0.06)' }}>
                  Edit
                </button>
                <a href={`/plan/${p.id}`} target="_blank" rel="noreferrer"
                  className="p-2 rounded-lg transition-all"
                  style={{ color: '#6B7080', border: '1px solid rgba(244,244,246,0.1)' }}>
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button onClick={() => deletePlan(p.id)} className="p-2 transition-colors" style={{ color: 'rgba(244,244,246,0.2)' }}>
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
            <div className="p-8 space-y-6 rounded-2xl" style={{ background: '#0D0F1E', border: '1px solid rgba(244,244,246,0.07)' }}>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#6B7080' }}>Section A</p>
                <h3 className="text-xl font-serif mt-1" style={{ color: '#F4F4F6' }}>Campaign Meta &amp; Financials</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <F label="Plan / Campaign Name">
                  <input value={form.name} onChange={e => set('name', e.target.value)} className={ic} placeholder="Q2 Lead Gen — Brand X" />
                </F>
                <F label="Client">
                  <CustomSelect value={form.client_id} onChange={v => set('client_id', v)} options={[{ value: '', label: '— General / No client —' }, ...clients.map(c => ({ value: c.id, label: c.name }))]} />
                </F>
                <F label="Orçamento Total">
                  <div className="flex gap-2">
                    <CustomSelect value={form.currency} onChange={v => set('currency', v)} style={{ width: '90px' }} options={[{ value: 'BRL', label: 'BRL' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }]} />
                    <input type="number" value={form.total_budget} onChange={e => set('total_budget', e.target.value)} className={ic} placeholder="5000.00" />
                  </div>
                </F>
                <F label="Duração da Campanha (Dias)">
                  <input type="number" min={1} value={form.days} onChange={e => set('days', e.target.value)} className={ic} placeholder="30" />
                </F>
                <F label="Data de Início">
                  <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={ic} />
                </F>
                <F label="KPI Alvo">
                  <div className="flex gap-2">
                    <CustomSelect value={form.target_kpi.type} onChange={v => set('target_kpi.type', v)} style={{ width: '100px' }} options={['CPA', 'ROAS', 'Leads', 'CPL'].map(t => ({ value: t, label: t }))} />
                    <input type="number" value={form.target_kpi.value} onChange={e => set('target_kpi.value', e.target.value)} className={ic} placeholder={form.target_kpi.type === 'ROAS' ? 'Ex: 4' : 'Ex: 50'} />
                  </div>
                </F>
                <F label="Volume de Pesquisa Mensal (Estimado)">
                  <input type="number" value={form.audience?.potential_volume || ''} onChange={e => set('audience.potential_volume', e.target.value)} className={ic} placeholder="Ex: 50000" />
                </F>
              </div>
            </div>

            {/* A2: Advertising Mediums */}
            <div className="p-8 space-y-5 rounded-2xl" style={{ background: '#0D0F1E', border: '1px solid rgba(244,244,246,0.07)' }}>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#6B7080' }}>Seção A2</p>
                <h3 className="text-xl font-serif mt-1" style={{ color: '#F4F4F6' }}>Canais de Mídia</h3>
                <p className="text-xs mt-1" style={{ color: '#6B7080' }}>Selecione todas as plataformas onde a campanha será veiculada.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PLATFORMS.map(p => {
                  const active = form.mediums?.[p.key];
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, mediums: { ...f.mediums, [p.key]: !f.mediums?.[p.key] } }))}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all"
                      style={active
                        ? { background: '#3362FF', color: '#F4F4F6', border: '1px solid #3362FF' }
                        : { background: 'rgba(244,244,246,0.04)', color: '#6B7080', border: '1px solid rgba(244,244,246,0.1)' }
                      }
                    >
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ background: active ? '#F4F4F6' : 'rgba(244,244,246,0.2)' }} />
                      <span className="text-[11px] font-bold uppercase tracking-widest leading-tight">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>


            {/* A3: Keywords */}
            <div className="p-8 space-y-6 rounded-2xl" style={{ background: '#0D0F1E', border: '1px solid rgba(244,244,246,0.07)' }}>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#6B7080' }}>Seção A3</p>
                <h3 className="text-xl font-serif mt-1" style={{ color: '#F4F4F6' }}>Palavras-chave da Campanha</h3>
                <p className="text-xs mt-1" style={{ color: '#6B7080' }}>Uma palavra-chave por linha, ou separada por vírgula.</p>
              </div>
              <div className="space-y-5">
                <F label="🎯 Palavras-chave Principais — Alta intenção, lance alto">
                  <textarea
                    value={form.keywords.primary}
                    onChange={e => set('keywords.primary', e.target.value)}
                    rows={3} className={ic + ' resize-none font-mono text-xs'}
                    placeholder="comprar apartamento sp&#10;imovel alto padrao sao paulo&#10;apartamento 3 quartos zona sul"
                  />
                </F>
                <F label="Secondary Keywords — Supporting intent, broader reach">
                  <textarea
                    value={form.keywords.secondary}
                    onChange={e => set('keywords.secondary', e.target.value)}
                    rows={3} className={ic + ' resize-none font-mono text-xs'}
                    placeholder="imoveis sp&#10;apartamentos a venda&#10;construtora sp"
                  />
                </F>
                <F label="🚫 Negative Keywords — Exclude irrelevant traffic">
                  <textarea
                    value={form.keywords.negative}
                    onChange={e => set('keywords.negative', e.target.value)}
                    rows={2} className={ic + ' resize-none font-mono text-xs'}
                    placeholder="gratis, aluguel, curso, emprego"
                  />
                </F>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#6B7080' }}>Section B</p>
                <h3 className="text-xl font-serif mt-1" style={{ color: '#F4F4F6' }}>Funnel Architecture &amp; Allocation</h3>
              </div>
              <div className={cn('text-[10px] font-bold rounded-xl px-4 py-3 flex items-center gap-2')}
                style={totalPct === 100
                  ? { background: 'rgba(34,197,94,0.08)', color: '#22C55E' }
                  : totalPct > 100
                    ? { background: 'rgba(255,59,92,0.08)', color: '#FF3B5C' }
                    : { background: 'rgba(245,158,11,0.08)', color: '#F59E0B' }
                }>
                {totalPct !== 100 && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                {totalPct === 100 ? '✓ Budget fully allocated (100%)' : totalPct > 100 ? `Over-allocated by ${totalPct - 100}% — reduce allocation` : `${100 - totalPct}% unallocated — assign remaining budget`}
              </div>
              <FunnelCard stage="tofu" label="1. Top of Funnel" color="border-blue-500" stageData={form.funnel.tofu} budget={budget} daily={daily} sym={sym} {...makeFunnelHandlers('tofu')} />
              <FunnelCard stage="mofu" label="2. Middle of Funnel" color="border-indigo-500" stageData={form.funnel.mofu} budget={budget} daily={daily} sym={sym} {...makeFunnelHandlers('mofu')} />
              <FunnelCard stage="bofu" label="3. Bottom of Funnel" color="border-emerald-500" stageData={form.funnel.bofu} budget={budget} daily={daily} sym={sym} {...makeFunnelHandlers('bofu')} />
            </div>

            {/* C: Conversion */}
            <div className="p-8 space-y-6 rounded-2xl" style={{ background: '#0D0F1E', border: '1px solid rgba(244,244,246,0.07)' }}>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#6B7080' }}>Section C</p>
                <h3 className="text-xl font-serif mt-1" style={{ color: '#F4F4F6' }}>Conversion Flow</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <F label="Primary Goal">
                  <CustomSelect value={form.conversion.goal} onChange={v => set('conversion.goal', v)} options={['Lead', 'Purchase', 'Call', 'Form Submit', 'App Install'].map(g => ({ value: g, label: g }))} />
                </F>
                <F label="Attribution Model">
                  <CustomSelect value={form.conversion.attribution} onChange={v => set('conversion.attribution', v)} options={['Data-Driven', 'Last Click', 'Linear', 'First Click', 'Time Decay'].map(a => ({ value: a, label: a }))} />
                </F>
                <F label="Tracking Setup">
                  <CustomSelect value={form.conversion.tracking} onChange={v => set('conversion.tracking', v)} options={['GA4 + GTM', 'Meta Pixel', 'GA4 Only', 'GTM Only', 'Custom'].map(t => ({ value: t, label: t }))} />
                </F>
                <F label="Conversion Flow Path">
                  <input value={form.conversion.flow} onChange={e => set('conversion.flow', e.target.value)} className={ic} placeholder="Ex: Pesquisa Google → Página do Produto → Compra → Obrigado → Tracking" />
                </F>
              </div>
            </div>

            {/* D: Audience */}
            <div className="p-8 space-y-6 rounded-2xl" style={{ background: '#0D0F1E', border: '1px solid rgba(244,244,246,0.07)' }}>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#6B7080' }}>Section D</p>
                <h3 className="text-xl font-serif mt-1" style={{ color: '#F4F4F6' }}>Audience Targeting</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <F label="Age Range"><input value={form.audience.age} onChange={e => set('audience.age', e.target.value)} className={ic} placeholder="25–54" /></F>
                <F label="Gender">
                  <CustomSelect value={form.audience.gender} onChange={v => set('audience.gender', v)} options={['All', 'Male', 'Female'].map(g => ({ value: g, label: g }))} />
                </F>
                <F label="Location"><input value={form.audience.location} onChange={e => set('audience.location', e.target.value)} className={ic} placeholder="São Paulo, SP — Brazil" /></F>
                <F label="Devices">
                  <CustomSelect value={form.audience.devices} onChange={v => set('audience.devices', v)} options={['All Devices', 'Mobile Only', 'Desktop Only', 'Mobile + Tablet'].map(d => ({ value: d, label: d }))} />
                </F>
                <div className="sm:col-span-2">
                  <F label="Interests &amp; Intent Audiences">
                    <textarea value={form.audience.interests} onChange={e => set('audience.interests', e.target.value)} rows={2} className={ic + ' resize-none'} placeholder="In-market: Real Estate, Business Services, Financial Products..." />
                  </F>
                </div>
              </div>
            </div>

            {/* E: Creative */}
            <div className="p-8 space-y-6 rounded-2xl" style={{ background: '#0D0F1E', border: '1px solid rgba(244,244,246,0.07)' }}>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#6B7080' }}>Section E</p>
                <h3 className="text-xl font-serif mt-1" style={{ color: '#F4F4F6' }}>Creative Notes</h3>
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

            <button onClick={handleSave} disabled={saving || totalPct !== 100}
              className="w-full h-16 flex items-center justify-center gap-3 text-[11px] font-bold uppercase tracking-widest rounded-2xl transition-all"
              style={totalPct === 100 && !saving
                ? editingId
                  ? { background: '#F59E0B', color: '#0D0F1E', cursor: 'pointer' }
                  : { background: '#3362FF', color: '#F4F4F6', cursor: 'pointer' }
                : { background: 'rgba(244,244,246,0.06)', color: 'rgba(244,244,246,0.2)', cursor: 'not-allowed' }
              }>
              {saving ? 'Saving...' : totalPct !== 100 ? `Allocate remaining ${100 - totalPct}% before saving` : (editingId ? 'Update Plan & Keep Link Active' : 'Save Plan & Generate Share Link')}
            </button>
          </div>

          {/* Calc Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 space-y-6">
              <div className="p-6 space-y-6 rounded-2xl" style={{ background: '#0D0F1E', border: '1px solid rgba(244,244,246,0.07)' }}>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#6B7080' }}>Live Budget Breakdown</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-end pb-3" style={{ borderBottom: '1px solid rgba(244,244,246,0.07)' }}>
                    <span className="text-xs" style={{ color: '#6B7080' }}>Total</span>
                    <span className="font-serif text-2xl" style={{ color: '#F4F4F6' }}>{money(budget, sym)}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-xs" style={{ color: '#6B7080' }}>Daily</span>
                    <span className="font-serif text-xl" style={{ color: '#F4F4F6' }}>{money(daily, sym)}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-xs" style={{ color: '#6B7080' }}>Duration</span>
                    <span className="text-sm font-medium" style={{ color: '#F4F4F6' }}>{days} days</span>
                  </div>
                </div>
                <div className="space-y-3 pt-2" style={{ borderTop: '1px solid rgba(244,244,246,0.07)' }}>
                  {[
                    { stage: 'tofu', label: 'TOFU', color: '#38bdf8' },
                    { stage: 'mofu', label: 'MOFU', color: '#a78bfa' },
                    { stage: 'bofu', label: 'BOFU', color: '#10b981' },
                  ].map(({ stage, label, color }) => {
                    const s = form.funnel[stage];
                    if (!s.enabled) return null;
                    return (
                      <div key={stage} className="space-y-1.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="font-bold" style={{ color: '#F4F4F6' }}>{label} ({s.budget_pct}%)</span>
                          <span style={{ color: '#6B7080' }}>{money(daily * s.budget_pct / 100, sym)}/day</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(244,244,246,0.07)' }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min(s.budget_pct, 100)}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {(projConversions || projROAS) && (
                <div className="p-6 space-y-4 rounded-2xl" style={{ background: '#0D0F1E', border: '1px solid rgba(244,244,246,0.07)' }}>
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#6B7080' }}>Projections</p>
                  {projConversions && (
                    <div className="space-y-1">
                      <p className="text-3xl font-serif" style={{ color: '#22C55E' }}>{projConversions.toLocaleString()}</p>
                      <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: '#6B7080' }}>Est. Conversions (BOFU @ {sym}{kpiVal} CPA)</p>
                    </div>
                  )}
                  {projROAS && (
                    <div className="space-y-1">
                      <p className="text-3xl font-serif" style={{ color: '#22C55E' }}>{money(projROAS, sym)}</p>
                      <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: '#6B7080' }}>Est. Revenue (BOFU @ {kpiVal}x ROAS)</p>
                    </div>
                  )}
                </div>
              )}

              {totalPct > 0 && (
                <div className="p-6 space-y-4 rounded-2xl" style={{ background: '#0D0F1E', border: '1px solid rgba(244,244,246,0.07)' }}>
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#6B7080' }}>Alocação de Funil</p>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'TOFU', value: form.funnel?.tofu?.budget_pct || 0 },
                            { name: 'MOFU', value: form.funnel?.mofu?.budget_pct || 0 },
                            { name: 'BOFU', value: form.funnel?.bofu?.budget_pct || 0 },
                          ].filter(d => d.value > 0)}
                          cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value" stroke="none"
                        >
                          <Cell fill="#38bdf8" />
                          <Cell fill="#a78bfa" />
                          <Cell fill="#10b981" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="p-6 space-y-3 rounded-2xl" style={{ background: 'rgba(244,244,246,0.03)', border: '1px solid rgba(244,244,246,0.07)' }}>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#6B7080' }}>How Sharing Works</p>
                <p className="text-xs leading-relaxed" style={{ color: '#6B7080' }}>After saving, you get a unique URL your client can open — no login required. The plan is read-only and renders as a premium branded brief.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
