import React from 'react';
import { Point, CadastralModel } from '../../../types';
import { calculateCentroid, isPolygonInsidePolygon } from '../../../utils/geo';

interface LandUseLayerProps {
  model: CadastralModel;
  mapToScreen: (x: number, y: number) => { u: number; v: number };
}

export default function LandUseLayer({ model, mapToScreen }: LandUseLayerProps) {
  const getPointsPolygonPath = (pts: Point[]): string => {
    if (pts.length === 0) return '';
    const mapped = pts.map((p) => {
      const { u, v } = mapToScreen(p.x, p.y);
      return `${u},${v}`;
    });
    return `M ${mapped.join(' L ')} Z`;
  };

  const isLandUseInside = (pts: Point[]) => {
    if (pts.length === 0) return true;
    return isPolygonInsidePolygon(pts, model.points);
  };

  return (
    <g id="svg_land_use_layer">
      {(model.landUseExplication || []).map((lu) => {
        if (!lu.points || lu.points.length === 0) return null;
        const pathStr = getPointsPolygonPath(lu.points);
        if (!pathStr) return null;

        const isInside = isLandUseInside(lu.points);

        return (
          <g
            id={`svg_lu_g_${lu.id}`}
            key={lu.id}
            className="opacity-70 hover:opacity-90 transition-opacity"
          >
            <path
              d={pathStr}
              fill={isInside ? "url(#striped-emerald-pattern)" : "url(#striped-red-pattern)"}
              stroke={isInside ? "#10b981" : "#dc2626"}
              strokeWidth="1.5"
              strokeDasharray="5 3"
            />
            {(() => {
              const centroid = calculateCentroid(lu.points!);
              const { u, v } = mapToScreen(centroid.x, centroid.y);
              return (
                <g transform={`translate(${u}, ${v})`}>
                  <rect
                    x="-45"
                    y="-10"
                    width="90"
                    height="20"
                    rx="3"
                    fill={isInside ? "#ecfdf5" : "#fef2f2"}
                    stroke={isInside ? "#10b981" : "#ef4444"}
                    strokeWidth="0.5"
                    className="opacity-90"
                  />
                  <text
                    className={`${isInside ? 'fill-emerald-900' : 'fill-red-950'} font-extrabold font-mono text-[8.5px]`}
                    textAnchor="middle"
                    y="3.5"
                  >
                    {lu.code}: {lu.area} м²
                  </text>
                </g>
              );
            })()}
          </g>
        );
      })}
    </g>
  );
}
