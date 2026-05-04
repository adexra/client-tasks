import { Handle, Position } from '@xyflow/react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

export default function ProjectionNode({ data }) {
  const { kpi, result, sym } = data;
  
  return (
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: 'spring' }}
      whileHover={{ scale: 1.05 }}
      className="relative w-80 rounded-3xl bg-[#0B0D17] border border-emerald-500/30 p-8 cursor-grab overflow-hidden"
    >
      {/* Background glowing rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.15)_0%,transparent_70%)] animate-[pulse_4s_ease-in-out_infinite]" />
      <div className="absolute inset-0 border-[4px] border-emerald-500/10 rounded-3xl m-2" />

      <Handle type="target" position={Position.Left} className="!bg-emerald-400 !w-4 !h-4 !border-2 !border-[#0B0D17] !left-[-8px] z-20 shadow-[0_0_15px_rgba(16,185,129,1)]" />
      
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
          <TrendingUp className="w-6 h-6 text-emerald-400" />
        </div>

        <div className="text-[12px] font-bold text-emerald-400/80 uppercase tracking-[0.2em] mb-2">
          Projected Output
        </div>
        
        <div className="text-4xl font-black font-serif text-white tracking-tight mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          {result}
        </div>
        
        <div className="text-xs text-emerald-100/50 uppercase tracking-widest font-mono bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-500/20">
          Based on Target {kpi}
        </div>
      </div>
    </motion.div>
  );
}
