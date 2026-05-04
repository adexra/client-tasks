import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ChevronLeft, Target, Calendar, DollarSign, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import PlatformNode from '../components/flow/PlatformNode';
import ClusterNode from '../components/flow/ClusterNode';
import ProjectionNode from '../components/flow/ProjectionNode';
import AnimatedPipeEdge from '../components/flow/AnimatedPipeEdge';

const SYM = { BRL: 'R$', USD: '$', EUR: '€' };

const nodeTypes = {
  platform: PlatformNode,
  cluster: ClusterNode,
  projection: ProjectionNode,
};

const edgeTypes = {
  animatedPipe: AnimatedPipeEdge,
};

export default function AdPlanView() {
  const { id } = useParams();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNodeData, setSelectedNodeData] = useState(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    supabase.from('ad_plans').select('*, clients(name)').eq('id', id).single()
      .then(({ data, error }) => {
        if (error || !data) setError('Plan not found');
        else if (!data.is_active) setError('Plan is deactivated');
        else {
          setPlan(data);
          buildMap(data);
        }
        setLoading(false);
      });
  }, [id]);

  const onNodeClick = useCallback((event, node) => {
    if (node.type === 'cluster') {
      setSelectedNodeData(node.data);
    } else {
      setSelectedNodeData(null);
    }
  }, []);

  const buildMap = (data) => {
    const { mediums, funnel, currency, total_budget, target_kpi } = data;
    const sym = SYM[currency] || 'R$';
    const newNodes = [];
    const newEdges = [];

    // Find all unique active platforms across all stages
    const allActivePlats = new Set();
    const stagesInfo = [
      { id: 'tofu', col: 1, y: 150 },
      { id: 'mofu', col: 2, y: 150 },
      { id: 'bofu', col: 3, y: 150 },
    ];

    stagesInfo.forEach(s => {
      if (funnel?.[s.id]?.enabled) {
        if (funnel[s.id].platforms) {
          Object.entries(funnel[s.id].platforms).forEach(([k, v]) => {
            if (v) allActivePlats.add(k);
          });
        } else if (mediums) {
          Object.entries(mediums).forEach(([k, v]) => {
            if (v) allActivePlats.add(k);
          });
        }
      }
    });

    // 1. Platforms (Col 0)
    const activePlatforms = Array.from(allActivePlats);
    const startY = 150;
    const gapY = 80;

    activePlatforms.forEach((p, idx) => {
      newNodes.push({
        id: `plat-${p}`,
        type: 'platform',
        position: { x: 50, y: startY + (idx * gapY) },
        data: { platform: p, label: p },
      });
    });

    // 2. Funnel Stages (Cols 1, 2, 3)
    let lastActiveStage = null;
    let prevActiveStageId = null;

    stagesInfo.forEach(({ id, col, y }) => {
      const stageData = funnel?.[id];
      if (stageData?.enabled) {
        lastActiveStage = id;
        newNodes.push({
          id: `stage-${id}`,
          type: 'cluster',
          position: { x: col * 350, y },
          data: {
            stage: id,
            focus: stageData.focus,
            pct: stageData.budget_pct,
            keywords: stageData.keywords,
            audience: stageData.audience,
            remarketing_logic: stageData.remarketing_logic,
            conversion_flow: stageData.conversion_flow,
          },
        });

        // Wire this stage's active platforms directly to it
        if (stageData.platforms) {
          Object.entries(stageData.platforms).forEach(([p, isActive]) => {
            if (isActive) {
              newEdges.push({
                id: `e-plat-${p}-${id}`,
                source: `plat-${p}`,
                target: `stage-${id}`,
                type: 'animatedPipe',
                data: { pct: stageData.budget_pct },
              });
            }
          });
        } else if (!prevActiveStageId && mediums) {
          Object.entries(mediums).forEach(([p, isActive]) => {
            if (isActive) {
              newEdges.push({
                id: `e-plat-${p}-${id}`,
                source: `plat-${p}`,
                target: `stage-${id}`,
                type: 'animatedPipe',
                data: { pct: stageData.budget_pct },
              });
            }
          });
        }

        // Connect sequential stages
        if (prevActiveStageId) {
          newEdges.push({
            id: `e-${prevActiveStageId}-${id}`,
            source: `stage-${prevActiveStageId}`,
            target: `stage-${id}`,
            type: 'animatedPipe',
            data: { pct: stageData.budget_pct },
          });
        }
        
        prevActiveStageId = id;
      }
    });

    // 3. Projection Node (Col 4)
    if (lastActiveStage) {
      const bofuPct = funnel?.bofu?.budget_pct || 0;
      const bofuBudget = total_budget * (bofuPct / 100);
      const kpiVal = parseFloat(target_kpi?.value) || 0;
      
      let resText = 'Pending KPI setup';
      if (kpiVal > 0) {
        if (target_kpi.type === 'CPA') {
          resText = Math.floor(bofuBudget / kpiVal) + ' Conversions';
        } else if (target_kpi.type === 'ROAS') {
          resText = sym + ' ' + (bofuBudget * kpiVal).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        }
      }

      newNodes.push({
        id: 'projection',
        type: 'projection',
        position: { x: 4 * 350, y: 150 },
        data: { kpi: target_kpi?.type || 'CPA', result: resText, sym },
      });

      newEdges.push({
        id: `e-${lastActiveStage}-proj`,
        source: `stage-${lastActiveStage}`,
        target: 'projection',
        type: 'animatedPipe',
        data: { pct: 100 },
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);
  };

  if (loading) return <div className="min-h-screen bg-[#0B0D17] flex items-center justify-center"><div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>;
  if (error) return (
    <div className="min-h-screen bg-[#0B0D17] flex flex-col items-center justify-center p-6 text-center">
      <div className="h-16 w-16 bg-neutral-900 rounded-full flex items-center justify-center mb-6">
        <X className="h-8 w-8 text-neutral-500" />
      </div>
      <h1 className="text-2xl font-serif text-white mb-2">{error}</h1>
      <Link to="/ads-planning" className="text-indigo-400 hover:text-indigo-300 font-medium">Return to Dashboard</Link>
    </div>
  );

  const sym = SYM[plan.currency] || 'R$';

  return (
    <div className="h-screen w-screen bg-[#0B0D17] overflow-hidden flex flex-col relative font-sans text-white">
      
      {/* Top Bar: Command Center */}
      <div className="absolute top-0 left-0 w-full z-20 bg-[#0B0D17]/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/ads-planning" className="p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors text-neutral-400 hover:text-white">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-sm font-bold tracking-widest uppercase text-neutral-400">{plan.clients?.name || 'Unknown Client'}</h1>
            <p className="text-lg font-serif text-white">{plan.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400"><DollarSign className="h-4 w-4" /></div>
            <div>
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Global Budget</p>
              <p className="text-sm font-mono text-white">{sym} {plan.total_budget?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><Calendar className="h-4 w-4" /></div>
            <div>
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Duration</p>
              <p className="text-sm font-mono text-white">{plan.days} Days</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400"><Target className="h-4 w-4" /></div>
            <div>
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Target {plan.target_kpi?.type}</p>
              <p className="text-sm font-mono text-white">
                {plan.target_kpi?.type === 'CPA' ? sym : ''} {plan.target_kpi?.value} {plan.target_kpi?.type === 'ROAS' ? 'x' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 w-full h-full relative" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(11, 13, 23, 1) 0%, rgba(5, 6, 12, 1) 100%)' }}>
        {/* Custom Blueprint Grid overlay */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          minZoom={0.1}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
          className="z-10"
        >
          <Background color="#ffffff" gap={120} size={2} opacity={0.03} />
          <Controls className="!bg-[#141523] !border-white/10 !fill-white shadow-2xl rounded-xl overflow-hidden" />
          <MiniMap 
            className="!bg-[#0B0D17]/90 !border !border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl"
            maskColor="rgba(0, 0, 0, 0.7)"
            nodeColor={(node) => {
              if (node.type === 'cluster') return 'rgba(99, 102, 241, 0.8)';
              if (node.type === 'projection') return 'rgba(16, 185, 129, 0.8)';
              return 'rgba(255, 255, 255, 0.5)';
            }}
          />
        </ReactFlow>

        {/* Floating Legend */}
        <div className="absolute top-24 left-6 z-20 bg-[#141523]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Map Legend</p>
          <div className="space-y-2 text-xs text-neutral-300">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full border border-white/30" /> Traffic Source</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-indigo-500/80 rounded-sm" /> Funnel Stage</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500/80 rounded-sm" /> Projected ROI</div>
            <div className="flex items-center gap-2"><div className="w-4 h-0.5 border-t-2 border-dashed border-white/50" /> Budget Flow</div>
          </div>
        </div>
      </div>

      {/* Slide-out Side Panel */}
      <AnimatePresence>
        {selectedNodeData && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-24 right-6 bottom-24 w-80 bg-[#141523]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-6 z-30 overflow-y-auto flex flex-col"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                {selectedNodeData.stage} Details
              </h3>
              <button onClick={() => setSelectedNodeData(null)} className="text-neutral-500 hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Focus</p>
                <p className="text-sm font-medium">{selectedNodeData.focus}</p>
              </div>

              {selectedNodeData.audience && (
                <div>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Audience Targeting</p>
                  <p className="text-sm font-medium">{selectedNodeData.audience}</p>
                </div>
              )}

              {selectedNodeData.remarketing_logic && (
                <div>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Remarketing Logic</p>
                  <p className="text-sm font-medium">{selectedNodeData.remarketing_logic}</p>
                </div>
              )}

              {selectedNodeData.conversion_flow && (
                <div>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Conversion Path</p>
                  <p className="text-sm font-medium">{selectedNodeData.conversion_flow}</p>
                </div>
              )}

              {selectedNodeData.keywords && (
                <div>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-2">Target Keywords</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedNodeData.keywords.split(',').map((kw, i) => (
                      <span key={i} className="text-xs font-mono text-neutral-300 bg-white/5 px-2 py-1 rounded border border-white/10">
                        {kw.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Timeline */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-[#141523]/80 backdrop-blur-xl border border-white/10 rounded-full px-8 py-3 flex items-center gap-8 shadow-2xl">
        {['Setup', 'Learning', 'Scaling'].map((step, i, arr) => (
          <div key={step} className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={cn("h-2 w-2 rounded-full", i === 0 ? "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" : "bg-neutral-700")} />
              <span className={cn("text-[10px] font-bold uppercase tracking-widest", i === 0 ? "text-indigo-400" : "text-neutral-500")}>
                {step}
              </span>
            </div>
            {i < arr.length - 1 && <div className="w-12 h-px bg-neutral-800" />}
          </div>
        ))}
      </div>

    </div>
  );
}
