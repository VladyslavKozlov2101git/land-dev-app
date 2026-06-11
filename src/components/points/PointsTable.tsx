import React from 'react';
import { Point, CadastralModel, AdjacentBoundary } from '../../types';
import { calculatePolygonArea, calculatePolygonPerimeter } from '../../utils/geo';
import SummaryGeoCard from './SummaryGeoCard';
import CoordinatesCatalog from './CoordinatesCatalog';
import GeodesicBoundsTable from './GeodesicBoundsTable';
import LandUseExplication from './LandUseExplication';
import AdjacentBoundaries from './AdjacentBoundaries';

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
  onSelectPoint,
}: PointsTableProps) {

  // Update X value
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

  // Update Y value
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
    if (selectedPointId === id) {
      onSelectPoint(null);
    }
    onUpdateModel({ points: updated });
  };

  // Add a new boundary point close to the last one
  const handleAddPoint = () => {
    const lastPt = model.points[model.points.length - 1];
    
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

  // Auto generation / sync of adjacent boundaries to match current points list length
  React.useEffect(() => {
    const totalPoints = model.points.length;
    if (totalPoints < 2) return;

    const neededLength = totalPoints;
    const currentAdjacents = [...model.adjacentBoundaries];

    let changed = false;
    const syncedAdjacents: AdjacentBoundary[] = [];

    for (let i = 0; i < neededLength; i++) {
      const fromLabel = (i + 1).toString();
      const nextLabel = (i === totalPoints - 1) ? "1" : (i + 2).toString();

      const existing = currentAdjacents[i];
      if (existing) {
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

  const totalAreaSqM = calculatePolygonArea(model.points);
  const totalAreaHectares = totalAreaSqM / 10000;
  const totalPerimeter = calculatePolygonPerimeter(model.points);

  return (
    <div className="space-y-6">
      <SummaryGeoCard
        totalAreaSqM={totalAreaSqM}
        totalAreaHectares={totalAreaHectares}
        totalPerimeter={totalPerimeter}
        pointsCount={model.points.length}
      />

      <CoordinatesCatalog
        points={model.points}
        selectedPointId={selectedPointId}
        onSelectPoint={onSelectPoint}
        onXChange={handleXChange}
        onYChange={handleYChange}
        onDeletePoint={handleDeletePoint}
        onAddPoint={handleAddPoint}
      />

      <GeodesicBoundsTable
        points={model.points}
      />

      <LandUseExplication
        model={model}
        onUpdateModel={onUpdateModel}
        totalAreaSqM={totalAreaSqM}
      />

      <AdjacentBoundaries
        model={model}
        onUpdateModel={onUpdateModel}
      />
    </div>
  );
}
