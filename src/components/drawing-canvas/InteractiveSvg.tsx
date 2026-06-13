import React, { useRef } from 'react';
import { Point, CadastralModel, DrawMode, ActiveGeozone } from '../../types';
import { calculatePolygonArea } from '../../utils/geo';
import { useCoordinateSpace } from './hooks/useCoordinateSpace';
import { useCanvasSnapping } from './hooks/useCanvasSnapping';

import SvgPatterns from './components/SvgPatterns';
import CoordinateGrid from './components/CoordinateGrid';
import LandUseLayer from './components/LandUseLayer';
import RestrictionsLayer from './components/RestrictionsLayer';
import ParcelLayer from './components/ParcelLayer';
import BuildingsLayer from './components/BuildingsLayer';
import VertexGripsLayer from './components/VertexGripsLayer';
import DrawingPreviewLayer from './components/DrawingPreviewLayer';
import ParcelVerticesLayer from './components/ParcelVerticesLayer';
import SnapIndicator from './components/SnapIndicator';
import CadConsole from './components/CadConsole';

interface InteractiveSvgProps {
  model: CadastralModel;
  onUpdateModel: (updates: Partial<CadastralModel>) => void;
  selectedPointId: string | null;
  onSelectPoint: (id: string | null) => void;
  activeGeozone: ActiveGeozone | null;
  onActiveGeozoneChange: (val: ActiveGeozone | null) => void;
  mode: DrawMode;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
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

function distanceToScreenSegment(
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { distance: number; x: number; y: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    const d = Math.sqrt((cx - x1) ** 2 + (cy - y1) ** 2);
    return { distance: d, x: x1, y: y1 };
  }

  const t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / lenSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;

  const d = Math.sqrt((cx - projX) ** 2 + (cy - projY) ** 2);
  return { distance: d, x: projX, y: projY };
}

export default function InteractiveSvg({
  model,
  onUpdateModel,
  selectedPointId,
  onSelectPoint,
  activeGeozone,
  onActiveGeozoneChange,
  mode,
  zoom,
  setZoom,
  pan,
  setPan,
  isPanning,
  setIsPanning,
  draggedPoint,
  setDraggedPoint,
  tempPoints,
  setTempPoints,
  dimensions,
  activeSnapPoint,
  setActiveSnapPoint,
  orthoMode,
  hoverGeodetic,
  setHoverGeodetic,
}: InteractiveSvgProps) {
  const startPanPos = useRef({ x: 0, y: 0 });
  const isDrawing = mode === 'ADD_BUILDING' || mode === 'ADD_RESTRICTION' || mode === 'ADD_LAND_USE';

  // Coordinate mapping Hook
  const {
    minX,
    maxX,
    minY,
    maxY,
    mapToScreen,
    mapToGeodetic,
  } = useCoordinateSpace({
    model,
    dimensions,
    zoom,
    pan,
    draggedPoint,
  });

  // Snapping calculations Hook
  const {
    getAllSegments,
    findSnapPoint,
    getOrthoSnappedCoordinate,
  } = useCanvasSnapping({
    model,
    tempPoints,
    mapToScreen,
    mapToGeodetic,
  });

  // Global keydown event listener to delete selected points
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return; // Ignore if user is editing text fields
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPointId) {
        e.preventDefault();

        // 1. Check parcel points
        const parcelPtIdx = model.points.findIndex(p => p.id === selectedPointId);
        if (parcelPtIdx !== -1) {
          if (model.points.length <= 3) {
            alert('Земельна ділянка повинна мати щонайменше 3 поворотні точки меж.');
            return;
          }
          const updated = model.points.filter(p => p.id !== selectedPointId);
          onUpdateModel({ points: updated });
          onSelectPoint(null);
          return;
        }

        // 2. Check buildings points
        for (const b of model.buildings) {
          const ptIdx = b.points.findIndex(p => p.id === selectedPointId);
          if (ptIdx !== -1) {
            if (b.points.length <= 3) {
              alert('Споруда повинна мати щонайменше 3 вершини.');
              return;
            }
            const updatedPts = b.points.filter(p => p.id !== selectedPointId);
            const updatedBuildings = model.buildings.map(item =>
              item.id === b.id
                ? { ...item, points: updatedPts, area: Math.round(calculatePolygonArea(updatedPts) * 10) / 10 }
                : item
            );
            onUpdateModel({ buildings: updatedBuildings });
            onSelectPoint(null);
            return;
          }
        }

        // 3. Check restrictions points
        for (const r of model.restrictions) {
          const ptIdx = r.points.findIndex(p => p.id === selectedPointId);
          if (ptIdx !== -1) {
            if (r.points.length <= 3) {
              alert('Обмеження повинно мати щонайменше 3 вершини.');
              return;
            }
            const updatedPts = r.points.filter(p => p.id !== selectedPointId);
            const updatedRestrictions = model.restrictions.map(item =>
              item.id === r.id
                ? { ...item, points: updatedPts, area: Math.round(calculatePolygonArea(updatedPts) * 10) / 10 }
                : item
            );
            onUpdateModel({ restrictions: updatedRestrictions });
            onSelectPoint(null);
            return;
          }
        }

        // 4. Check land use points
        for (const lu of (model.landUseExplication || [])) {
          if (lu.points) {
            const ptIdx = lu.points.findIndex(p => p.id === selectedPointId);
            if (ptIdx !== -1) {
              if (lu.points.length <= 3) {
                alert('Контур угіддя повинен мати щонайменше 3 вершини.');
                return;
              }
              const updatedPts = lu.points.filter(p => p.id !== selectedPointId);
              const updatedLu = (model.landUseExplication || []).map(item =>
                item.id === lu.id
                  ? { ...item, points: updatedPts, area: Math.round(calculatePolygonArea(updatedPts) * 10) / 10 }
                  : item
              );
              onUpdateModel({ landUseExplication: updatedLu });
              onSelectPoint(null);
              return;
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedPointId, model, onUpdateModel, onSelectPoint]);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      startPanPos.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (e.button !== 0) return;

    const svgEl = e.currentTarget;
    const rect = svgEl.getBoundingClientRect();
    const clickU = e.clientX - rect.left;
    const clickV = e.clientY - rect.top;

    // 1. Check if we clicked within 10px of any vertex of the ACTIVE geozone
    if (activeGeozone) {
      if (activeGeozone.type === 'parcel') {
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
      } else if (activeGeozone.type === 'building') {
        const b = model.buildings.find((item) => item.id === activeGeozone.id);
        if (b) {
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
      } else if (activeGeozone.type === 'restriction') {
        const r = model.restrictions.find((item) => item.id === activeGeozone.id);
        if (r) {
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
      } else if (activeGeozone.type === 'land_use') {
        const lu = (model.landUseExplication || []).find((item) => item.id === activeGeozone.id);
        if (lu && lu.points) {
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
    }

    // 2. Segment clicks: split segment and insert intermediate vertex - only allowed for activeGeozone!
    const CLICK_TOLERANCE_PX = 8;
    let bestMatch: {
      type: 'parcel' | 'building' | 'restriction' | 'land_use';
      ownerId?: string;
      insertIndex: number;
      projU: number;
      projV: number;
    } | null = null;
    let minSegDist = Infinity;

    if (activeGeozone && !isDrawing) {
      // A. Check parcel segments
      if (activeGeozone.type === 'parcel' && model.points.length >= 3) {
        for (let i = 0; i < model.points.length; i++) {
          const p1 = model.points[i];
          const p2 = model.points[(i + 1) % model.points.length];
          const s1 = mapToScreen(p1.x, p1.y);
          const s2 = mapToScreen(p2.x, p2.y);
          
          const { distance, x, y } = distanceToScreenSegment(clickU, clickV, s1.u, s1.v, s2.u, s2.v);
          if (distance < CLICK_TOLERANCE_PX && distance < minSegDist) {
            minSegDist = distance;
            bestMatch = {
              type: 'parcel',
              insertIndex: i + 1,
              projU: x,
              projV: y,
            };
          }
        }
      }

      // B. Check building segments
      if (activeGeozone.type === 'building') {
        const b = model.buildings.find((item) => item.id === activeGeozone.id);
        if (b && b.points.length >= 3) {
          for (let i = 0; i < b.points.length; i++) {
            const p1 = b.points[i];
            const p2 = b.points[(i + 1) % b.points.length];
            const s1 = mapToScreen(p1.x, p1.y);
            const s2 = mapToScreen(p2.x, p2.y);

            const { distance, x, y } = distanceToScreenSegment(clickU, clickV, s1.u, s1.v, s2.u, s2.v);
            if (distance < CLICK_TOLERANCE_PX && distance < minSegDist) {
              minSegDist = distance;
              bestMatch = {
                type: 'building',
                ownerId: b.id,
                insertIndex: i + 1,
                projU: x,
                projV: y,
              };
            }
          }
        }
      }

      // C. Check restriction segments
      if (activeGeozone.type === 'restriction') {
        const r = model.restrictions.find((item) => item.id === activeGeozone.id);
        if (r && r.points.length >= 3) {
          for (let i = 0; i < r.points.length; i++) {
            const p1 = r.points[i];
            const p2 = r.points[(i + 1) % r.points.length];
            const s1 = mapToScreen(p1.x, p1.y);
            const s2 = mapToScreen(p2.x, p2.y);

            const { distance, x, y } = distanceToScreenSegment(clickU, clickV, s1.u, s1.v, s2.u, s2.v);
            if (distance < CLICK_TOLERANCE_PX && distance < minSegDist) {
              minSegDist = distance;
              bestMatch = {
                type: 'restriction',
                ownerId: r.id,
                insertIndex: i + 1,
                projU: x,
                projV: y,
              };
            }
          }
        }
      }

      // D. Check land use segments
      if (activeGeozone.type === 'land_use') {
        const lu = model.landUseExplication.find((item) => item.id === activeGeozone.id);
        if (lu && lu.points && lu.points.length >= 3) {
          for (let i = 0; i < lu.points.length; i++) {
            const p1 = lu.points[i];
            const p2 = lu.points[(i + 1) % lu.points.length];
            const s1 = mapToScreen(p1.x, p1.y);
            const s2 = mapToScreen(p2.x, p2.y);

            const { distance, x, y } = distanceToScreenSegment(clickU, clickV, s1.u, s1.v, s2.u, s2.v);
            if (distance < CLICK_TOLERANCE_PX && distance < minSegDist) {
              minSegDist = distance;
              bestMatch = {
                type: 'land_use',
                ownerId: lu.id,
                insertIndex: i + 1,
                projU: x,
                projV: y,
              };
            }
          }
        }
      }
    }

    // If we matched an edge/segment, split it and insert a new point
    if (bestMatch && !isDrawing) {
      const geo = mapToGeodetic(bestMatch.projU, bestMatch.projV);
      const newPtId = `split_${Date.now()}`;
      const newPt: Point = {
        id: newPtId,
        x: geo.x,
        y: geo.y,
      };

      if (bestMatch.type === 'parcel') {
        const updated = [...model.points];
        updated.splice(bestMatch.insertIndex, 0, newPt);
        onUpdateModel({ points: updated });
        onSelectPoint(newPtId);
        setDraggedPoint({ type: 'parcel', id: newPtId, index: bestMatch.insertIndex });
      } else if (bestMatch.type === 'building') {
        const b = model.buildings.find(item => item.id === bestMatch!.ownerId)!;
        const updatedPts = [...b.points];
        updatedPts.splice(bestMatch.insertIndex, 0, newPt);
        const updated = model.buildings.map(item =>
          item.id === b.id ? { ...item, points: updatedPts, area: Math.round(calculatePolygonArea(updatedPts) * 10) / 10 } : item
        );
        onUpdateModel({ buildings: updated });
        onSelectPoint(newPtId);
        setDraggedPoint({ type: 'building', id: b.id, index: bestMatch.insertIndex });
      } else if (bestMatch.type === 'restriction') {
        const r = model.restrictions.find(item => item.id === bestMatch!.ownerId)!;
        const updatedPts = [...r.points];
        updatedPts.splice(bestMatch.insertIndex, 0, newPt);
        const updated = model.restrictions.map(item =>
          item.id === r.id ? { ...item, points: updatedPts, area: Math.round(calculatePolygonArea(updatedPts) * 10) / 10 } : item
        );
        onUpdateModel({ restrictions: updated });
        onSelectPoint(newPtId);
        setDraggedPoint({ type: 'restriction', id: r.id, index: bestMatch.insertIndex });
      } else if (bestMatch.type === 'land_use') {
        const lu = model.landUseExplication.find(item => item.id === bestMatch!.ownerId)!;
        const updatedPts = [...lu.points!];
        updatedPts.splice(bestMatch.insertIndex, 0, newPt);
        const updated = model.landUseExplication.map(item =>
          item.id === lu.id ? { ...item, points: updatedPts, area: Math.round(calculatePolygonArea(updatedPts) * 10) / 10 } : item
        );
        onUpdateModel({ landUseExplication: updated });
        onSelectPoint(newPtId);
        setDraggedPoint({ type: 'land_use', id: lu.id, index: bestMatch.insertIndex });
      }
      return; // Stop processing and start dragging split point immediately
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
      const clickedGeozone = (e.nativeEvent as any)._clickedGeozone;
      if (!clickedGeozone) {
        onActiveGeozoneChange(null);
      }
      setIsPanning(true);
      startPanPos.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svgEl = e.currentTarget;
    const rect = svgEl.getBoundingClientRect();
    const currU = e.clientX - rect.left;
    const currV = e.clientY - rect.top;

    const isDragging = draggedPoint !== null;

    let draggedVertexId: string | undefined = undefined;
    if (draggedPoint) {
      if (draggedPoint.type === 'parcel') {
        draggedVertexId = draggedPoint.id;
      } else if (draggedPoint.type === 'building') {
        const b = model.buildings.find(item => item.id === draggedPoint.id);
        if (b && draggedPoint.index !== undefined) {
          draggedVertexId = b.points[draggedPoint.index]?.id;
        }
      } else if (draggedPoint.type === 'restriction') {
        const r = model.restrictions.find(item => item.id === draggedPoint.id);
        if (r && draggedPoint.index !== undefined) {
          draggedVertexId = r.points[draggedPoint.index]?.id;
        }
      } else if (draggedPoint.type === 'land_use') {
        const lu = (model.landUseExplication || []).find(item => item.id === draggedPoint.id);
        if (lu && lu.points && draggedPoint.index !== undefined) {
          draggedVertexId = lu.points[draggedPoint.index]?.id;
        }
      }
    }

    let targetCoord = mapToGeodetic(currU, currV);

    if (isDrawing || isDragging) {
      const snapResult = findSnapPoint(currU, currV, draggedVertexId);
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

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const svgEl = e.currentTarget;
    const rect = svgEl.getBoundingClientRect();
    const cursorU = e.clientX - rect.left;
    const cursorV = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;

    setZoom((prevZoom) => {
      const newZoom = Math.max(0.2, Math.min(5, prevZoom * zoomFactor));
      if (newZoom === prevZoom) return prevZoom;

      const cx = dimensions.width / 2;
      const cy = dimensions.height / 2;

      const ratio = newZoom / prevZoom - 1;

      setPan((prevPan) => ({
        x: prevPan.x - (cursorU - prevPan.x - cx) * ratio,
        y: prevPan.y - (cursorV - prevPan.y - cy) * ratio,
      }));

      return newZoom;
    });
  };

  // Calculate Polar Tracking snaps for guide line rendering in subcomponents
  let orthoResult = null;
  if (tempPoints.length > 0 && hoverGeodetic && orthoMode) {
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
        onWheel={handleWheel}
        className="absolute inset-0"
      >
        <CoordinateGrid
          minX={minX}
          maxX={maxX}
          minY={minY}
          maxY={maxY}
          dimensions={dimensions}
          mapToScreen={mapToScreen}
        />

        <ParcelLayer
          model={model}
          mapToScreen={mapToScreen}
          activeGeozone={activeGeozone}
          onActiveGeozoneChange={onActiveGeozoneChange}
        />

        <LandUseLayer
          model={model}
          mapToScreen={mapToScreen}
          activeGeozone={activeGeozone}
          onActiveGeozoneChange={onActiveGeozoneChange}
        />

        <RestrictionsLayer
          model={model}
          mapToScreen={mapToScreen}
          activeGeozone={activeGeozone}
          onActiveGeozoneChange={onActiveGeozoneChange}
        />

        <BuildingsLayer
          model={model}
          mapToScreen={mapToScreen}
          activeGeozone={activeGeozone}
          onActiveGeozoneChange={onActiveGeozoneChange}
        />

        <VertexGripsLayer
          model={model}
          mode={mode}
          mapToScreen={mapToScreen}
          activeGeozone={activeGeozone}
        />

        <DrawingPreviewLayer
          isDrawing={isDrawing}
          mode={mode}
          tempPoints={tempPoints}
          hoverGeodetic={hoverGeodetic}
          orthoResult={orthoResult}
          mapToScreen={mapToScreen}
        />

        <ParcelVerticesLayer
          model={model}
          selectedPointId={selectedPointId}
          mapToScreen={mapToScreen}
          activeGeozone={activeGeozone}
        />

        <SnapIndicator activeSnapPoint={activeSnapPoint} />

        <SvgPatterns />
      </svg>

      <CadConsole
        mode={mode}
        tempPoints={tempPoints}
        setTempPoints={setTempPoints}
        hoverGeodetic={hoverGeodetic}
      />
    </div>
  );
}
