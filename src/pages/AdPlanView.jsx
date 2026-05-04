import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { 
  ChevronLeft, ArrowDown, Target, Activity, Settings, Clock, 
  BarChart2, Zap, LayoutTemplate, Share2, 
  ChevronRight, Database, Code
} from 'lucide-react';

const SYM = { BRL: 'R$', USD: '$', EUR: '€' };

const PLATFORM_ICONS = {
  google: 'Google Ads',
  meta: 'Meta Ads',
  tiktok: 'TikTok Ads',
  linkedin: 'LinkedIn Ads'
};

export default function AdPlanView() {
  const { id } = useParams();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRevOps, setShowRevOps] = useState(false);

  useEffect(() => {
    supabase.from('ad_plans').select('*, clients(name)').eq('id', id).single()
      .then(({ data, error }) => {
        if (error || !data) setError('Plan not found');
        else if (!data.is_active) setError('Plan is deactivated');
        else setPlan(data);
        
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="min-h-screen bg-[#06080D] flex items-center justify-center"><div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return (
    <div className="min-h-screen bg-[#06080D] flex flex-col items-center justify-center p-6 text-center text-white">
      <div className="h-16 w-16 bg-neutral-900 rounded-full flex items-center justify-center mb-6">
        <Target className="h-8 w-8 text-neutral-600" />
      </div>
      <h2 className="text-2xl font-serif mb-2">Unavailable</h2>
      <p className="text-neutral-500 mb-8 max-w-sm">{error}</p>
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
  let projLabel = 'Estimativa de Volume';
  if (kpiVal > 0) {
    if (kpiType === 'CPA' || kpiType === 'CPL' || kpiType === 'Leads') {
      projValue = Math.floor(bofuBudget / kpiVal).toLocaleString();
      projLabel = `Estimativa de ${kpiType === 'CPA' ? 'Conversões' : 'Leads'}`;
    } else if (kpiType === 'ROAS') {
      projValue = `${sym} ${(bofuBudget * kpiVal).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      projLabel = 'Receita Estimada';
    }
  }

  const clientName = clients?.name || name;

  // RevOps Parsing
  // Check if string is stored in BOFU or global conversion
  const rawFlowString = funnel?.bofu?.conversion_flow || conversion?.flow || "Ad > Landing Page > Lead > CRM";
  const flowSteps = rawFlowString.split('>').map(s => s.trim()).filter(Boolean);

  // Active platforms helper
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
    <div className="min-h-screen bg-[#06080D] text-white font-sans selection:bg-indigo-500/30">
      
      {/* Top Nav */}
      <nav className="border-b border-white/5 bg-[#0A0C14] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/ad-planning" className="p-2 -ml-2 text-neutral-500 hover:text-white transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-400">Adexra Executive Briefing</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Plan
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-20 pb-32">
        
        {/* 1. The Boardroom View (Hero) */}
        <section className="mb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-white tracking-tight leading-tight mb-12">
            Plano de Aceleração para <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              {clientName}
            </span>
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-xl">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5" /> Investimento
              </p>
              <p className="text-3xl font-serif text-white">{sym} {budget.toLocaleString()}</p>
            </div>
            
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-xl">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" /> Prazo
              </p>
              <p className="text-3xl font-serif text-white">{days || 30} Dias</p>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-xl">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Target className="h-3.5 w-3.5" /> Alvo de Aquisição
              </p>
              <p className="text-3xl font-serif text-white">{sym} {kpiVal} <span className="text-sm text-neutral-500 font-sans">{kpiType}</span></p>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full" />
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2 relative">
                <Activity className="h-3.5 w-3.5" /> {projLabel}
              </p>
              <p className="text-3xl font-serif text-emerald-400 relative">{projValue}</p>
            </div>
          </div>
        </section>

        {/* 2. Cachoeira de Conversão */}
        <section className="mb-24">
          <div className="mb-12">
            <h2 className="text-2xl font-serif text-white mb-2">Estrutura de Campanha</h2>
            <p className="text-neutral-500 text-sm">O fluxo financeiro desenhado para transformar desconhecidos em receita previsível.</p>
          </div>

          <div className="relative border-l border-white/10 ml-4 md:ml-8 space-y-16 py-8">
            
            {/* Phase 1 */}
            {funnel?.tofu?.enabled && (
              <div className="relative pl-8 md:pl-16">
                <div className="absolute -left-3 top-0 h-6 w-6 rounded-full bg-[#0A0C14] border-4 border-[#06080D] flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-cyan-400" />
                </div>
                
                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Fase 1</span>
                  <h3 className="text-2xl font-serif text-white">Aquisição de Mercado</h3>
                  <p className="text-neutral-400 text-sm">Comprando atenção e volume de buscas de quem já procura pela solução.</p>
                  
                  <div className="flex flex-col gap-2 mt-6">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Alocação de Verba</span>
                      <span className="text-sm font-bold text-white">{funnel.tofu.budget_pct}% do Investimento</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${funnel.tofu.budget_pct}%` }} />
                    </div>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 mt-6 space-y-6">
                    {/* Platforms */}
                    <div className="flex flex-wrap gap-2">
                      {getActivePlatforms('tofu').map(p => (
                        <span key={p} className="px-3 py-1.5 rounded-lg bg-white/5 text-[10px] font-bold text-white uppercase tracking-widest border border-white/5">
                          {PLATFORM_ICONS[p] || p}
                        </span>
                      ))}
                    </div>
                    {/* Keywords/Audience */}
                    {(funnel.tofu.keywords || funnel.tofu.audience) && (
                      <div className="pt-4 border-t border-white/5">
                        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Segmentação Alvo</p>
                        <p className="text-sm text-neutral-300 italic font-serif opacity-80 border-l-2 border-cyan-400/30 pl-4">
                          {funnel.tofu.keywords || funnel.tofu.audience}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Phase 2 */}
            {funnel?.mofu?.enabled && (
              <div className="relative pl-8 md:pl-16">
                <div className="absolute -left-3 top-0 h-6 w-6 rounded-full bg-[#0A0C14] border-4 border-[#06080D] flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-indigo-400" />
                </div>
                
                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Fase 2</span>
                  <h3 className="text-2xl font-serif text-white">Filtro de Intenção</h3>
                  <p className="text-neutral-400 text-sm">Apenas quem demonstrou interesse real avança na jornada.</p>
                  
                  <div className="flex flex-col gap-2 mt-6">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Alocação de Verba</span>
                      <span className="text-sm font-bold text-white">{funnel.mofu.budget_pct}% do Investimento</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${funnel.mofu.budget_pct}%` }} />
                    </div>
                  </div>

                  {funnel.mofu.remarketing_logic && (
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 mt-6">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Lógica de Remarketing</p>
                      <p className="text-sm text-neutral-300 italic font-serif opacity-80 border-l-2 border-indigo-400/30 pl-4">
                        "{funnel.mofu.remarketing_logic}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Phase 3 */}
            {funnel?.bofu?.enabled && (
              <div className="relative pl-8 md:pl-16">
                <div className="absolute -left-3 top-0 h-6 w-6 rounded-full bg-[#0A0C14] border-4 border-[#06080D] flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
                </div>
                
                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Fase 3</span>
                  <h3 className="text-2xl font-serif text-white">Captura de Demanda</h3>
                  <p className="text-neutral-400 text-sm">Conversão direta e fechamento de vendas focada em ROI.</p>
                  
                  <div className="flex flex-col gap-2 mt-6">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Alocação de Verba</span>
                      <span className="text-sm font-bold text-white">{funnel.bofu.budget_pct}% do Investimento</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]" style={{ width: `${funnel.bofu.budget_pct}%` }} />
                    </div>
                  </div>

                  {funnel.bofu.keywords && (
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 mt-6 overflow-hidden relative">
                      {/* Subtle gradient background effect for high intent */}
                      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full" />
                      
                      <p className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest mb-3 relative">Termos de Alta Intenção (Fundo de Funil)</p>
                      <div className="space-y-2 relative">
                        {funnel.bofu.keywords.split('\n').filter(Boolean).map((kw, i) => (
                          <div key={i} className="text-sm text-white font-mono bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-md inline-block mr-2 mb-2">
                            {kw}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
          </div>
        </section>

        {/* 3. O Motor Oculto (RevOps) */}
        <section className="mb-24">
          <button 
            onClick={() => setShowRevOps(!showRevOps)}
            className="w-full flex items-center justify-between p-6 bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] transition-colors rounded-2xl group"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-neutral-900 border border-white/5 flex items-center justify-center">
                <Settings className="h-5 w-5 text-neutral-400 group-hover:text-white transition-colors" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-bold text-white">Ver Infraestrutura Técnica</h3>
                <p className="text-xs text-neutral-500">RevOps, Rastreamento e Conversão</p>
              </div>
            </div>
            <ChevronRight className={cn("h-5 w-5 text-neutral-500 transition-transform duration-300", showRevOps && "rotate-90")} />
          </button>

          <AnimatePresence>
            {showRevOps && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-8 border border-t-0 border-white/10 rounded-b-2xl bg-black/40 space-y-10">
                  
                  {/* Setup */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div>
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Code className="h-3.5 w-3.5" /> Stack de Rastreamento
                      </p>
                      <p className="text-sm text-neutral-300">{conversion?.tracking || 'Google Analytics 4 + Google Tag Manager via Server-Side'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Database className="h-3.5 w-3.5" /> Modelo de Atribuição
                      </p>
                      <p className="text-sm text-neutral-300">{conversion?.attribution || 'Data-Driven (Algorítmico)'}</p>
                    </div>
                  </div>

                  {/* Flow Steps */}
                  <div>
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5" /> Caminho do Lead (Pipeline de Dados)
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-0">
                      {flowSteps.map((step, idx) => (
                        <div key={idx} className="flex items-center flex-1 w-full sm:w-auto group">
                          <div className="bg-[#141523] border border-white/10 px-4 py-3 rounded-xl text-xs font-bold text-white whitespace-nowrap shadow-xl">
                            {step}
                          </div>
                          {idx < flowSteps.length - 1 && (
                            <div className="flex-1 min-w-[20px] h-px bg-white/10 mx-2 sm:mx-0 sm:flex-1 hidden sm:block relative">
                              <ChevronRight className="h-3 w-3 text-neutral-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/40 rounded-full" />
                            </div>
                          )}
                          {idx < flowSteps.length - 1 && (
                            <ArrowDown className="h-4 w-4 text-neutral-600 mx-auto my-2 sm:hidden" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* 4. A Linha do Tempo de Retorno */}
        <section>
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-serif text-white mb-2">Cronograma Operacional</h2>
            <p className="text-neutral-500 text-sm">Gestão de expectativas e maturação do algoritmo nos primeiros 30 dias.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-neutral-700" />
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Dias 1 a 3</p>
              <h4 className="text-lg font-bold text-white mb-2">Setup Técnico</h4>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Integração de tags, configuração de conversões no GA4 e revisão final de criativos antes do lançamento.
              </p>
            </div>

            <div className="bg-white/[0.02] border border-indigo-500/20 p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Dias 4 a 14</p>
              <h4 className="text-lg font-bold text-white mb-2">Aprendizado de Máquina</h4>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Fase de exploração do algoritmo. O CPA pode oscilar enquanto as plataformas mapeiam os compradores ideais.
              </p>
            </div>

            <div className="bg-white/[0.02] border border-emerald-500/20 p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Dias 15 a 30</p>
              <h4 className="text-lg font-bold text-white mb-2">Otimização e Estabilização</h4>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Corte de anúncios perdedores, estabilização do Custo por Aquisição e início da previsibilidade de ROI.
              </p>
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}
