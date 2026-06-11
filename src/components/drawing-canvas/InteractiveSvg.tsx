import React, { useRef } from 'react';
import { Point, CadastralModel, Building, Restriction } from '../../types';
import { calculateDistance, calculateCentroid } from '../../utils/geo';

type DrawMode = 'VIEW' | 'EDIT_PARCEL' | 'ADD_BUILDING' | 'ADD_RESTRICTION';

interface InteractiveSvgProps {
  model: CadastralModel;
  onUpdateModel: (updates: Partial<CadastralModel>) => void;
  selectedPointId: string | null;
  onSelectPoint: (id: string | null) => void;
  mode: DrawMode;
  zoom: number;
  pan: { x: number; y: number };
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  isPanning: boolean;
  setIsPanning: (val: boolean) => void;
  draggedPoint: {
    type: 'parcel' | 'building' | 'restriction';
    id: string;
    index?: number;
  } | null;
  setDraggedPoint: (val: {
    type: 'parcel' | 'building' | 'restriction';
    id: string;
    index?: number;
  } | null) => void;
  tempPoints: Point[];
  setTempPoints: React.Dispatch<React.SetStateAction<Point[]>>;
  tempName: string;
  tempCode: string;
  dimensions: { width: number; height: number };
  activeSnapPoint: { u: number; v: number; x: number; y: number } | null;
  setActiveSnapPoint: (val: { u: number; v: number; x: number; y: number } | null) => void;
  orthoMode: boolean;
  hoverGeodetic: { x: number; y: number } | null;
  setHoverGeodetic: (val: { x: number; y: number } | null) => void;
}

export default function InteractiveSvg({
  model,
  onUpdateModel,
  selectedPointId,
  onSelectPoint,
  mode,
  zoom,
  pan,
  setPan,
  isPanning,
  setIsPanning,
  draggedPoint,
  setDraggedPoint,
  tempPoints,
  setTempPoints,
  tempName,
  tempCode,
  dimensions,
  activeSnapPoint,
  setActiveSnapPoint,
  orthoMode,
  hoverGeodetic,
  setHoverGeodetic,
}: InteractiveSvgProps) {
  const startPanPos = useRef({ x: 0, y: 0 });

  // Bounding box computation
  const getAllPoints = (): Point[] => {
    let list: Point[] = [...model.points];
    model.buildings.forEach((b) => list.push(...b.points));
    model.restrictions.forEach((r) => list.push(...r.points));
    return list;
  };

  const calculateBounds = (points: Point[]) => {
    if (points.length === 0) {
      return { minX: 5612000, maxX: 5613000, minY: 3248000, maxY: 3249000 };
    }
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    points.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const dx = maxX - minX || 100;
    const dy = maxY - minY || 100;
    const center = { x: minX + dx / 2, y: minY + dy / 2 };
    const maxDelta = Math.max(dx, dy) * 1.3;

    return {
      minX: center.x - maxDelta / 2,
      maxX: center.x + maxDelta / 2,
      minY: center.y - maxDelta / 2,
      maxY: center.y + maxDelta / 2,
    };
  };

  const bounds = React.useMemo(() => {
    return calculateBounds(getAllPoints());
  }, [model.points, model.buildings, model.restrictions, draggedPoint]);

  const { minX, maxX, minY, maxY } = bounds;
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;

  const pad = 40;
  const drawW = dimensions.width - 2 * pad;
  const drawH = dimensions.height - 2 * pad;

  const scale = React.useMemo(() => {
    if (rangeX === 0 && rangeY === 0) return 1;
    if (rangeX === 0) return drawW / rangeY;
    if (rangeY === 0) return drawH / rangeX;
    return Math.min(drawW / rangeY, drawH / rangeX);
  }, [rangeX, rangeY, drawW, drawH]);

  const mapToScreen = (x: number, y: number) => {
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;

    const centerX = minX + rangeX / 2;
    const centerY = minY + rangeY / 2;

    const uBase = cx + (y - centerY) * scale;
    const vBase = cy - (x - centerX) * scale;

    const u = cx + (uBase - cx) * zoom + pan.x;
    const v = cy + (vBase - cy) * zoom + pan.y;

    return { u, v };
  };

  const mapToGeodetic = (u: number, v: number): { x: number; y: number } => {
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;

    const centerX = minX + rangeX / 2;
    const centerY = minY + rangeY / 2;

    const y = centerY + (u - pan.x - cx) / (scale * zoom);
    const x = centerX - (v - pan.y - cy) / (scale * zoom);

    return {
      x: Math.round(x * 1000) / 1000,
      y: Math.round(y * 1000) / 1000,
    };
  };

  const getSnappedCoordinate = (
    currU: number,
    currV: number,
    excludePointId?: string,
  ): { x: number; y: number; snappedPointId: string | null } => {
    const SNAP_THRESHOLD_PX = 15;
    let nearestPt: Point | null = null;
    let minDistance = Infinity;

    model.points.forEach((p) => {
      if (p.id === excludePointId) return;
      const { u, v } = mapToScreen(p.x, p.y);
      const dist = Math.sqrt((u - currU) ** 2 + (v - currV) ** 2);
      if (dist < SNAP_THRESHOLD_PX && dist < minDistance) {
        minDistance = dist;
        nearestPt = p;
      }
    });

    if (nearestPt) {
      return {
        x: (nearestPt as Point).x,
        y: (nearestPt as Point).y,
        snappedPointId: (nearestPt as Point).id,
      };
    }

    const geo = mapToGeodetic(currU, currV);
    return { x: geo.x, y: geo.y, snappedPointId: null };
  };

  const getOrthoSnappedCoordinate = (
    cursorGeo: { x: number; y: number },
    prevPt: Point,
  ): { x: number; y: number; angle: number } => {
    const dx = cursorGeo.x - prevPt.x;
    const dy = cursorGeo.y - prevPt.y;

    const angleRad = Math.atan2(dy, dx);
    const angleDeg = angleRad * (180 / Math.PI);

    const snappedAngleDeg = Math.round(angleDeg / 45) * 45;
    const snappedAngleRad = snappedAngleDeg * (Math.PI / 180);
    const dist = Math.sqrt(dx * dx + dy * dy);

    const x = prevPt.x + dist * Math.cos(snappedAngleRad);
    const y = prevPt.y + dist * Math.sin(snappedAngleRad);

    let displayAngle = snappedAngleDeg;
    if (displayAngle < 0) displayAngle += 360;

    return {
      x: Math.round(x * 1000) / 1000,
      y: Math.round(y * 1000) / 1000,
      angle: displayAngle,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const svgEl = e.currentTarget;
    const rect = svgEl.getBoundingClientRect();
    const clickU = e.clientX - rect.left;
    const clickV = e.clientY - rect.top;

    for (let i = 0; i < model.points.length; i++) {
      const p = model.points[i];
      const { u, v } = mapToScreen(p.x, p.y);
      const dist = Math.sqrt((u - clickU) ** 2 + (v - clickV) ** 2);
      if (dist < 10) {
        setDraggedPoint({ type: 'parcel', id: p.id, index: i });
        onSelectPoint(p.id);
        return;
      }
    }

    for (let bIdx = 0; bIdx < model.buildings.length; bIdx++) {
      const b = model.buildings[bIdx];
      for (let pIdx = 0; pIdx < b.points.length; pIdx++) {
        const p = b.points[pIdx];
        const { u, v } = mapToScreen(p.x, p.y);
        const dist = Math.sqrt((u - clickU) ** 2 + (v - clickV) ** 2);
        if (dist < 10) {
          setDraggedPoint({ type: 'building', id: b.id, index: pIdx });
          return;
        }
      }
    }

    for (let rIdx = 0; rIdx < model.restrictions.length; rIdx++) {
      const r = model.restrictions[rIdx];
      for (let pIdx = 0; pIdx < r.points.length; pIdx++) {
        const p = r.points[pIdx];
        const { u, v } = mapToScreen(p.x, p.y);
        const dist = Math.sqrt((u - clickU) ** 2 + (v - clickV) ** 2);
        if (dist < 10) {
          setDraggedPoint({ type: 'restriction', id: r.id, index: pIdx });
          return;
        }
      }
    }

    if (mode === 'ADD_BUILDING' || mode === 'ADD_RESTRICTION') {
      let targetCoord = getSnappedCoordinate(clickU, clickV);

      if (tempPoints.length > 0 && (orthoMode || e.shiftKey)) {
        const prevPt = tempPoints[tempPoints.length - 1];
        const orthoResult = getOrthoSnappedCoordinate(targetCoord, prevPt);
        targetCoord = {
          x: orthoResult.x,
          y: orthoResult.y,
          snappedPointId: targetCoord.snappedPointId,
        };
      }

      const newPt: Point = {
        id: `temp_${Date.now()}_${tempPoints.length}`,
        x: targetCoord.x,
        y: targetCoord.y,
      };
      setTempPoints([...tempPoints, newPt]);
    } else {
      setIsPanning(true);
      startPanPos.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svgEl = e.currentTarget;
    const rect = svgEl.getBoundingClientRect();
    const currU = e.clientX - rect.left;
    const currV = e.clientY - rect.top;

    const isDrawing = mode === 'ADD_BUILDING' || mode === 'ADD_RESTRICTION';
    const isDraggingNonParcel = draggedPoint && draggedPoint.type !== 'parcel';

    let targetCoord = mapToGeodetic(currU, currV);

    if (isDrawing || isDraggingNonParcel) {
      const { x, y, snappedPointId } = getSnappedCoordinate(currU, currV, draggedPoint?.id);
      if (snappedPointId) {
        const snapScreen = mapToScreen(x, y);
        setActiveSnapPoint({ u: snapScreen.u, v: snapScreen.v, x, y });
        targetCoord = { x, y };
      } else {
        setActiveSnapPoint(null);
      }
    } else {
      setActiveSnapPoint(null);
    }

    if (isDrawing && tempPoints.length > 0) {
      const useOrtho = orthoMode || e.shiftKey;
      if (useOrtho) {
        const prevPt = tempPoints[tempPoints.length - 1];
        const orthoResult = getOrthoSnappedCoordinate(targetCoord, prevPt);
        targetCoord = { x: orthoResult.x, y: orthoResult.y };
      }
    }

    if (isDrawing) {
      setHoverGeodetic(targetCoord);
    } else {
      setHoverGeodetic(null);
    }

    if (draggedPoint) {
      if (draggedPoint.type === 'parcel' && draggedPoint.index !== undefined) {
        const newPts = [...model.points];
        newPts[draggedPoint.index] = {
          ...newPts[draggedPoint.index],
          x: targetCoord.x,
          y: targetCoord.y,
        };
        onUpdateModel({ points: newPts });
      } else if (draggedPoint.type === 'building' && draggedPoint.index !== undefined) {
        const updatedBuildings = model.buildings.map((b) => {
          if (b.id === draggedPoint.id) {
            const pts = [...b.points];
            pts[draggedPoint.index!] = {
              ...pts[draggedPoint.index!],
              x: targetCoord.x,
              y: targetCoord.y,
            };
            return { ...b, points: pts };
          }
          return b;
        });
        onUpdateModel({ buildings: updatedBuildings });
      } else if (draggedPoint.type === 'restriction' && draggedPoint.index !== undefined) {
        const updatedRestrictions = model.restrictions.map((r) => {
          if (r.id === draggedPoint.id) {
            const pts = [...r.points];
            pts[draggedPoint.index!] = {
              ...pts[draggedPoint.index!],
              x: targetCoord.x,
              y: targetCoord.y,
            };
            return { ...r, points: pts };
          }
          return r;
        });
        onUpdateModel({ restrictions: updatedRestrictions });
      }
    } else if (isPanning) {
      setPan({
        x: e.clientX - startPanPos.current.x,
        y: e.clientY - startPanPos.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setDraggedPoint(null);
    setIsPanning(false);
    setActiveSnapPoint(null);
    setHoverGeodetic(null);
  };

  const getPointsPolygonPath = (pts: Point[]): string => {
    if (pts.length === 0) return '';
    const mapped = pts.map((p) => {
      const { u, v } = mapToScreen(p.x, p.y);
      return `${u},${v}`;
    });
    return `M ${mapped.join(' L ')} Z`;
  };

  const renderCoordinateGrid = () => {
    const gridLines: React.ReactNode[] = [];
    const step = 50;

    const startX = Math.floor(minX / step) * step;
    const endX = Math.ceil(maxX / step) * step;
    const startY = Math.floor(minY / step) * step;
    const endY = Math.ceil(maxY / step) * step;

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
        />,
      );
      if (p1.u > 0 && p1.u < dimensions.width) {
        gridLines.push(
          <text
            key={`lbl_v_${gy}`}
            x={p1.u + 4}
            y={dimensions.height - 10}
            className="fill-slate-400 font-mono text-[9px]">
            {gy.toFixed(0)}
          </text>,
        );
      }
    }

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
        />,
      );
      if (p1.v > 0 && p1.v < dimensions.height) {
        gridLines.push(
          <text
            key={`lbl_h_${gx}`}
            x={6}
            y={p1.v - 4}
            className="fill-slate-400 font-mono text-[9px]">
            {gx.toFixed(0)}
          </text>,
        );
      }
    }

    return gridLines;
  };

  return (
    <svg
      id="main_cadastral_svg"
      width="100%"
      height="100%"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="absolute inset-0">
      {renderCoordinateGrid()}

      {/* 1. Render Restrictions polygons */}
      {model.restrictions.map((r) => {
        const pathStr = getPointsPolygonPath(r.points);
        if (!pathStr) return null;
        return (
          <g
            id={`svg_rest_g_${r.id}`}
            key={r.id}
            className="opacity-85 hover:opacity-100 transition-opacity">
            <path
              d={pathStr}
              fill="url(#striped-amber-pattern)"
              stroke="#d97706"
              strokeWidth="1.5"
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
                    fill="#fffbeb"
                    stroke="#f59e0b"
                    strokeWidth="0.5"
                    className="opacity-90"
                  />
                  <text
                    className="fill-amber-900 font-semibold font-mono text-[9px]"
                    textAnchor="middle"
                    y="5">
                    ОБМ ({r.code})
                  </text>
                </g>
              );
            })()}
          </g>
        );
      })}

      {/* 2. Render Main Parcel Polygon */}
      {model.points.length >= 3 && (
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
                    className="fill-blue-950 font-bold font-mono text-[8.5px]">
                    {dist.toFixed(1)}м
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      )}

      {/* 3. Render Buildings */}
      {model.buildings.map((b) => {
        const pathStr = getPointsPolygonPath(b.points);
        if (!pathStr) return null;
        return (
          <g
            id={`svg_building_g_${b.id}`}
            key={b.id}
            className="opacity-90 hover:opacity-100 transition-opacity">
            <path
              d={pathStr}
              fill="#fee2e2"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path d={pathStr} fill="url(#building-diagonal-pattern)" className="opacity-30" />
            {(() => {
              const centroid = calculateCentroid(b.points);
              const { u, v } = mapToScreen(centroid.x, centroid.y);
              return (
                <g transform={`translate(${u}, ${v})`}>
                  <rect
                    x="-35"
                    y="-10"
                    width="70"
                    height="20"
                    rx="3"
                    fill="#fef2f2"
                    stroke="#b91c1c"
                    strokeWidth="0.5"
                    className="opacity-90"
                  />
                  <text
                    className="fill-red-900 font-bold font-mono text-[9px]"
                    textAnchor="middle"
                    y="4">
                    Буд.{' '}
                    {b.name.includes('літ.')
                      ? b.name.split('літ.')[1].replace(')', '').trim()
                      : ''}
                  </text>
                </g>
              );
            })()}
          </g>
        );
      })}

      {/* Dynamic preview line during drawing */}
      {(mode === 'ADD_BUILDING' || mode === 'ADD_RESTRICTION') &&
        tempPoints.length > 0 &&
        hoverGeodetic &&
        (() => {
          const lastPt = tempPoints[tempPoints.length - 1];
          const sLast = mapToScreen(lastPt.x, lastPt.y);
          const sHover = mapToScreen(hoverGeodetic.x, hoverGeodetic.y);
          const dist = calculateDistance(lastPt, { ...hoverGeodetic, id: '' });
          const dx = hoverGeodetic.x - lastPt.x;
          const dy = hoverGeodetic.y - lastPt.y;
          let angleDeg = Math.round(Math.atan2(dy, dx) * (180 / Math.PI));
          if (angleDeg < 0) angleDeg += 360;

          const midU = (sLast.u + sHover.u) / 2;
          const midV = (sLast.v + sHover.v) / 2;

          return (
            <g id="svg_draw_preview_line" className="pointer-events-none">
              <line
                x1={sLast.u}
                y1={sLast.v}
                x2={sHover.u}
                y2={sHover.v}
                stroke={mode === 'ADD_BUILDING' ? '#ef4444' : '#d97706'}
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />

              {dist > 0.1 && (
                <g transform={`translate(${midU}, ${midV})`}>
                  <rect
                    x="-20"
                    y="-8"
                    width="40"
                    height="15"
                    rx="3"
                    fill="#1e293b"
                    className="opacity-80"
                  />
                  <text
                    textAnchor="middle"
                    y="2.5"
                    className="fill-white font-mono text-[8px] font-bold">
                    {dist.toFixed(1)}м
                  </text>
                </g>
              )}

              {dist > 1 && (
                <g transform={`translate(${sHover.u + 12}, ${sHover.v + 15})`}>
                  <rect
                    x="-15"
                    y="-8"
                    width="30"
                    height="15"
                    rx="3"
                    fill="#0f172a"
                    className="opacity-90"
                  />
                  <text
                    textAnchor="middle"
                    y="2"
                    className="fill-blue-300 font-mono text-[8px] font-extrabold">
                    {angleDeg}°
                  </text>
                </g>
              )}
            </g>
          );
        })()}

      {/* 4. Render Temp Points during interactive drawing */}
      {tempPoints.length > 0 && (
        <g id="svg_temp_draw_g">
          {tempPoints.map((tp, i) => {
            const s = mapToScreen(tp.x, tp.y);
            return (
              <circle
                key={`tpt_${i}`}
                cx={s.u}
                cy={s.v}
                r="5"
                fill={mode === 'ADD_BUILDING' ? '#ef4444' : '#d97706'}
                stroke="white"
                strokeWidth="1.5"
              />
            );
          })}
          {tempPoints.length >= 2 && (
            <path
              d={getPointsPolygonPath(tempPoints)}
              fill="none"
              stroke={mode === 'ADD_BUILDING' ? '#ef4444' : '#d97706'}
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}
        </g>
      )}

      {/* 5. Render parcel vertices */}
      {model.points.map((p, index) => {
        const { u, v } = mapToScreen(p.x, p.y);
        const isSelected = p.id === selectedPointId;
        return (
          <g
            key={`vertex_${p.id}`}
            id={`svg_vertex_g_${p.id}`}
            className="group cursor-pointer">
            <circle
              cx={u}
              cy={v}
              r={isSelected ? '9' : '7'}
              fill={isSelected ? '#2563eb' : '#ffffff'}
              stroke={isSelected ? '#1d4ed8' : '#3b82f6'}
              strokeWidth={isSelected ? '3' : '2'}
              className="transition-transform duration-100 group-hover:scale-125 shadow-md"
            />
            <text
              x={u}
              y={v + 3.5}
              textAnchor="middle"
              className={`font-sans font-extrabold text-[8px] select-none ${isSelected ? 'fill-white' : 'fill-slate-800'}`}>
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
              <text
                x={u}
                y={v - 30}
                textAnchor="middle"
                className="fill-white font-mono text-[8.5px]">
                X: {p.x.toFixed(2)}
              </text>
              <text
                x={u}
                y={v - 18}
                textAnchor="middle"
                className="fill-blue-400 font-mono text-[8.5px]">
                Y: {p.y.toFixed(2)}
              </text>
            </g>
          </g>
        );
      })}

      {/* Snapping Target Indicator */}
      {activeSnapPoint && (
        <g id="svg_snap_indicator" className="pointer-events-none animate-fade-in">
          <circle
            cx={activeSnapPoint.u}
            cy={activeSnapPoint.v}
            r="14"
            fill="none"
            stroke="#10b981"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            className="animate-spin"
            style={{
              transformOrigin: `${activeSnapPoint.u}px ${activeSnapPoint.v}px`,
              animationDuration: '4s',
            }}
          />
          <circle
            cx={activeSnapPoint.u}
            cy={activeSnapPoint.v}
            r="6"
            fill="#10b981"
            fillOpacity="0.3"
            stroke="#059669"
            strokeWidth="1"
          />
          <circle cx={activeSnapPoint.u} cy={activeSnapPoint.v} r="2" fill="#047857" />
          <g transform={`translate(${activeSnapPoint.u + 12}, ${activeSnapPoint.v - 12})`}>
            <rect
              x="0"
              y="-10"
              width="85"
              height="16"
              rx="3"
              fill="#064e3b"
              className="shadow-sm"
            />
            <text
              x="42.5"
              y="1"
              textAnchor="middle"
              className="fill-emerald-100 font-bold font-sans text-[8px]">
              Прив'язка до кута
            </text>
          </g>
        </g>
      )}

      {/* Helper SVG Definitions */}
      <defs>
        <pattern
          id="striped-amber-pattern"
          width="10"
          height="10"
          patternTransform="rotate(45 0 0)"
          patternUnits="userSpaceOnUse">
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="10"
            stroke="#f59e0b"
            strokeWidth="2"
            className="opacity-30"
          />
        </pattern>
        <pattern
          id="building-diagonal-pattern"
          width="8"
          height="8"
          patternTransform="rotate(45 0 0)"
          patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#ef4444" strokeWidth="1.5" />
        </pattern>
      </defs>
    </svg>
  );
}
