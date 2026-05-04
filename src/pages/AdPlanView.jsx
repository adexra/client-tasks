import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { 
  ChevronLeft, ArrowDown, Target, Activity, Settings, Clock, 
  BarChart2, Zap, LayoutTemplate, Share2, DollarSign,
  ChevronRight, Database, Code, Filter, Sparkles, CheckCircle2,
  Globe, Search, ArrowRight, ShoppingCart, User
} from 'lucide-react';

const SYM = { BRL: 'R$', USD: '$', EUR: '€' };

const PLATFORM_ICONS = {
  google: <Search className="h-4 w-4" />,
  meta: <Globe className="h-4 w-4" />,
  tiktok: <Activity className="h-4 w-4" />,
  linkedin: <User className="h-4 w-4" />
};

export default function AdPlanView() {
  const { id } = useParams();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.from('ad_plans').select('*, clients(name)').eq('id', id).single()
      .then(({ data, error }) => {
        if (error || !data) setError('Plan not found');
        else if (!data.is_active) setError('Plan is deactivated');
        else setPlan(data);
        
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
      <div className="h-16 w-16 bg-slate-900 rounded-full flex items-center justify-center mb-6">
        <Target className="h-8 w-8 text-slate-600" />
      </div>
      <h2 className="text-2xl font-serif mb-2">Unavailable</h2>
      <p className="text-slate-500 mb-8 max-w-sm">{error}</p>
      <Link to="/" className="btn-minimal btn-primary">Return to Dashboard</Link>
    </div>
  );

  const { name, client_id, clients, currency, total_budget, days, target_kpi, funnel, mediums, conversion } = plan;
  const sym = SYM[currency] || 'R$';
  const kpiVal = parseFloat(target_kpi?.value) || 0;
  const kpiType = target_kpi?.type || 'CPA';
  const budget = parseFloat(total_budget) || 0;
  
  // Calculations
  const bofuPct = funnel?.bofu?.budget_pct || 0;
  const bofuBudget = budget * (bofuPct / 100);
  
  let projValue = '--';
  if (kpiVal > 0) {
    if (kpiType === 'CPA' || kpiType === 'CPL' || kpiType === 'Leads') {
      projValue = Math.floor(bofuBudget / kpiVal).toLocaleString() + ` ${kpiType === 'CPA' ? 'Conversões' : 'Leads'}`;
    } else if (kpiType === 'ROAS') {
      projValue = `${sym} ${(bofuBudget * kpiVal).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    }
  }

  const clientName = clients?.name || name;

  // RevOps Parsing
  const rawFlowString = funnel?.bofu?.conversion_flow || conversion?.flow || "Ad > Landing Page > Lead > CRM";
  const flowSteps = rawFlowString.split('>').map(s => s.trim()).filter(Boolean);

  const getActivePlatforms = (stageId) => {
    const stagePlats = funnel?.[stageId]?.platforms;
    if (stagePlats) {
      return Object.entries(stagePlats).filter(([_, v]) => v).map(([k]) => k);
    }
    if (mediums) {
      return Object.entries(mediums).filter(([_, v]) => v).map(([k]) => k);
    }
    return [];
  };

  return (
    <div className="min-h-screen bg-[#031427] text-slate-200 font-sans selection:bg-emerald-500/30">
      
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 md:px-12 h-20 bg-slate-950/80 backdrop-blur-[20px] border-b border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-4">
          <Link to="/ad-planning" className="text-emerald-400 hover:text-emerald-300 transition-colors">
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <div className="text-2xl font-medium tracking-[0.2em] text-slate-50 uppercase font-serif">Adexra</div>
        </div>
        <nav className="hidden md:flex space-x-8 font-serif tracking-tight antialiased">
          <a className="text-emerald-400 border-b-2 border-emerald-500 pb-1 hover:text-emerald-300 transition-all duration-300" href="#">Strategic Flow</a>
          <a className="text-slate-400 hover:text-slate-100 transition-colors duration-300" href="#">Overview</a>
          <a className="text-slate-400 hover:text-slate-100 transition-colors duration-300" href="#">Investment</a>
          <a className="text-slate-400 hover:text-slate-100 transition-colors duration-300" href="#">Governance</a>
        </nav>
        <div className="flex space-x-4 text-emerald-500">
          <Settings className="h-6 w-6 hover:text-emerald-300 transition-all duration-300 cursor-pointer" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-12 pt-32 pb-32 space-y-20">
        
        {/* Executive HUD */}
        <section className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-5xl md:text-7xl font-serif text-white mb-10 text-center tracking-tight">Strategic Flow</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            <div className="glass-card rounded-xl p-8 flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Investimento Total</span>
              <span className="text-3xl md:text-4xl font-serif text-emerald-400">{sym} {budget.toLocaleString()}</span>
            </div>
            
            <div className="glass-card rounded-xl p-8 flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Prazo de Execução</span>
              <span className="text-3xl md:text-4xl font-serif text-white">{days || 30} Dias</span>
            </div>
            
            <div className="glass-card rounded-xl p-8 flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Meta de Retorno</span>
              <span className="text-3xl md:text-4xl font-serif text-white">{kpiVal} <span className="text-sm font-sans text-slate-400">{kpiType}</span></span>
            </div>
            
            <div className="glass-card rounded-xl p-8 flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Volume Estimado</span>
              <span className="text-3xl md:text-4xl font-serif text-white">{projValue}</span>
            </div>

          </div>
        </section>

        {/* The Golden Path & Investment GPS (Bento Grid Style) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Vertical Flow (Left Column) */}
          <div className="lg:col-span-8 relative">
            {/* Vertical Line */}
            <div className="absolute left-6 md:left-12 top-0 bottom-0 w-0.5 bg-slate-800 -ml-[1px]"></div>
            
            <div className="space-y-12 relative z-10">
              
              {/* TOFU */}
              {funnel?.tofu?.enabled && (
                <div className="glass-card rounded-xl p-8 ml-0 md:ml-24 flex flex-col md:flex-row gap-8 items-start relative">
                  <div className="absolute left-6 md:left-[-72px] -top-6 md:top-12 w-12 h-12 rounded-full bg-[#031427] flex items-center justify-center border-2 border-emerald-400 z-20">
                    <Filter className="text-emerald-400 h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 mt-6 md:mt-0">
                    <h2 className="text-3xl font-serif text-white mb-2">Atração (TOFU)</h2>
                    <p className="text-slate-400 mb-6">Foco: Quem estamos buscando</p>
                    
                    <div className="flex flex-wrap gap-4 mb-6">
                      {getActivePlatforms('tofu').map(p => (
                        <div key={p} className="bg-slate-900 px-4 py-2 rounded-full text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2 border border-white/5">
                          {PLATFORM_ICONS[p]} <span className="capitalize">{p}</span>
                        </div>
                      ))}
                    </div>

                    {(funnel.tofu.keywords || funnel.tofu.audience) && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Segmentação Alvo</span>
                        <div className="flex flex-wrap gap-2">
                          {(funnel.tofu.keywords || funnel.tofu.audience).split(/[,|\n]+/).filter(Boolean).map((kw, i) => (
                            <span key={i} className="px-3 py-1 bg-slate-800 rounded text-slate-200 text-sm">{kw.trim()}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MOFU */}
              {funnel?.mofu?.enabled && (
                <div className="glass-card rounded-xl p-8 ml-0 md:ml-24 flex flex-col md:flex-row gap-8 items-start relative">
                  <div className="absolute left-6 md:left-[-72px] -top-6 md:top-12 w-12 h-12 rounded-full bg-[#031427] flex items-center justify-center border-2 border-emerald-400 z-20">
                    <Sparkles className="text-emerald-400 h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 mt-6 md:mt-0">
                    <h2 className="text-3xl font-serif text-white mb-2">Nutrição (MOFU)</h2>
                    <p className="text-slate-400 mb-6">Impactar quem demonstrou interesse real.</p>
                    
                    {funnel.mofu.remarketing_logic && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Lógica de Remarketing</span>
                        <p className="text-sm text-slate-300 italic font-serif opacity-80 border-l-2 border-emerald-400/30 pl-4">
                          "{funnel.mofu.remarketing_logic}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* BOFU */}
              {funnel?.bofu?.enabled && (
                <div className="bg-emerald-900/20 backdrop-blur-[20px] rounded-xl p-8 ml-0 md:ml-24 border border-emerald-500/30 flex flex-col md:flex-row gap-8 items-start relative shadow-[0_0_40px_rgba(52,211,153,0.1)]">
                  <div className="absolute left-6 md:left-[-72px] -top-6 md:top-12 w-12 h-12 rounded-full bg-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(52,211,153,0.5)] z-20">
                    <CheckCircle2 className="text-emerald-950 h-6 w-6" />
                  </div>
                  
                  <div className="flex-1 w-full mt-6 md:mt-0">
                    <h2 className="text-3xl font-serif text-emerald-400 mb-6">Conversão (BOFU)</h2>
                    
                    {/* Pipeline Arrow Map */}
                    <div className="flex flex-col sm:flex-row items-center justify-between w-full bg-slate-900/50 rounded-lg p-6 border border-white/5">
                      {flowSteps.map((step, idx) => (
                        <div key={idx} className="flex items-center flex-1 w-full sm:w-auto group">
                          <div className="flex flex-col items-center text-center w-full">
                            {idx === 0 && <Search className="text-slate-200 mb-2 h-6 w-6" />}
                            {idx === 1 && <Globe className="text-slate-200 mb-2 h-6 w-6" />}
                            {idx === 2 && <ShoppingCart className="text-slate-200 mb-2 h-6 w-6" />}
                            {idx === 3 && <User className="text-emerald-400 mb-2 h-6 w-6" />}
                            {idx > 3 && <Target className="text-emerald-400 mb-2 h-6 w-6" />}
                            <span className={cn(
                              "text-xs font-bold uppercase tracking-widest",
                              idx === flowSteps.length - 1 ? "text-emerald-400" : "text-slate-200"
                            )}>{step}</span>
                          </div>
                          {idx < flowSteps.length - 1 && (
                            <ArrowRight className="text-emerald-400 my-4 sm:my-0 mx-2 flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Investment GPS (Right Column) */}
          <div className="lg:col-span-4 space-y-8 mt-10 lg:mt-0">
            <div className="glass-card rounded-xl p-8 sticky top-32">
              <h3 className="text-3xl font-serif text-white mb-8 border-b border-white/10 pb-4">Investment GPS</h3>
              
              <div className="space-y-8">
                {/* TOFU Bar */}
                {funnel?.tofu?.enabled && (
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-widest">TOFU</span>
                      <span className="text-base text-emerald-400">{sym} {(budget * funnel.tofu.budget_pct / 100).toLocaleString()} ({funnel.tofu.budget_pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 mb-2">
                      <div className="bg-emerald-400 h-2 rounded-full" style={{ width: `${funnel.tofu.budget_pct}%` }}></div>
                    </div>
                    <p className="text-sm text-slate-400">"Para encher o topo do funil"</p>
                  </div>
                )}
                
                {/* MOFU Bar */}
                {funnel?.mofu?.enabled && (
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-widest">MOFU</span>
                      <span className="text-base text-emerald-400">{sym} {(budget * funnel.mofu.budget_pct / 100).toLocaleString()} ({funnel.mofu.budget_pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 mb-2">
                      <div className="bg-emerald-400 h-2 rounded-full opacity-70" style={{ width: `${funnel.mofu.budget_pct}%` }}></div>
                    </div>
                    <p className="text-sm text-slate-400">"Para manter o interesse"</p>
                  </div>
                )}
                
                {/* BOFU Bar */}
                {funnel?.bofu?.enabled && (
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-widest">BOFU</span>
                      <span className="text-base text-emerald-400">{sym} {(budget * funnel.bofu.budget_pct / 100).toLocaleString()} ({funnel.bofu.budget_pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 mb-2">
                      <div className="bg-emerald-400 h-2 rounded-full opacity-40" style={{ width: `${funnel.bofu.budget_pct}%` }}></div>
                    </div>
                    <p className="text-sm text-slate-400">"Para fechar a venda"</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full py-12 px-6 md:px-12 flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto bg-[#031427] border-t border-white/10 mt-16">
        <div className="text-sm font-bold text-slate-200 uppercase tracking-widest mb-4 md:mb-0">Strategic Plan by Adexra</div>
        <div className="flex space-x-8 text-xs font-bold uppercase tracking-widest text-slate-500">
          <span className="hover:text-emerald-400 transition-colors cursor-pointer text-emerald-500">Privacy Policy</span>
          <span className="hover:text-emerald-400 transition-colors cursor-pointer text-emerald-500">Advisory Terms</span>
          <span className="hover:text-emerald-400 transition-colors cursor-pointer text-emerald-500">Contact Partner</span>
        </div>
      </footer>
    </div>
  );
}
