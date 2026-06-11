import React, { useState, useRef, useEffect } from 'react';
import { Point, CadastralModel, Building, Restriction } from '../types';
import { calculateDistance, calculateCentroid } from '../utils/geo';
import {
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Layers,
  Plus,
  Trash2,
  Edit2,
  Play,
  Check,
  Compass,
} from 'lucide-react';

interface DrawingCanvasProps {
  model: CadastralModel;
  onUpdateModel: (updates: Partial<CadastralModel>) => void;
  selectedPointId: string | null;
  onSelectPoint: (id: string | null) => void;
}

type DrawMode = 'VIEW' | 'EDIT_PARCEL' | 'ADD_BUILDING' | 'ADD_RESTRICTION';

export default function DrawingCanvas({
  model,
  onUpdateModel,
  selectedPointId,
  onSelectPoint,
}: DrawingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<DrawMode>('VIEW');
  const [zoom, setZoom] = useState<number>(0.9); // zoom multiplier
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [draggedPoint, setDraggedPoint] = useState<{
    type: 'parcel' | 'building' | 'restriction';
    id: string;
    index?: number;
  } | null>(null);
  const startPanPos = useRef({ x: 0, y: 0 });

  // Temporary points when drawing a new building or restriction
  const [tempPoints, setTempPoints] = useState<Point[]>([]);
  const [tempName, setTempName] = useState('');
  const [tempCode, setTempCode] = useState('01.05'); // restriction code

  // Canvas size state
  const [dimensions, setDimensions] = useState({ width: 600, height: 450 });
  const [activeSnapPoint, setActiveSnapPoint] = useState<{
    u: number;
    v: number;
    x: number;
    y: number;
  } | null>(null);
  const [orthoMode, setOrthoMode] = useState<boolean>(false);
  const [hoverGeodetic, setHoverGeodetic] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          const { width, height } = entry.contentRect;
          setDimensions({ width: width || 600, height: height || 450 });
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  // Determine bounds of all points in model to center the map
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

    // Add 20% margin
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

  const [bounds, setBounds] = useState(() => calculateBounds(getAllPoints()));

  // Sync bounds when points change, unless we are currently dragging a point
  useEffect(() => {
    if (draggedPoint) return;
    setBounds(calculateBounds(getAllPoints()));
  }, [model.points, model.buildings, model.restrictions, draggedPoint]);

  const { minX, maxX, minY, maxY } = bounds;
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;

  const pad = 40;
  const drawW = dimensions.width - 2 * pad;
  const drawH = dimensions.height - 2 * pad;

  // Base scale: pixels per meter (uniform for X and Y to maintain 1:1 aspect ratio)
  const scale = React.useMemo(() => {
    if (rangeX === 0 && rangeY === 0) return 1;
    if (rangeX === 0) return drawW / rangeY;
    if (rangeY === 0) return drawH / rangeX;
    return Math.min(drawW / rangeY, drawH / rangeX);
  }, [rangeX, rangeY, drawW, drawH]);

  // Projection / Scaling Math
  // Geodetic system (Ukraine): X is North/Vertical, Y is East/Horizontal
  // Screen SVG system: U is horizontal (increases right), V is vertical (increases down)
  const mapToScreen = (x: number, y: number) => {
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;

    const centerX = minX + rangeX / 2;
    const centerY = minY + rangeY / 2;

    // Base screen position relative to center of screen (1:1 aspect ratio)
    const uBase = cx + (y - centerY) * scale;
    const vBase = cy - (x - centerX) * scale; // vertical flip for geodetic X (North is up)

    // Zoom and pan relative to screen center
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

    // Round to mm
    return {
      x: Math.round(x * 1000) / 1000,
      y: Math.round(y * 1000) / 1000,
    };
  };

  // Helper to get coordinates snapped to main parcel corners
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

  // Helper to snap a target coordinate to the nearest 45 degree angle relative to a previous point
  const getOrthoSnappedCoordinate = (
    cursorGeo: { x: number; y: number },
    prevPt: Point,
  ): { x: number; y: number; angle: number } => {
    const dx = cursorGeo.x - prevPt.x;
    const dy = cursorGeo.y - prevPt.y;

    const angleRad = Math.atan2(dy, dx);
    const angleDeg = angleRad * (180 / Math.PI);

    // Snap to nearest 45 degrees
    const snappedAngleDeg = Math.round(angleDeg / 45) * 45;
    const snappedAngleRad = snappedAngleDeg * (Math.PI / 180);
    const dist = Math.sqrt(dx * dx + dy * dy);

    const x = prevPt.x + dist * Math.cos(snappedAngleRad);
    const y = prevPt.y + dist * Math.sin(snappedAngleRad);

    // Normalize angle to 0-360 range for display
    let displayAngle = snappedAngleDeg;
    if (displayAngle < 0) displayAngle += 360;

    return {
      x: Math.round(x * 1000) / 1000,
      y: Math.round(y * 1000) / 1000,
      angle: displayAngle,
    };
  };

  // Reset viewport
  const handleResetZoom = () => {
    setZoom(0.9);
    setPan({ x: 0, y: 0 });
    setTempPoints([]);
    setMode('VIEW');
  };

  // Mouse Handlers for Pan & Drag Point
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const svgEl = e.currentTarget;
    const rect = svgEl.getBoundingClientRect();
    const clickU = e.clientX - rect.left;
    const clickV = e.clientY - rect.top;

    // Check if clicked any point to drag
    // 1. Check parcel points first
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

    // 2. Check building points
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

    // 3. Check restriction points
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

    // Fallback: If not clicking on any points, we either pan or add a drawing vertex
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
      // Start panning
      setIsPanning(true);
      startPanPos.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svgEl = e.currentTarget;
    const rect = svgEl.getBoundingClientRect();
    const currU = e.clientX - rect.left;
    const currV = e.clientY - rect.top;

    // Check for snapping to show indicator or apply to dragged point
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

    // Apply ortho angle snapping
    if (isDrawing && tempPoints.length > 0) {
      const useOrtho = orthoMode || e.shiftKey;
      if (useOrtho) {
        const prevPt = tempPoints[tempPoints.length - 1];
        const orthoResult = getOrthoSnappedCoordinate(targetCoord, prevPt);
        targetCoord = { x: orthoResult.x, y: orthoResult.y };
      }
    }

    // Update hoverGeodetic coordinate for guide overlays
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
            };
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

  // Convert points array to SVG path
  const getPointsPolygonPath = (pts: Point[]): string => {
    if (pts.length === 0) return '';
    const mapped = pts.map((p) => {
      const { u, v } = mapToScreen(p.x, p.y);
      return `${u},${v}`;
    });
    return `M ${mapped.join(' L ')} Z`;
  };

  // Draw the coordinates metric background grids (Geodetic lines e.g. every 50m)
  const renderCoordinateGrid = () => {
    const gridLines: React.ReactNode[] = [];
    const step = 50; // grid interval meters

    // Find bounding integers
    const startX = Math.floor(minX / step) * step;
    const endX = Math.ceil(maxX / step) * step;
    const startY = Math.floor(minY / step) * step;
    const endY = Math.ceil(maxY / step) * step;

    // Vertical lines (constant Y coordinate in geodetic, maps to constant vertical grid)
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
      // Label standard Easting
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

    // Horizontal lines (constant X coordinate in geodetic)
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
      // Label standard Northing
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

  const saveDrawing = () => {
    if (tempPoints.length < 3) {
      alert('Будь ласка, нанесіть щонайменше 3 точки для замикання контуру.');
      return;
    }

    if (mode === 'ADD_BUILDING') {
      const name =
        tempName.trim() ||
        `Будівля (літ. літ. ${String.fromCharCode(65 + model.buildings.length)})`;
      const newBuilding: Building = {
        id: `bld_${Date.now()}`,
        name,
        points: tempPoints,
        area: Math.round(parseFloat(computeTempArea()) * 10) / 10,
      };
      onUpdateModel({
        buildings: [...model.buildings, newBuilding],
      });
    } else if (mode === 'ADD_RESTRICTION') {
      const name = tempName.trim() || `Обмеження №${model.restrictions.length + 1}`;
      const newRestriction: Restriction = {
        id: `rest_${Date.now()}`,
        code: tempCode,
        name,
        points: tempPoints,
        area: Math.round(parseFloat(computeTempArea()) * 10) / 10,
        description: 'Внесено землевпорядником за допомогою інтерактивної схеми.',
      };
      onUpdateModel({
        restrictions: [...model.restrictions, newRestriction],
      });
    }

    // reset
    setTempPoints([]);
    setTempName('');
    setMode('VIEW');
  };

  const removeBuilding = (id: string) => {
    onUpdateModel({
      buildings: model.buildings.filter((b) => b.id !== id),
    });
  };

  const removeRestriction = (id: string) => {
    onUpdateModel({
      restrictions: model.restrictions.filter((r) => r.id !== id),
    });
  };

  // Calculates temporary area using Shoelace
  const computeTempArea = (): string => {
    if (tempPoints.length < 3) return '0';
    let area = 0;
    for (let i = 0; i < tempPoints.length; i++) {
      const j = (i + 1) % tempPoints.length;
      area += tempPoints[i].x * tempPoints[j].y - tempPoints[j].x * tempPoints[i].y;
    }
    return Math.abs(area / 2).toFixed(1);
  };

  return (
    <div
      className="flex flex-col h-full bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden"
      id="cadastral_drawing_workspace">
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between p-3 bg-slate-50 border-b border-slate-200 gap-2">
        <div className="flex items-center gap-1.5">
          <Layers className="h-4 w-4 text-blue-600" id="geom_layers_icon" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 font-mono">
            Креслення ділянки {model.coordinateSystem}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            id="ortho_toggle_btn"
            onClick={() => setOrthoMode(!orthoMode)}
            className={`p-1 px-2.5 mr-2 rounded transition-all text-[11px] font-bold flex items-center gap-1.5 cursor-pointer border ${orthoMode ? 'bg-emerald-600 border-emerald-700 text-white shadow-xs' : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-55'}`}
            title="Орто-режим: фіксація ліній під 45°/90°/180° (можна також затиснути Shift)">
            <Compass className={`h-3.5 w-3.5 ${orthoMode ? 'text-white' : 'text-slate-500'}`} />
            <span>Орто {orthoMode ? 'Увімк.' : 'Вимк.'}</span>
          </button>
          <button
            id="zoom_in_btn"
            onClick={() => setZoom((prev) => Math.min(prev * 1.2, 5))}
            className="p-1 text-slate-600 hover:bg-slate-200 rounded transition-colors"
            title="Збільшити масштаб">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            id="zoom_out_btn"
            onClick={() => setZoom((prev) => Math.max(prev / 1.2, 0.2))}
            className="p-1 text-slate-600 hover:bg-slate-200 rounded transition-colors"
            title="Зменшити масштаб">
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            id="zoom_reset_btn"
            onClick={handleResetZoom}
            className="p-1 text-slate-600 hover:bg-slate-200 rounded transition-colors"
            title="Скинути фокус та очистити">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Mode Selection panel */}
      <div className="flex items-center justify-between bg-blue-50/40 p-2 px-3 border-b border-slate-200 text-xs">
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <button
            id="mode_view_btn"
            onClick={() => {
              setMode('VIEW');
              setTempPoints([]);
            }}
            className={`px-2.5 py-1 rounded font-medium transition-all ${mode === 'VIEW' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            Режим Огляду
          </button>
          <button
            id="mode_add_bld_btn"
            onClick={() => {
              setMode('ADD_BUILDING');
              setTempPoints([]);
            }}
            className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 transition-all ${mode === 'ADD_BUILDING' ? 'bg-red-600 text-white' : 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100/50'}`}>
            <Plus className="h-3.5 w-3.5" /> + Будівля
          </button>
          <button
            id="mode_add_rest_btn"
            onClick={() => {
              setMode('ADD_RESTRICTION');
              setTempPoints([]);
            }}
            className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 transition-all ${mode === 'ADD_RESTRICTION' ? 'bg-amber-600 text-white' : 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100/50'}`}>
            <Plus className="h-3.5 w-3.5" /> + Обмеження
          </button>
        </div>

        {mode !== 'VIEW' && (
          <span className="hidden sm:inline-block text-[11px] text-blue-800 font-medium font-mono animate-pulse bg-blue-100/60 px-2 py-0.5 rounded">
            Клікніть на кресленні для нанесення точок
          </span>
        )}
      </div>

      {/* Active draw form info overlay */}
      {(mode === 'ADD_BUILDING' || mode === 'ADD_RESTRICTION') && (
        <div className="bg-slate-100 p-2 px-3 flex flex-wrap items-center gap-3 border-b border-slate-200 text-xs">
          <div className="flex items-center gap-2 flex-grow">
            <span className="font-semibold text-slate-700">Назва контуру:</span>
            <input
              id="temp_geom_name_input"
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder={
                mode === 'ADD_BUILDING'
                  ? 'Житловий будинок літ. А-1'
                  : 'Охоронна зона інженерних комунікацій'
              }
              className="px-2 py-1 bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-100 text-xs flex-grow max-w-sm"
            />
          </div>

          {mode === 'ADD_RESTRICTION' && (
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700">Код:</span>
              <input
                id="temp_geom_code_input"
                type="text"
                value={tempCode}
                onChange={(e) => setTempCode(e.target.value)}
                placeholder="01.05"
                className="w-16 px-1.5 py-1 bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-100 text-center font-mono text-xs"
              />
            </div>
          )}

          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[11px] font-semibold font-mono bg-white text-slate-600 px-1.5 py-0.5 rounded border">
              Точок: {tempPoints.length} ({computeTempArea()} м²)
            </span>
            <button
              id="confirm_draw_btn"
              onClick={saveDrawing}
              disabled={tempPoints.length < 3}
              className="px-3 py-1 bg-blue-600 text-white rounded font-medium flex items-center gap-1 hover:bg-blue-700 disabled:opacity-50 text-[11px]">
              <Check className="h-3.5 w-3.5" /> Зберегти
            </button>
            <button
              id="cancel_draw_btn"
              onClick={() => {
                setMode('VIEW');
                setTempPoints([]);
              }}
              className="px-2 py-1 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded text-[11px]">
              Скасувати
            </button>
          </div>
        </div>
      )}

      {/* Main Interactive CAD SVG Canvas */}
      <div
        ref={containerRef}
        className="relative flex-grow bg-slate-50 overflow-hidden cursor-crosshair select-none"
        id="cadastral_svg_interactive_panel">
        <svg
          id="main_cadastral_svg"
          width="100%"
          height="100%"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="absolute inset-0">
          {/* Coordinates Grid */}
          {renderCoordinateGrid()}

          {/* 1. Render Restrictions polygons (dashed orange zones, lower in z-orders) */}
          {model.restrictions.map((r, rIdx) => {
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
                {/* Centroid label */}
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
                        className="fill-amber-900 font-semibold font-mono text-[9px] text-anchor-middle"
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
              {/* Outer boundary shade */}
              <path
                d={getPointsPolygonPath(model.points)}
                fill="#eff6ff"
                stroke="#3b82f6"
                strokeWidth="3.5"
                strokeLinejoin="round"
                className="opacity-75"
              />

              {/* Distances and direction line overlays */}
              {model.points.map((p, index) => {
                const next = model.points[(index + 1) % model.points.length];
                const screenP = mapToScreen(p.x, p.y);
                const screenNext = mapToScreen(next.x, next.y);

                // Line boundary distance
                const midU = (screenP.u + screenNext.u) / 2;
                const midV = (screenP.v + screenNext.v) / 2;
                const dist = calculateDistance(p, next);

                // Angle of line to orient label parallel or nicely
                const angleRad = Math.atan2(screenNext.v - screenP.v, screenNext.u - screenP.u);
                let angleDeg = angleRad * (180 / Math.PI);
                if (angleDeg > 90 || angleDeg < -90) {
                  angleDeg += 180; // keep label upright
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
                    {/* Floating distance bubble */}
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

          {/* 3. Render Buildings (red shaded polygons) */}
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
                {/* Crosshatch for building representation */}
                <path d={pathStr} fill="url(#building-diagonal-pattern)" className="opacity-30" />
                {/* Centroid label */}
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
              const dist = calculateDistance(lastPt, hoverGeodetic);
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

                  {/* Length Label */}
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

                  {/* Angle Guide Arc or Text */}
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
                        className="fill-blue-305 font-mono text-[8px] font-extrabold">
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

          {/* 5. Render parcel vertices (clickable, drag anchors) */}
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
                {/* Point count index bubble text */}
                <text
                  x={u}
                  y={v + 3.5}
                  textAnchor="middle"
                  className={`font-sans font-extrabold text-[8px] select-none ${isSelected ? 'fill-white' : 'fill-slate-800'}`}>
                  {index + 1}
                </text>
                {/* Floating geodetic coordinate tooltip on hover */}
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

          {/* Helper SVG Definitions (Stripes patterns) */}
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

        {/* Floating status instructions on drawing */}
        <div className="absolute bottom-3 right-3 bg-slate-900/90 text-white p-2.5 rounded-lg border border-slate-700/60 max-w-[210px] pointer-events-none text-[10px] space-y-1 font-mono shadow-md backdrop-blur-xs">
          <div className="text-blue-400 font-semibold mb-1">КЕРУВАННЯ СХЕМОЮ:</div>
          <div>• Перетягуйте точки мишкою</div>
          <div>• Прокрутка / мишка — зсув плану</div>
          <div>• Клік на точку покаже у списку</div>
          <div className="text-slate-400 block pt-1 border-t border-slate-700 mt-1">
            Колонка X — Північ (Вгору)
            <br />
            Колонка Y — Схід (Вправо)
          </div>
        </div>
      </div>

      {/* Embedded listings panel for buildings & easements inside drawing screen */}
      <div className="border-t border-slate-100 p-3 bg-slate-50 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans max-h-36 overflow-y-auto">
        {/* Buildings Inventory list */}
        <div>
          <span className="font-bold text-slate-700 block mb-1">
            Будівлі та споруди на ділянці ({model.buildings.length})
          </span>
          {model.buildings.length === 0 ? (
            <span className="text-slate-400 italic text-[11px]">Жодної споруди не додано</span>
          ) : (
            <div className="space-y-1">
              {model.buildings.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-1 px-2 bg-white rounded border border-slate-200">
                  <span className="truncate max-w-[150px] font-medium" title={b.name}>
                    {b.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-500 font-semibold">{b.area} м²</span>
                    <button
                      id={`del_bld_${b.id}`}
                      onClick={() => removeBuilding(b.id)}
                      className="text-red-500 hover:text-red-700 p-0.5 rounded hover:bg-red-50"
                      title="Видалити споруду">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Restrictions Zone list */}
        <div>
          <span className="font-bold text-slate-700 block mb-1">
            Обмеження та обтяження ділянки ({model.restrictions.length})
          </span>
          {model.restrictions.length === 0 ? (
            <span className="text-slate-400 italic text-[11px]">Обмеження не встановлені</span>
          ) : (
            <div className="space-y-1">
              {model.restrictions.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-1 px-2 bg-white rounded border border-slate-200">
                  <div className="truncate max-w-[140px] flex flex-col">
                    <span className="truncate font-medium text-slate-800" title={r.name}>
                      {r.name}
                    </span>
                    <span className="text-[10px] font-mono text-amber-700">Код: {r.code}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-500 font-semibold">{r.area} м²</span>
                    <button
                      id={`del_rest_${r.id}`}
                      onClick={() => removeRestriction(r.id)}
                      className="text-red-500 hover:text-red-700 p-0.5 rounded hover:bg-slate-100"
                      title="Видалити обмеження">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
