import React from 'react';
import { CadastralModel } from '../../types';

interface OwnerDetailsTabProps {
  model: CadastralModel;
  onUpdateModel: (updates: Partial<CadastralModel>) => void;
}

export default function OwnerDetailsTab({ model, onUpdateModel }: OwnerDetailsTabProps) {
  return (
    <div className="space-y-4 font-sans animate-fade-in" id="form_tab_owner">
      <h3 className="font-extrabold text-sm text-slate-800 border-b pb-1">Відомості про власника</h3>

      <div className="space-y-1 block">
        <label className="font-bold text-slate-600" htmlFor="meta_owner_name">Власник / Користувач (ПІБ або повна назва юр. особи)</label>
        <input
          id="meta_owner_name"
          type="text"
          value={model.ownerName}
          onChange={(e) => onUpdateModel({ ownerName: e.target.value })}
          placeholder="Іваненко Петро Олексійович"
          className="w-full px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-250 focus:border-blue-550 focus:ring-2 focus:ring-blue-100/50 focus:outline-none rounded-md text-slate-800"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1 block">
          <label className="font-bold text-slate-600" htmlFor="meta_owner_code">ІПН / Код ЄДРПОУ власника</label>
          <input
            id="meta_owner_code"
            type="text"
            value={model.ownerCode}
            onChange={(e) => onUpdateModel({ ownerCode: e.target.value })}
            placeholder="2948194032"
            maxLength={10}
            className="w-full font-mono px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-250 focus:border-blue-550 focus:ring-2 focus:ring-blue-100/50 focus:outline-none rounded-md text-slate-800"
          />
        </div>

        <div className="space-y-1 block">
          <label className="font-bold text-slate-600" htmlFor="meta_owner_share">Розмір частки власності</label>
          <input
            id="meta_owner_share"
            type="text"
            value={model.ownerShare}
            onChange={(e) => onUpdateModel({ ownerShare: e.target.value })}
            placeholder="1/1"
            className="w-full text-center font-mono px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-250 focus:border-blue-550 focus:ring-2 focus:ring-blue-100/50 focus:outline-none rounded-md text-slate-800"
          />
        </div>
      </div>

      <div className="space-y-1 block">
        <label className="font-bold text-slate-600" htmlFor="meta_owner_doc">Документ правонабуття земельної ділянки</label>
        <textarea
          id="meta_owner_doc"
          rows={3}
          value={model.ownerDocument}
          onChange={(e) => onUpdateModel({ ownerDocument: e.target.value })}
          placeholder="Рішення сесії, Свідоцтво з реєстру, Спадковий договір №..."
          className="w-full px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-250 focus:border-blue-550 focus:ring-2 focus:ring-blue-100/50 focus:outline-none rounded-md text-slate-800 text-xs"
        />
      </div>
    </div>
  );
}
