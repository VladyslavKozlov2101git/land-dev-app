import React, { useState } from 'react';
import { CadastralModel } from '../../types';
import { CheckSquare, ChevronUp, ChevronDown } from 'lucide-react';

interface AdjacentBoundariesProps {
  model: CadastralModel;
  onUpdateModel: (updates: Partial<CadastralModel>) => void;
}

export default function AdjacentBoundaries({
  model,
  onUpdateModel,
}: AdjacentBoundariesProps) {
  const [isOpen, setIsOpen] = useState(true);

  const handleAdjacentChange = (id: string, description: string) => {
    const updated = model.adjacentBoundaries.map(adj => {
      if (adj.id === id) {
        return { ...adj, description };
      }
      return adj;
    });
    onUpdateModel({ adjacentBoundaries: updated });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="neighbors_boundaries_section">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100 hover:bg-slate-100/50 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-1.5">
          <CheckSquare className="h-4.5 w-4.5 text-blue-600" />
          <span className="text-sm font-bold text-slate-800">Опис меж суміжних землекористувачів</span>
        </div>
        <div>
          {isOpen ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
        </div>
      </div>

      {isOpen && (
        <div className="p-4 space-y-3 animate-fade-in">
          <p className="text-[11px] text-slate-505">
            Ці відомості будуть внесені до сертифікованого кадастрового плану та специфікації погодження меж.
          </p>

          <div className="space-y-3.5 text-left">
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
                  className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none focus:bg-white rounded-md text-slate-800 transition-colors"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
