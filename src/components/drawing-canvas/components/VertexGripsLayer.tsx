import React from 'react';
import { Point, CadastralModel, DrawMode } from '../../../types';

interface VertexGripsLayerProps {
  model: CadastralModel;
  mode: DrawMode;
  mapToScreen: (x: number, y: number) => { u: number; v: number };
}

export default function VertexGripsLayer({ model, mode, mapToScreen }: VertexGripsLayerProps) {
  if (mode !== 'VIEW') return null;

  return (
    <g id="svg_cad_grips" className="pointer-events-none">
      {/* Building vertex grips (small red squares) */}
      {model.buildings.map((b) =>
        b.points.map((pt, idx) => {
          const { u, v } = mapToScreen(pt.x, pt.y);
          return (
            <rect
              key={`bld_grip_${b.id}_${idx}`}
              x={u - 3.5}
              y={v - 3.5}
              width="7"
              height="7"
              fill="white"
              stroke="#ef4444"
              strokeWidth="1.5"
              className="cursor-pointer pointer-events-auto"
              title="Потягніть, щоб змінити кут будівлі"
            />
          );
        })
      )}

      {/* Restriction vertex grips (small orange squares) */}
      {model.restrictions.map((r) =>
        r.points.map((pt, idx) => {
          const { u, v } = mapToScreen(pt.x, pt.y);
          return (
            <rect
              key={`rest_grip_${r.id}_${idx}`}
              x={u - 3.5}
              y={v - 3.5}
              width="7"
              height="7"
              fill="white"
              stroke="#d97706"
              strokeWidth="1.5"
              className="cursor-pointer pointer-events-auto"
              title="Потягніть, щоб змінити кут обмеження"
            />
          );
        })
      )}

      {/* Land use vertex grips (small green squares) */}
      {(model.landUseExplication || []).map((lu) =>
        (lu.points || []).map((pt, idx) => {
          const { u, v } = mapToScreen(pt.x, pt.y);
          return (
            <rect
              key={`lu_grip_${lu.id}_${idx}`}
              x={u - 3.5}
              y={v - 3.5}
              width="7"
              height="7"
              fill="white"
              stroke="#10b981"
              strokeWidth="1.5"
              className="cursor-pointer pointer-events-auto"
              title="Потягніть, щоб змінити кут угіддя"
            />
          );
        })
      )}
    </g>
  );
}
