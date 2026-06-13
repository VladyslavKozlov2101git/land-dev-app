import React, { useState } from 'react';
import { Point, CadastralModel, ActiveGeozone } from '../../../types';
import { calculateDistance } from '../../../utils/geo';

interface ParcelLayerProps {
  model: CadastralModel;
  mapToScreen: (x: number, y: number) => { u: number; v: number };
  activeGeozone: ActiveGeozone | null;
  onActiveGeozoneChange: (val: ActiveGeozone | null) => void;
}

export default function ParcelLayer({
  model,
  mapToScreen,
  activeGeozone,
  onActiveGeozoneChange,
}: ParcelLayerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isActive = activeGeozone?.type === 'parcel';

  const getPointsPolygonPath = (pts: Point[]): string => {
    if (pts.length === 0) return '';
    const mapped = pts.map((p) => {
      const { u, v } = mapToScreen(p.x, p.y);
      return `${u},${v}`;
    });
    return `M ${mapped.join(' L ')} Z`;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Mark as clicked geozone so parent SVG knows not to clear selection
    (e.nativeEvent as any)._clickedGeozone = true;

    if (!isActive) {
      onActiveGeozoneChange({ type: 'parcel', id: 'parcel' });
      e.stopPropagation(); // Stop propagation to prevent panning
    }
  };

  if (model.points.length < 3) return null;

  return (
    <g
      id="svg_parcel_g"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleMouseDown}
      className="cursor-pointer"
    >
      {/* Background fill path */}
      <path
        d={getPointsPolygonPath(model.points)}
        fill={isActive ? "#dbeafe" : isHovered ? "#eff6ff" : "#eff6ff"}
        stroke={isActive ? "#1d4ed8" : isHovered ? "#2563eb" : "#3b82f6"}
        strokeWidth={isActive ? "4.5" : isHovered ? "4" : "3.5"}
        strokeLinejoin="round"
        className={`transition-all duration-150 ${isActive ? 'opacity-85' : isHovered ? 'opacity-90' : 'opacity-75'}`}
        style={{
          filter: isActive ? 'drop-shadow(0 0 6px rgba(37, 99, 235, 0.4))' : 'none',
        }}
      />

      {/* Edge lines and distance badges */}
      {model.points.map((p, index) => {
        const next = model.points[(index + 1) % model.points.length];
        const screenP = mapToScreen(p.x, p.y);
        const screenNext = mapToScreen(next.x, next.y);

        const midU = (screenP.u + screenNext.u) / 2;
        const midV = (screenP.v + screenNext.v) / 2;
        const dist = calculateDistance(p, next);

        const angleRad = Math.atan2(screenNext.v - screenP.v, screenNext.u - screenP.u);
        let angleDeg = angleRad * (180 / Math.PI);
        if (angleDeg > 90 || angleDeg < -90) {
          angleDeg += 180;
        }

        return (
          <g key={`edge_${index}`} id={`svg_edge_g_${index}`}>
            <line
              x1={screenP.u}
              y1={screenP.v}
              x2={screenNext.u}
              y2={screenNext.v}
              stroke={isActive ? "#1d4ed8" : isHovered ? "#2563eb" : "#2563eb"}
              strokeWidth={isActive ? "2.5" : isHovered ? "2.2" : "2"}
              className="transition-all duration-150"
            />
            <g transform={`translate(${midU}, ${midV}) rotate(${angleDeg})`}>
              <rect
                x="-18"
                y="-8"
                width="36"
                height="16"
                rx="3"
                fill="white"
                stroke={isActive ? "#2563eb" : isHovered ? "#3b82f6" : "#3b82f6"}
                strokeWidth={isActive ? "1" : "0.75"}
                className="filter drop-shadow-xs"
              />
              <text
                textAnchor="middle"
                y="3.5"
                className={`font-sans font-extrabold font-mono text-[8.5px] ${isActive ? 'fill-blue-900' : 'fill-blue-950'}`}
              >
                {dist.toFixed(1)}м
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
}
