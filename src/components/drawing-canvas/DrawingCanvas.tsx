import React, { useState, useRef, useEffect } from 'react';
import { Point, CadastralModel, Building, Restriction, DrawMode, LandUseExplication, ActiveGeozone } from '../../types';
import CanvasToolbar from './CanvasToolbar';
import CanvasModeSelector from './CanvasModeSelector';
import CanvasDrawOverlay from './CanvasDrawOverlay';
import InteractiveSvg from './InteractiveSvg';
import CanvasInventoryPanels from './CanvasInventoryPanels';

interface DrawingCanvasProps {
  model: CadastralModel;
  onUpdateModel: (updates: Partial<CadastralModel>) => void;
  selectedPointId: string | null;
  onSelectPoint: (id: string | null) => void;
  activeGeozone: ActiveGeozone | null;
  onActiveGeozoneChange: (val: ActiveGeozone | null) => void;
}

export default function DrawingCanvas({
  model,
  onUpdateModel,
  selectedPointId,
  onSelectPoint,
  activeGeozone,
  onActiveGeozoneChange,
}: DrawingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<DrawMode>('VIEW');
  const [zoom, setZoom] = useState<number>(0.9);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [draggedPoint, setDraggedPoint] = useState<{
    type: 'parcel' | 'building' | 'restriction';
    id: string;
    index?: number;
  } | null>(null);

  const [tempPoints, setTempPoints] = useState<Point[]>([]);
  const [tempName, setTempName] = useState('');
  const [tempCode, setTempCode] = useState('01.05');

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

  const handleResetZoom = () => {
    setZoom(0.9);
    setPan({ x: 0, y: 0 });
    setTempPoints([]);
    setMode('VIEW');
  };

  // Calculates temporary area using Shoelace formula
  const computeTempArea = (): string => {
    if (tempPoints.length < 3) return '0';
    let area = 0;
    for (let i = 0; i < tempPoints.length; i++) {
      const j = (i + 1) % tempPoints.length;
      area += tempPoints[i].x * tempPoints[j].y - tempPoints[j].x * tempPoints[i].y;
    }
    return Math.abs(area / 2).toFixed(1);
  };

  const saveDrawing = () => {
    if (tempPoints.length < 3) {
      alert('Будь ласка, нанесіть щонайменше 3 точки для замикання контуру.');
      return;
    }

    if (mode === 'ADD_BUILDING') {
      const name =
        tempName.trim() ||
        `Житловий будинок літ. ${String.fromCharCode(65 + model.buildings.length)}`;
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
      const name =
        tempName.trim() ||
        `Охоронна зона інженерних комунікацій (№${model.restrictions.length + 1})`;
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
    } else if (mode === 'ADD_LAND_USE') {
      const name = tempName.trim() || `Земельні угіддя (${tempCode})`;
      const newLandUse: LandUseExplication = {
        id: `lu_${Date.now()}`,
        code: tempCode || '001.01',
        name,
        points: tempPoints,
        area: Math.round(parseFloat(computeTempArea()) * 10) / 10,
      };
      onUpdateModel({
        landUseExplication: [...(model.landUseExplication || []), newLandUse],
      });
    }

    setTempPoints([]);
    setTempName('');
    setTempCode('01.05'); // reset default
    setMode('VIEW');
  };

  return (
    <div
      className="flex flex-col h-full bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden"
      id="cadastral_drawing_workspace">
      <CanvasToolbar
        coordinateSystem={model.coordinateSystem}
        orthoMode={orthoMode}
        setOrthoMode={setOrthoMode}
        onZoomIn={() => setZoom((prev) => Math.min(prev * 1.2, 5))}
        onZoomOut={() => setZoom((prev) => Math.max(prev / 1.2, 0.2))}
        onResetZoom={handleResetZoom}
      />

      <CanvasModeSelector
        mode={mode}
        setMode={setMode}
        onClearTempPoints={() => setTempPoints([])}
      />

      <CanvasDrawOverlay
        mode={mode}
        setMode={setMode}
        tempPointsCount={tempPoints.length}
        tempName={tempName}
        setTempName={setTempName}
        tempCode={tempCode}
        setTempCode={setTempCode}
        computeTempArea={computeTempArea}
        onSaveDrawing={saveDrawing}
        onClearTempPoints={() => setTempPoints([])}
      />

      <div
        ref={containerRef}
        className="relative flex-grow bg-slate-50 overflow-hidden cursor-crosshair select-none"
        id="cadastral_svg_interactive_panel">
        <InteractiveSvg
          model={model}
          onUpdateModel={onUpdateModel}
          selectedPointId={selectedPointId}
          onSelectPoint={onSelectPoint}
          activeGeozone={activeGeozone}
          onActiveGeozoneChange={onActiveGeozoneChange}
          mode={mode}
          zoom={zoom}
          setZoom={setZoom}
          pan={pan}
          setPan={setPan}
          isPanning={isPanning}
          setIsPanning={setIsPanning}
          draggedPoint={draggedPoint}
          setDraggedPoint={setDraggedPoint}
          tempPoints={tempPoints}
          setTempPoints={setTempPoints}
          tempName={tempName}
          tempCode={tempCode}
          dimensions={dimensions}
          activeSnapPoint={activeSnapPoint}
          setActiveSnapPoint={setActiveSnapPoint}
          orthoMode={orthoMode}
          hoverGeodetic={hoverGeodetic}
          setHoverGeodetic={setHoverGeodetic}
        />
      </div>

      <CanvasInventoryPanels
        model={model}
        onUpdateModel={onUpdateModel}
        activeGeozone={activeGeozone}
        onActiveGeozoneChange={onActiveGeozoneChange}
      />
    </div>
  );
}
