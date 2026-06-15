import React, { useState } from 'react';
import { CadastralModel } from '../../types';
import { CheckSquare, ChevronUp, ChevronDown, ClipboardCheck } from 'lucide-react';
import { isPolygonInsidePolygon, doPolygonsOverlap } from '../../utils/geo';

interface ChecklistPanelProps {
  model: CadastralModel;
}

export default function ChecklistPanel({ model }: ChecklistPanelProps) {
  const [isChecklistVisible, setIsChecklistVisible] = useState(true);

  // Check if any buildings overlap
  let hasOverlap = false;
  let overlappingNames = '';
  for (let i = 0; i < model.buildings.length; i++) {
    for (let j = i + 1; j < model.buildings.length; j++) {
      if (doPolygonsOverlap(model.buildings[i].points, model.buildings[j].points)) {
        hasOverlap = true;
        overlappingNames = `${model.buildings[i].name} та ${model.buildings[j].name}`;
        break;
      }
    }
  }

  const buildingsDoNotOverlap = !hasOverlap;
  const buildingsInside = model.buildings.every(b => isPolygonInsidePolygon(b.points, model.points));
  const restrictionsInside = model.restrictions.every(r => isPolygonInsidePolygon(r.points, model.points));
  
  const drawableLandUse = (model.landUseExplication || []).filter(lu => lu.points && lu.points.length >= 3);
  const landUseInside = drawableLandUse.every(lu => isPolygonInsidePolygon(lu.points!, model.points));

  const checks = [
    { label: 'Межові точки визначено', checked: model.points.length >= 3, detail: `${model.points.length} поворотних точок` },
    { label: 'Кадастровий номер заповнено', checked: model.cadastralNumber.trim().length > 6, detail: model.cadastralNumber },
    { label: 'Реквізити ДРРП внесено', checked: model.drrpRegNumber.trim().length > 3, detail: `№ ${model.drrpRegNumber || "немає"}` },
    { label: 'Суб\'єкт права вказано', checked: model.ownerName.trim().length > 3, detail: model.ownerName },
    { label: 'Суміжники погоджені', checked: model.adjacentBoundaries.every(adj => adj.description.length > 5), detail: `${model.adjacentBoundaries.length} суміжних меж` },
    { 
      label: 'Будинки не накладаються', 
      checked: buildingsDoNotOverlap, 
      detail: buildingsDoNotOverlap ? 'Накладань не виявлено' : `Перетин: ${overlappingNames}` 
    },
    { 
      label: 'Будинки в межах ділянки', 
      checked: buildingsInside, 
      detail: buildingsInside ? 'Усі в межах ділянки' : 'Виявлено вихід за межу' 
    },
    { 
      label: 'Обмеження в межах ділянки', 
      checked: restrictionsInside, 
      detail: restrictionsInside ? 'Усі в межах ділянки' : 'Виявлено вихід за межу' 
    },
    { 
      label: 'Угіддя в межах ділянки', 
      checked: landUseInside, 
      detail: landUseInside ? 'Усі в межах ділянки' : 'Виявлено вихід за межу' 
    }
  ];

  const totalCompletedChecks = checks.filter(c => c.checked).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden shrink-0" id="quick_checklist_panel">
      <button
        onClick={() => setIsChecklistVisible(!isChecklistVisible)}
        className="w-full flex items-center justify-between p-4 bg-emerald-50/50 border-b border-emerald-100 hover:bg-emerald-100/50 transition-colors cursor-pointer text-left"
        id="toggle_checklist_panel_btn"
      >
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-emerald-600" />
          <span className="text-[13px] font-black text-slate-800 uppercase tracking-tight">
            Кадастрова перевірка ділянки
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
            {totalCompletedChecks}/{checks.length}
          </span>
          {isChecklistVisible ? <ChevronUp className="h-4 w-4 text-emerald-600" /> : <ChevronDown className="h-4 w-4 text-emerald-600" />}
        </div>
      </button>
      
      {isChecklistVisible && (
        <div className="p-4 space-y-2 animate-fade-in text-xs max-h-[450px] overflow-y-auto scrollbar-thin">
          {checks.map((chk, i) => (
            <div key={i} className={`flex items-start justify-between p-3 rounded-lg border transition-all ${chk.checked ? 'bg-white border-slate-150' : 'bg-rose-50/30 border-rose-100'}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${chk.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300'}`}>
                   {chk.checked && <CheckSquare className="h-3 w-3" />}
                </div>
                <div className="text-left leading-tight">
                  <span className={`text-[11px] font-bold block ${chk.checked ? 'text-slate-700' : 'text-slate-500'}`}>{chk.label}</span>
                  <span className="text-[10px] text-slate-400 block font-mono mt-0.5 truncate max-w-[220px]" title={chk.detail}>
                    {chk.detail}
                  </span>
                </div>
              </div>
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider ${chk.checked ? 'text-emerald-600' : 'text-rose-500'}`}>
                {chk.checked ? 'OK' : 'MISS'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
