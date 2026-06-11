import React from 'react';
import { Point, CadastralModel } from '../../../types';

interface ParcelVerticesLayerProps {
  model: CadastralModel;
  selectedPointId: string | null;
  mapToScreen: (x: number, y: number) => { u: number; v: number };
}

export default function ParcelVerticesLayer({
  model,
  selectedPointId,
  mapToScreen,
}: ParcelVerticesLayerProps) {
  return (
    <g id="svg_parcel_vertices">
      {model.points.map((p, index) => {
        const { u, v } = mapToScreen(p.x, p.y);
        const isSelected = p.id === selectedPointId;
        return (
          <g
            key={`vertex_${p.id}`}
            id={`svg_vertex_g_${p.id}`}
            className="group cursor-pointer"
          >
            <circle
              cx={u}
              cy={v}
              r={isSelected ? '9' : '7'}
              fill={isSelected ? '#2563eb' : '#ffffff'}
              stroke={isSelected ? '#1d4ed8' : '#3b82f6'}
              strokeWidth={isSelected ? '3' : '2'}
              className="group-hover:fill-blue-50 group-hover:stroke-blue-750 shadow-md transition-colors duration-150"
            />
            <text
              x={u}
              y={v + 3.5}
              textAnchor="middle"
              className={`font-sans font-extrabold text-[8px] select-none ${
                isSelected ? 'fill-white' : 'fill-slate-800'
              }`}
            >
              {index + 1}
            </text>
            <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-250">
              <rect
                x={u - 65}
                y={v - 42}
                width="130"
                height="32"
                rx="4"
                fill="#1e293b"
                className="opacity-95 shadow-lg"
              />
              <text x={u} y={v - 30} textAnchor="middle" className="fill-white font-mono text-[8.5px]">
                X: {p.x.toFixed(2)}
              </text>
              <text x={u} y={v - 18} textAnchor="middle" className="fill-blue-400 font-mono text-[8.5px]">
                Y: {p.y.toFixed(2)}
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
}
