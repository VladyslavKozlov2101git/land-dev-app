import React from 'react';
import { Upload } from 'lucide-react';

interface DragDropZoneProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  dragActive: boolean;
  onDrag: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function DragDropZone({
  fileInputRef,
  dragActive,
  onDrag,
  onDrop,
  onFileChange,
}: DragDropZoneProps) {
  return (
    <div
      id="geojson_drop_zone"
      onDragEnter={onDrag}
      onDragOver={onDrag}
      onDragLeave={onDrag}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${dragActive ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 hover:border-slate-350 bg-slate-50/40'}`}
    >
      <input
        id="geojson_file_input"
        ref={fileInputRef}
        type="file"
        accept=".geojson,.json"
        onChange={onFileChange}
        className="hidden"
      />
      <Upload className="h-7 w-7 text-slate-400 mx-auto mb-2" />
      <span className="text-xs font-semibold text-slate-700 block">
        Перетягніть GeoJSON файл сюди або клікніть
      </span>
      <span className="text-[10px] text-slate-550 block mt-1">
        Підтримуються файли полігонів .geojson або .json (WGS-84)
      </span>
    </div>
  );
}
