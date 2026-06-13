import React, { useState } from 'react';
import { CadastralModel, ActiveGeozone } from '../../types';
import { Home, ChevronDown, ChevronUp } from 'lucide-react';
import BuildingsList from './BuildingsList';
import RestrictionsList from './RestrictionsList';

interface BuildingsRestrictionsEditorProps {
  model: CadastralModel;
  onUpdateModel: (updates: Partial<CadastralModel>) => void;
  selectedPointId: string | null;
  onSelectPoint: (id: string | null) => void;
  activeGeozone: ActiveGeozone | null;
  onActiveGeozoneChange: (val: ActiveGeozone | null) => void;
}

export default function BuildingsRestrictionsEditor({
  model,
  onUpdateModel,
  selectedPointId,
  onSelectPoint,
  activeGeozone,
  onActiveGeozoneChange,
}: BuildingsRestrictionsEditorProps) {
  const [isOpen, setIsOpen] = useState(true);

  const activeBuildingId = activeGeozone?.type === 'building' ? activeGeozone.id : null;
  const activeRestrictionId = activeGeozone?.type === 'restriction' ? activeGeozone.id : null;

  const setActiveBuildingId = (id: string | null) => {
    onActiveGeozoneChange(id ? { type: 'building', id } : null);
  };

  const setActiveRestrictionId = (id: string | null) => {
    onActiveGeozoneChange(id ? { type: 'restriction', id } : null);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="buildings_restrictions_editor_block">
      {/* Widget Expandable Header */}
      <button
        id="toggle_bld_rest_block"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100 hover:bg-slate-100/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Home className="h-4.5 w-4.5 text-blue-600" />
          <span className="text-sm font-bold text-slate-800">Редактор Об'єктів (Будівлі / Обмеження)</span>
        </div>
        <div>
          {isOpen ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 space-y-4 animate-fade-in text-xs text-left" id="bld_rest_panel_body">
          <BuildingsList
            model={model}
            onUpdateModel={onUpdateModel}
            selectedPointId={selectedPointId}
            onSelectPoint={onSelectPoint}
            activeBuildingId={activeBuildingId}
            setActiveBuildingId={setActiveBuildingId}
          />

          <hr className="border-slate-150" />

          <RestrictionsList
            model={model}
            onUpdateModel={onUpdateModel}
            selectedPointId={selectedPointId}
            onSelectPoint={onSelectPoint}
            activeRestrictionId={activeRestrictionId}
            setActiveRestrictionId={setActiveRestrictionId}
          />
        </div>
      )}
    </div>
  );
}
