import React from 'react';
import { CadastralModel } from '../../types';

interface DrrpDetailsTabProps {
  model: CadastralModel;
  onUpdateModel: (updates: Partial<CadastralModel>) => void;
}

export default function DrrpDetailsTab({ model, onUpdateModel }: DrrpDetailsTabProps) {
  return (
    <div className="space-y-4 font-sans animate-fade-in" id="form_tab_drrp">
      <div className="flex items-center justify-between border-b pb-1.5">
        <h3 className="font-extrabold text-sm text-slate-800">Державний реєстр речових прав (ДРРП)</h3>
        <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-semibold animate-pulse">
          Відповідність ДЗК / ДРРП
        </span>
      </div>
      <p className="text-[10.5px] text-slate-505">
        Дані з Реєстру речових прав на нерухоме майно, необхідні для формування повного витягу під ключ та погодження меж.
      </p>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1 block">
          <label className="font-bold text-slate-600" htmlFor="drrp_reg_num">Реєстраційний номер об'єкта</label>
          <input
            id="drrp_reg_num"
            type="text"
            value={model.drrpRegNumber}
            onChange={(e) => onUpdateModel({ drrpRegNumber: e.target.value })}
            placeholder="2647382910321"
            className="w-full font-mono px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-250 focus:border-blue-555 focus:ring-2 focus:ring-blue-100/50 focus:outline-none rounded-md text-slate-800"
          />
        </div>

        <div className="space-y-1 block">
          <label className="font-bold text-slate-600" htmlFor="drrp_right_num">Номер запису про право власності</label>
          <input
            id="drrp_right_num"
            type="text"
            value={model.drrpRightNumber}
            onChange={(e) => onUpdateModel({ drrpRightNumber: e.target.value })}
            placeholder="48029314"
            className="w-full font-mono px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-250 focus:border-blue-555 focus:ring-2 focus:ring-blue-100/50 focus:outline-none rounded-md text-slate-800"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1 block">
          <label className="font-bold text-slate-600" htmlFor="drrp_dec_num">Номер рішення реєстратора</label>
          <input
            id="drrp_dec_num"
            type="text"
            value={model.drrpDecisionNumber}
            onChange={(e) => onUpdateModel({ drrpDecisionNumber: e.target.value })}
            placeholder="68502941"
            className="w-full font-mono px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-250 focus:border-blue-555 focus:ring-2 focus:ring-blue-100/50 focus:outline-none rounded-md text-slate-800"
          />
        </div>

        <div className="space-y-1 block">
          <label className="font-bold text-slate-600" htmlFor="drrp_dec_date">Дата рішення</label>
          <input
            id="drrp_dec_date"
            type="date"
            value={model.drrpDecisionDate}
            onChange={(e) => onUpdateModel({ drrpDecisionDate: e.target.value })}
            className="w-full font-mono px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-250 focus:border-blue-555 focus:ring-2 focus:ring-blue-100/50 focus:outline-none rounded-md text-slate-800"
          />
        </div>
      </div>

      <div className="space-y-1 block">
        <label className="font-bold text-slate-600" htmlFor="drrp_registrar">Державний реєстратор (чи нотаріус)</label>
        <input
          id="drrp_registrar"
          type="text"
          value={model.drrpRegistrar}
          onChange={(e) => onUpdateModel({ drrpRegistrar: e.target.value })}
          placeholder="ПІБ нотаріуса чи державного реєстратора речових прав..."
          className="w-full px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-250 focus:border-blue-555 focus:ring-2 focus:ring-blue-100/50 focus:outline-none rounded-md text-slate-800"
        />
      </div>

      <div className="space-y-1 block">
        <label className="font-bold text-slate-600 flex items-center gap-1.5" htmlFor="drrp_enc">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-ping"></span>
          Зареєстровані обтяження / іпотеки / судові заборони
        </label>
        <input
          id="drrp_enc"
          type="text"
          value={model.drrpEncumbrances}
          onChange={(e) => onUpdateModel({ drrpEncumbrances: e.target.value })}
          placeholder="Заборони відчуження, арешт... або сформулювати — Відсутні"
          className="w-full px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-red-500 focus:outline-none rounded-md text-red-900 border-red-200"
        />
      </div>
    </div>
  );
}
