import React from 'react';
import { Layers, Compass, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

interface CanvasToolbarProps {
  coordinateSystem: string;
  orthoMode: boolean;
  setOrthoMode: (val: boolean) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export default function CanvasToolbar({
  coordinateSystem,
  orthoMode,
  setOrthoMode,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}: CanvasToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between p-3 bg-slate-50 border-b border-slate-200 gap-2">
      <div className="flex items-center gap-1.5">
        <Layers className="h-4 w-4 text-blue-600" id="geom_layers_icon" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 font-mono">
          Креслення ділянки {coordinateSystem}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          id="ortho_toggle_btn"
          onClick={() => setOrthoMode(!orthoMode)}
          className={`p-1 px-2.5 mr-2 rounded transition-all text-[11px] font-bold flex items-center gap-1.5 cursor-pointer border ${orthoMode ? 'bg-emerald-600 border-emerald-700 text-white shadow-xs' : 'bg-white border-slate-205 text-slate-650 hover:bg-slate-50'}`}
          title="Орто-режим: фіксація ліній під 45°/90°/180° (можна також затиснути Shift)">
          <Compass className={`h-3.5 w-3.5 ${orthoMode ? 'text-white' : 'text-slate-500'}`} />
          <span>Орто {orthoMode ? 'Увімк.' : 'Вимк.'}</span>
        </button>
        <button
          id="zoom_in_btn"
          onClick={onZoomIn}
          className="p-1 text-slate-600 hover:bg-slate-200 rounded transition-colors"
          title="Збільшити масштаб">
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          id="zoom_out_btn"
          onClick={onZoomOut}
          className="p-1 text-slate-600 hover:bg-slate-200 rounded transition-colors"
          title="Зменшити масштаб">
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          id="zoom_reset_btn"
          onClick={onResetZoom}
          className="p-1 text-slate-600 hover:bg-slate-200 rounded transition-colors"
          title="Скинути фокус та очистити">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
