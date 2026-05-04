import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Copy, Check, Printer } from 'lucide-react';

const SYM = { BRL: 'R$', USD: '$', EUR: '€' };
const money = (n, sym) => `${sym} ${(parseFloat(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const FUNNEL_CFG = [
  { key: 'tofu', label: 'Top of Funnel', sub: 'TOFU · Cold Audience', accent: '#38bdf8', bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.25)' },
  { key: 'mofu', label: 'Middle of Funnel', sub: 'MOFU · Remarketing', accent: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.25)' },
  { key: 'bofu', label: 'Bottom of Funnel', sub: 'BOFU · Conversion', accent: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.25)' },
];

export default function AdPlanView() {
  const { id } = useParams();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase.from('ad_plans').select('*').eq('id', id).single()
      .then(({ data, error }) => { setPlan(error ? null : data); setLoading(false); });
  }, [id]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const s = {
    page: { background: '#01020E', color: '#F4F4F6', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" },
    topbar: { background: 'rgba(13,15,30,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(244,244,246,0.07)', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 },
    section: { padding: '48px 32px', maxWidth: 1100, margin: '0 auto' },
    card: { background: 'rgba(13,15,30,0.8)', border: '1px solid rgba(244,244,246,0.07)', borderRadius: 16, padding: 24 },
    label: { fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6B7080' },
    mono: { fontFamily: "'JetBrains Mono', monospace" },
    serif: { fontFamily: "'DM Serif Display', serif", fontWeight: 400 },
    btn: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(244,244,246,0.12)', background: 'rgba(244,244,246,0.05)', color: '#F4F4F6', cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none' },
  };

  if (loading) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #3362FF', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!plan) return (
    <div style={{ ...s.page, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <p style={{ ...s.label, fontSize: 11 }}>Plan not found</p>
      <p style={{ color: '#6B7080', fontSize: 14 }}>This plan may have been deleted or the link is invalid.</p>
    </div>
  );

  const sym = SYM[plan.currency] || 'R$';
  const daily = plan.total_budget / plan.days;
  const funnel = plan.funnel || {};
  const conv = plan.conversion || {};
  const aud = plan.audience || {};
  const cre = plan.creative || {};
  const kpi = plan.target_kpi || {};

  const activeFunnel = FUNNEL_CFG.filter(f => funnel[f.key]?.enabled);
  const med = plan.mediums || {};
  const PLATFORM_LABELS = { google: 'Google Ads', meta: 'Meta Ads', tiktok: 'TikTok Ads', linkedin: 'LinkedIn Ads' };
  const activeMediums = Object.entries(med).filter(([, v]) => v).map(([k]) => PLATFORM_LABELS[k] || k);

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        @media print { .no-print { display: none !important; } body { background: #01020E !important; } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
        .fade-up { animation: fadeUp 0.5s ease forwards; }
      `}</style>

      {/* Topbar */}
      <div style={s.topbar} className="no-print">
        <div>
          <p style={{ ...s.label, color: '#3362FF', marginBottom: 2 }}>Adexra · Ads Plan</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#F4F4F6' }}>{plan.name}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={copyLink} style={s.btn}>
            {copied ? <><Check size={14} color="#34d399" />Copied!</> : <><Copy size={14} />Copy Link</>}
          </button>
          <button onClick={() => window.print()} style={s.btn}>
            <Printer size={14} />Export PDF
          </button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ ...s.section, paddingBottom: 0 }} className="fade-up">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 48 }}>
          {[
            { label: 'Total Budget', value: money(plan.total_budget, sym), accent: '#3362FF' },
            { label: 'Daily Budget', value: money(daily, sym), accent: '#a78bfa' },
            { label: 'Duration', value: `${plan.days} days`, accent: '#38bdf8' },
            kpi.type && kpi.value ? { label: `Target ${kpi.type}`, value: kpi.type === 'ROAS' ? `${kpi.value}x` : money(kpi.value, sym), accent: '#34d399' } : null,
          ].filter(Boolean).map((item, i) => (
            <div key={i} style={{ ...s.card, borderTop: `2px solid ${item.accent}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={s.label}>{item.label}</p>
              <p style={{ ...s.serif, fontSize: 28, color: item.accent }}>{item.value}</p>
            </div>
          ))}
        </div>

        {activeMediums.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {activeMediums.map(m => (
              <span key={m} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', background: 'rgba(51,98,255,0.12)', border: '1px solid rgba(51,98,255,0.3)', color: '#6b8fff', borderRadius: 8, padding: '6px 12px' }}>{m}</span>
            ))}
          </div>
        )}
        {plan.start_date && (
          <p style={{ ...s.label, marginBottom: 48 }}>
            Start Date: <span style={{ color: '#F4F4F6' }}>{new Date(plan.start_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
          </p>
        )}
      </div>

      {/* Funnel Architecture */}
      {activeFunnel.length > 0 && (
        <div style={s.section}>
          <p style={{ ...s.label, marginBottom: 8 }}>Funnel Architecture</p>
          <p style={{ ...s.serif, fontSize: 32, marginBottom: 32, color: '#F4F4F6' }}>Campaign Flow</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {activeFunnel.map((fc, i) => {
              const stage = funnel[fc.key];
              const stageBudget = plan.total_budget * stage.budget_pct / 100;
              const stageDaily = daily * stage.budget_pct / 100;
              return (
                <div key={fc.key} style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
                  {/* Connector line */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0 }}>
                    <div style={{ width: 2, height: i === 0 ? 24 : 0, background: 'transparent' }} />
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: fc.accent, flexShrink: 0 }} />
                    {i < activeFunnel.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 24, background: `linear-gradient(${fc.accent}, ${activeFunnel[i+1].accent})`, opacity: 0.4 }} />}
                  </div>
                  <div style={{ flex: 1, paddingLeft: 16, paddingBottom: i < activeFunnel.length - 1 ? 24 : 0 }}>
                    <div style={{ background: fc.bg, border: `1px solid ${fc.border}`, borderRadius: 14, padding: '20px 24px', marginBottom: i < activeFunnel.length - 1 ? 0 : 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                        <div>
                          <p style={{ ...s.label, color: fc.accent, marginBottom: 4 }}>{fc.sub}</p>
                          <p style={{ fontSize: 16, fontWeight: 600, color: '#F4F4F6' }}>{stage.focus}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ ...s.serif, fontSize: 22, color: fc.accent }}>{money(stageBudget, sym)}</p>
                          <p style={{ ...s.label, marginTop: 2 }}>{money(stageDaily, sym)}/day · {stage.budget_pct}%</p>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 12 }}>
                        {fc.key === 'tofu' && <>
                          {stage.audience && <div><p style={s.label}>Audience</p><p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>{stage.audience}</p></div>}
                          {stage.keywords && <div><p style={s.label}>Keywords</p><p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>{stage.keywords}</p></div>}
                        </>}
                        {fc.key === 'mofu' && stage.remarketing_logic && (
                          <div><p style={s.label}>Remarketing Logic</p><p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>{stage.remarketing_logic}</p></div>
                        )}
                        {fc.key === 'bofu' && <>
                          {stage.conversion_flow && <div><p style={s.label}>Conversion Flow</p><p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>{stage.conversion_flow}</p></div>}
                          {stage.keywords && <div><p style={s.label}>High-Intent Keywords</p><p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>{stage.keywords}</p></div>}
                        </>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Conversion + Audience */}
      <div style={{ ...s.section, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 20 }}>
        {/* Conversion */}
        <div style={s.card}>
          <p style={{ ...s.label, marginBottom: 16 }}>Conversion Strategy</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { label: 'Primary Goal', value: conv.goal },
              { label: 'Attribution', value: conv.attribution },
              { label: 'Tracking', value: conv.tracking },
              conv.flow ? { label: 'Funnel Path', value: conv.flow } : null,
            ].filter(Boolean).map((item, i) => (
              <div key={i} style={item.label === 'Funnel Path' ? { gridColumn: '1/-1' } : {}}>
                <p style={s.label}>{item.label}</p>
                <p style={{ fontSize: 13, color: '#F4F4F6', fontWeight: 500, marginTop: 4 }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Audience */}
        <div style={s.card}>
          <p style={{ ...s.label, marginBottom: 16 }}>Audience Targeting</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              aud.age ? { label: 'Age Range', value: aud.age } : null,
              { label: 'Gender', value: aud.gender },
              aud.location ? { label: 'Location', value: aud.location } : null,
              { label: 'Devices', value: aud.devices },
              aud.interests ? { label: 'Interests', value: aud.interests } : null,
            ].filter(Boolean).map((item, i) => (
              <div key={i} style={item.label === 'Interests' || item.label === 'Location' ? { gridColumn: '1/-1' } : {}}>
                <p style={s.label}>{item.label}</p>
                <p style={{ fontSize: 13, color: '#F4F4F6', fontWeight: 500, marginTop: 4 }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Creative Notes */}
      {(cre.hook || cre.cta || cre.formats || cre.landing_page) && (
        <div style={s.section}>
          <div style={s.card}>
            <p style={{ ...s.label, marginBottom: 16 }}>Creative Direction</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 16 }}>
              {cre.formats && <div><p style={s.label}>Ad Formats</p><p style={{ fontSize: 13, color: '#F4F4F6', fontWeight: 500, marginTop: 4 }}>{cre.formats}</p></div>}
              {cre.cta && <div><p style={s.label}>Call to Action</p><p style={{ fontSize: 13, color: '#3362FF', fontWeight: 600, marginTop: 4 }}>{cre.cta}</p></div>}
              {cre.landing_page && <div><p style={s.label}>Landing Page</p><a href={cre.landing_page} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#38bdf8', fontWeight: 500, marginTop: 4, display: 'block', wordBreak: 'break-all' }}>{cre.landing_page}</a></div>}
              {cre.hook && <div style={{ gridColumn: '1/-1' }}><p style={s.label}>Key Hook / Message</p><p style={{ fontSize: 14, color: '#E5E7EB', marginTop: 6, lineHeight: 1.6, fontStyle: 'italic' }}>"{cre.hook}"</p></div>}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: '1px solid rgba(244,244,246,0.07)', padding: '32px', textAlign: 'center' }}>
        <p style={{ ...s.serif, fontSize: 20, color: '#F4F4F6', marginBottom: 4 }}>Adexra.</p>
        <p style={{ ...s.label }}>Advertising Data Experts · ROI Acceleration</p>
      </div>
    </div>
  );
}
