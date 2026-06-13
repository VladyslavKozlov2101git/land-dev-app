import React, { useState } from 'react';
import { Point, CadastralModel, ActiveGeozone } from '../../../types';
import { calculateCentroid, isPolygonInsidePolygon } from '../../../utils/geo';

interface LandUseLayerProps {
  model: CadastralModel;
  mapToScreen: (x: number, y: number) => { u: number; v: number };
  activeGeozone: ActiveGeozone | null;
  onActiveGeozoneChange: (val: ActiveGeozone | null) => void;
}

export default function LandUseLayer({
  model,
  mapToScreen,
  activeGeozone,
  onActiveGeozoneChange,
}: LandUseLayerProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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

  const handleMouseDown = (e: React.MouseEvent, landUseId: string) => {
    (e.nativeEvent as any)._clickedGeozone = true;
    const isActive = activeGeozone?.type === 'land_use' && activeGeozone.id === landUseId;

    if (!isActive) {
      onActiveGeozoneChange({ type: 'land_use', id: landUseId });
      e.stopPropagation(); // Prevent panning and reset
    }
  };

  return (
    <g id="svg_land_use_layer">
      {(model.landUseExplication || []).map((lu) => {
        if (!lu.points || lu.points.length === 0) return null;
        const pathStr = getPointsPolygonPath(lu.points);
        if (!pathStr) return null;

        const isInside = isLandUseInside(lu.points);
        const isActive = activeGeozone?.type === 'land_use' && activeGeozone.id === lu.id;
        const isHovered = hoveredId === lu.id;

        return (
          <g
            id={`svg_lu_g_${lu.id}`}
            key={lu.id}
            onMouseEnter={() => setHoveredId(lu.id)}
            onMouseLeave={() => setHoveredId(null)}
            onMouseDown={(e) => handleMouseDown(e, lu.id)}
            className={`cursor-pointer transition-all duration-150 ${isActive ? 'opacity-100' : isHovered ? 'opacity-95' : 'opacity-70'}`}
          >
            <path
              d={pathStr}
              fill={isInside ? "url(#striped-emerald-pattern)" : "url(#striped-red-pattern)"}
              stroke={isActive ? "#065f46" : isHovered ? "#10b981" : (isInside ? "#10b981" : "#dc2626")}
              strokeWidth={isActive ? "4.5" : isHovered ? "3.5" : "1.5"}
              strokeDasharray={isActive ? "0" : "5 3"}
              className="transition-all duration-150"
              style={{
                filter: isActive ? 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.5))' : 'none',
              }}
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
                    stroke={isActive ? "#065f46" : isHovered ? "#10b981" : (isInside ? "#10b981" : "#ef4444")}
                    strokeWidth={isActive ? "1.5" : isHovered ? "1" : "0.5"}
                    className="opacity-90 shadow-2xs"
                  />
                  <text
                    className={`${isInside ? 'fill-emerald-900 font-bold' : 'fill-red-950 font-black'} font-extrabold font-mono text-[8.5px]`}
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
