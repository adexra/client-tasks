import { Handle, Position } from '@xyflow/react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Users, Tags, ArrowRightLeft } from 'lucide-react';

export default function ClusterNode({ data, selected }) {
  const { stage, focus, pct, keywords, audience, remarketing_logic, conversion_flow } = data;
  
  let color = 'from-neutral-900/80 to-neutral-950/90 border-neutral-700/50';
  let accent = 'bg-neutral-500';
  let glow = '';

  if (stage === 'tofu') {
    color = 'from-blue-950/60 to-[#0A0F1C]/90 border-blue-500/30';
    accent = 'bg-blue-500';
    glow = 'shadow-[0_0_50px_rgba(59,130,246,0.15)]';
  }
  if (stage === 'mofu') {
    color = 'from-indigo-950/60 to-[#0C0B1A]/90 border-indigo-500/30';
    accent = 'bg-indigo-500';
    glow = 'shadow-[0_0_50px_rgba(99,102,241,0.15)]';
  }
  if (stage === 'bofu') {
    color = 'from-emerald-950/60 to-[#0A1A12]/90 border-emerald-500/30';
    accent = 'bg-emerald-500';
    glow = 'shadow-[0_0_50px_rgba(16,185,129,0.15)]';
  }

  const kwList = keywords ? keywords.split(',').slice(0, 4) : [];

  return (
    <motion.div 
      whileHover={{ scale: 1.01 }}
      className={cn(
        "relative w-[400px] rounded-3xl backdrop-blur-2xl border bg-gradient-to-br transition-all cursor-grab overflow-hidden",
        color, glow,
        selected ? 'ring-2 ring-white/50 border-white' : ''
      )}
    >
      <Handle type="target" position={Position.Left} className={cn("!w-4 !h-4 !border-2 !border-[#0B0D17] !left-[-8px] z-20 shadow-[0_0_10px_currentColor]", accent)} />
      
      {/* Decorative Top Bar */}
      <div className={cn("h-1.5 w-full", accent)} />

      <div className="p-6">
        {/* Header section */}
        <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
          <div>
            <div className="text-[14px] font-black font-serif text-white uppercase tracking-[0.2em]">{stage}</div>
            <div className="text-neutral-400 font-medium text-sm mt-1">{focus}</div>
          </div>
          <div className={cn("text-white font-mono text-lg px-4 py-2 rounded-xl shadow-inner font-bold border border-white/10", accent.replace('bg-', 'bg-').concat('/20'))}>
            {pct}%
          </div>
        </div>

        {/* Data Pills / Sticky Notes */}
        <div className="space-y-3">
          
          {(audience || remarketing_logic) && (
            <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex gap-3 items-start">
              <Users className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider mb-1">Targeting Logic</p>
                <p className="text-sm text-neutral-200 leading-snug">{audience || remarketing_logic}</p>
              </div>
            </div>
          )}

          {conversion_flow && (
            <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex gap-3 items-start">
              <ArrowRightLeft className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider mb-1">Conversion Path</p>
                <p className="text-sm text-neutral-200 leading-snug">{conversion_flow}</p>
              </div>
            </div>
          )}

          {kwList.length > 0 && (
            <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex gap-3 items-start">
              <Tags className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
              <div className="w-full">
                <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider mb-2">Core Keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {kwList.map((kw, i) => (
                    <span key={i} className="text-[11px] font-mono text-neutral-300 bg-[#0B0D17] px-2.5 py-1 rounded border border-white/10">
                      {kw.trim()}
                    </span>
                  ))}
                  {keywords.split(',').length > 4 && <span className="text-[11px] font-mono text-neutral-500 bg-[#0B0D17] px-2.5 py-1 rounded border border-white/5">+{keywords.split(',').length - 4} more</span>}
                </div>
              </div>
            </div>
          )}

        </div>
        
        <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-500 uppercase tracking-widest font-bold">
          <span>Click to view full brief</span>
          <span className="text-neutral-400">→</span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className={cn("!w-4 !h-4 !border-2 !border-[#0B0D17] !right-[-8px] z-20 shadow-[0_0_10px_currentColor]", accent)} />
    </motion.div>
  );
}
