import React from 'react';
import { Point, CadastralModel, AdjacentBoundary } from '../types';
import { calculateDistance, calculateDirectionalAngle, formatToDMS, calculatePolygonArea, calculatePolygonPerimeter } from '../utils/geo';
import { Plus, Trash2, Edit, ChevronDown, ChevronUp, ChevronRight, Compass, CheckSquare } from 'lucide-react';

interface PointsTableProps {
  model: CadastralModel;
  onUpdateModel: (updates: Partial<CadastralModel>) => void;
  selectedPointId: string | null;
  onSelectPoint: (id: string | null) => void;
}

export default function PointsTable({
  model,
  onUpdateModel,
  selectedPointId,
  onSelectPoint
}: PointsTableProps) {
  const [isCatalogOpen, setIsCatalogOpen] = React.useState(true);
  const [isGeodesicOpen, setIsGeodesicOpen] = React.useState(true);
  const [isNeighborsOpen, setIsNeighborsOpen] = React.useState(true);
  const [isExplicationOpen, setIsExplicationOpen] = React.useState(true);

  const explication = model.landUseExplication || [];

  const handleAddExplication = () => {
    const newItem = {
      id: `lu_${Date.now()}`,
      code: '001.01',
      name: 'Нове угіддя',
      area: 0
    };
    onUpdateModel({
      landUseExplication: [...explication, newItem]
    });
  };

  const handleDeleteExplication = (id: string) => {
    const updated = explication.filter(item => item.id !== id);
    onUpdateModel({
      landUseExplication: updated
    });
  };

  const handleExplicationChange = (id: string, field: 'code' | 'name' | 'area', value: any) => {
    const updated = explication.map(item => {
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
      landUseExplication: updated
    });
  };

  // Update a single coordinate point's X value
  const handleXChange = (id: string, value: string) => {
    const numeric = parseFloat(value);
    if (isNaN(numeric)) return;
    
    const updated = model.points.map(p => {
      if (p.id === id) {
        return { ...p, x: numeric };
      }
      return p;
    });
    onUpdateModel({ points: updated });
  };

  // Update a single coordinate point's Y value
  const handleYChange = (id: string, value: string) => {
    const numeric = parseFloat(value);
    if (isNaN(numeric)) return;

    const updated = model.points.map(p => {
      if (p.id === id) {
        return { ...p, y: numeric };
      }
      return p;
    });
    onUpdateModel({ points: updated });
  };

  // Delete a boundary point
  const handleDeletePoint = (id: string) => {
    if (model.points.length <= 3) {
      alert('Земельна ділянка повинна мати щонайменше 3 поворотні точки.');
      return;
    }
    const updated = model.points.filter(p => p.id !== id);
    // Cleanup selection
    if (selectedPointId === id) {
      onSelectPoint(null);
    }
    onUpdateModel({ points: updated });
  };

  // Add a new boundary point close to the last one
  const handleAddPoint = () => {
    const lastPt = model.points[model.points.length - 1];
    const firstPt = model.points[0];
    
    // Position it roughly in between or offsetted slightly 
    const newPt: Point = {
      id: `pt_${Date.now()}`,
      x: lastPt ? lastPt.x + 15 : 5612200,
      y: lastPt ? lastPt.y + 15 : 3248400
    };
    
    onUpdateModel({
      points: [...model.points, newPt]
    });
    onSelectPoint(newPt.id);
  };

  // Update adjacent boundaries descriptions
  const handleAdjacentChange = (id: string, description: string) => {
    const updated = model.adjacentBoundaries.map(adj => {
      if (adj.id === id) {
        return { ...adj, description };
      }
      return adj;
    });
    onUpdateModel({ adjacentBoundaries: updated });
  };

  // Auto generation / sync of adjacent boundaries to match current points list length
  // e.g. from Point 1 to Point 2, Point 2 to Point 3...
  React.useEffect(() => {
    const totalPoints = model.points.length;
    if (totalPoints < 2) return;

    const neededLength = totalPoints;
    const currentAdjacents = [...model.adjacentBoundaries];

    let changed = false;
    const syncedAdjacents: AdjacentBoundary[] = [];

    for (let i = 0; i < neededLength; i++) {
      const fromLabel = (i + 1).toString();
      const toLabel = (((i + 1) % totalPoints) === 0 ? totalPoints : (i + 1) % totalPoints).toString();
      const nextLabel = (i === totalPoints - 1) ? "1" : (i + 2).toString();

      // Find if we have an existing matches
      const existing = currentAdjacents[i];
      if (existing) {
        // Just verify/update labels
        syncedAdjacents.push({
          ...existing,
          fromPoint: fromLabel,
          toPoint: nextLabel
        });
      } else {
        changed = true;
        syncedAdjacents.push({
          id: `adj_auto_${i}_${Date.now()}`,
          fromPoint: fromLabel,
          toPoint: nextLabel,
          description: `від ${fromLabel} до ${nextLabel} — Суміжні землі`
        });
      }
    }

    if (currentAdjacents.length !== neededLength) {
      changed = true;
    }

    if (changed) {
      onUpdateModel({ adjacentBoundaries: syncedAdjacents });
    }
  }, [model.points.length]);

  // Derived calculations
  const totalAreaSqM = calculatePolygonArea(model.points);
  const totalAreaHectares = totalAreaSqM / 10000;
  const totalPerimeter = calculatePolygonPerimeter(model.points);

  return (
    <div className="space-y-6">
      {/* Geodetic Area and Perimeter Report Card */}
      <div className="grid grid-cols-2 gap-4 bg-slate-900 border border-slate-800 text-white p-4 rounded-xl shadow-xs" id="summary_geo_card">
        <div>
          <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">Площа ділянки (S):</span>
          <span className="text-xl font-extrabold font-mono text-blue-400" id="val_hectares">{totalAreaHectares.toFixed(4)} га</span>
          <span className="text-[11px] text-slate-300 block font-mono">({Math.round(totalAreaSqM * 10) / 10} кв. м)</span>
        </div>
        <div>
          <span className="text-[10px] text-blue-450 font-bold uppercase tracking-wider block">Периметр (P):</span>
          <span className="text-xl font-extrabold font-mono text-slate-100" id="val_perimeter">{totalPerimeter.toFixed(2)} м</span>
          <span className="text-[11px] text-slate-400 block font-mono">({model.points.length} поворотні точки)</span>
        </div>
      </div>

      {/* Catalog of Coordinates */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="catalog_coordinates_section">
        <div 
          onClick={() => setIsCatalogOpen(!isCatalogOpen)}
          className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100 hover:bg-slate-100/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-1.5 select-none">
            <Compass className="h-4.5 w-4.5 text-blue-600" />
            <span className="text-sm font-bold text-slate-800">Каталог координат меж ділянки</span>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              id="add_new_coordinate_btn"
              onClick={handleAddPoint}
              className="flex items-center gap-1 bg-white hover:bg-blue-50 text-blue-700 border border-slate-205 px-2 py-0.5 text-[10px] rounded-md font-semibold transition-all shadow-3xs"
            >
              <Plus className="h-3.5 w-3.5" /> Додати
            </button>
            <button 
              onClick={() => setIsCatalogOpen(!isCatalogOpen)}
              className="p-0.5 text-slate-400 hover:text-slate-600"
            >
              {isCatalogOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {isCatalogOpen && (
          <div className="p-4 space-y-3 animate-fade-in">
            {/* Scrollable table container */}
            <div className="overflow-x-auto border border-slate-205 rounded-lg">
              <table className="w-full text-left border-collapse" id="coords_list_table">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-205 font-mono">
                    <th className="py-2.5 px-3 font-semibold text-center w-8">№</th>
                    <th className="py-2.5 px-3 font-semibold">Північ - X (м)</th>
                    <th className="py-2.5 px-3 font-semibold">Схід - Y (м)</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Дія</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {model.points.map((p, index) => {
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
                            onChange={(e) => handleXChange(p.id, e.target.value)}
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
                            onChange={(e) => handleYChange(p.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-2 py-1 bg-white border border-slate-200 hover:border-slate-350 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none rounded font-mono text-xs text-slate-800"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <button
                            id={`del_pt_btn_${p.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePoint(p.id);
                            }}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-55 rounded transition-colors"
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

      {/* Boundary Geodesics Analysis table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="geodesic_table_section">
        <div 
          onClick={() => setIsGeodesicOpen(!isGeodesicOpen)}
          className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100 hover:bg-slate-100/50 transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center gap-1.5">
            <Compass className="h-4.5 w-4.5 text-blue-600" />
            <span className="text-sm font-bold text-slate-800">Геодезична таблиця меж (Рубми)</span>
          </div>
          <div>
            {isGeodesicOpen ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
          </div>
        </div>

        {isGeodesicOpen && (
          <div className="p-4 animate-fade-in">
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse" id="bounds_analysis_table">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[9px] uppercase tracking-wider border-b border-slate-200 font-mono">
                    <th className="py-2.5 px-3 font-semibold">Межа (Від-До)</th>
                    <th className="py-2.5 px-3 font-semibold">Відстань S (м)</th>
                    <th className="py-2.5 px-3 font-semibold">Дирекційний Кут (α)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-mono text-slate-700">
                  {model.points.map((p, index) => {
                    const next = model.points[(index + 1) % model.points.length];
                    const fromLabel = (index + 1);
                    const nextLabel = (index === model.points.length - 1) ? 1 : (index + 2);
                    
                    const dist = calculateDistance(p, next);
                    const dirAngle = calculateDirectionalAngle(p, next);

                    return (
                      <tr key={`geodesic_tr_${index}`} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {fromLabel} — {nextLabel}
                        </td>
                        <td className="py-2.5 px-3 text-blue-700 font-bold">
                          {dist.toFixed(2)} м
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {formatToDMS(dirAngle)}
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

      {/* Land Use Explication (Експлікація угідь) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="land_use_explication_section">
        <div 
          onClick={() => setIsExplicationOpen(!isExplicationOpen)}
          className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100 hover:bg-slate-100/50 transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center gap-1.5">
            <CheckSquare className="h-4.5 w-4.5 text-blue-600" />
            <span className="text-sm font-bold text-slate-800">Експлікація земельних угідь</span>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              id="add_new_explication_btn"
              onClick={handleAddExplication}
              className="flex items-center gap-1 bg-white hover:bg-blue-50 text-blue-700 border border-slate-205 px-2 py-0.5 text-[10px] rounded-md font-semibold transition-all shadow-3xs animate-fade-in"
            >
              <Plus className="h-3.5 w-3.5" /> Додати
            </button>
            <button 
              onClick={() => setIsExplicationOpen(!isExplicationOpen)}
              className="p-0.5 text-slate-400 hover:text-slate-600"
            >
              {isExplicationOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {isExplicationOpen && (
          <div className="p-4 space-y-3 animate-fade-in">
            <p className="text-[11px] text-slate-500">
              Розподіл загальної площі земельної ділянки за видами угідь (згідно з КВЗУ).
            </p>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse" id="explication_list_table">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[9px] uppercase tracking-wider border-b border-slate-200 font-mono">
                    <th className="py-2 px-3 font-semibold w-16">Код</th>
                    <th className="py-2 px-3 font-semibold">Назва угіддя</th>
                    <th className="py-2 px-3 font-semibold w-20">Площа (м²)</th>
                    <th className="py-2 px-3 font-semibold w-8 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {explication.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={item.code}
                          placeholder="007.01"
                          onChange={(e) => handleExplicationChange(item.id, 'code', e.target.value)}
                          className="w-full px-1.5 py-1 bg-white border border-slate-200 rounded font-mono text-xs text-slate-800 text-center focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={item.name}
                          placeholder="під забудовою"
                          onChange={(e) => handleExplicationChange(item.id, 'name', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          step="0.1"
                          value={item.area}
                          onChange={(e) => handleExplicationChange(item.id, 'area', e.target.value)}
                          className="w-full px-1.5 py-1 bg-white border border-slate-200 rounded font-mono text-xs text-slate-800 text-right focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <button
                          onClick={() => handleDeleteExplication(item.id)}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                          title="Видалити рядок експлікації"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
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

            {/* Area balancing validation display */}
            {(() => {
              const sumExplicationArea = explication.reduce((acc, curr) => acc + curr.area, 0);
              const explicationDiff = Math.round((totalAreaSqM - sumExplicationArea) * 10) / 10;
              const isAreaMatching = Math.abs(explicationDiff) < 0.1;

              return (
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
                      <span className={`font-semibold flex items-center gap-1 ${explicationDiff > 0 ? 'text-amber-700' : 'text-rose-750'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full inline-block ${explicationDiff > 0 ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'}`}></span>
                        {explicationDiff > 0 
                          ? `Не розподілено: +${explicationDiff.toFixed(1)} м²` 
                          : `Перевищення: ${explicationDiff.toFixed(1)} м²`
                        }
                      </span>
                    )}
                    
                    {!isAreaMatching && explication.length > 0 && (
                      <button 
                        onClick={() => {
                          const lastItem = explication[explication.length - 1];
                          const newArea = Math.max(0, Math.round((lastItem.area + explicationDiff) * 10) / 10);
                          handleExplicationChange(lastItem.id, 'area', newArea.toString());
                        }}
                        className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border rounded font-medium text-[9px] shadow-3xs cursor-pointer active:scale-95 transition-all"
                        title="Підігнати площу останнього угіддя під загальну площу ділянки"
                      >
                        Збалансувати
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Landowners Boundaries descriptions section (Суміжники) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="neighbors_boundaries_section">
        <div 
          onClick={() => setIsNeighborsOpen(!isNeighborsOpen)}
          className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100 hover:bg-slate-100/50 transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center gap-1.5">
            <CheckSquare className="h-4.5 w-4.5 text-blue-600" />
            <span className="text-sm font-bold text-slate-800">Опис меж суміжних землекористувачів</span>
          </div>
          <div>
            {isNeighborsOpen ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
          </div>
        </div>

        {isNeighborsOpen && (
          <div className="p-4 space-y-3 animate-fade-in">
            <p className="text-[11px] text-slate-505">
              Ці відомості будуть внесені до сертифікованого кадастрового плану та специфікації погодження меж.
            </p>

            <div className="space-y-3.5">
              {model.adjacentBoundaries.map((adj) => (
                <div key={adj.id} className="space-y-1 block" id={`form_block_adj_${adj.id}`}>
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                    <span>Межа {adj.fromPoint} — {adj.toPoint}</span>
                  </div>
                  <textarea
                    id={`input_adj_${adj.id}`}
                    rows={2}
                    value={adj.description}
                    onChange={(e) => handleAdjacentChange(adj.id, e.target.value)}
                    placeholder={`Хто суміжник на межі від точки ${adj.fromPoint} до ${adj.toPoint}...`}
                    className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-205 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none focus:bg-white rounded-md text-slate-800 transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
