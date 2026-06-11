import React from 'react';
import { Point, DrawMode } from '../../../types';
import { calculateDistance } from '../../../utils/geo';

interface DrawingPreviewLayerProps {
  isDrawing: boolean;
  mode: DrawMode;
  tempPoints: Point[];
  hoverGeodetic: { x: number; y: number } | null;
  orthoResult: { x: number; y: number; angle: number; isOrthoTracked: boolean } | null;
  mapToScreen: (x: number, y: number) => { u: number; v: number };
}

export default function DrawingPreviewLayer({
  isDrawing,
  mode,
  tempPoints,
  hoverGeodetic,
  orthoResult,
  mapToScreen,
}: DrawingPreviewLayerProps) {
  const getPointsPolygonPath = (pts: Point[]): string => {
    if (pts.length === 0) return '';
    const mapped = pts.map((p) => {
      const { u, v } = mapToScreen(p.x, p.y);
      return `${u},${v}`;
    });
    return `M ${mapped.join(' L ')} Z`;
  };

  if (!isDrawing) return null;

  return (
    <g id="svg_drawing_preview_layer">
      {/* Polar Tracking snap guidelines */}
      {tempPoints.length > 0 && orthoResult && orthoResult.isOrthoTracked && hoverGeodetic && (
        <g id="svg_polar_tracking_guides" className="pointer-events-none">
          {(() => {
            const lastPt = tempPoints[tempPoints.length - 1];
            const snapRad = orthoResult.angle * (Math.PI / 180);
            const extX1 = lastPt.x - 2000 * Math.cos(snapRad);
            const extY1 = lastPt.y - 2000 * Math.sin(snapRad);
            const extX2 = lastPt.x + 2000 * Math.cos(snapRad);
            const extY2 = lastPt.y + 2000 * Math.sin(snapRad);

            const s1 = mapToScreen(extX1, extY1);
            const s2 = mapToScreen(extX2, extY2);

            return (
              <>
                <line
                  x1={s1.u}
                  y1={s1.v}
                  x2={s2.u}
                  y2={s2.v}
                  stroke="#10b981"
                  strokeWidth="1"
                  strokeDasharray="6 4"
                  className="opacity-60"
                />
                <g
                  transform={`translate(${mapToScreen(hoverGeodetic.x, hoverGeodetic.y).u + 25}, ${
                    mapToScreen(hoverGeodetic.x, hoverGeodetic.y).v + 25
                  })`}
                >
                  <rect x="-22" y="-7" width="44" height="14" rx="2" fill="#064e3b" className="opacity-90" />
                  <text textAnchor="middle" y="3.5" className="fill-emerald-100 font-mono text-[8.5px] font-bold">
                    Кут {orthoResult.angle}°
                  </text>
                </g>
              </>
            );
          })()}
        </g>
      )}

      {/* Dynamic preview line during drawing */}
      {tempPoints.length > 0 && hoverGeodetic && (
        <g id="svg_draw_preview_line" className="pointer-events-none">
          {(() => {
            const lastPt = tempPoints[tempPoints.length - 1];
            const sLast = mapToScreen(lastPt.x, lastPt.y);
            const sHover = mapToScreen(hoverGeodetic.x, hoverGeodetic.y);
            const dist = calculateDistance(lastPt, hoverGeodetic);
            const dx = hoverGeodetic.x - lastPt.x;
            const dy = hoverGeodetic.y - lastPt.y;
            let angleDeg = Math.round(Math.atan2(dy, dx) * (180 / Math.PI));
            if (angleDeg < 0) angleDeg += 360;

            const midU = (sLast.u + sHover.u) / 2;
            const midV = (sLast.v + sHover.v) / 2;

            const lineStroke =
              mode === 'ADD_BUILDING' ? '#ef4444' : mode === 'ADD_LAND_USE' ? '#10b981' : '#d97706';

            return (
              <>
                <line
                  x1={sLast.u}
                  y1={sLast.v}
                  x2={sHover.u}
                  y2={sHover.v}
                  stroke={lineStroke}
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />

                {dist > 0.1 && (
                  <g transform={`translate(${midU}, ${midV})`}>
                    <rect x="-20" y="-8" width="40" height="15" rx="3" fill="#1e293b" className="opacity-80" />
                    <text textAnchor="middle" y="2.5" className="fill-white font-mono text-[8px] font-bold">
                      {dist.toFixed(1)}м
                    </text>
                  </g>
                )}

                {dist > 1 && (!orthoResult || !orthoResult.isOrthoTracked) && (
                  <g transform={`translate(${sHover.u + 12}, ${sHover.v + 15})`}>
                    <rect x="-15" y="-8" width="30" height="15" rx="3" fill="#0f172a" className="opacity-90" />
                    <text textAnchor="middle" y="2" className="fill-blue-300 font-mono text-[8px] font-extrabold">
                      {angleDeg}°
                    </text>
                  </g>
                )}
              </>
            );
          })()}
        </g>
      )}

      {/* Render Temp Points during interactive drawing */}
      {tempPoints.length > 0 && (
        <g id="svg_temp_draw_g">
          {tempPoints.map((tp, i) => {
            const s = mapToScreen(tp.x, tp.y);
            const pointColor =
              mode === 'ADD_BUILDING' ? '#ef4444' : mode === 'ADD_LAND_USE' ? '#10b981' : '#d97706';
            return (
              <circle
                key={`tpt_${i}`}
                cx={s.u}
                cy={s.v}
                r="5"
                fill={pointColor}
                stroke="white"
                strokeWidth="1.5"
              />
            );
          })}
          {tempPoints.length >= 2 && (
            <path
              d={getPointsPolygonPath(tempPoints)}
              fill="none"
              stroke={mode === 'ADD_BUILDING' ? '#ef4444' : mode === 'ADD_LAND_USE' ? '#10b981' : '#d97706'}
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}
        </g>
      )}
    </g>
  );
}
