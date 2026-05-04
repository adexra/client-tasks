import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { 
  ChevronLeft, Target, Globe, Search, ArrowRight, 
  MessageSquare, MousePointer2, ShieldCheck, Zap,
  TrendingUp, Calendar, Wallet, Database, Fingerprint, RefreshCcw, Network
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
      if (type === 'CPA' || type === 'CPL' || type === 'Leads') {
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
              Ecossistema de Receita
            </span>
            <h1 className="text-5xl md:text-7xl font-serif text-white tracking-tight leading-tight max-w-4xl">
              Dominando a jornada de <span className="italic text-indigo-400">{plan.clients?.name || plan.name}</span>
            </h1>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5 border border-white/10 rounded-[2rem] mt-16 overflow-hidden">
            <StatBlock icon={Wallet} label="Investimento Planejado" value={`${stats.sym} ${stats.budget.toLocaleString('pt-BR')}`} />
            <StatBlock icon={Target} label={`Meta de ${stats.type === 'Leads' ? 'Aquisição' : stats.type}`} value={`${stats.type === 'CPA' ? stats.sym : ''} ${plan.target_kpi?.value || 0}${stats.type === 'ROAS' ? 'x' : ''}`} />
            <StatBlock icon={TrendingUp} label="Volume Estimado" value={stats.projection} />
          </div>
        </header>

        {/* The Strategy Breakdown - Visual & Tangible */}
        <section className="space-y-32">
          
          {/* Phase 1: Awareness */}
          {plan.funnel?.tofu?.enabled && (
            <JourneyPhase 
              title="1. Descoberta & Alcance"
              subtitle="Onde criamos o primeiro impacto e capturamos a atenção."
              description="Focamos em audiências que estão na fase inicial de busca, interceptando a demanda com posicionamento premium."
              budget={`${stats.sym} ${(stats.budget * plan.funnel.tofu.budget_pct / 100).toLocaleString('pt-BR')}`}
              pct={plan.funnel.tofu.budget_pct}
            >
              {/* Ad/Campaign Representation Block */}
              <div className="w-full bg-slate-900/50 rounded-[2rem] border border-white/10 p-8 relative overflow-hidden group">
                <div className="flex items-center gap-3 mb-8">
                  <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-white tracking-widest uppercase">Aquisição Ativa</div>
                    <div className="text-xs text-slate-500">Google / Meta / LinkedIn</div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {(plan.funnel.tofu.keywords || plan.funnel.tofu.audience)?.split(/[,|\n]+/).filter(Boolean).slice(0, 4).map((kw, i) => (
                    <div key={i} className="px-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl flex items-center justify-between">
                      <span className="text-sm text-slate-300">{kw.trim()}</span>
                      <Search className="h-4 w-4 text-slate-600" />
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] to-transparent opacity-0 group-hover:opacity-10 transition-opacity" />
              </div>
            </JourneyPhase>
          )}

          {/* Phase 2: Intent -> Safety Net & Drop-off */}
          {plan.funnel?.mofu?.enabled && (
            <JourneyPhase 
              title="2. Filtro & Retenção"
              subtitle="A rede de segurança que impede a evasão de lucro."
              description="A maioria das campanhas perde leads aqui. Nós implementamos um protocolo de resgate contínuo para quem acessou mas não converteu."
              budget={`${stats.sym} ${(stats.budget * plan.funnel.mofu.budget_pct / 100).toLocaleString('pt-BR')}`}
              pct={plan.funnel.mofu.budget_pct}
              reverse
            >
              {/* Drop-off & Rescue Diagram */}
              <div className="bg-slate-900/30 border border-white/5 rounded-[2rem] p-8 relative">
                
                <div className="flex justify-between items-center bg-slate-800/50 rounded-2xl p-4 border border-white/10 relative z-10">
                  <div className="text-center px-4">
                    <MousePointer2 className="h-5 w-5 text-slate-400 mx-auto mb-2" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Tráfego Frio</span>
                  </div>
                  <ArrowRight className="text-slate-600" />
                  <div className="text-center px-4">
                    <Globe className="h-5 w-5 text-indigo-400 mx-auto mb-2" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Sua Página</span>
                  </div>
                </div>

                {/* Drop-off path */}
                <div className="flex justify-center mt-2 relative z-0">
                  <div className="h-12 border-r-2 border-dashed border-rose-500/30" />
                </div>
                
                <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4 text-center mx-auto max-w-[200px] mb-2 relative z-10">
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Leads Evadidos (Drop-off)</span>
                </div>

                {/* Rescue Path */}
                <div className="flex justify-between items-start mt-4 px-4 relative z-10">
                  <div className="flex-1 flex justify-center -mt-6">
                     <div className="w-full h-16 border-l-2 border-b-2 border-indigo-500/40 rounded-bl-[2rem]" />
                  </div>
                  <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-6 w-[240px] text-center shadow-[0_0_30px_rgba(99,102,241,0.15)] backdrop-blur-md relative z-20">
                    <RefreshCcw className="h-6 w-6 text-indigo-400 mx-auto mb-3" />
                    <span className="text-xs font-bold text-white uppercase tracking-widest block mb-2">Protocolo de Recuperação</span>
                    <span className="text-[10px] text-indigo-300 italic">Remarketing Automático</span>
                  </div>
                </div>

              </div>
            </JourneyPhase>
          )}

          {/* Phase 3: Conversion */}
          {plan.funnel?.bofu?.enabled && (
            <JourneyPhase 
              title="3. Decisão & Fechamento"
              subtitle="Capturando a demanda pronta para comprar."
              description="O estágio final onde convertemos a intenção validada em reuniões ou vendas diretas através de alta performance."
              budget={`${stats.sym} ${(stats.budget * plan.funnel.bofu.budget_pct / 100).toLocaleString('pt-BR')}`}
              pct={plan.funnel.bofu.budget_pct}
            >
              <div className="bg-slate-900/50 border border-white/10 rounded-[2rem] p-8 space-y-6">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 tracking-widest uppercase">
                  <Target className="h-3 w-3 text-indigo-400" /> Fluxo de Conversão
                </div>
                
                <div className="bg-slate-800/40 rounded-xl p-4 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-widest">Volume de Alta Intenção</span>
                    <TrendingUp className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                    <motion.div initial={{width: 0}} whileInView={{width: '100%'}} transition={{duration: 1.5}} className="h-full bg-gradient-to-r from-indigo-500 to-indigo-300" />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                   <div className="flex items-center gap-2">
                     <ShieldCheck className="h-4 w-4 text-emerald-400" />
                     <span className="text-xs font-bold text-white uppercase tracking-widest">Conversão Segura</span>
                   </div>
                   <div className="px-4 py-2 bg-indigo-500 rounded-xl text-xs font-bold text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]">ACIONAR VENDA</div>
                </div>
              </div>
            </JourneyPhase>
          )}

        </section>

        {/* Infraestrutura Invisível (Tracking) */}
        <section className="mt-40 pt-20 border-t border-white/10">
          <div className="text-center mb-16">
            <span className="px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-[0.3em] mb-6 inline-block">
              Governança Técnica
            </span>
            <h2 className="text-4xl md:text-5xl font-serif text-white tracking-tight">
              Inteligência de Rastreamento
            </h2>
            <p className="text-slate-400 mt-4 max-w-2xl mx-auto leading-relaxed">
              Seu investimento não pode depender da sorte. Implementamos uma infraestrutura invisível que blinda os dados da sua operação contra AdBlockers e atualizações do iOS, garantindo que toda conversão seja computada e otimizada pelo algoritmo.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TrackingBadge 
              icon={Network} 
              title="Server-Side Tracking" 
              desc="Em vez de depender do navegador do usuário, o disparo da conversão acontece diretamente no nosso servidor em nuvem. Anti-bloqueio e resiliente." 
            />
            <TrackingBadge 
              icon={Database} 
              title="Conversions API (CAPI)" 
              desc="Conexão de dados primários direta com a Meta e Google. Nós enviamos o dado de compra com qualidade máxima, alimentando a inteligência da plataforma." 
            />
            <TrackingBadge 
              icon={Fingerprint} 
              title="Identity Fingerprinting" 
              desc="Mesmo sem cookies de terceiros, utilizamos parâmetros avançados (GCLID/FBCLID e hashed data) para identificar leads através de múltiplos dispositivos." 
            />
          </div>
        </section>

      </main>

      <footer className="py-20 border-t border-white/5 bg-black/40 text-center">
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
      "flex flex-col lg:flex-row gap-16 items-center",
      reverse && "lg:flex-row-reverse"
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

function TrackingBadge({ icon: Icon, title, desc }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 hover:bg-white/10 transition-colors group h-full">
      <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        <Icon className="h-6 w-6 text-indigo-400" />
      </div>
      <h3 className="text-lg font-serif text-white mb-3">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}
