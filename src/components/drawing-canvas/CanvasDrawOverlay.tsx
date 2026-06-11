import React from 'react';
import { Check } from 'lucide-react';
import { DrawMode } from '../../types';

interface CanvasDrawOverlayProps {
  mode: DrawMode;
  setMode: (m: DrawMode) => void;
  tempPointsCount: number;
  tempName: string;
  setTempName: (name: string) => void;
  tempCode: string;
  setTempCode: (code: string) => void;
  computeTempArea: () => string;
  onSaveDrawing: () => void;
  onClearTempPoints: () => void;
}

export default function CanvasDrawOverlay({
  mode,
  setMode,
  tempPointsCount,
  tempName,
  setTempName,
  tempCode,
  setTempCode,
  computeTempArea,
  onSaveDrawing,
  onClearTempPoints,
}: CanvasDrawOverlayProps) {
  if (mode === 'VIEW') return null;

  return (
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
              : mode === 'ADD_LAND_USE'
              ? 'Рілля (городи)'
              : 'Охоронна зона інженерних комунікацій'
          }
          className="px-2 py-1 bg-white border border-slate-350 rounded focus:outline-none focus:ring-2 focus:ring-blue-100 text-xs flex-grow max-w-sm"
        />
      </div>

      {(mode === 'ADD_RESTRICTION' || mode === 'ADD_LAND_USE') && (
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-700">Код:</span>
          <input
            id="temp_geom_code_input"
            type="text"
            value={tempCode}
            onChange={(e) => setTempCode(e.target.value)}
            placeholder={mode === 'ADD_LAND_USE' ? '001.01' : '01.05'}
            className="w-16 px-1.5 py-1 bg-white border border-slate-355 rounded focus:outline-none focus:ring-2 focus:ring-blue-100 text-center font-mono text-xs"
          />
        </div>
      )}

      <div className="flex items-center gap-1.5 ml-auto">
        <span className="text-[11px] font-semibold font-mono bg-white text-slate-650 px-1.5 py-0.5 rounded border border-slate-205">
          Точок: {tempPointsCount} ({computeTempArea()} м²)
        </span>
        <button
          id="confirm_draw_btn"
          onClick={onSaveDrawing}
          disabled={tempPointsCount < 3}
          className="px-3 py-1 bg-blue-600 text-white rounded font-medium flex items-center gap-1 hover:bg-blue-700 disabled:opacity-50 text-[11px] cursor-pointer">
          <Check className="h-3.5 w-3.5" /> Зберегти
        </button>
        <button
          id="cancel_draw_btn"
          onClick={() => {
            setMode('VIEW');
            onClearTempPoints();
          }}
          className="px-2 py-1 bg-slate-350 hover:bg-slate-400 text-slate-800 rounded text-[11px] cursor-pointer">
          Скасувати
        </button>
      </div>
    </div>
  );
}
