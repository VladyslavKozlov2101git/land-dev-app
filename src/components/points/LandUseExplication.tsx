import React, { useState } from 'react';
import { CadastralModel } from '../../types';
import { Plus, Trash2, ChevronUp, ChevronDown, CheckSquare, MapPin, Map } from 'lucide-react';
import { calculatePolygonArea } from '../../utils/geo';

interface LandUseExplicationProps {
  model: CadastralModel;
  onUpdateModel: (updates: Partial<CadastralModel>) => void;
  totalAreaSqM: number;
}

export default function LandUseExplication({
  model,
  onUpdateModel,
  totalAreaSqM,
}: LandUseExplicationProps) {
  const [isOpen, setIsOpen] = useState(true);
  const explication = model.landUseExplication || [];

  const handleAddExplication = () => {
    const newItem = {
      id: `lu_${Date.now()}`,
      code: '001.01',
      name: 'Нове угіддя',
      area: 0,
    };
    onUpdateModel({
      landUseExplication: [...explication, newItem],
    });
  };

  const handleDeleteExplication = (id: string) => {
    const updated = explication.filter((item) => item.id !== id);
    onUpdateModel({
      landUseExplication: updated,
    });
  };

  const handleExplicationChange = (id: string, field: 'code' | 'name' | 'area', value: any) => {
    const updated = explication.map((item) => {
      if (item.id === id) {
        if (field === 'area') {
          const num = parseFloat(value);
          return { ...item, area: isNaN(num) ? 0 : num };
        }
        return { ...item, [field]: value };
      }
      return item;
    });
    onUpdateModel({
      landUseExplication: updated,
    });
  };

  const getDisplayArea = (item: typeof explication[0]) => {
    if (item.points && item.points.length >= 3) {
      return Math.round(calculatePolygonArea(item.points) * 10) / 10;
    }
    return item.area;
  };

  const sumExplicationArea = explication.reduce((acc, curr) => acc + getDisplayArea(curr), 0);
  const explicationDiff = Math.round((totalAreaSqM - sumExplicationArea) * 10) / 10;
  const isAreaMatching = Math.abs(explicationDiff) < 0.1;

  return (
    <div
      className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      id="land_use_explication_section">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100 hover:bg-slate-100/50 transition-colors cursor-pointer select-none">
        <div className="flex items-center gap-1.5">
          <CheckSquare className="h-4.5 w-4.5 text-blue-600" />
          <span className="text-sm font-bold text-slate-800">Експлікація земельних угідь</span>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            id="add_new_explication_btn"
            onClick={handleAddExplication}
            className="flex items-center gap-1 bg-white hover:bg-blue-50 text-blue-700 border border-slate-200 px-2 py-0.5 text-[10px] rounded-md font-semibold transition-all shadow-3xs cursor-pointer animate-fade-in">
            <Plus className="h-3.5 w-3.5" /> Додати
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-0.5 text-slate-455 hover:text-slate-650 cursor-pointer">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 space-y-3 animate-fade-in">
          <p className="text-[11px] text-slate-500">
            Розподіл загальної площі земельної ділянки за видами угідь (згідно з КВЗУ). Натисніть кнопку "Угіддя" на карті, щоб накреслити контури.
          </p>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse" id="explication_list_table">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[9px] uppercase tracking-wider border-b border-slate-200 font-mono">
                  <th className="py-2 px-3 font-semibold w-16">Код</th>
                  <th className="py-2 px-3 font-semibold">Назва угіддя</th>
                  <th className="py-2 px-3 font-semibold w-24">Площа (м²)</th>
                  <th className="py-2 px-3 font-semibold w-8 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {explication.map((item) => {
                  const hasGeom = item.points && item.points.length >= 3;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={item.code}
                          placeholder="007.01"
                          onChange={(e) => handleExplicationChange(item.id, 'code', e.target.value)}
                          className="w-full px-1.5 py-1 bg-white border border-slate-200 rounded font-mono text-xs text-slate-800 text-center focus:border-blue-550 focus:outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <div className="flex items-center gap-1.5">
                          {hasGeom && (
                            <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" title="Контур накреслено на карті" />
                          )}
                          <input
                            type="text"
                            value={item.name}
                            placeholder="під забудовою"
                            onChange={(e) => handleExplicationChange(item.id, 'name', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:border-blue-550 focus:outline-none font-medium"
                          />
                        </div>
                      </td>
                      <td className="py-1.5 px-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            value={getDisplayArea(item)}
                            disabled={!!hasGeom}
                            onChange={(e) => handleExplicationChange(item.id, 'area', e.target.value)}
                            className={`w-full px-1.5 py-1 bg-white border border-slate-200 rounded font-mono text-xs text-slate-800 text-right focus:border-blue-550 focus:outline-none ${hasGeom ? 'bg-emerald-50 border-emerald-250 text-emerald-800 font-bold' : ''}`}
                          />
                          {hasGeom && (
                            <button
                              onClick={() => {
                                const updated = explication.map((lu) =>
                                  lu.id === item.id ? { ...lu, points: undefined, area: getDisplayArea(item) } : lu
                                );
                                onUpdateModel({ landUseExplication: updated });
                              }}
                              className="p-1 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded transition-colors cursor-pointer shrink-0"
                              title="Видалити контур з карти (перейти на ручний ввід)">
                              <Map className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <button
                          onClick={() => handleDeleteExplication(item.id)}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Видалити рядок експлікації">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {explication.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400 italic">
                      Не додано жодного запису експлікації.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-1.5 p-3 bg-slate-50/50 rounded-lg border text-[11px] font-sans">
            <div className="flex justify-between font-mono font-semibold">
              <span className="text-slate-500">Загальна площа по межі:</span>
              <span className="text-slate-900">{totalAreaSqM.toFixed(1)} м²</span>
            </div>
            <div className="flex justify-between font-mono font-semibold">
              <span className="text-slate-500">Сума площ по експлікації:</span>
              <span className="text-slate-900">{sumExplicationArea.toFixed(1)} м²</span>
            </div>

            <div className="border-t border-slate-200 pt-2 flex items-center justify-between gap-2">
              {isAreaMatching ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                  Площі повністю узгоджені
                </span>
              ) : (
                <span
                  className={`font-semibold flex items-center gap-1 ${explicationDiff > 0 ? 'text-amber-700' : 'text-rose-750'}`}>
                  <span
                    className={`w-1.5 h-1.5 rounded-full inline-block ${explicationDiff > 0 ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'}`}></span>
                  {explicationDiff > 0
                    ? `Не розподілено: +${explicationDiff.toFixed(1)} м²`
                    : `Перевищення: ${explicationDiff.toFixed(1)} м²`}
                </span>
              )}

              {!isAreaMatching && explication.length > 0 && (
                <button
                  onClick={() => {
                    const manualIndex = explication.map((lu) => !(lu.points && lu.points.length >= 3)).lastIndexOf(true);
                    const targetIndex = manualIndex !== -1 ? manualIndex : explication.length - 1;
                    const lastItem = explication[targetIndex];
                    const currentDisplayArea = getDisplayArea(lastItem);
                    const newArea = Math.max(0, Math.round((currentDisplayArea + explicationDiff) * 10) / 10);
                    handleExplicationChange(lastItem.id, 'area', newArea.toString());
                  }}
                  className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border rounded font-medium text-[9px] shadow-3xs cursor-pointer active:scale-95 transition-all"
                  title="Підігнати площу ручного угіддя під загальну площу ділянки">
                  Збалансувати
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
