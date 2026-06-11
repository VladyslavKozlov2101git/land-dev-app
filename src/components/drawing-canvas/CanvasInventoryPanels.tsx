import React from 'react';
import { CadastralModel } from '../../types';
import { Trash2 } from 'lucide-react';

interface CanvasInventoryPanelsProps {
  model: CadastralModel;
  onUpdateModel: (updates: Partial<CadastralModel>) => void;
}

export default function CanvasInventoryPanels({
  model,
  onUpdateModel,
}: CanvasInventoryPanelsProps) {
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

  return (
    <div className="border-t border-slate-150 p-3 bg-slate-50 flex flex-col gap-4 text-xs font-sans max-h-36 overflow-y-auto">
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
                    className="text-red-550 hover:text-red-700 p-0.5 rounded hover:bg-red-50 cursor-pointer"
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
                    className="text-red-555 hover:text-red-700 p-0.5 rounded hover:bg-slate-100 cursor-pointer"
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
  );
}
