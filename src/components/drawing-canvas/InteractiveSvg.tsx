import React, { useRef, useState } from 'react';
import { Point, CadastralModel, Building, Restriction, DrawMode, LandUseExplication } from '../../types';
import { 
  calculateDistance, 
  calculateCentroid, 
  doPolygonsOverlap, 
  isPolygonInsidePolygon, 
  getClosestPointOnSegment, 
  getLineIntersection,
  distanceToSegment,
  calculatePolygonArea
} from '../../utils/geo';

interface SnapResult {
  x: number;
  y: number;
  type: 'vertex' | 'edge' | 'intersection' | 'ortho' | 'none';
  label: string;
  color?: string;
}

interface Segment {
  p1: Point;
  p2: Point;
  label: string;
}

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
    type: 'parcel' | 'building' | 'restriction' | 'land_use';
    id: string;
    index?: number;
  } | null;
  setDraggedPoint: (val: {
    type: 'parcel' | 'building' | 'restriction' | 'land_use';
    id: string;
    index?: number;
  } | null) => void;
  tempPoints: Point[];
  setTempPoints: React.Dispatch<React.SetStateAction<Point[]>>;
  tempName: string;
  tempCode: string;
  dimensions: { width: number; height: number };
  activeSnapPoint: { u: number; v: number; x: number; y: number; label?: string; type?: string; color?: string } | null;
  setActiveSnapPoint: (val: { u: number; v: number; x: number; y: number; label?: string; type?: string; color?: string } | null) => void;
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
  const isDrawing = mode === 'ADD_BUILDING' || mode === 'ADD_RESTRICTION' || mode === 'ADD_LAND_USE';

  // Bounding box computation
  const getAllPoints = (): Point[] => {
    let list: Point[] = [...model.points];
    model.buildings.forEach((b) => list.push(...b.points));
    model.restrictions.forEach((r) => list.push(...r.points));
    (model.landUseExplication || []).forEach((lu) => {
      if (lu.points) list.push(...lu.points);
    });
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
  }, [model.points, model.buildings, model.restrictions, model.landUseExplication, draggedPoint]);

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

  const getAllVertices = (): { pt: Point; label: string; color: string }[] => {
    const list: { pt: Point; label: string; color: string }[] = [];
    model.points.forEach((p, idx) => list.push({ pt: p, label: `Межа ${idx + 1}`, color: '#2563eb' }));
    model.buildings.forEach((b) => {
      b.points.forEach((p, idx) => list.push({ pt: p, label: `${b.name} (Кут ${idx + 1})`, color: '#ef4444' }));
    });
    model.restrictions.forEach((r) => {
      r.points.forEach((p, idx) => list.push({ pt: p, label: `${r.name} (Кут ${idx + 1})`, color: '#d97706' }));
    });
    (model.landUseExplication || []).forEach((lu) => {
      if (lu.points) {
        lu.points.forEach((p, idx) => list.push({ pt: p, label: `${lu.name} (Кут ${idx + 1})`, color: '#10b981' }));
      }
    });
    return list;
  };

  const getAllSegments = (): Segment[] => {
    const list: Segment[] = [];
    // Parcel edges
    for (let i = 0; i < model.points.length; i++) {
      list.push({
        p1: model.points[i],
        p2: model.points[(i + 1) % model.points.length],
        label: 'Межа ділянки',
      });
    }
    // Building edges
    model.buildings.forEach((b) => {
      for (let i = 0; i < b.points.length; i++) {
        list.push({
          p1: b.points[i],
          p2: b.points[(i + 1) % b.points.length],
          label: `Стіна ${b.name}`,
        });
      }
    });
    // Restrictions
    model.restrictions.forEach((r) => {
      for (let i = 0; i < r.points.length; i++) {
        list.push({
          p1: r.points[i],
          p2: r.points[(i + 1) % r.points.length],
          label: `Межа обмеження ${r.name}`,
        });
      }
    });
    // Land use
    (model.landUseExplication || []).forEach((lu) => {
      if (lu.points && lu.points.length >= 3) {
        for (let i = 0; i < lu.points.length; i++) {
          list.push({
            p1: lu.points[i],
            p2: lu.points[(i + 1) % lu.points.length],
            label: `Межа угіддя ${lu.name}`,
          });
        }
      }
    });
    return list;
  };

  const getStaticIntersections = (segs: Segment[]): { x: number; y: number }[] => {
    const intersections: { x: number; y: number }[] = [];
    for (let i = 0; i < segs.length; i++) {
      for (let j = i + 1; j < segs.length; j++) {
        const seg1 = segs[i];
        const seg2 = segs[j];
        // Skip shared endpoints
        if (
          seg1.p1.id === seg2.p1.id || seg1.p1.id === seg2.p2.id ||
          seg1.p2.id === seg2.p1.id || seg1.p2.id === seg2.p2.id
        ) {
          continue;
        }
        const inter = getLineIntersection(seg1.p1, seg1.p2, seg2.p1, seg2.p2);
        if (inter) {
          intersections.push(inter);
        }
      }
    }
    return intersections;
  };

  const findSnapPoint = (
    currU: number,
    currV: number,
    excludePointId?: string,
  ): SnapResult => {
    const SNAP_THRESHOLD_PX = 15;
    const geo = mapToGeodetic(currU, currV);

    const segments = getAllSegments();
    const vertices = getAllVertices();

    // 1. Vertex Snapping
    let nearestVertex: typeof vertices[0] | null = null;
    let minVertexDist = Infinity;
    vertices.forEach((v) => {
      if (excludePointId && v.pt.id === excludePointId) return;
      const screen = mapToScreen(v.pt.x, v.pt.y);
      const dist = Math.sqrt((screen.u - currU) ** 2 + (screen.v - currV) ** 2);
      if (dist < SNAP_THRESHOLD_PX && dist < minVertexDist) {
        minVertexDist = dist;
        nearestVertex = v;
      }
    });

    if (nearestVertex) {
      return {
        x: (nearestVertex as any).pt.x,
        y: (nearestVertex as any).pt.y,
        type: 'vertex',
        label: (nearestVertex as any).label,
        color: (nearestVertex as any).color,
      };
    }

    // 2. Preview Segment Intersection Snapping
    if (tempPoints.length > 0) {
      const lastPt = tempPoints[tempPoints.length - 1];
      let nearestInter: { x: number; y: number; label: string } | null = null;
      let minInterDist = Infinity;

      segments.forEach((seg) => {
        if (seg.p1.id === lastPt.id || seg.p2.id === lastPt.id) return;
        const inter = getLineIntersection(lastPt, geo, seg.p1, seg.p2);
        if (inter) {
          const screen = mapToScreen(inter.x, inter.y);
          const dist = Math.sqrt((screen.u - currU) ** 2 + (screen.v - currV) ** 2);
          if (dist < SNAP_THRESHOLD_PX && dist < minInterDist) {
            minInterDist = dist;
            nearestInter = { x: inter.x, y: inter.y, label: `Перетин з: ${seg.label}` };
          }
        }
      });

      if (nearestInter) {
        return {
          x: nearestInter.x,
          y: nearestInter.y,
          type: 'intersection',
          label: nearestInter.label,
          color: '#f97316',
        };
      }
    }

    // 3. Static Segment-Segment Intersection Snapping
    const staticInters = getStaticIntersections(segments);
    let nearestStaticInter: { x: number; y: number } | null = null;
    let minStaticDist = Infinity;
    staticInters.forEach((inter) => {
      const screen = mapToScreen(inter.x, inter.y);
      const dist = Math.sqrt((screen.u - currU) ** 2 + (screen.v - currV) ** 2);
      if (dist < SNAP_THRESHOLD_PX && dist < minStaticDist) {
        minStaticDist = dist;
        nearestStaticInter = inter;
      }
    });

    if (nearestStaticInter) {
      return {
        x: nearestStaticInter.x,
        y: nearestStaticInter.y,
        type: 'intersection',
        label: 'Перетин меж',
        color: '#f97316',
      };
    }

    // 4. Edge Line Snapping (Perpendicular/Nearest)
    let nearestEdgePoint: { x: number; y: number; label: string } | null = null;
    let minEdgeDist = Infinity;
    segments.forEach((seg) => {
      const ptOnSeg = getClosestPointOnSegment(geo, seg.p1, seg.p2);
      const screen = mapToScreen(ptOnSeg.x, ptOnSeg.y);
      const dist = Math.sqrt((screen.u - currU) ** 2 + (screen.v - currV) ** 2);
      if (dist < 10 && dist < minEdgeDist) {
        minEdgeDist = dist;
        nearestEdgePoint = { x: ptOnSeg.x, y: ptOnSeg.y, label: `Прив'язка до лінії: ${seg.label}` };
      }
    });

    if (nearestEdgePoint) {
      return {
        x: nearestEdgePoint.x,
        y: nearestEdgePoint.y,
        type: 'edge',
        label: nearestEdgePoint.label,
        color: '#3b82f6',
      };
    }

    return {
      x: geo.x,
      y: geo.y,
      type: 'none',
      label: '',
    };
  };

  const getOrthoSnappedCoordinate = (
    cursorGeo: { x: number; y: number },
    prevPt: Point,
    prev2Pt?: Point
  ): { x: number; y: number; angle: number; isOrthoTracked: boolean } => {
    const dx = cursorGeo.x - prevPt.x;
    const dy = cursorGeo.y - prevPt.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return { x: prevPt.x, y: prevPt.y, angle: 0, isOrthoTracked: false };

    const cursorAngleDeg = Math.atan2(dy, dx) * (180 / Math.PI);

    let baseAngle = 0; // Relative to horizontal
    if (prev2Pt) {
      const pdx = prevPt.x - prev2Pt.x;
      const pdy = prevPt.y - prev2Pt.y;
      baseAngle = Math.atan2(pdy, pdx) * (180 / Math.PI);
    }

    // Snap to 90 degree increments relative to base angle + 45 degree polar tracking lines
    const snapOffsets = [0, 90, 180, 270, 45, 135, 225, 315];
    let minDiff = Infinity;
    let bestSnapAngle = 0;

    snapOffsets.forEach((offset) => {
      const targetAngle = (baseAngle + offset) % 360;
      let diff = Math.abs(cursorAngleDeg - targetAngle);
      while (diff > 180) diff = Math.abs(diff - 360);
      if (diff < minDiff) {
        minDiff = diff;
        bestSnapAngle = targetAngle;
      }
    });

    const TRACK_THRESHOLD = 15; // 15 degrees tracking corridor
    if (minDiff < TRACK_THRESHOLD) {
      const snapRad = bestSnapAngle * (Math.PI / 180);
      const x = prevPt.x + dist * Math.cos(snapRad);
      const y = prevPt.y + dist * Math.sin(snapRad);
      let displayAngle = Math.round(bestSnapAngle);
      if (displayAngle < 0) displayAngle += 360;
      return {
        x: Math.round(x * 1000) / 1000,
        y: Math.round(y * 1000) / 1000,
        angle: displayAngle,
        isOrthoTracked: true,
      };
    }

    let displayAngle = Math.round(cursorAngleDeg);
    if (displayAngle < 0) displayAngle += 360;
    return {
      x: cursorGeo.x,
      y: cursorGeo.y,
      angle: displayAngle,
      isOrthoTracked: false,
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

    // Support dragging Land Use vertices
    for (let luIdx = 0; luIdx < (model.landUseExplication || []).length; luIdx++) {
      const lu = model.landUseExplication[luIdx];
      if (lu.points) {
        for (let pIdx = 0; pIdx < lu.points.length; pIdx++) {
          const p = lu.points[pIdx];
          const { u, v } = mapToScreen(p.x, p.y);
          const dist = Math.sqrt((u - clickU) ** 2 + (v - clickV) ** 2);
          if (dist < 10) {
            setDraggedPoint({ type: 'land_use', id: lu.id, index: pIdx });
            return;
          }
        }
      }
    }

    if (isDrawing) {
      const snapResult = findSnapPoint(clickU, clickV);
      let targetCoord = { x: snapResult.x, y: snapResult.y };

      if (tempPoints.length > 0 && (orthoMode || e.shiftKey)) {
        const prevPt = tempPoints[tempPoints.length - 1];
        const prev2Pt = tempPoints.length >= 2 ? tempPoints[tempPoints.length - 2] : undefined;
        const orthoResult = getOrthoSnappedCoordinate(targetCoord, prevPt, prev2Pt);
        targetCoord = {
          x: orthoResult.x,
          y: orthoResult.y,
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

    const isDraggingNonParcel = draggedPoint && draggedPoint.type !== 'parcel';

    let targetCoord = mapToGeodetic(currU, currV);

    if (isDrawing || isDraggingNonParcel) {
      const snapResult = findSnapPoint(currU, currV, draggedPoint?.id);
      if (snapResult.type !== 'none') {
        const snapScreen = mapToScreen(snapResult.x, snapResult.y);
        setActiveSnapPoint({
          u: snapScreen.u,
          v: snapScreen.v,
          x: snapResult.x,
          y: snapResult.y,
          label: snapResult.label,
          type: snapResult.type,
          color: snapResult.color,
        });
        targetCoord = { x: snapResult.x, y: snapResult.y };
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
        const prev2Pt = tempPoints.length >= 2 ? tempPoints[tempPoints.length - 2] : undefined;
        const orthoResult = getOrthoSnappedCoordinate(targetCoord, prevPt, prev2Pt);
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
            return {
              ...b,
              points: pts,
              area: Math.round(calculatePolygonArea(pts) * 10) / 10
            };
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
            return {
              ...r,
              points: pts,
              area: Math.round(calculatePolygonArea(pts) * 10) / 10
            };
          }
          return r;
        });
        onUpdateModel({ restrictions: updatedRestrictions });
      } else if (draggedPoint.type === 'land_use' && draggedPoint.index !== undefined) {
        const updatedLu = (model.landUseExplication || []).map((lu) => {
          if (lu.id === draggedPoint.id && lu.points) {
            const pts = [...lu.points];
            pts[draggedPoint.index!] = {
              ...pts[draggedPoint.index!],
              x: targetCoord.x,
              y: targetCoord.y,
            };
            return {
              ...lu,
              points: pts,
              area: Math.round(calculatePolygonArea(pts) * 10) / 10
            };
          }
          return lu;
        });
        onUpdateModel({ landUseExplication: updatedLu });
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

  // CAD Input submission handler
  const [cadInput, setCadInput] = useState('');
  const cadInputRef = useRef<HTMLInputElement>(null);

  const handleCadInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempPoints.length === 0) return;

    const lastPt = tempPoints[tempPoints.length - 1];
    const val = cadInput.trim();
    if (!val) return;

    let nextX = lastPt.x;
    let nextY = lastPt.y;
    let valid = false;

    // Pattern 1: Relative offset like @dx,dy or @dx dy
    const relMatch = val.match(/^@\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/);
    // Pattern 2: Polar coordinate like dist<angle
    const polarMatch = val.match(/^(\d+(?:\.\d+)?)\s*<\s*(-?\d+(?:\.\d+)?)$/);
    // Pattern 3: Simple distance (along cursor direction)
    const distMatch = val.match(/^(\d+(?:\.\d+)?)$/);

    if (relMatch) {
      const dx = parseFloat(relMatch[1]);
      const dy = parseFloat(relMatch[2]);
      nextX = lastPt.x + dx;
      nextY = lastPt.y + dy;
      valid = true;
    } else if (polarMatch) {
      const dist = parseFloat(polarMatch[1]);
      const angleDeg = parseFloat(polarMatch[2]);
      const angleRad = angleDeg * (Math.PI / 180);
      nextX = lastPt.x + dist * Math.cos(angleRad);
      nextY = lastPt.y + dist * Math.sin(angleRad);
      valid = true;
    } else if (distMatch && hoverGeodetic) {
      const dist = parseFloat(distMatch[1]);
      const dx = hoverGeodetic.x - lastPt.x;
      const dy = hoverGeodetic.y - lastPt.y;
      const currentDist = Math.sqrt(dx * dx + dy * dy);
      if (currentDist > 0) {
        nextX = lastPt.x + (dx / currentDist) * dist;
        nextY = lastPt.y + (dy / currentDist) * dist;
        valid = true;
      }
    }

    if (valid) {
      const newPt: Point = {
        id: `temp_${Date.now()}_${tempPoints.length}`,
        x: Math.round(nextX * 1000) / 1000,
        y: Math.round(nextY * 1000) / 1000,
      };
      setTempPoints([...tempPoints, newPt]);
      setCadInput('');
      // Keep focus on input for continuous typing
      setTimeout(() => cadInputRef.current?.focus(), 50);
    } else {
      alert('Невідомий формат CAD. Спробуйте:\n - "15" (відкласти 15м у напрямку курсору)\n - "15<90" (відкласти 15м під кутом 90°)\n - "@10,-5" (приріст X=+10м, Y=-5м)');
    }
  };

  const isBuildingInside = (b: Building) => isPolygonInsidePolygon(b.points, model.points);
  const isRestrictionInside = (r: Restriction) => isPolygonInsidePolygon(r.points, model.points);
  const isLandUseInside = (lu: LandUseExplication) => {
    if (!lu.points || lu.points.length === 0) return true;
    return isPolygonInsidePolygon(lu.points, model.points);
  };

  // Find overlapping buildings
  const overlappingBuildingIds = new Set<string>();
  for (let i = 0; i < model.buildings.length; i++) {
    for (let j = i + 1; j < model.buildings.length; j++) {
      if (doPolygonsOverlap(model.buildings[i].points, model.buildings[j].points)) {
        overlappingBuildingIds.add(model.buildings[i].id);
        overlappingBuildingIds.add(model.buildings[j].id);
      }
    }
  }

  // Calculate Polar Tracking snaps for guide line rendering
  let orthoResult: any = null;
  if (tempPoints.length > 0 && hoverGeodetic && (orthoMode)) {
    const prevPt = tempPoints[tempPoints.length - 1];
    const prev2Pt = tempPoints.length >= 2 ? tempPoints[tempPoints.length - 2] : undefined;
    orthoResult = getOrthoSnappedCoordinate(hoverGeodetic, prevPt, prev2Pt);
  }

  return (
    <div className="relative w-full h-full">
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

        {/* 0. Render Land Use Polygons (угіддя) */}
        {(model.landUseExplication || []).map((lu) => {
          if (!lu.points || lu.points.length === 0) return null;
          const pathStr = getPointsPolygonPath(lu.points);
          if (!pathStr) return null;

          const isInside = isLandUseInside(lu);

          return (
            <g
              id={`svg_lu_g_${lu.id}`}
              key={lu.id}
              className="opacity-70 hover:opacity-90 transition-opacity">
              <path
                d={pathStr}
                fill={isInside ? "url(#striped-emerald-pattern)" : "url(#striped-red-pattern)"}
                stroke={isInside ? "#10b981" : "#dc2626"}
                strokeWidth="1.5"
                strokeDasharray="5 3"
              />
              {(() => {
                const centroid = calculateCentroid(lu.points);
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
                      stroke={isInside ? "#10b981" : "#ef4444"}
                      strokeWidth="0.5"
                      className="opacity-90"
                    />
                    <text
                      className={`${isInside ? 'fill-emerald-900' : 'fill-red-950'} font-extrabold font-mono text-[8.5px]`}
                      textAnchor="middle"
                      y="3.5">
                      {lu.code}: {lu.area} м²
                    </text>
                  </g>
                );
              })()}
            </g>
          );
        })}

        {/* 1. Render Restrictions polygons */}
        {model.restrictions.map((r) => {
          const pathStr = getPointsPolygonPath(r.points);
          if (!pathStr) return null;
          const isInside = isRestrictionInside(r);
          return (
            <g
              id={`svg_rest_g_${r.id}`}
              key={r.id}
              className="opacity-85 hover:opacity-100 transition-opacity">
              <path
                d={pathStr}
                fill={isInside ? "url(#striped-amber-pattern)" : "url(#striped-red-pattern)"}
                stroke={isInside ? "#d97706" : "#dc2626"}
                strokeWidth={isInside ? "1.5" : "2.5"}
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
                      fill={isInside ? "#fffbeb" : "#fef2f2"}
                      stroke={isInside ? "#f59e0b" : "#ef4444"}
                      strokeWidth="0.5"
                      className="opacity-90"
                    />
                    <text
                      className={`${isInside ? 'fill-amber-900' : 'fill-red-950'} font-semibold font-mono text-[9px]`}
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
          const isOverlap = overlappingBuildingIds.has(b.id);
          const isInside = isBuildingInside(b);
          const isValid = !isOverlap && isInside;

          return (
            <g
              id={`svg_building_g_${b.id}`}
              key={b.id}
              className="opacity-90 hover:opacity-100 transition-opacity">
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
                      y="4">
                      Буд.{' '}
                      {b.name.includes('літ.')
                        ? b.name.split('літ.')[1].replace(')', '').trim()
                        : b.name.slice(0, 10)}
                    </text>
                    {!isValid && (
                      <text
                        className="fill-rose-700 font-sans font-bold text-[8px]"
                        textAnchor="middle"
                        y="15">
                        {!isInside ? "Вихід за межі!" : "Накладання!"}
                      </text>
                    )}
                  </g>
                );
              })()}
            </g>
          );
        })}

        {/* 3.1 Draw Vertex Handle Grips for dragging objects (in view/edit mode) */}
        {mode === 'VIEW' && (
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
        )}

        {/* Polar Tracking snap guidelines */}
        {isDrawing && tempPoints.length > 0 && orthoResult && orthoResult.isOrthoTracked && (
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
                  <g transform={`translate(${mapToScreen(hoverGeodetic!.x, hoverGeodetic!.y).u + 25}, ${mapToScreen(hoverGeodetic!.x, hoverGeodetic!.y).v + 25})`}>
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
        {isDrawing &&
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

            const lineStroke = mode === 'ADD_BUILDING' ? '#ef4444' : mode === 'ADD_LAND_USE' ? '#10b981' : '#d97706';

            return (
              <g id="svg_draw_preview_line" className="pointer-events-none">
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

                {dist > 1 && !orthoResult?.isOrthoTracked && (
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
              const pointColor = mode === 'ADD_BUILDING' ? '#ef4444' : mode === 'ADD_LAND_USE' ? '#10b981' : '#d97706';
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
              stroke={activeSnapPoint.color || "#10b981"}
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
              fill={activeSnapPoint.color || "#10b981"}
              fillOpacity="0.3"
              stroke={activeSnapPoint.color || "#059669"}
              strokeWidth="1"
            />
            <circle cx={activeSnapPoint.u} cy={activeSnapPoint.v} r="2" fill={activeSnapPoint.color || "#047857"} />
            <g transform={`translate(${activeSnapPoint.u + 12}, ${activeSnapPoint.v - 12})`}>
              <rect
                x="0"
                y="-10"
                width="145"
                height="16"
                rx="3"
                fill="#1e293b"
                className="shadow-sm border border-slate-700 opacity-95"
              />
              <text
                x="72.5"
                y="1"
                textAnchor="middle"
                className="fill-slate-100 font-bold font-sans text-[7.5px] truncate px-1">
                {activeSnapPoint.label || "Прив'язка до об'єкта"}
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
          <pattern
            id="striped-emerald-pattern"
            width="12"
            height="12"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse">
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="12"
              stroke="#10b981"
              strokeWidth="1.5"
              className="opacity-20"
            />
          </pattern>
          <pattern
            id="striped-red-pattern"
            width="12"
            height="12"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse">
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="12"
              stroke="#dc2626"
              strokeWidth="2"
              className="opacity-25"
            />
          </pattern>
        </defs>
      </svg>

      {/* Floating CAD keyboard input overlay console */}
      {(mode === 'ADD_BUILDING' || mode === 'ADD_RESTRICTION' || mode === 'ADD_LAND_USE') && tempPoints.length > 0 && (
        <div className="absolute bottom-4 left-4 z-[50] bg-slate-900/95 text-white p-2.5 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2 max-w-sm backdrop-blur-md animate-fade-in select-text">
          <form onSubmit={handleCadInputSubmit} className="flex items-center gap-1.5 w-full">
            <span className="text-[10px] font-mono text-blue-400 font-bold shrink-0">CAD &gt;</span>
            <input
              ref={cadInputRef}
              type="text"
              value={cadInput}
              onChange={(e) => setCadInput(e.target.value)}
              placeholder="Відстань (напр. 15), @dx,dy або dist<кути"
              className="bg-slate-950 text-white font-mono text-xs px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-blue-500 w-44"
              title="Введіть число для відстані, @X,Y для приросту, або Відстань<Кут"
            />
            <button
              type="submit"
              className="px-2 py-1 bg-blue-600 text-white font-bold text-[10px] rounded hover:bg-blue-700 active:scale-95 cursor-pointer"
            >
              Ввід
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
