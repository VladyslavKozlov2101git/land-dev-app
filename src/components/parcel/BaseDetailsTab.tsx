import React from 'react';
import { CadastralModel } from '../../types';

interface BaseDetailsTabProps {
  model: CadastralModel;
  onUpdateModel: (updates: Partial<CadastralModel>) => void;
}

export const PURPOSE_PRESETS = [
  { code: '02.01', name: 'Для будівництва і обслуговування житлового будинку, господарських будівель і споруд (присадибна дінянка)', category: 'Землі житлової та громадської забудови' },
  { code: '01.03', name: 'Для ведення особистого селянського господарства', category: 'Землі сільськогосподарського призначення' },
  { code: '01.01', name: 'Для ведення товарного сільськогосподарського виробництва', category: 'Землі сільськогосподарського призначення' },
  { code: '02.03', name: 'Для будівництва і обслуговування багатоквартирного житлового будинку', category: 'Землі житлової та громадської забудови' },
  { code: '03.07', name: 'Для будівництва та обслуговування будівель торгівлі', category: 'Землі громадської забудови' },
  { code: '12.04', name: 'Для розміщення та експлуатації будівель і споруд автомобільного транспорту та дорожнього господарства', category: 'Землі промисловості, транспорту, зв\'язку, енергетики, оборони та іншого призначення' },
];

export default function BaseDetailsTab({ model, onUpdateModel }: BaseDetailsTabProps) {
  const applyPurposePreset = (preset: typeof PURPOSE_PRESETS[0]) => {
    onUpdateModel({
      purposeCode: preset.code,
      purposeName: preset.name,
      category: preset.category
    });
  };

  return (
    <div className="space-y-4 font-sans animate-fade-in" id="form_tab_base">
      <h3 className="font-extrabold text-sm text-slate-800 border-b pb-1">Параметри земельної ділянки</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1 block">
          <label className="font-bold text-slate-600" htmlFor="meta_cad_num">Кадастровий номер</label>
          <input
            id="meta_cad_num"
            type="text"
            value={model.cadastralNumber}
            onChange={(e) => onUpdateModel({ cadastralNumber: e.target.value })}
            placeholder="3220882600:02:003:0112"
            className="w-full font-mono px-3 py-1.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-250 focus:border-blue-550 focus:ring-2 focus:ring-blue-100/50 focus:outline-none rounded-md text-slate-800"
          />
        </div>

        <div className="space-y-1 block">
          <label className="font-bold text-slate-600" htmlFor="meta_own_form">Форма власності</label>
          <select
            id="meta_own_form"
            value={model.ownershipForm}
            onChange={(e) => onUpdateModel({ ownershipForm: e.target.value as any })}
            className="w-full px-3 py-1.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-250 focus:border-blue-550 focus:ring-2 focus:ring-blue-100/50 focus:outline-none rounded-md text-slate-800"
          >
            <option value="Приватна">Приватна</option>
            <option value="Державна">Державна</option>
            <option value="Комунальна">Комунальна</option>
            <option value="Сумісна">Спільна сумісна (часткова)</option>
          </select>
        </div>
      </div>

      <div className="space-y-1 block">
        <label className="font-bold text-slate-600" htmlFor="meta_address">Місцезнаходження (Адреса)</label>
        <input
          id="meta_address"
          type="text"
          value={model.address}
          onChange={(e) => onUpdateModel({ address: e.target.value })}
          placeholder="Область, Район, Місто/Село, Вулиця..."
          className="w-full px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-250 focus:border-blue-550 focus:ring-2 focus:ring-blue-100/50 focus:outline-none rounded-md text-slate-800"
        />
      </div>

      {/* Purpose preset selector quick links */}
      <div className="space-y-1.5 block">
        <span className="font-bold text-slate-500 text-[10px] uppercase block">Класифікатор цільового призначення:</span>
        <div className="flex flex-wrap gap-1.5">
          {PURPOSE_PRESETS.map((p, idx) => (
            <button
              id={`preset_purpose_${p.code}`}
              key={idx}
              type="button"
              onClick={() => applyPurposePreset(p)}
              className={`px-2 py-0.5 rounded border text-[10px] font-medium transition-colors ${model.purposeCode === p.code ? 'bg-blue-50 text-blue-800 border-blue-450 font-bold' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'}`}
            >
              Код {p.code}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1 block md:col-span-1">
          <label className="font-bold text-slate-600" htmlFor="meta_purpose_code">Код КВЦПЗ</label>
          <input
            id="meta_purpose_code"
            type="text"
            value={model.purposeCode}
            onChange={(e) => onUpdateModel({ purposeCode: e.target.value })}
            placeholder="02.01"
            className="w-full text-center font-mono px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-250 focus:border-blue-550 focus:ring-2 focus:ring-blue-100/50 focus:outline-none rounded-md text-slate-800"
          />
        </div>

        <div className="space-y-1 block md:col-span-2">
          <label className="font-bold text-slate-600" htmlFor="meta_category">Категорія земель</label>
          <input
            id="meta_category"
            type="text"
            value={model.category}
            onChange={(e) => onUpdateModel({ category: e.target.value })}
            placeholder="Землі житлової та громадської забудови"
            className="w-full px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-250 focus:border-blue-550 focus:ring-2 focus:ring-blue-100/50 focus:outline-none rounded-md text-slate-800"
          />
        </div>
      </div>

      <div className="space-y-1 block">
        <label className="font-bold text-slate-600" htmlFor="meta_purpose_name">Цільове призначення (згідно державного класифікатора)</label>
        <textarea
          id="meta_purpose_name"
          rows={2}
          value={model.purposeName}
          onChange={(e) => onUpdateModel({ purposeName: e.target.value })}
          className="w-full px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-250 focus:border-blue-550 focus:ring-2 focus:ring-blue-100/50 focus:outline-none rounded-md text-slate-800 text-xs"
        />
      </div>
    </div>
  );
}
