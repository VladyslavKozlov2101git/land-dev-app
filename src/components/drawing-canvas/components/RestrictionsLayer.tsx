import React from 'react';
import { Point, CadastralModel } from '../../../types';
import { calculateCentroid, isPolygonInsidePolygon } from '../../../utils/geo';

interface RestrictionsLayerProps {
  model: CadastralModel;
  mapToScreen: (x: number, y: number) => { u: number; v: number };
}

export default function RestrictionsLayer({ model, mapToScreen }: RestrictionsLayerProps) {
  const getPointsPolygonPath = (pts: Point[]): string => {
    if (pts.length === 0) return '';
    const mapped = pts.map((p) => {
      const { u, v } = mapToScreen(p.x, p.y);
      return `${u},${v}`;
    });
    return `M ${mapped.join(' L ')} Z`;
  };

  const isRestrictionInside = (pts: Point[]) => {
    return isPolygonInsidePolygon(pts, model.points);
  };

  return (
    <g id="svg_restrictions_layer">
      {model.restrictions.map((r) => {
        const pathStr = getPointsPolygonPath(r.points);
        if (!pathStr) return null;
        const isInside = isRestrictionInside(r.points);
        return (
          <g
            id={`svg_rest_g_${r.id}`}
            key={r.id}
            className="opacity-85 hover:opacity-100 transition-opacity"
          >
            <path
              d={pathStr}
              fill={isInside ? "url(#striped-amber-pattern)" : "url(#striped-red-pattern)"}
              stroke={isInside ? "#d97706" : "#dc2626"}
              strokeWidth={isInside ? "1.5" : "2.5"}
              strokeDasharray="4 4"
            />
            {(() => {
              const centroid = calculateCentroid(r.points);
              const { u, v } = mapToScreen(centroid.x, centroid.y);
              return (
                <g transform={`translate(${u}, ${v})`}>
                  <rect
                    x="-40"
                    y="-12"
                    width="80"
                    height="24"
                    rx="3"
                    fill={isInside ? "#fffbeb" : "#fef2f2"}
                    stroke={isInside ? "#f59e0b" : "#ef4444"}
                    strokeWidth="0.5"
                    className="opacity-90"
                  />
                  <text
                    className={`${isInside ? 'fill-amber-900' : 'fill-red-950'} font-semibold font-mono text-[9px]`}
                    textAnchor="middle"
                    y="5"
                  >
                    ОБМ ({r.code})
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
