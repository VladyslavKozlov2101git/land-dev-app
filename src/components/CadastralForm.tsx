import React, { useState } from 'react';
import { CadastralModel } from '../types';
import { ShieldCheck, Briefcase, FileText, UserCheck, Settings, BookOpen } from 'lucide-react';

interface CadastralFormProps {
  model: CadastralModel;
  onUpdateModel: (updates: Partial<CadastralModel>) => void;
}

const PURPOSE_PRESETS = [
  { code: '02.01', name: 'Для будівництва і обслуговування житлового будинку, господарських будівель і споруд (присадибна ділянка)', category: 'Землі житлової та громадської забудови' },
  { code: '01.03', name: 'Для ведення особистого селянського господарства', category: 'Землі сільськогосподарського призначення' },
  { code: '01.01', name: 'Для ведення товарного сільськогосподарського виробництва', category: 'Землі сільськогосподарського призначення' },
  { code: '02.03', name: 'Для будівництва і обслуговування багатоквартирного житлового будинку', category: 'Землі житлової та громадської забудови' },
  { code: '03.07', name: 'Для будівництва та обслуговування будівель торгівлі', category: 'Землі громадської забудови' },
  { code: '12.04', name: 'Для розміщення та експлуатації будівель і споруд автомобільного транспорту та дорожнього господарства', category: 'Землі промисловості, транспорту, зв\'язку, енергетики, оборони та іншого призначення' },
];

export default function CadastralForm({ model, onUpdateModel }: CadastralFormProps) {
  const [activeTab, setActiveTab] = useState<'BASE' | 'OWNER' | 'DRRP' | 'SURVEYOR'>('BASE');

  const applyPurposePreset = (preset: typeof PURPOSE_PRESETS[0]) => {
    onUpdateModel({
      purposeCode: preset.code,
      purposeName: preset.name,
      category: preset.category
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden" id="cadastral_metadata_form_container">
      {/* Horizontal Tabs header */}
      <div className="flex border-b border-slate-200 bg-slate-50/70 overflow-x-auto text-xs font-medium text-slate-500">
        <button
          id="tab_base_btn"
          onClick={() => setActiveTab('BASE')}
          className={`flex items-center gap-1.5 py-3 px-4 outline-none border-b-2 transition-all shrink-0 ${activeTab === 'BASE' ? 'text-blue-600 bg-white border-blue-600 font-bold' : 'border-transparent hover:text-slate-800'}`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Ділянка
        </button>
        <button
          id="tab_owner_btn"
          onClick={() => setActiveTab('OWNER')}
          className={`flex items-center gap-1.5 py-3 px-4 outline-none border-b-2 transition-all shrink-0 ${activeTab === 'OWNER' ? 'text-blue-600 bg-white border-blue-600 font-bold' : 'border-transparent hover:text-slate-800'}`}
        >
          <UserCheck className="h-3.5 w-3.5" />
          Суб'єкт права
        </button>
        <button
          id="tab_drrp_btn"
          onClick={() => setActiveTab('DRRP')}
          className={`flex items-center gap-1.5 py-3 px-4 outline-none border-b-2 transition-all shrink-0 ${activeTab === 'DRRP' ? 'text-blue-600 bg-white border-blue-600 font-bold' : 'border-transparent hover:text-slate-800'}`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Відомості ДРРП
        </button>
        <button
          id="tab_surveyor_btn"
          onClick={() => setActiveTab('SURVEYOR')}
          className={`flex items-center gap-1.5 py-3 px-4 outline-none border-b-2 transition-all shrink-0 ${activeTab === 'SURVEYOR' ? 'text-blue-600 bg-white border-blue-600 font-bold' : 'border-transparent hover:text-slate-800'}`}
        >
          <Briefcase className="h-3.5 w-3.5" />
          Виконавець
        </button>
      </div>

      <div className="p-5 text-slate-700 text-xs text-left">
        {/* TAB 1: BASE PROPERTY DETAILS */}
        {activeTab === 'BASE' && (
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
        )}

        {/* TAB 2: OWNER/SUBJECT RIGHTS */}
        {activeTab === 'OWNER' && (
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
                <label className="font-bold text-slate-600" htmlFor="meta_owner_code">ІПН / Код ЄДРПОУ владельця</label>
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
        )}

        {/* TAB 3: STATE REGISTER OF REAL RIGHTS (ДРРП) */}
        {activeTab === 'DRRP' && (
          <div className="space-y-4 font-sans animate-fade-in" id="form_tab_drrp">
            <div className="flex items-center justify-between border-b pb-1.5">
              <h3 className="font-extrabold text-sm text-slate-800">Державний реєстр речових прав (ДРРП)</h3>
              <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-semibold animate-pulse">
                Відповідність ДЗК / ДРРП
              </span>
            </div>
            <p className="text-[10.5px] text-slate-500">
              Дані з Реєстру речових прав на нерухоме майно, необхідні для формування повного витягу під ключ та погодження меж.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 block">
                <label className="font-bold text-slate-600" htmlFor="drrp_reg_num">Реєстраційний номер об'єкта</label>
                <input
                  id="drrp_reg_num"
                  type="text"
                  value={model.drrpRegNumber}
                  onChange={(e) => onUpdateModel({ drrpRegNumber: e.target.value })}
                  placeholder="2647382910321"
                  className="w-full font-mono px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-250 focus:border-blue-550 focus:ring-2 focus:ring-blue-100/50 focus:outline-none rounded-md text-slate-800"
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
                  className="w-full font-mono px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-250 focus:border-blue-550 focus:ring-2 focus:ring-blue-100/50 focus:outline-none rounded-md text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 block">
                <label className="font-bold text-slate-600" htmlFor="drrp_dec_num">Номер рішення реєстратора</label>
                <input
                  id="drrp_dec_num"
                  type="text"
                  value={model.drrpDecisionNumber}
                  onChange={(e) => onUpdateModel({ drrpDecisionNumber: e.target.value })}
                  placeholder="68502941"
                  className="w-full font-mono px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-250 focus:border-blue-550 focus:ring-2 focus:ring-blue-100/50 focus:outline-none rounded-md text-slate-800"
                />
              </div>

              <div className="space-y-1 block">
                <label className="font-bold text-slate-600" htmlFor="drrp_dec_date">Дата рішення</label>
                <input
                  id="drrp_dec_date"
                  type="date"
                  value={model.drrpDecisionDate}
                  onChange={(e) => onUpdateModel({ drrpDecisionDate: e.target.value })}
                  className="w-full font-mono px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-250 focus:border-blue-550 focus:ring-2 focus:ring-blue-100/50 focus:outline-none rounded-md text-slate-800"
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
                className="w-full px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-250 focus:border-blue-550 focus:ring-2 focus:ring-blue-100/50 focus:outline-none rounded-md text-slate-800"
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
                className="w-full px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-250 focus:border-red-500 focus:outline-none rounded-md text-red-900 border-red-200"
              />
            </div>
          </div>
        )}

        {/* TAB 4: SURVEYOR DETAILS & CALIBRATION */}
        {activeTab === 'SURVEYOR' && (
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-3">
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
        )}
      </div>
    </div>
  );
}
