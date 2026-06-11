import React from 'react';

interface SummaryGeoCardProps {
  totalAreaSqM: number;
  totalAreaHectares: number;
  totalPerimeter: number;
  pointsCount: number;
}

export default function SummaryGeoCard({
  totalAreaSqM,
  totalAreaHectares,
  totalPerimeter,
  pointsCount,
}: SummaryGeoCardProps) {
  return (
    <div className="grid grid-cols-2 gap-4 bg-slate-900 border border-slate-800 text-white p-4 rounded-xl shadow-xs" id="summary_geo_card">
      <div>
        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">Площа ділянки (S):</span>
        <span className="text-xl font-extrabold font-mono text-blue-400" id="val_hectares">{totalAreaHectares.toFixed(4)} га</span>
        <span className="text-[11px] text-slate-350 block font-mono">({Math.round(totalAreaSqM * 10) / 10} кв. м)</span>
      </div>
      <div>
        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">Периметр (P):</span>
        <span className="text-xl font-extrabold font-mono text-slate-100" id="val_perimeter">{totalPerimeter.toFixed(2)} м</span>
        <span className="text-[11px] text-slate-400 block font-mono">({pointsCount} поворотні точки)</span>
      </div>
    </div>
  );
}
