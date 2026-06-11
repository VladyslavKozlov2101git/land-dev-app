import React from 'react';
import { ArrowLeft, Printer } from 'lucide-react';

interface PrintActionBarProps {
  onClose: () => void;
  onTriggerPrint: () => void;
}

export default function PrintActionBar({
  onClose,
  onTriggerPrint,
}: PrintActionBarProps) {
  return (
    <div className="max-w-4xl w-full mx-auto bg-slate-800 text-white rounded-t-xl p-4 flex items-center justify-between border-b border-slate-700 print:hidden shrink-0">
      <button
        id="close_print_modal_btn"
        onClick={onClose}
        className="flex items-center gap-1 text-xs hover:text-slate-300 font-medium bg-slate-750 hover:bg-slate-700 p-2 rounded-lg transition-colors border border-slate-700 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" /> Назад до Реєстру
      </button>

      <span className="text-xs font-bold font-mono text-blue-400 uppercase tracking-widest bg-blue-900/30 px-3 py-1 rounded-md border border-blue-800/40">
        Друк Кадастрової Документації
      </span>

      <button
        id="start_print_doc_btn"
        onClick={onTriggerPrint}
        className="flex items-center gap-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white p-2 px-4 rounded-lg transition-all shadow-md focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        <Printer className="h-4.5 w-4.5" /> ДРУК В PDF / ПРИНТЕР
      </button>
    </div>
  );
}
