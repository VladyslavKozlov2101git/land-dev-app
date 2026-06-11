import React, { useState } from 'react';
import { CadastralModel } from '../../types';
import { ShieldCheck, Briefcase, UserCheck, BookOpen } from 'lucide-react';
import BaseDetailsTab from './BaseDetailsTab';
import OwnerDetailsTab from './OwnerDetailsTab';
import DrrpDetailsTab from './DrrpDetailsTab';
import SurveyorDetailsTab from './SurveyorDetailsTab';

interface CadastralFormProps {
  model: CadastralModel;
  onUpdateModel: (updates: Partial<CadastralModel>) => void;
}

export default function CadastralForm({ model, onUpdateModel }: CadastralFormProps) {
  const [activeTab, setActiveTab] = useState<'BASE' | 'OWNER' | 'DRRP' | 'SURVEYOR'>('BASE');

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden" id="cadastral_metadata_form_container">
      {/* Horizontal Tabs header */}
      <div className="flex border-b border-slate-200 bg-slate-50/70 overflow-x-auto text-xs font-medium text-slate-550">
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
        {activeTab === 'BASE' && (
          <BaseDetailsTab model={model} onUpdateModel={onUpdateModel} />
        )}
        {activeTab === 'OWNER' && (
          <OwnerDetailsTab model={model} onUpdateModel={onUpdateModel} />
        )}
        {activeTab === 'DRRP' && (
          <DrrpDetailsTab model={model} onUpdateModel={onUpdateModel} />
        )}
        {activeTab === 'SURVEYOR' && (
          <SurveyorDetailsTab model={model} onUpdateModel={onUpdateModel} />
        )}
      </div>
    </div>
  );
}
