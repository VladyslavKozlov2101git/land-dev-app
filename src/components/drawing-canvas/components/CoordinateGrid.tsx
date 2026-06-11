import React from 'react';

interface CoordinateGridProps {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  dimensions: { width: number; height: number };
  mapToScreen: (x: number, y: number) => { u: number; v: number };
}

export default function CoordinateGrid({
  minX,
  maxX,
  minY,
  maxY,
  dimensions,
  mapToScreen,
}: CoordinateGridProps) {
  const gridLines: React.ReactNode[] = [];
  const step = 50;

  const startX = Math.floor(minX / step) * step;
  const endX = Math.ceil(maxX / step) * step;
  const startY = Math.floor(minY / step) * step;
  const endY = Math.ceil(maxY / step) * step;

  // Render vertical grid lines (with respect to y/Easting axis mapping)
  for (let gy = startY; gy <= endY; gy += step) {
    const p1 = mapToScreen(minX, gy);
    const p2 = mapToScreen(maxX, gy);
    gridLines.push(
      <line
        key={`gr_v_${gy}`}
        x1={p1.u}
        y1={p1.v}
        x2={p2.u}
        y2={p2.v}
        stroke="#f1f5f9"
        strokeWidth="1"
        strokeDasharray="2 3"
      />
    );
    if (p1.u > 0 && p1.u < dimensions.width) {
      gridLines.push(
        <text
          key={`lbl_v_${gy}`}
          x={p1.u + 4}
          y={dimensions.height - 10}
          className="fill-slate-400 font-mono text-[9px]"
        >
          {gy.toFixed(0)}
        </text>
      );
    }
  }

  // Render horizontal grid lines (with respect to x/Northing axis mapping)
  for (let gx = startX; gx <= endX; gx += step) {
    const p1 = mapToScreen(gx, minY);
    const p2 = mapToScreen(gx, maxY);
    gridLines.push(
      <line
        key={`gr_h_${gx}`}
        x1={p1.u}
        y1={p1.v}
        x2={p2.u}
        y2={p2.v}
        stroke="#f1f5f9"
        strokeWidth="1"
        strokeDasharray="2 3"
      />
    );
    if (p1.v > 0 && p1.v < dimensions.height) {
      gridLines.push(
        <text
          key={`lbl_h_${gx}`}
          x={6}
          y={p1.v - 4}
          className="fill-slate-400 font-mono text-[9px]"
        >
          {gx.toFixed(0)}
        </text>
      );
    }
  }

  return <g id="svg_grid">{gridLines}</g>;
}
