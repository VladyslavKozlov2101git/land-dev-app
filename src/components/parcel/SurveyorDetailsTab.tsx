import React from 'react';
import { CadastralModel } from '../../types';

interface SurveyorDetailsTabProps {
  model: CadastralModel;
  onUpdateModel: (updates: Partial<CadastralModel>) => void;
}

export default function SurveyorDetailsTab({ model, onUpdateModel }: SurveyorDetailsTabProps) {
  return (
    <div className="space-y-4 font-sans animate-fade-in" id="form_tab_surveyor">
      <h3 className="font-extrabold text-sm text-slate-800 border-b pb-1">Розробник документації (Землеустрій)</h3>

      <div className="space-y-1 block">
        <label className="font-bold text-slate-600" htmlFor="sv_name">Сертифікований інженер-землевпорядник</label>
        <input
          id="sv_name"
          type="text"
          value={model.surveyorName}
          onChange={(e) => onUpdateModel({ surveyorName: e.target.value })}
          placeholder="ПІБ інженера"
          className="w-full px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-250 focus:border-blue-550 focus:ring-2 focus:ring-blue-100/50 focus:outline-none rounded-md text-slate-800"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1 block">
          <label className="font-bold text-slate-600" htmlFor="sv_cert">Номер та серія кваліфікаційного сертифіката</label>
          <input
            id="sv_cert"
            type="text"
            value={model.surveyorCertificate}
            onChange={(e) => onUpdateModel({ surveyorCertificate: e.target.value })}
            placeholder="№ 012485 від 18.06.2016"
            className="w-full font-mono px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-250 focus:border-blue-550 focus:ring-2 focus:ring-blue-100/50 focus:outline-none rounded-md text-slate-800"
          />
        </div>

        <div className="space-y-1 block">
          <label className="font-bold text-slate-600" htmlFor="sv_org">Землевпорядна організація</label>
          <input
            id="sv_org"
            type="text"
            value={model.surveyorOrganization}
            onChange={(e) => onUpdateModel({ surveyorOrganization: e.target.value })}
            placeholder="ТОВ чи ФОП організація..."
            className="w-full px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-250 focus:border-blue-550 focus:ring-2 focus:ring-blue-100/50 focus:outline-none rounded-md text-slate-800"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 border-t pt-3">
        <div className="space-y-1 block">
          <label className="font-bold text-slate-600" htmlFor="sv_system">Геодезична система</label>
          <select
            id="sv_system"
            value={model.coordinateSystem}
            onChange={(e) => onUpdateModel({ coordinateSystem: e.target.value as any })}
            className="w-full px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-250 focus:outline-none focus:ring-2 focus:ring-blue-100/50 rounded-md text-slate-800"
          >
            <option value="УСК-2000">УСК-2000</option>
            <option value="СК-63">СК-63 (Державна)</option>
            <option value="Місцева">Місцева СК</option>
          </select>
        </div>

        <div className="space-y-1 block">
          <label className="font-bold text-slate-600" htmlFor="sv_zone">Зона системи</label>
          <input
            id="sv_zone"
            type="text"
            value={model.zone}
            onChange={(e) => onUpdateModel({ zone: e.target.value })}
            placeholder="Зона 3 / Зона 2"
            className="w-full text-center font-mono px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-250 focus:outline-none rounded-md text-slate-800"
          />
        </div>

        <div className="space-y-1 block">
          <label className="font-bold text-slate-600" htmlFor="sv_scale">Масштаб плану (1:M)</label>
          <select
            id="sv_scale"
            value={model.scale}
            onChange={(e) => onUpdateModel({ scale: parseInt(e.target.value) })}
            className="w-full px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-250 focus:outline-none focus:ring-2 focus:ring-blue-100/50 rounded-md text-slate-800"
          >
            <option value="500">1:500 (Будівельний)</option>
            <option value="1000">1:1000 (Стандартний)</option>
            <option value="2000">1:2000 (Генплан)</option>
            <option value="5000">1:5000 (Сільрада)</option>
          </select>
        </div>
      </div>

      <div className="space-y-1 block">
        <label className="font-bold text-slate-600" htmlFor="sv_date">Дата проведення польових вишукувань</label>
        <input
          id="sv_date"
          type="date"
          value={model.surveyDate}
          onChange={(e) => onUpdateModel({ surveyDate: e.target.value })}
          className="w-full font-mono px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-250 focus:border-blue-550 focus:ring-2 focus:ring-blue-100/50 focus:outline-none rounded-md text-slate-800"
        />
      </div>
    </div>
  );
}
