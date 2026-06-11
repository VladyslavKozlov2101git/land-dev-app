import React from 'react';
import { Point } from '../../types';
import { Compass, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

interface CoordinatesCatalogProps {
  points: Point[];
  selectedPointId: string | null;
  onSelectPoint: (id: string | null) => void;
  onXChange: (id: string, value: string) => void;
  onYChange: (id: string, value: string) => void;
  onDeletePoint: (id: string) => void;
  onAddPoint: () => void;
}

export default function CoordinatesCatalog({
  points,
  selectedPointId,
  onSelectPoint,
  onXChange,
  onYChange,
  onDeletePoint,
  onAddPoint,
}: CoordinatesCatalogProps) {
  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="catalog_coordinates_section">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100 hover:bg-slate-100/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-1.5 select-none">
          <Compass className="h-4.5 w-4.5 text-blue-600" />
          <span className="text-sm font-bold text-slate-800">Каталог координат меж ділянки</span>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            id="add_new_coordinate_btn"
            onClick={onAddPoint}
            className="flex items-center gap-1 bg-white hover:bg-blue-50 text-blue-700 border border-slate-200 px-2 py-0.5 text-[10px] rounded-md font-semibold transition-all shadow-3xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Додати
          </button>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-0.5 text-slate-450 hover:text-slate-650 cursor-pointer"
          >
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 space-y-3 animate-fade-in">
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse" id="coords_list_table">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-200 font-mono">
                  <th className="py-2.5 px-3 font-semibold text-center w-8">№</th>
                  <th className="py-2.5 px-3 font-semibold">Північ - X (м)</th>
                  <th className="py-2.5 px-3 font-semibold">Схід - Y (м)</th>
                  <th className="py-2.5 px-3 font-semibold text-center w-12">Дія</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {points.map((p, index) => {
                  const isSelected = p.id === selectedPointId;
                  return (
                    <tr
                      key={p.id}
                      id={`tr_pt_${p.id}`}
                      onClick={() => onSelectPoint(p.id)}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/70 font-semibold border-l-4 border-blue-600 text-blue-900' : 'hover:bg-slate-50/80'}`}
                    >
                      <td className="py-2 px-3 text-center text-slate-500 font-bold font-mono">
                        {index + 1}
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          id={`input_pt_x_${p.id}`}
                          type="number"
                          step="0.001"
                          value={p.x}
                          onChange={(e) => onXChange(p.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-2 py-1 bg-white border border-slate-200 hover:border-slate-350 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none rounded font-mono text-xs text-slate-800"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          id={`input_pt_y_${p.id}`}
                          type="number"
                          step="0.001"
                          value={p.y}
                          onChange={(e) => onYChange(p.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-2 py-1 bg-white border border-slate-200 hover:border-slate-350 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none rounded font-mono text-xs text-slate-800"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <button
                          id={`del_pt_btn_${p.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePoint(p.id);
                          }}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Видалити поворотну точку"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
