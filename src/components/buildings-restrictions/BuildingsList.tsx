import React from 'react';
import { Point, CadastralModel, Building } from '../../types';
import { calculatePolygonArea } from '../../utils/geo';
import { Home, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';

interface BuildingsListProps {
  model: CadastralModel;
  onUpdateModel: (updates: Partial<CadastralModel>) => void;
  selectedPointId: string | null;
  onSelectPoint: (id: string | null) => void;
  activeBuildingId: string | null;
  setActiveBuildingId: (id: string | null) => void;
}

export default function BuildingsList({
  model,
  onUpdateModel,
  selectedPointId,
  onSelectPoint,
  activeBuildingId,
  setActiveBuildingId,
}: BuildingsListProps) {

  const recalculateBuildingArea = (points: Point[]): number => {
    return Math.round(calculatePolygonArea(points) * 10) / 10;
  };

  const handleAddBuilding = () => {
    let avgX = 5612400;
    let avgY = 3248600;
    if (model.points.length > 0) {
      avgX = model.points.reduce((sum, p) => sum + p.x, 0) / model.points.length;
      avgY = model.points.reduce((sum, p) => sum + p.y, 0) / model.points.length;
    }

    const d = 12; // offset
    const defaultPoints: Point[] = [
      { id: `bld_pt_${Date.now()}_0`, x: avgX + d, y: avgY - d },
      { id: `bld_pt_${Date.now()}_1`, x: avgX + d, y: avgY + d },
      { id: `bld_pt_${Date.now()}_2`, x: avgX - d, y: avgY + d },
      { id: `bld_pt_${Date.now()}_3`, x: avgX - d, y: avgY - d },
    ];

    const newBuilding: Building = {
      id: `bld_${Date.now()}`,
      name: `Житловий будинок літ. ${String.fromCharCode(65 + model.buildings.length)}`,
      points: defaultPoints,
      area: recalculateBuildingArea(defaultPoints)
    };

    onUpdateModel({
      buildings: [...model.buildings, newBuilding]
    });
    setActiveBuildingId(newBuilding.id);
  };

  const handleDeleteBuilding = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateModel({
      buildings: model.buildings.filter(b => b.id !== id)
    });
    if (activeBuildingId === id) {
      setActiveBuildingId(null);
    }
  };

  const handleUpdateBuildingName = (id: string, name: string) => {
    const updated = model.buildings.map(b => b.id === id ? { ...b, name } : b);
    onUpdateModel({ buildings: updated });
  };

  const handleBuildingPointChange = (bldId: string, ptId: string, field: 'x' | 'y', value: string) => {
    const numeric = parseFloat(value);
    if (isNaN(numeric)) return;

    const updated = model.buildings.map(b => {
      if (b.id === bldId) {
        const pts = b.points.map(p => p.id === ptId ? { ...p, [field]: numeric } : p);
        return {
          ...b,
          points: pts,
          area: recalculateBuildingArea(pts)
        };
      }
      return b;
    });
    onUpdateModel({ buildings: updated });
  };

  const handleAddBuildingPoint = (bldId: string) => {
    const building = model.buildings.find(b => b.id === bldId);
    if (!building || building.points.length === 0) return;

    const last = building.points[building.points.length - 1];
    const newPt: Point = {
      id: `bld_pt_${Date.now()}_${building.points.length}`,
      x: last.x + 5,
      y: last.y + 5
    };

    const updated = model.buildings.map(b => {
      if (b.id === bldId) {
        const pts = [...b.points, newPt];
        return {
          ...b,
          points: pts,
          area: recalculateBuildingArea(pts)
        };
      }
      return b;
    });
    onUpdateModel({ buildings: updated });
    onSelectPoint(newPt.id);
  };

  const handleDeleteBuildingPoint = (bldId: string, ptId: string) => {
    const building = model.buildings.find(b => b.id === bldId);
    if (!building) return;

    if (building.points.length <= 3) {
      alert('Будівля повинна мати щонайменше 3 вершини.');
      return;
    }

    const updated = model.buildings.map(b => {
      if (b.id === bldId) {
        const pts = b.points.filter(p => p.id !== ptId);
        return {
          ...b,
          points: pts,
          area: recalculateBuildingArea(pts)
        };
      }
      return b;
    });
    onUpdateModel({ buildings: updated });
    if (selectedPointId === ptId) onSelectPoint(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-extrabold text-slate-600 uppercase tracking-wider text-[10px] flex items-center gap-1">
          <Home className="h-3 w-3 text-red-505" /> Будівлі та капітальні споруди
        </span>
        <button
          id="add_bld_btn"
          onClick={handleAddBuilding}
          className="flex items-center gap-0.5 text-blue-600 hover:text-blue-800 font-bold transition-all text-[11px] cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" /> Створити Будівлю
        </button>
      </div>

      {model.buildings.length === 0 ? (
        <p className="text-slate-400 italic py-1">Жодних споруд не побудовано.</p>
      ) : (
        <div className="space-y-2">
          {model.buildings.map((b) => {
            const isActive = activeBuildingId === b.id;
            return (
              <div key={b.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                <div
                  onClick={() => setActiveBuildingId(isActive ? null : b.id)}
                  className="p-2 px-3 bg-slate-50/55 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer border-b border-slate-100"
                >
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 min-w-0">
                    <span className="text-red-500">■</span>
                    <span className="truncate block max-w-[130px]">{b.name}</span>
                    <span className="text-[10px] font-mono font-bold text-slate-450 bg-slate-200 px-1 rounded shrink-0">{b.area} м²</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      id={`del_bld_inner_${b.id}`}
                      onClick={(e) => handleDeleteBuilding(b.id, e)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                      title="Видалити будівлю"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {isActive ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                  </div>
                </div>

                {isActive && (
                  <div className="p-3 bg-white space-y-3 border-t border-slate-50">
                    <div className="space-y-1 block">
                      <label className="font-semibold text-slate-500">Назва / Літера будівлі:</label>
                      <input
                        type="text"
                        value={b.name}
                        onChange={(e) => handleUpdateBuildingName(b.id, e.target.value)}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 focus:outline-none focus:border-red-400 rounded text-xs text-slate-800 font-medium"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-650">
                        <span>КООРДИНАТИ КУТІВ БУДІВЛІ (X, Y)</span>
                        <button
                          onClick={() => handleAddBuildingPoint(b.id)}
                          className="text-red-650 hover:text-red-800 hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" /> Додати кут
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
                            {b.points.map((pt, pIdx) => {
                              const isPtSelected = pt.id === selectedPointId;
                              return (
                                <tr
                                  key={pt.id}
                                  onClick={() => onSelectPoint(pt.id)}
                                  className={`cursor-pointer transition-colors ${isPtSelected ? 'bg-red-50/70 font-semibold border-l-2 border-red-500' : 'hover:bg-slate-50/70'}`}
                                >
                                  <td className="p-1 px-2 text-center text-slate-400 font-bold">{pIdx + 1}</td>
                                  <td className="p-1">
                                    <input
                                      type="number"
                                      step="0.001"
                                      value={pt.x}
                                      onChange={(e) => handleBuildingPointChange(b.id, pt.id, 'x', e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-full text-[10px] p-0.5 border border-slate-100 rounded focus:border-red-400 text-slate-800"
                                    />
                                  </td>
                                  <td className="p-1">
                                    <input
                                      type="number"
                                      step="0.001"
                                      value={pt.y}
                                      onChange={(e) => handleBuildingPointChange(b.id, pt.id, 'y', e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-full text-[10px] p-0.5 border border-slate-100 rounded focus:border-red-400 text-slate-800"
                                    />
                                  </td>
                                  <td className="p-1 text-center">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteBuildingPoint(b.id, pt.id);
                                      }}
                                      className="text-red-500 hover:text-red-700 p-0.5 hover:bg-red-50 rounded cursor-pointer"
                                      title="Видалити цей кут"
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
