import React from 'react';
import { Point, CadastralModel } from '../../../types';
import { calculateDistance } from '../../../utils/geo';

interface ParcelLayerProps {
  model: CadastralModel;
  mapToScreen: (x: number, y: number) => { u: number; v: number };
}

export default function ParcelLayer({ model, mapToScreen }: ParcelLayerProps) {
  const getPointsPolygonPath = (pts: Point[]): string => {
    if (pts.length === 0) return '';
    const mapped = pts.map((p) => {
      const { u, v } = mapToScreen(p.x, p.y);
      return `${u},${v}`;
    });
    return `M ${mapped.join(' L ')} Z`;
  };

  if (model.points.length < 3) return null;

  return (
    <g id="svg_parcel_g">
      <path
        d={getPointsPolygonPath(model.points)}
        fill="#eff6ff"
        stroke="#3b82f6"
        strokeWidth="3.5"
        strokeLinejoin="round"
        className="opacity-75"
      />

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
              stroke="#2563eb"
              strokeWidth="2"
            />
            <g transform={`translate(${midU}, ${midV}) rotate(${angleDeg})`}>
              <rect
                x="-18"
                y="-8"
                width="36"
                height="16"
                rx="3"
                fill="white"
                stroke="#3b82f6"
                strokeWidth="0.75"
                className="filter drop-shadow-xs"
              />
              <text
                textAnchor="middle"
                y="3.5"
                className="fill-blue-950 font-bold font-mono text-[8.5px]"
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
