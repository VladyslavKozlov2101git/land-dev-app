import React, { useState } from 'react';
import { FileText, ChevronUp, ChevronDown } from 'lucide-react';

export default function RegulatoryHints() {
  const [isHintsVisible, setIsHintsVisible] = useState(true);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="hints_widget_block">
      <button
        onClick={() => setIsHintsVisible(!isHintsVisible)}
        className="w-full flex items-center justify-between p-3.5 bg-slate-50/70 border-b border-slate-100 hover:bg-slate-100/50 transition-colors cursor-pointer text-left"
        id="toggle_hints_block_btn"
      >
        <div className="flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-extrabold text-slate-700 tracking-wider uppercase">
            Довідкові Відомості КВЦПЗ
          </span>
        </div>
        <div>
          {isHintsVisible ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </button>
      {isHintsVisible && (
        <div className="p-4 bg-blue-50/30 text-blue-900 text-xs font-sans space-y-2 text-left animate-fade-in">
          <p className="leading-relaxed">
            Згідно Закону України про Державний земельний кадастр, кожен обмінний файл має відповідати <b>УСК-2000</b> (координатна система) та містити відомості про суміжних землекористувачів для проведення погодження меж.
          </p>
          <p className="leading-relaxed font-semibold">
            Усі зміни координат автоматично перелічуються у га, розраховуючи кути та відстані меж.
          </p>
        </div>
      )}
    </div>
  );
}
