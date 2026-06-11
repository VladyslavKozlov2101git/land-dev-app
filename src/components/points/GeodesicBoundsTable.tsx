import React, { useState } from 'react';
import { Point } from '../../types';
import { Compass, ChevronUp, ChevronDown } from 'lucide-react';
import { calculateDistance, calculateDirectionalAngle, formatToDMS } from '../../utils/geo';

interface GeodesicBoundsTableProps {
  points: Point[];
}

export default function GeodesicBoundsTable({ points }: GeodesicBoundsTableProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div
      className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      id="geodesic_table_section">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100 hover:bg-slate-100/50 transition-colors cursor-pointer select-none">
        <div className="flex items-center gap-1.5">
          <Compass className="h-4.5 w-4.5 text-blue-600" />
          <span className="text-sm font-bold text-slate-800">Геодезична таблиця меж (Румби)</span>
        </div>
        <div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          )}
        </div>
      </div>

      {isOpen && (
        <div className="p-4 animate-fade-in">
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse" id="bounds_analysis_table">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[9px] uppercase tracking-wider border-b border-slate-200 font-mono">
                  <th className="py-2.5 px-3 font-semibold">Межа (Від-До)</th>
                  <th className="py-2.5 px-3 font-semibold">Відстань S (м)</th>
                  <th className="py-2.5 px-3 font-semibold">Дирекційний Кут (α)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-mono text-slate-700">
                {points.map((p, index) => {
                  const next = points[(index + 1) % points.length];
                  const fromLabel = index + 1;
                  const nextLabel = index === points.length - 1 ? 1 : index + 2;

                  const dist = calculateDistance(p, next);
                  const dirAngle = calculateDirectionalAngle(p, next);

                  return (
                    <tr key={`geodesic_tr_${index}`} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {fromLabel} — {nextLabel}
                      </td>
                      <td className="py-2.5 px-3 text-blue-700 font-bold">{dist.toFixed(2)} м</td>
                      <td className="py-2.5 px-3 text-slate-650">{formatToDMS(dirAngle)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
