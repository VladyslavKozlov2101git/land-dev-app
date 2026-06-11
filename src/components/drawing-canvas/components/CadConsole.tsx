import React, { useState, useRef } from 'react';
import { Point, DrawMode } from '../../../types';

interface CadConsoleProps {
  mode: DrawMode;
  tempPoints: Point[];
  setTempPoints: React.Dispatch<React.SetStateAction<Point[]>>;
  hoverGeodetic: { x: number; y: number } | null;
}

export default function CadConsole({
  mode,
  tempPoints,
  setTempPoints,
  hoverGeodetic,
}: CadConsoleProps) {
  const [cadInput, setCadInput] = useState('');
  const cadInputRef = useRef<HTMLInputElement>(null);

  const isDrawing = mode === 'ADD_BUILDING' || mode === 'ADD_RESTRICTION' || mode === 'ADD_LAND_USE';

  if (!isDrawing || tempPoints.length === 0) return null;

  const handleCadInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempPoints.length === 0) return;

    const lastPt = tempPoints[tempPoints.length - 1];
    const val = cadInput.trim();
    if (!val) return;

    let nextX = lastPt.x;
    let nextY = lastPt.y;
    let valid = false;

    // Pattern 1: Relative offset like @dx,dy or @dx dy
    const relMatch = val.match(/^@\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/);
    // Pattern 2: Polar coordinate like dist<angle
    const polarMatch = val.match(/^(\d+(?:\.\d+)?)\s*<\s*(-?\d+(?:\.\d+)?)$/);
    // Pattern 3: Simple distance (along cursor direction)
    const distMatch = val.match(/^(\d+(?:\.\d+)?)$/);

    if (relMatch) {
      const dx = parseFloat(relMatch[1]);
      const dy = parseFloat(relMatch[2]);
      nextX = lastPt.x + dx;
      nextY = lastPt.y + dy;
      valid = true;
    } else if (polarMatch) {
      const dist = parseFloat(polarMatch[1]);
      const angleDeg = parseFloat(polarMatch[2]);
      const angleRad = angleDeg * (Math.PI / 180);
      nextX = lastPt.x + dist * Math.cos(angleRad);
      nextY = lastPt.y + dist * Math.sin(angleRad);
      valid = true;
    } else if (distMatch && hoverGeodetic) {
      const dist = parseFloat(distMatch[1]);
      const dx = hoverGeodetic.x - lastPt.x;
      const dy = hoverGeodetic.y - lastPt.y;
      const currentDist = Math.sqrt(dx * dx + dy * dy);
      if (currentDist > 0) {
        nextX = lastPt.x + (dx / currentDist) * dist;
        nextY = lastPt.y + (dy / currentDist) * dist;
        valid = true;
      }
    }

    if (valid) {
      const newPt: Point = {
        id: `temp_${Date.now()}_${tempPoints.length}`,
        x: Math.round(nextX * 1000) / 1000,
        y: Math.round(nextY * 1000) / 1000,
      };
      setTempPoints([...tempPoints, newPt]);
      setCadInput('');
      // Keep focus on input for continuous typing
      setTimeout(() => cadInputRef.current?.focus(), 50);
    } else {
      alert(
        'Невідомий формат CAD. Спробуйте:\n - "15" (відкласти 15м у напрямку курсору)\n - "15<90" (відкласти 15м під кутом 90°)\n - "@10,-5" (приріст X=+10м, Y=-5м)'
      );
    }
  };

  return (
    <div className="absolute bottom-4 left-4 z-[50] bg-slate-900/95 text-white p-2.5 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2 max-w-sm backdrop-blur-md animate-fade-in select-text">
      <form onSubmit={handleCadInputSubmit} className="flex items-center gap-1.5 w-full">
        <span className="text-[10px] font-mono text-blue-400 font-bold shrink-0">CAD &gt;</span>
        <input
          ref={cadInputRef}
          type="text"
          value={cadInput}
          onChange={(e) => setCadInput(e.target.value)}
          placeholder="Відстань (напр. 15), @dx,dy або dist<кути"
          className="bg-slate-950 text-white font-mono text-xs px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-blue-500 w-44"
          title="Введіть число для відстані, @X,Y для приросту, або Відстань<Кут"
        />
        <button
          type="submit"
          className="px-2 py-1 bg-blue-600 text-white font-bold text-[10px] rounded hover:bg-blue-700 active:scale-95 cursor-pointer"
        >
          Ввід
        </button>
      </form>
    </div>
  );
}
