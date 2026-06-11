import React, { useState } from 'react';
import { CadastralModel } from '../../types';
import { CheckSquare, ChevronUp, ChevronDown } from 'lucide-react';
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="quick_checklist_panel">
      <button
        onClick={() => setIsChecklistVisible(!isChecklistVisible)}
        className="w-full flex items-center justify-between p-3.5 bg-slate-50/70 border-b border-slate-100 hover:bg-slate-100/50 transition-colors cursor-pointer text-left"
        id="toggle_checklist_panel_btn"
      >
        <div className="flex items-center gap-1.5">
          <CheckSquare className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-extrabold text-slate-700 tracking-wider uppercase">
            Кадастрова перевірка
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-blue-800 bg-blue-100/50 px-1.5 py-0.2 rounded border border-blue-150">
            {totalCompletedChecks}/{checks.length}
          </span>
          {isChecklistVisible ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </button>
      
      {isChecklistVisible && (
        <div className="p-4 space-y-2 animate-fade-in text-xs">
          {checks.map((chk, i) => (
            <div key={i} className="flex items-start justify-between p-2 rounded-lg bg-slate-50 border border-slate-150">
              <div className="flex items-start gap-1.5">
                <input
                  type="checkbox"
                  checked={chk.checked}
                  readOnly
                  className="mt-0.5 w-3.5 h-3.5 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 inline-block pointer-events-none"
                />
                <div className="text-left leading-tight">
                  <span className="font-semibold text-slate-700 block">{chk.label}</span>
                  <span className="text-[10px] text-slate-450 block font-mono truncate max-w-[170px]" title={chk.detail}>
                    {chk.detail}
                  </span>
                </div>
              </div>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${chk.checked ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-500'}`}>
                {chk.checked ? 'OK' : 'Нема'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
