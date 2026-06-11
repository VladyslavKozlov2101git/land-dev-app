import { useMemo } from 'react';
import { Point, CadastralModel } from '../../../types';

interface CoordinateSpaceProps {
  model: CadastralModel;
  dimensions: { width: number; height: number };
  zoom: number;
  pan: { x: number; y: number };
  draggedPoint: any;
}

export function useCoordinateSpace({
  model,
  dimensions,
  zoom,
  pan,
  draggedPoint,
}: CoordinateSpaceProps) {
  const getAllPoints = (): Point[] => {
    const list: Point[] = [...model.points];
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
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    
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

  const bounds = useMemo(() => {
    return calculateBounds(getAllPoints());
  }, [model.points, model.buildings, model.restrictions, model.landUseExplication, draggedPoint]);

  const { minX, maxX, minY, maxY } = bounds;
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;

  const pad = 40;
  const drawW = dimensions.width - 2 * pad;
  const drawH = dimensions.height - 2 * pad;

  const scale = useMemo(() => {
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

  return {
    minX,
    maxX,
    minY,
    maxY,
    scale,
    mapToScreen,
    mapToGeodetic,
  };
}
