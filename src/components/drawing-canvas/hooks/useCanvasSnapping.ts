import { Point, CadastralModel } from '../../../types';
import { getLineIntersection, getClosestPointOnSegment } from '../../../utils/geo';

export interface SnapResult {
  x: number;
  y: number;
  type: 'vertex' | 'edge' | 'intersection' | 'ortho' | 'none';
  label: string;
  color?: string;
}

export interface Segment {
  p1: Point;
  p2: Point;
  label: string;
}

interface CanvasSnappingProps {
  model: CadastralModel;
  tempPoints: Point[];
  mapToScreen: (x: number, y: number) => { u: number; v: number };
  mapToGeodetic: (u: number, v: number) => { x: number; y: number };
}

export function useCanvasSnapping({
  model,
  tempPoints,
  mapToScreen,
  mapToGeodetic,
}: CanvasSnappingProps) {
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
    excludePointId?: string
  ): SnapResult => {
    const SNAP_THRESHOLD_PX = 15;
    const geo = mapToGeodetic(currU, currV);

    const rawSegments = getAllSegments();
    const segments = excludePointId
      ? rawSegments.filter(seg => seg.p1.id !== excludePointId && seg.p2.id !== excludePointId)
      : rawSegments;
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

  return {
    getAllVertices,
    getAllSegments,
    getStaticIntersections,
    findSnapPoint,
    getOrthoSnappedCoordinate,
  };
}
