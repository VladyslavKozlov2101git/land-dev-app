import React, { useState } from 'react';
import { Point, CadastralModel, ActiveGeozone } from '../../../types';
import { calculateCentroid, isPolygonInsidePolygon } from '../../../utils/geo';

interface RestrictionsLayerProps {
  model: CadastralModel;
  mapToScreen: (x: number, y: number) => { u: number; v: number };
  activeGeozone: ActiveGeozone | null;
  onActiveGeozoneChange: (val: ActiveGeozone | null) => void;
}

export default function RestrictionsLayer({
  model,
  mapToScreen,
  activeGeozone,
  onActiveGeozoneChange,
}: RestrictionsLayerProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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

  const handleMouseDown = (e: React.MouseEvent, restrictionId: string) => {
    (e.nativeEvent as any)._clickedGeozone = true;
    const isActive = activeGeozone?.type === 'restriction' && activeGeozone.id === restrictionId;

    if (!isActive) {
      onActiveGeozoneChange({ type: 'restriction', id: restrictionId });
      e.stopPropagation(); // Prevent panning and reset
    }
  };

  return (
    <g id="svg_restrictions_layer">
      {model.restrictions.map((r) => {
        const pathStr = getPointsPolygonPath(r.points);
        if (!pathStr) return null;
        const isInside = isRestrictionInside(r.points);
        const isActive = activeGeozone?.type === 'restriction' && activeGeozone.id === r.id;
        const isHovered = hoveredId === r.id;

        return (
          <g
            id={`svg_rest_g_${r.id}`}
            key={r.id}
            onMouseEnter={() => setHoveredId(r.id)}
            onMouseLeave={() => setHoveredId(null)}
            onMouseDown={(e) => handleMouseDown(e, r.id)}
            className={`cursor-pointer transition-all duration-150 ${isActive ? 'opacity-100' : isHovered ? 'opacity-95' : 'opacity-85'}`}
          >
            <path
              d={pathStr}
              fill={isInside ? "url(#striped-amber-pattern)" : "url(#striped-red-pattern)"}
              stroke={isActive ? "#b45309" : isHovered ? "#d97706" : (isInside ? "#d97706" : "#dc2626")}
              strokeWidth={isActive ? "4.5" : isHovered ? "3.5" : (isInside ? "1.5" : "2.5")}
              strokeDasharray={isActive ? "0" : "4 4"}
              className="transition-all duration-150"
              style={{
                filter: isActive ? 'drop-shadow(0 0 6px rgba(217, 119, 6, 0.5))' : 'none',
              }}
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
                    stroke={isActive ? "#b45309" : isHovered ? "#d97706" : (isInside ? "#f59e0b" : "#ef4444")}
                    strokeWidth={isActive ? "1.5" : isHovered ? "1" : "0.5"}
                    className="opacity-90 shadow-2xs"
                  />
                  <text
                    className={`${isInside ? 'fill-amber-900 font-bold' : 'fill-red-950 font-black'} font-semibold font-mono text-[9px]`}
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
