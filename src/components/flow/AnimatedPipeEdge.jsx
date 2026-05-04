import { BaseEdge, getSmoothStepPath } from '@xyflow/react';

export default function AnimatedPipeEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data
}) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 40 // Super smooth corners
  });

  const thickness = data?.pct ? Math.max(3, Math.min(14, data.pct / 8)) : 3;

  return (
    <>
      <defs>
        <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Very faint background track */}
      <path
        d={edgePath}
        fill="none"
        stroke="rgba(255, 255, 255, 0.03)"
        strokeWidth={thickness + 6}
      />
      
      {/* Glow track */}
      <path
        d={edgePath}
        fill="none"
        stroke="rgba(255, 255, 255, 0.1)"
        strokeWidth={thickness + 2}
        filter="url(#neon-glow)"
      />

      {/* Main animated energy stream */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: thickness,
          stroke: 'rgba(255, 255, 255, 0.8)',
          strokeDasharray: '6 12',
          strokeLinecap: 'round',
          animation: 'flowAnimation 15s linear infinite',
          filter: 'url(#neon-glow)',
        }}
      />
    </>
  );
}
