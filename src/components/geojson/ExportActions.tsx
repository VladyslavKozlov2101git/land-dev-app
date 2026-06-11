import React from 'react';
import { FileJson, FileCode } from 'lucide-react';

interface ExportActionsProps {
  onExportGeoJSON: () => void;
  onExportXML: () => void;
}

export default function ExportActions({ onExportGeoJSON, onExportXML }: ExportActionsProps) {
  return (
    <div className="flex flex-col gap-3 pt-1">
      <button
        id="export_geojson_btn"
        onClick={onExportGeoJSON}
        className="flex items-center justify-center gap-1.5 p-2 bg-slate-800 hover:bg-slate-900 border border-slate-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer"
        title="Скачати геометрію та атрибути в GEOJSON">
        <FileJson className="h-4 w-4" />
        <span>Експорт GeoJSON</span>
      </button>

      <button
        id="export_xml_btn"
        onClick={onExportXML}
        className="flex items-center justify-center gap-1.5 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer"
        title="Завантажити обмінний файл XML для системи ДЗК">
        <FileCode className="h-4 w-4" />
        <span>Обмінний XML ГІС</span>
      </button>
    </div>
  );
}
