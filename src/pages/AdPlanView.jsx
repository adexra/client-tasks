import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { 
  ChevronLeft, Target, Globe, Search, ArrowRight, 
  MessageSquare, MousePointer2, ShieldCheck, Zap,
  TrendingUp, Calendar, Wallet, ExternalLink
} from 'lucide-react';

const SYM = { BRL: 'R$', USD: '$', EUR: '€' };

export default function AdPlanView() {
  const { id } = useParams();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.from('ad_plans')
      .select('*, clients(name)')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setError('Projeto não encontrado');
        else if (!data.is_active) setError('Este plano expirou ou está inativo');
        else setPlan(data);
        setLoading(false);
      });
  }, [id]);

  const stats = useMemo(() => {
    if (!plan) return null;
    const budget = parseFloat(plan.total_budget) || 0;
    const kpiVal = parseFloat(plan.target_kpi?.value) || 0;
    const type = plan.target_kpi?.type || 'CPA';
    const sym = SYM[plan.currency] || 'R$';
    
    // Cálculo de volume baseado na última etapa do funil (Decisão)
    const bofuPct = plan.funnel?.bofu?.budget_pct || 100;
    const focusBudget = budget * (bofuPct / 100);
    
    let projection = '--';
    if (kpiVal > 0) {
      if (type === 'CPA' || type === 'CPL') {
        projection = Math.floor(focusBudget / kpiVal).toLocaleString('pt-BR');
      } else if (type === 'ROAS') {
        projection = `${sym} ${(focusBudget * kpiVal).toLocaleString('pt-BR')}`;
      }
    }
    return { budget, sym, projection, type };
  }, [plan]);

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="h-10 w-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-white">
      <h2 className="text-3xl font-serif mb-6">{error}</h2>
      <Link to="/ad-planning" className="px-6 py-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all">
        Voltar ao Painel
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans selection:bg-indigo-500/30">
      
      {/* Navigation - Minimalist & Fixed */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#020617]/80 backdrop-blur-md px-8 h-20 flex items-center justify-between">
        <Link to="/ad-planning" className="flex items-center gap-2 group text-slate-500 hover:text-white transition-colors">
          <ChevronLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-[0.2em]">Dashboard</span>
        </Link>
        <div className="text-lg font-serif italic text-white tracking-widest">ADEXRA <span className="text-indigo-500">.</span></div>
        <div className="flex gap-6">
          <div className="h-10 w-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 cursor-pointer transition-all">
            <Zap className="h-4 w-4 text-indigo-400" />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-8 pt-40 pb-32">
        
        {/* Header - The Narrative */}
        <header className="mb-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center space-y-6"
          >
            <span className="px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-[0.3em]">
              Planejamento Estratégico de Performance
            </span>
            <h1 className="text-5xl md:text-7xl font-serif text-white tracking-tight leading-tight max-w-4xl">
              Dominando a jornada de <span className="italic text-indigo-400">{plan.clients?.name || plan.name}</span>
            </h1>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5 border border-white/10 rounded-3xl mt-16 overflow-hidden">
            <StatBlock icon={Wallet} label="Investimento Planejado" value={`${stats.sym} ${stats.budget.toLocaleString('pt-BR')}`} />
            <StatBlock icon={Target} label={`Meta de ${stats.type}`} value={`${stats.type === 'CPA' ? stats.sym : ''} ${plan.target_kpi?.value || 0}${stats.type === 'ROAS' ? 'x' : ''}`} />
            <StatBlock icon={TrendingUp} label="Volume Estimado" value={stats.projection} />
          </div>
        </header>

        {/* The Strategy Breakdown - Visual & Tangible */}
        <section className="space-y-32">
          
          {/* Phase 1: Awareness -> Tangible Ad Mockup */}
          {plan.funnel?.tofu?.enabled && (
            <JourneyPhase 
              title="1. Descoberta & Alcance"
              subtitle="Onde criamos o primeiro impacto e despertamos o desejo."
              description="Nesta etapa, focamos em audiências que ainda não conhecem sua solução, utilizando segmentação por intenção e comportamento."
              budget={`${stats.sym} ${(stats.budget * plan.funnel.tofu.budget_pct / 100).toLocaleString('pt-BR')}`}
              pct={plan.funnel.tofu.budget_pct}
              platform={Object.keys(plan.mediums || {}).find(k => plan.mediums[k]) || 'google'}
            >
              {/* Ad Mockup Wireframe */}
              <div className="w-full aspect-video bg-slate-900/50 rounded-2xl border border-white/10 p-6 relative overflow-hidden group">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-8 w-8 rounded-full bg-slate-800" />
                  <div className="space-y-1">
                    <div className="h-2 w-24 bg-slate-800 rounded" />
                    <div className="h-1.5 w-16 bg-slate-800/50 rounded" />
                  </div>
                </div>
                <div className="aspect-[16/7] bg-indigo-500/10 rounded-xl border border-indigo-500/20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-indigo-400 tracking-widest uppercase">Visual Criativo Premium</span>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-3 w-full bg-slate-800 rounded" />
                  <div className="h-3 w-2/3 bg-slate-800 rounded" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] to-transparent opacity-0 group-hover:opacity-10 transition-opacity" />
              </div>
            </JourneyPhase>
          )}

          {/* Phase 2: Intent -> The Logic */}
          {plan.funnel?.mofu?.enabled && (
            <JourneyPhase 
              title="2. Consideração & Autoridade"
              subtitle="Re-impactando quem demonstrou interesse real."
              description={plan.funnel.mofu.remarketing_logic || "Estratégia de remarketing para quebrar objeções e reforçar os diferenciais da marca."}
              budget={`${stats.sym} ${(stats.budget * plan.funnel.mofu.budget_pct / 100).toLocaleString('pt-BR')}`}
              pct={plan.funnel.mofu.budget_pct}
              reverse
            >
              <div className="space-y-4">
                <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <ShieldCheck className="h-5 w-5 text-indigo-400" />
                    <span className="text-sm font-bold text-white uppercase tracking-widest">Protocolo de Confiança</span>
                  </div>
                  <p className="text-sm leading-relaxed opacity-60 italic">
                    "O usuário que visitou o site nos últimos 7 dias verá anúncios focados em prova social e cases de sucesso."
                  </p>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="h-6 w-6 text-slate-700 rotate-90" />
                </div>
                <div className="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                  <span className="text-[10px] font-bold text-indigo-400 tracking-widest uppercase">Trigger de Retenção Ativo</span>
                </div>
              </div>
            </JourneyPhase>
          )}

          {/* Phase 3: Conversion -> The Result */}
          {plan.funnel?.bofu?.enabled && (
            <JourneyPhase 
              title="3. Decisão & Aquisição"
              subtitle="O momento da conversão final e fechamento."
              description="Foco total em fundo de funil, capturando a demanda de quem está pronto para comprar agora."
              budget={`${stats.sym} ${(stats.budget * plan.funnel.bofu.budget_pct / 100).toLocaleString('pt-BR')}`}
              pct={plan.funnel.bofu.budget_pct}
              platform="search"
            >
              <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-8 space-y-6">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 tracking-widest uppercase">
                  <Search className="h-3 w-3" /> Google Search Preview
                </div>
                <div className="space-y-1">
                  <div className="text-indigo-400 text-lg font-serif">Melhor {plan.name} em 2026</div>
                  <div className="text-emerald-500/80 text-xs italic">https://seusite.com.br/conversao</div>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded" />
                <div className="h-2 w-3/4 bg-slate-800 rounded" />
                <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                   <div className="flex items-center gap-2">
                     <MousePointer2 className="h-4 w-4 text-indigo-400" />
                     <span className="text-xs font-bold text-white uppercase tracking-widest italic">Action Required</span>
                   </div>
                   <div className="px-4 py-2 bg-indigo-500 rounded text-xs font-bold text-white">COMPRAR AGORA</div>
                </div>
              </div>
            </JourneyPhase>
          )}

        </section>

        {/* Technical Governance - Low key but authoritative */}
        <section className="mt-40 pt-20 border-t border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
            <div className="space-y-6">
              <h3 className="text-2xl font-serif text-white italic">Infraestrutura RevOps</h3>
              <p className="text-sm leading-relaxed text-slate-500">
                Não apenas anúncios, mas um ecossistema. Integramos sua mídia com o CRM e ferramentas de automação para garantir que nenhum lead seja desperdiçado.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <TechBadge icon={MessageSquare} label="Atendimento" value="CRM Integrado" />
              <TechBadge icon={Calendar} label="Duração" value={`${plan.days || 30} Dias`} />
              <TechBadge icon={ShieldCheck} label="Tracking" value="GTM + Conversions API" />
              <TechBadge icon={Globe} label="Region" value="Global/Local" />
            </div>
          </div>
        </section>

      </main>

      <footer className="py-20 border-t border-white/5 bg-black/20 text-center">
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.4em]">
          ADEXRA ESTRATÉGIA PROPRIETÁRIA © 2026
        </p>
      </footer>
    </div>
  );
}

// Visual Helpers

function StatBlock({ icon: Icon, label, value }) {
  return (
    <div className="p-10 flex flex-col items-center text-center group hover:bg-white/5 transition-colors">
      <Icon className="h-5 w-5 text-indigo-500 mb-6 group-hover:scale-110 transition-transform" />
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">{label}</span>
      <span className="text-3xl font-serif text-white">{value}</span>
    </div>
  );
}

function JourneyPhase({ title, subtitle, description, budget, pct, children, reverse = false }) {
  return (
    <div className={cn(
      "flex flex-col md:flex-row gap-16 items-center",
      reverse && "md:flex-row-reverse"
    )}>
      <div className="flex-1 space-y-8">
        <div className="space-y-4">
          <h2 className="text-3xl md:text-4xl font-serif text-white">{title}</h2>
          <p className="text-indigo-400 font-serif italic text-lg">{subtitle}</p>
          <p className="text-slate-500 leading-relaxed text-sm max-w-md">{description}</p>
        </div>
        
        <div className="pt-8 flex items-center gap-10 border-t border-white/5">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Budget Alocado</div>
            <div className="text-xl font-serif text-white">{budget}</div>
          </div>
          <div className="flex-1 max-w-[120px]">
             <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-2">
               <span>Intensidade</span>
               <span>{pct}%</span>
             </div>
             <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: `${pct}%` }}
                  className="h-full bg-indigo-500" 
                />
             </div>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative z-10"
        >
          {children}
        </motion.div>
        {/* Decorative elements */}
        <div className="absolute -top-10 -right-10 h-40 w-40 bg-indigo-500/10 blur-[100px] rounded-full" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 bg-indigo-500/5 blur-[80px] rounded-full" />
      </div>
    </div>
  );
}

function TechBadge({ icon: Icon, label, value }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-sm font-medium text-slate-300">{value}</div>
    </div>
  );
}
