import React from 'react';
import { CadastralModel } from '../../types';
import { calculatePolygonArea } from '../../utils/geo';
import PrintActionBar from './PrintActionBar';
import CadastralPlanDoc from './CadastralPlanDoc';
import DrrpExtractDoc from './DrrpExtractDoc';
import BoundaryActDoc from './BoundaryActDoc';

interface CadastralPrintLayoutProps {
  model: CadastralModel;
  onClose: () => void;
}

export default function CadastralPrintLayout({ model, onClose }: CadastralPrintLayoutProps) {
  const handleTriggerPrint = () => {
    window.print();
  };

  const areaSqM = calculatePolygonArea(model.points);
  const areaHectares = areaSqM / 10000;

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-70 backdrop-blur-xs flex flex-col z-50 overflow-y-auto p-4 md:p-8" id="print_modal_overlay">
      <PrintActionBar
        onClose={onClose}
        onTriggerPrint={handleTriggerPrint}
      />

      <div
        className="max-w-4xl w-full mx-auto bg-white rounded-b-xl overflow-hidden shadow-2xl p-6 md:p-12 space-y-16 text-black print:mx-0 print:p-0 print:shadow-none print:rounded-none"
        id="cadastral_pages_scroll_area"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
      >
        <CadastralPlanDoc
          model={model}
          areaSqM={areaSqM}
          areaHectares={areaHectares}
        />

        <DrrpExtractDoc
          model={model}
          areaSqM={areaSqM}
          areaHectares={areaHectares}
        />

        <BoundaryActDoc
          model={model}
        />
      </div>
    </div>
  );
}
