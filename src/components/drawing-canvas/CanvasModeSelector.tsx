import React from 'react';
import { Plus } from 'lucide-react';

type DrawMode = 'VIEW' | 'EDIT_PARCEL' | 'ADD_BUILDING' | 'ADD_RESTRICTION';

interface CanvasModeSelectorProps {
  mode: DrawMode;
  setMode: (m: DrawMode) => void;
  onClearTempPoints: () => void;
}

export default function CanvasModeSelector({
  mode,
  setMode,
  onClearTempPoints,
}: CanvasModeSelectorProps) {
  return (
    <div className="flex items-center justify-between bg-blue-50/40 p-2 px-3 border-b border-slate-200 text-xs">
      <div className="flex items-center gap-2 overflow-x-auto py-1">
        <button
          id="mode_view_btn"
          onClick={() => {
            setMode('VIEW');
            onClearTempPoints();
          }}
          className={`px-2.5 py-1 rounded font-medium transition-all ${mode === 'VIEW' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
          Режим Огляду
        </button>
        <button
          id="mode_add_bld_btn"
          onClick={() => {
            setMode('ADD_BUILDING');
            onClearTempPoints();
          }}
          className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 transition-all ${mode === 'ADD_BUILDING' ? 'bg-red-600 text-white' : 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100/50'}`}>
          <Plus className="h-3.5 w-3.5" /> Будівля
        </button>
        <button
          id="mode_add_rest_btn"
          onClick={() => {
            setMode('ADD_RESTRICTION');
            onClearTempPoints();
          }}
          className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 transition-all ${mode === 'ADD_RESTRICTION' ? 'bg-amber-600 text-white' : 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100/50'}`}>
          <Plus className="h-3.5 w-3.5" /> Обмеження
        </button>
      </div>

      {mode !== 'VIEW' && (
        <span className="hidden sm:inline-block text-[11px] text-blue-800 font-medium font-mono animate-pulse bg-blue-100/60 px-2 py-0.5 rounded">
          Клікніть на кресленні для нанесення точок
        </span>
      )}
    </div>
  );
}
