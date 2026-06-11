import React from 'react';
import { Point, CadastralModel, Restriction } from '../../types';
import { calculatePolygonArea } from '../../utils/geo';
import { Shield, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';

interface RestrictionsListProps {
  model: CadastralModel;
  onUpdateModel: (updates: Partial<CadastralModel>) => void;
  selectedPointId: string | null;
  onSelectPoint: (id: string | null) => void;
  activeRestrictionId: string | null;
  setActiveRestrictionId: (id: string | null) => void;
}

export default function RestrictionsList({
  model,
  onUpdateModel,
  selectedPointId,
  onSelectPoint,
  activeRestrictionId,
  setActiveRestrictionId,
}: RestrictionsListProps) {

  const recalculateRestrictionArea = (points: Point[]): number => {
    return Math.round(calculatePolygonArea(points) * 10) / 10;
  };

  const handleAddRestriction = () => {
    let avgX = 5612400;
    let avgY = 3248600;
    if (model.points.length > 0) {
      avgX = model.points.reduce((sum, p) => sum + p.x, 0) / model.points.length;
      avgY = model.points.reduce((sum, p) => sum + p.y, 0) / model.points.length;
    }

    const d = 16;
    const defaultPoints: Point[] = [
      { id: `rc_pt_${Date.now()}_0`, x: avgX + d, y: avgY - d },
      { id: `rc_pt_${Date.now()}_1`, x: avgX + d, y: avgY + d },
      { id: `rc_pt_${Date.now()}_2`, x: avgX - d, y: avgY + d },
      { id: `rc_pt_${Date.now()}_3`, x: avgX - d, y: avgY - d },
    ];

    const newRestriction: Restriction = {
      id: `rest_${Date.now()}`,
      code: '01.05',
      name: `Охоронна зона інженерних комунікацій (№${model.restrictions.length + 1})`,
      points: defaultPoints,
      area: recalculateRestrictionArea(defaultPoints),
      description: 'Обмеження встановлено землевпорядними вишукуваннями.'
    };

    onUpdateModel({
      restrictions: [...model.restrictions, newRestriction]
    });
    setActiveRestrictionId(newRestriction.id);
  };

  const handleDeleteRestriction = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateModel({
      restrictions: model.restrictions.filter(r => r.id !== id)
    });
    if (activeRestrictionId === id) {
      setActiveRestrictionId(null);
    }
  };

  const handleUpdateRestrictionField = (id: string, field: 'name' | 'code' | 'description', value: string) => {
    const updated = model.restrictions.map(r => r.id === id ? { ...r, [field]: value } : r);
    onUpdateModel({ restrictions: updated });
  };

  const handleRestrictionPointChange = (restId: string, ptId: string, field: 'x' | 'y', value: string) => {
    const numeric = parseFloat(value);
    if (isNaN(numeric)) return;

    const updated = model.restrictions.map(r => {
      if (r.id === restId) {
        const pts = r.points.map(p => p.id === ptId ? { ...p, [field]: numeric } : p);
        return {
          ...r,
          points: pts,
          area: recalculateRestrictionArea(pts)
        };
      }
      return r;
    });
    onUpdateModel({ restrictions: updated });
  };

  const handleAddRestrictionPoint = (restId: string) => {
    const restriction = model.restrictions.find(r => r.id === restId);
    if (!restriction || restriction.points.length === 0) return;

    const last = restriction.points[restriction.points.length - 1];
    const newPt: Point = {
      id: `rc_pt_${Date.now()}_${restriction.points.length}`,
      x: last.x + 4,
      y: last.y + 4
    };

    const updated = model.restrictions.map(r => {
      if (r.id === restId) {
        const pts = [...r.points, newPt];
        return {
          ...r,
          points: pts,
          area: recalculateRestrictionArea(pts)
        };
      }
      return r;
    });
    onUpdateModel({ restrictions: updated });
    onSelectPoint(newPt.id);
  };

  const handleDeleteRestrictionPoint = (restId: string, ptId: string) => {
    const restriction = model.restrictions.find(r => r.id === restId);
    if (!restriction) return;

    if (restriction.points.length <= 3) {
      alert('Обмеження повинно мати щонайменше 3 вершини.');
      return;
    }

    const updated = model.restrictions.map(r => {
      if (r.id === restId) {
        const pts = r.points.filter(p => p.id !== ptId);
        return {
          ...r,
          points: pts,
          area: recalculateRestrictionArea(pts)
        };
      }
      return r;
    });
    onUpdateModel({ restrictions: updated });
    if (selectedPointId === ptId) onSelectPoint(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-extrabold text-slate-600 uppercase tracking-wider text-[10px] flex items-center gap-1">
          <Shield className="h-3 w-3 text-amber-505" /> Охоронні зони та обмеження
        </span>
        <button
          id="add_rest_btn"
          onClick={handleAddRestriction}
          className="flex items-center gap-0.5 text-blue-600 hover:text-blue-800 font-bold transition-all text-[11px] cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" /> Створити Обмеження
        </button>
      </div>

      {model.restrictions.length === 0 ? (
        <p className="text-slate-400 italic py-1">Відомості про обмеження відсутні.</p>
      ) : (
        <div className="space-y-2">
          {model.restrictions.map((r) => {
            const isActive = activeRestrictionId === r.id;
            return (
              <div key={r.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                <div
                  onClick={() => setActiveRestrictionId(isActive ? null : r.id)}
                  className="p-2 px-3 bg-slate-50/55 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer border-b border-slate-100"
                >
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 min-w-0">
                    <span className="text-amber-500">■</span>
                    <span className="truncate block max-w-[125px]">{r.name}</span>
                    <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 border border-amber-100 px-1 rounded shrink-0">{r.area} м²</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      id={`del_rest_inner_${r.id}`}
                      onClick={(e) => handleDeleteRestriction(r.id, e)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                      title="Видалити обмеження"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {isActive ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                  </div>
                </div>

                {isActive && (
                  <div className="p-3 bg-white space-y-3 border-t border-slate-50">
                    <div className="space-y-1 block">
                      <label className="font-semibold text-slate-500">Код КВЗ:</label>
                      <input
                        type="text"
                        value={r.code}
                        onChange={(e) => handleUpdateRestrictionField(r.id, 'code', e.target.value)}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 focus:outline-none focus:border-amber-400 rounded text-xs text-slate-800 font-mono"
                      />
                    </div>
                    <div className="space-y-1 block">
                      <label className="font-semibold text-slate-500">Опис обмеження:</label>
                      <input
                        type="text"
                        value={r.name}
                        onChange={(e) => handleUpdateRestrictionField(r.id, 'name', e.target.value)}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 focus:outline-none focus:border-amber-400 rounded text-xs text-slate-800 font-medium"
                      />
                    </div>

                    <div className="space-y-1 block">
                      <label className="font-semibold text-slate-500">Правові підстави введення обмеження:</label>
                      <textarea
                        rows={2}
                        value={r.description || ''}
                        onChange={(e) => handleUpdateRestrictionField(r.id, 'description', e.target.value)}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 focus:outline-none focus:border-amber-400 rounded text-xs text-slate-800"
                        placeholder="Закон України №... або інша правова норма"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-650">
                        <span>ВЕРШИНИ ОБМЕЖЕННЯ (КООРДИНАТИ X, Y)</span>
                        <button
                          onClick={() => handleAddRestrictionPoint(r.id)}
                          className="text-amber-700 hover:text-amber-900 hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" /> Додати точку
                        </button>
                      </div>

                      <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-md">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-slate-50 font-mono text-[9px] border-b text-slate-500 uppercase">
                            <tr>
                              <th className="p-1 px-2 text-center w-6">№</th>
                              <th className="p-1">X (Північ)</th>
                              <th className="p-1">Y (Схід)</th>
                              <th className="p-1 text-center w-6">-</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono">
                            {r.points.map((pt, pIdx) => {
                              const isPtSelected = pt.id === selectedPointId;
                              return (
                                <tr
                                  key={pt.id}
                                  onClick={() => onSelectPoint(pt.id)}
                                  className={`cursor-pointer transition-colors ${isPtSelected ? 'bg-amber-50/70 font-semibold border-l-2 border-amber-500' : 'hover:bg-slate-50/70'}`}
                                >
                                  <td className="p-1 px-2 text-center text-slate-400 font-bold">{pIdx + 1}</td>
                                  <td className="p-1">
                                    <input
                                      type="number"
                                      step="0.001"
                                      value={pt.x}
                                      onChange={(e) => handleRestrictionPointChange(r.id, pt.id, 'x', e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-full text-[10px] p-0.5 border border-slate-100 rounded focus:border-amber-450 text-slate-800"
                                    />
                                  </td>
                                  <td className="p-1">
                                    <input
                                      type="number"
                                      step="0.001"
                                      value={pt.y}
                                      onChange={(e) => handleRestrictionPointChange(r.id, pt.id, 'y', e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-full text-[10px] p-0.5 border border-slate-100 rounded focus:border-amber-450 text-slate-800"
                                    />
                                  </td>
                                  <td className="p-1 text-center">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteRestrictionPoint(r.id, pt.id);
                                      }}
                                      className="text-amber-600 hover:text-amber-800 p-0.5 hover:bg-amber-50 rounded cursor-pointer"
                                      title="Видалити цю точку"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
