import React from 'react';
import { Point, CadastralModel, Building } from '../../../types';
import { calculateCentroid, isPolygonInsidePolygon, doPolygonsOverlap } from '../../../utils/geo';

interface BuildingsLayerProps {
  model: CadastralModel;
  mapToScreen: (x: number, y: number) => { u: number; v: number };
}

export default function BuildingsLayer({ model, mapToScreen }: BuildingsLayerProps) {
  const getPointsPolygonPath = (pts: Point[]): string => {
    if (pts.length === 0) return '';
    const mapped = pts.map((p) => {
      const { u, v } = mapToScreen(p.x, p.y);
      return `${u},${v}`;
    });
    return `M ${mapped.join(' L ')} Z`;
  };

  const isBuildingInside = (b: Building) => {
    return isPolygonInsidePolygon(b.points, model.points);
  };

  // Find overlapping buildings
  const overlappingBuildingIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (let i = 0; i < model.buildings.length; i++) {
      for (let j = i + 1; j < model.buildings.length; j++) {
        if (doPolygonsOverlap(model.buildings[i].points, model.buildings[j].points)) {
          ids.add(model.buildings[i].id);
          ids.add(model.buildings[j].id);
        }
      }
    }
    return ids;
  }, [model.buildings]);

  return (
    <g id="svg_buildings_layer">
      {model.buildings.map((b) => {
        const pathStr = getPointsPolygonPath(b.points);
        if (!pathStr) return null;
        const isOverlap = overlappingBuildingIds.has(b.id);
        const isInside = isBuildingInside(b);
        const isValid = !isOverlap && isInside;

        return (
          <g
            id={`svg_building_g_${b.id}`}
            key={b.id}
            className="opacity-90 hover:opacity-100 transition-opacity"
          >
            <path
              d={pathStr}
              fill="#fee2e2"
              stroke={isValid ? "#ef4444" : "#dc2626"}
              strokeWidth={isValid ? "2" : "3.5"}
              strokeLinejoin="round"
              className={isValid ? "" : "animate-pulse"}
            />
            <path
              d={pathStr}
              fill={isValid ? "url(#building-diagonal-pattern)" : "url(#striped-red-pattern)"}
              className={isValid ? "opacity-30" : "opacity-50"}
            />
            {(() => {
              const centroid = calculateCentroid(b.points);
              const { u, v } = mapToScreen(centroid.x, centroid.y);
              return (
                <g transform={`translate(${u}, ${v})`}>
                  <rect
                    x="-45"
                    y="-12"
                    width="90"
                    height="24"
                    rx="3"
                    fill={isValid ? "#fef2f2" : "#fef2f2"}
                    stroke={isValid ? "#b91c1c" : "#dc2626"}
                    strokeWidth={isValid ? "0.5" : "1.5"}
                    className="opacity-90 shadow-xs"
                  />
                  <text
                    className={`${isValid ? 'fill-red-900' : 'fill-red-700 font-black'} font-bold font-mono text-[9px]`}
                    textAnchor="middle"
                    y="4"
                  >
                    Буд.{' '}
                    {b.name.includes('літ.')
                      ? b.name.split('літ.')[1].replace(')', '').trim()
                      : b.name.slice(0, 10)}
                  </text>
                  {!isValid && (
                    <text
                      className="fill-rose-700 font-sans font-bold text-[8px]"
                      textAnchor="middle"
                      y="15"
                    >
                      {!isInside ? "Вихід за межі!" : "Накладання!"}
                    </text>
                  )}
                </g>
              );
            })()}
          </g>
        );
      })}
    </g>
  );
}
