import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { 
  ChevronLeft, Target, Globe, Search, ArrowRight, 
  MousePointer2, ShieldCheck, Zap,
  TrendingUp, Calendar, Wallet, Database, Fingerprint, RefreshCcw, Network,
  Crosshair, Users, Activity, BarChart, Smartphone, Laptop
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const SYM = { BRL: 'R$', USD: '$', EUR: '€' };
const money = (n, sym) => `${sym} ${(parseFloat(n)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

const parseKeywords = (kwString) => {
  if (!kwString) return [];
  return kwString.split(/[\n,]+/).map(k => k.trim()).filter(k => k !== "");
};

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#3b82f6'];

export default function AdPlanView() {
  const { id } = useParams();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState(0);

  const containerRef = useRef(null);

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

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const { scrollTop, clientHeight } = containerRef.current;
      const index = Math.round(scrollTop / clientHeight);
      setActiveSection(index);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [loading]);

  const scrollTo = (index) => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: index * window.innerHeight,
        behavior: 'smooth'
      });
    }
  };

  const stats = useMemo(() => {
    if (!plan) return null;
    const budget = parseFloat(plan.total_budget) || 0;
    const days = parseInt(plan.days) || 30;
    const daily = budget / days;
    const kpiVal = parseFloat(plan.target_kpi?.value) || 0;
    const type = plan.target_kpi?.type || 'CPA';
    const sym = SYM[plan.currency] || 'R$';
    
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
    return { budget, daily, days, sym, projection, type, kpiVal };
  }, [plan]);

  const marketChartData = useMemo(() => {
    const vol = plan?.audience?.potential_volume || 10000;
    return [
      { name: 'Semana 1', atual: vol * 0.05, potencial: vol * 0.4 },
      { name: 'Semana 2', atual: vol * 0.15, potencial: vol * 0.6 },
      { name: 'Semana 3', atual: vol * 0.25, potencial: vol * 0.8 },
      { name: 'Semana 4', atual: vol * 0.40, potencial: vol },
    ];
  }, [plan]);

  const primaryKeywords = parseKeywords(plan?.keywords?.primary || plan?.funnel?.bofu?.keywords);
  const secondaryKeywords = parseKeywords(plan?.keywords?.secondary || plan?.funnel?.tofu?.keywords);

  if (loading) return (
    <div className="min-h-screen bg-[#08090D] flex items-center justify-center">
      <div className="h-10 w-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#08090D] flex flex-col items-center justify-center p-6 text-white">
      <h2 className="text-3xl font-serif mb-6 text-center">{error}</h2>
      <Link to="/ad-planning" className="px-8 py-4 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all font-medium text-sm tracking-wider uppercase">
        Voltar
      </Link>
    </div>
  );

  const sections = [
    'Visão Geral', 'Mercado', 'Investimento', 'Metas', 'Audiência', 'Fluxo', 'Alocação'
  ];

  return (
    <div className="bg-[#08090D] text-slate-300 font-sans selection:bg-indigo-500/30 overflow-hidden h-screen w-full">
      
      {/* 0. Header & Navegação */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#08090D]/60 backdrop-blur-xl px-6 md:px-12 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-xl font-serif italic text-white tracking-widest">ADEXRA<span className="text-indigo-500">.</span></div>
        </div>
        
        <div className="hidden md:flex items-center gap-6">
          {sections.map((sec, i) => (
            <button 
              key={i} 
              onClick={() => scrollTo(i)}
              className={cn(
                "text-[10px] uppercase font-bold tracking-widest transition-all",
                activeSection === i ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"
              )}
            >
              {sec}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
           <span className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[10px] font-bold uppercase tracking-[0.2em] hidden sm:block">
            Project: {plan.clients?.name || plan.name}
          </span>
        </div>
      </nav>

      {/* Main Content - Scroll Snapping Container */}
      <main 
        ref={containerRef}
        className="h-screen w-full overflow-y-auto snap-y snap-mandatory scroll-smooth hide-scrollbar"
      >
        
        {/* 1. Hero (Welcome & Intro) */}
        <SectionContainer>
          <div className="absolute inset-0 z-0 opacity-30">
            <div className="absolute top-[20%] left-[20%] w-[40vw] h-[40vw] bg-indigo-600/30 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow" />
            <div className="absolute bottom-[20%] right-[20%] w-[30vw] h-[30vw] bg-fuchsia-600/20 blur-[100px] rounded-full mix-blend-screen" />
          </div>
          <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center space-y-12">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
              <span className="inline-block mb-6 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-[0.3em]">
                Roadmap Estratégico
              </span>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif text-white tracking-tight leading-[1.1] max-w-4xl">
                Bem-vindo ao seu <br />
                <span className="italic text-indigo-400">Planejamento</span>.
              </h1>
              <p className="mt-8 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-light">
                Este é o mapa do tesouro para os próximos {stats.days} dias. Uma operação desenhada para capturar demanda e gerar lucro com precisão cirúrgica.
              </p>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
              <GlassCard>
                <Wallet className="h-5 w-5 text-indigo-500 mb-4" />
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Investimento Total</div>
                <div className="text-3xl font-serif text-white">{money(stats.budget, stats.sym)}</div>
              </GlassCard>
              <GlassCard>
                <Target className="h-5 w-5 text-fuchsia-500 mb-4" />
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Meta {stats.type}</div>
                <div className="text-3xl font-serif text-white">{stats.type === 'CPA' ? stats.sym : ''} {stats.kpiVal}{stats.type === 'ROAS' ? 'x' : ''}</div>
              </GlassCard>
              <GlassCard>
                <TrendingUp className="h-5 w-5 text-emerald-500 mb-4" />
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Volume Projetado</div>
                <div className="text-3xl font-serif text-white">{stats.projection}</div>
              </GlassCard>
            </motion.div>
          </div>
        </SectionContainer>

        {/* 2. Oportunidade de Mercado */}
        <SectionContainer>
          <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="space-y-6">
              <span className="text-indigo-400 text-[10px] font-bold uppercase tracking-[0.3em]">Oceano Azul</span>
              <h2 className="text-4xl md:text-5xl font-serif text-white leading-tight">O tamanho real da sua <span className="italic text-indigo-400">oportunidade</span>.</h2>
              <p className="text-slate-400 text-lg leading-relaxed font-light">
                Baseado no seu perfil, mapeamos a intenção de busca. O gráfico ilustra a demanda latente pronta para ser convertida.
              </p>
              
              <div className="mt-8 space-y-4">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/10 pb-2">Top Keywords Estratégicas</div>
                <div className="flex flex-wrap gap-2">
                  {primaryKeywords.map((kw, i) => (
                    <motion.span 
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs font-bold text-indigo-400 uppercase tracking-widest"
                    >
                      {kw}
                    </motion.span>
                  ))}
                  {secondaryKeywords.slice(0, 5).map((kw, i) => (
                    <span key={i} className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs text-slate-500">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="h-[400px] w-full bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={marketChartData}>
                  <defs>
                    <linearGradient id="colorPotencial" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAtual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="potencial" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorPotencial)" />
                  <Area type="monotone" dataKey="atual" stroke="#ec4899" strokeWidth={2} fillOpacity={1} fill="url(#colorAtual)" />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        </SectionContainer>

        {/* 3. Investimento & Projeções */}
        <SectionContainer>
          <div className="w-full max-w-5xl mx-auto space-y-16">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="text-center">
              <span className="text-indigo-400 text-[10px] font-bold uppercase tracking-[0.3em]">Financials</span>
              <h2 className="text-4xl md:text-6xl font-serif text-white leading-tight mt-4">Combustível de <span className="italic text-indigo-400">Crescimento</span></h2>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-indigo-500/20 to-transparent p-1 rounded-3xl">
                <div className="bg-[#08090D] h-full w-full rounded-[23px] p-10 border border-white/5 flex flex-col items-center text-center justify-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Orçamento Mensal</div>
                  <div className="text-6xl font-serif text-white tracking-tight">{money(stats.budget, stats.sym)}</div>
                </div>
              </div>
              <div className="bg-gradient-to-bl from-fuchsia-500/20 to-transparent p-1 rounded-3xl">
                <div className="bg-[#08090D] h-full w-full rounded-[23px] p-10 border border-white/5 flex flex-col items-center text-center justify-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Investimento Diário</div>
                  <div className="text-6xl font-serif text-white tracking-tight">{money(stats.daily, stats.sym)}</div>
                </div>
              </div>
            </motion.div>
          </div>
        </SectionContainer>

        {/* 4. Objetivos e KPIs */}
        <SectionContainer>
          <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="flex-1 space-y-6">
              <span className="text-indigo-400 text-[10px] font-bold uppercase tracking-[0.3em]">Indicadores</span>
              <h2 className="text-4xl md:text-5xl font-serif text-white leading-tight">O que define o <span className="italic text-indigo-400">sucesso</span>?</h2>
              <p className="text-slate-400 text-lg leading-relaxed font-light">
                Não compramos cliques, compramos dados de conversão. Estes são os alvos que nosso algoritmo irá perseguir implacavelmente.
              </p>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="flex-1 w-full grid grid-cols-2 gap-4">
              <GlassCard className="col-span-2">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                    <Crosshair className="h-6 w-6 text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Alvo Principal</div>
                    <div className="text-2xl font-serif text-white">{plan.conversion?.goal || 'Conversão'}</div>
                  </div>
                </div>
                <div className="text-sm text-slate-400 font-mono bg-white/5 p-3 rounded-lg">Flow: {plan.conversion?.flow || 'Anúncio -> LP -> Ação'}</div>
              </GlassCard>
              
              <GlassCard>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Meta de Custo</div>
                <div className="text-3xl font-serif text-white">{stats.type === 'CPA' ? stats.sym : ''} {stats.kpiVal}</div>
              </GlassCard>
              
              <GlassCard>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Modelo de Atribuição</div>
                <div className="text-xl font-serif text-white pt-2">{plan.conversion?.attribution || 'Data-Driven'}</div>
              </GlassCard>
            </motion.div>
          </div>
        </SectionContainer>

        {/* 5. Audiência e Geolocalização */}
        <SectionContainer>
          <div className="w-full max-w-6xl mx-auto flex flex-col-reverse lg:flex-row gap-16 items-center">
            
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="flex-1 w-full relative">
              {/* Mock Map Premium */}
              <div className="aspect-square w-full max-w-[500px] mx-auto rounded-full bg-slate-900 border border-white/10 relative overflow-hidden flex items-center justify-center shadow-2xl shadow-indigo-500/10">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                <div className="w-[80%] h-[80%] border border-indigo-500/30 rounded-full flex items-center justify-center animate-[ping_4s_ease-out_infinite]"></div>
                <div className="w-[50%] h-[50%] border border-indigo-500/50 rounded-full flex items-center justify-center animate-[ping_3s_ease-out_infinite]"></div>
                <div className="w-4 h-4 bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,1)] relative z-10"></div>
                
                {/* Decorative Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
              </div>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="flex-1 space-y-6">
              <span className="text-indigo-400 text-[10px] font-bold uppercase tracking-[0.3em]">Segmentação</span>
              <h2 className="text-4xl md:text-5xl font-serif text-white leading-tight">Mapeamento de <span className="italic text-indigo-400">Território</span>.</h2>
              <p className="text-slate-400 text-lg leading-relaxed font-light">
                Definimos o perímetro exato e o perfil psicológico de quem verá a oferta.
              </p>
              
              <div className="space-y-4 mt-8">
                <AudienceRow icon={Globe} label="Geolocalização" value={plan.audience?.location || 'Nacional'} />
                <AudienceRow icon={Users} label="Demografia" value={`${plan.audience?.age || '25-54'} · ${plan.audience?.gender || 'Todos'}`} />
                <AudienceRow icon={Activity} label="Comportamento" value={plan.audience?.interests || 'Intenção de Compra Elevada'} />
                <AudienceRow icon={Smartphone} label="Dispositivos" value={plan.audience?.devices || 'Mobile & Desktop'} />
              </div>
            </motion.div>
          </div>
        </SectionContainer>

        {/* 6. Fluxo da Estratégia (Flowchart) */}
        <SectionContainer>
          <div className="w-full max-w-6xl mx-auto flex flex-col items-center text-center space-y-16">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
              <span className="text-indigo-400 text-[10px] font-bold uppercase tracking-[0.3em]">A Jornada</span>
              <h2 className="text-4xl md:text-5xl font-serif text-white leading-tight mt-4">Do clique ao <span className="italic text-indigo-400">lucro</span>.</h2>
            </motion.div>

            <div className="w-full max-w-4xl relative py-12">
              {/* Connecting Line */}
              <div className="absolute top-1/2 left-0 w-full h-1 bg-white/5 -translate-y-1/2 rounded-full hidden md:block" />
              
              {/* Light Ball Animation */}
              <motion.div 
                className="absolute top-1/2 left-0 w-24 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent -translate-y-1/2 rounded-full hidden md:block shadow-[0_0_20px_rgba(99,102,241,0.8)]"
                animate={{ left: ['0%', '100%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />

              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10 w-full">
                <FlowNode 
                  step="1" 
                  title="Atração" 
                  desc={Object.keys(plan?.mediums || {}).filter(k => plan.mediums[k]).join(' & ') || "Multi-Channel Ads"} 
                  icon={Network} 
                />
                <FlowNode 
                  step="2" 
                  title="Engajamento" 
                  desc={plan?.creative?.landing_page?.split('//')[1] || "Landing Page Premium"} 
                  icon={Laptop} 
                />
                <FlowNode 
                  step="3" 
                  title="Decisão" 
                  desc={plan?.conversion?.goal || "Conversão Direta"} 
                  icon={MousePointer2} 
                />
                <FlowNode 
                  step="4" 
                  title="Resultado" 
                  desc={plan?.target_kpi?.type === 'ROAS' ? 'Faturamento & Escala' : 'Lead Qualificado'} 
                  icon={ShieldCheck} 
                />
              </div>

              <motion.p className="text-sm text-slate-500 font-mono mt-12 bg-white/5 py-3 px-6 rounded-full border border-white/10">
                Logística do Funil: {plan?.conversion?.flow || "Tráfego Direto → Conversão"}
              </motion.p>
            </div>
          </div>
        </SectionContainer>

        {/* 7. Distribuição de Canais */}
        <SectionContainer>
          <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="flex-1 space-y-6">
              <span className="text-indigo-400 text-[10px] font-bold uppercase tracking-[0.3em]">Distribuição</span>
              <h2 className="text-4xl md:text-5xl font-serif text-white leading-tight">Alocação de <span className="italic text-indigo-400">Recursos</span>.</h2>
              <p className="text-slate-400 text-lg leading-relaxed font-light">
                Como dividimos o orçamento para garantir que estamos cobrindo todas as fases do funil, desde a descoberta até o fechamento.
              </p>

              <div className="space-y-4 mt-8">
                {['tofu', 'mofu', 'bofu'].map((stage, i) => {
                  const s = plan.funnel?.[stage];
                  if (!s?.enabled) return null;
                  const labels = { tofu: 'Topo (Descoberta)', mofu: 'Meio (Retenção)', bofu: 'Fundo (Conversão)' };
                  return (
                    <div key={stage} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-sm font-bold text-white uppercase tracking-widest">{labels[stage]}</span>
                      </div>
                      <span className="font-serif text-xl text-white">{s.budget_pct}%</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="flex-1 w-full h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'TOFU', value: plan.funnel?.tofu?.budget_pct || 40 },
                      { name: 'MOFU', value: plan.funnel?.mofu?.budget_pct || 30 },
                      { name: 'BOFU', value: plan.funnel?.bofu?.budget_pct || 30 },
                    ].filter(d => d.value > 0)}
                    cx="50%" cy="50%"
                    innerRadius={100}
                    outerRadius={140}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        </SectionContainer>
        
        {/* Footer */}
        <div className="snap-start w-full bg-[#040508] border-t border-white/5 py-12 flex flex-col items-center justify-center text-center px-6">
          <div className="text-2xl font-serif italic text-white tracking-widest mb-6">ADEXRA<span className="text-indigo-500">.</span></div>
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.4em]">
            ESTRATÉGIA PROPRIETÁRIA © {new Date().getFullYear()}
          </p>
        </div>

      </main>
    </div>
  );
}

// Helper Components

function SectionContainer({ children }) {
  return (
    <section className="h-screen w-full snap-start flex flex-col justify-center items-center px-6 md:px-12 relative">
      {children}
    </section>
  );
}

function GlassCard({ children, className }) {
  return (
    <div className={cn("bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm", className)}>
      {children}
    </div>
  );
}

function AudienceRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 p-4 border border-white/5 rounded-xl bg-white/5">
      <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
        <Icon className="h-5 w-5 text-indigo-400" />
      </div>
      <div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</div>
        <div className="text-sm text-slate-200 mt-1">{value}</div>
      </div>
    </div>
  );
}

function FlowNode({ step, title, desc, icon: Icon }) {
  return (
    <div className="bg-[#08090D] border border-white/10 rounded-2xl p-6 flex flex-col items-center shadow-xl">
      <div className="h-12 w-12 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-4">
        <Icon className="h-5 w-5 text-indigo-400" />
      </div>
      <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-2">Passo {step}</div>
      <h3 className="text-lg font-serif text-white mb-1">{title}</h3>
      <p className="text-xs text-slate-400">{desc}</p>
    </div>
  );
}
