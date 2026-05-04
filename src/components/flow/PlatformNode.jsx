import { Handle, Position } from '@xyflow/react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';
import { Search, MonitorSmartphone, PlaySquare, Briefcase } from 'lucide-react';

export default function PlatformNode({ data }) {
  const p = data.platform;
  
  let Icon = Search;
  let color = 'border-neutral-700 bg-[#141523] text-neutral-300 shadow-[0_0_20px_rgba(255,255,255,0.05)]';
  
  if (p === 'google') {
    Icon = Search;
    color = 'border-blue-500 bg-blue-950/40 text-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.3)]';
  } else if (p === 'meta') {
    Icon = MonitorSmartphone;
    color = 'border-indigo-500 bg-indigo-950/40 text-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.3)]';
  } else if (p === 'tiktok') {
    Icon = PlaySquare;
    color = 'border-pink-500 bg-pink-950/40 text-pink-400 shadow-[0_0_30px_rgba(236,72,153,0.3)]';
  } else if (p === 'linkedin') {
    Icon = Briefcase;
    color = 'border-sky-500 bg-sky-950/40 text-sky-400 shadow-[0_0_30px_rgba(14,165,233,0.3)]';
  }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      className="relative flex flex-col items-center justify-center gap-3 w-28 h-28 cursor-grab"
    >
      {/* Outer rotating/pulsing ring */}
      <div className={cn("absolute inset-0 rounded-full border-2 border-dashed opacity-50 animate-[spin_10s_linear_infinite]", color.split(' ')[0])} />
      
      {/* Main Circular Button */}
      <div className={cn(
        "relative z-10 w-20 h-20 rounded-full border-2 backdrop-blur-xl flex flex-col items-center justify-center",
        color
      )}>
        <Icon className="w-8 h-8 mb-1" strokeWidth={1.5} />
      </div>

      {/* Label outside the circle */}
      <div className="absolute -bottom-6 whitespace-nowrap text-[10px] font-bold tracking-widest uppercase text-white/70 bg-black/40 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm">
        {data.label}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-white !w-4 !h-4 !border-2 !border-[#0B0D17] !right-[-8px] z-20 shadow-[0_0_10px_white]" />
    </motion.div>
  );
}
