import React from 'react';

interface SnapIndicatorProps {
  activeSnapPoint: {
    u: number;
    v: number;
    x: number;
    y: number;
    label?: string;
    type?: string;
    color?: string;
  } | null;
}

export default function SnapIndicator({ activeSnapPoint }: SnapIndicatorProps) {
  if (!activeSnapPoint) return null;

  return (
    <g id="svg_snap_indicator" className="pointer-events-none animate-fade-in">
      <circle
        cx={activeSnapPoint.u}
        cy={activeSnapPoint.v}
        r="14"
        fill="none"
        stroke={activeSnapPoint.color || '#10b981'}
        strokeWidth="1.5"
        strokeDasharray="4 3"
        className="animate-spin"
        style={{
          transformOrigin: `${activeSnapPoint.u}px ${activeSnapPoint.v}px`,
          animationDuration: '4s',
        }}
      />
      <circle
        cx={activeSnapPoint.u}
        cy={activeSnapPoint.v}
        r="6"
        fill={activeSnapPoint.color || '#10b981'}
        fillOpacity="0.3"
        stroke={activeSnapPoint.color || '#059669'}
        strokeWidth="1"
      />
      <circle cx={activeSnapPoint.u} cy={activeSnapPoint.v} r="2" fill={activeSnapPoint.color || '#047857'} />
      <g transform={`translate(${activeSnapPoint.u + 12}, ${activeSnapPoint.v - 12})`}>
        <rect
          x="0"
          y="-10"
          width="145"
          height="16"
          rx="3"
          fill="#1e293b"
          className="shadow-sm border border-slate-700 opacity-95"
        />
        <text
          x="72.5"
          y="1"
          textAnchor="middle"
          className="fill-slate-100 font-bold font-sans text-[7.5px] truncate px-1"
        >
          {activeSnapPoint.label || "Прив'язка до об'єкта"}
        </text>
      </g>
    </g>
  );
}
