import React, { useState, useEffect } from 'react';
import { Point, CadastralModel } from './types';
import { createSampleCadastralModel, calculatePolygonArea, calculatePolygonPerimeter } from './utils/geo';
import CadastralForm from './components/CadastralForm';
import DrawingCanvas from './components/DrawingCanvas';
import PointsTable from './components/PointsTable';
import GeoJSONImporter from './components/GeoJSONImporter';
import BuildingsRestrictionsEditor from './components/BuildingsRestrictionsEditor';
import CadastralPrintLayout from './components/CadastralPrintLayout';
import { Compass, FileText, Printer, CheckSquare, RefreshCcw, Layers, MapPin, BadgeCheck, BookOpen, ChevronUp, ChevronDown, Menu, Eye, EyeOff } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'cadastral_survey_model';

export default function App() {
  const [model, setModel] = useState<CadastralModel>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Помилка завантаження збереженої моделі з LocalStorage', e);
    }
    return createSampleCadastralModel();
  });

  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  // Layout Controls
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const [isLeftSidebarVisible, setIsLeftSidebarVisible] = useState(true);
  const [isRightSidebarVisible, setIsRightSidebarVisible] = useState(true);

  // Individual Block (Widget) Controls
  const [isChecklistVisible, setIsChecklistVisible] = useState(true);
  const [isFormVisible, setIsFormVisible] = useState(true);
  const [isHintsVisible, setIsHintsVisible] = useState(true);
  const [isImporterVisible, setIsImporterVisible] = useState(false); // Collapsed by default

  // Auto synchronize model state with LocalStorage for session survivability
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(model));
    } catch (e) {
      console.error('Помилка збереження моделі в LocalStorage', e);
    }
  }, [model]);

  // Partial update model state
  const handleUpdateModel = (updates: Partial<CadastralModel>) => {
    setModel(prev => ({
      ...prev,
      ...updates
    }));
  };

  // Hard Reset to sample template
  const handleResetToSample = () => {
    if (window.confirm('Ви впевнені, що бажаєте скинути всі поточні зміни та завантажити демо-приклад ділянки?')) {
      setModel(createSampleCadastralModel());
      setSelectedPointId(null);
    }
  };

  // Computed state details
  const areaSqM = calculatePolygonArea(model.points);
  const areaHectares = areaSqM / 10000;
  const perimeter = calculatePolygonPerimeter(model.points);

  // Checking lists for submittal validity
  const checks = [
    { label: 'Межові точки визначено', checked: model.points.length >= 3, detail: `${model.points.length} поворотних точок` },
    { label: 'Кадастровий номер заповнено', checked: model.cadastralNumber.trim().length > 6, detail: model.cadastralNumber },
    { label: 'Реквізити ДРРП внесено', checked: model.drrpRegNumber.trim().length > 3, detail: `№ ${model.drrpRegNumber || "немає"}` },
    { label: 'Суб\'єкт права вказано', checked: model.ownerName.trim().length > 3, detail: model.ownerName },
    { label: 'Суміжники погоджені', checked: model.adjacentBoundaries.every(adj => adj.description.length > 5), detail: `${model.adjacentBoundaries.length} су меж` }
  ];

  const totalCompletedChecks = checks.filter(c => c.checked).length;

  // Dynamic Grid Math
  const colSpanLeft = isLeftSidebarVisible ? 'col-span-1 lg:col-span-4' : 'hidden';
  const colSpanRight = isRightSidebarVisible ? 'col-span-1 lg:col-span-3' : 'hidden';
  
  let colSpanMid = 'col-span-1 lg:col-span-5';
  if (!isLeftSidebarVisible && !isRightSidebarVisible) {
    colSpanMid = 'col-span-1 lg:col-span-12';
  } else if (!isLeftSidebarVisible) {
    colSpanMid = 'col-span-1 lg:col-span-9';
  } else if (!isRightSidebarVisible) {
    colSpanMid = 'col-span-1 lg:col-span-8';
  }

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#f8fafc] text-slate-800 flex flex-col font-sans selection:bg-blue-100 relative">
      
      {/* Absolute floating controls when navbar or sidebars are hidden */}
      {!isNavbarVisible && (
        <div className="fixed top-3 left-3 z-[999] print:hidden">
          <button
            id="restore_navbar_float"
            onClick={() => setIsNavbarVisible(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/95 hover:bg-slate-900 text-white border border-slate-700 rounded-lg text-xs font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 animate-fade-in backdrop-blur-md"
            title="Розгорнути головне меню"
          >
            <Compass className="h-4 w-4 text-blue-400 animate-spin-slow" />
            <span>Показати Меню</span>
          </button>
        </div>
      )}

      {!isLeftSidebarVisible && (
        <button
          id="restore_left_sidebar_float"
          onClick={() => setIsLeftSidebarVisible(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-[40] bg-blue-600 hover:bg-blue-700 text-white font-extrabold p-1 px-1.5 rounded-r-lg shadow-lg flex flex-col items-center gap-1 select-none text-[9px] uppercase tracking-widest transition-all animate-fade-in py-3 cursor-pointer"
          title="Розгорнути лівий сайдбар"
        >
          <span>Л</span><span>І</span><span>В</span><span>А</span>
        </button>
      )}

      {!isRightSidebarVisible && (
        <button
          id="restore_right_sidebar_float"
          onClick={() => setIsRightSidebarVisible(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-[40] bg-blue-600 hover:bg-blue-700 text-white font-extrabold p-1 px-1.5 rounded-l-lg shadow-lg flex flex-col items-center gap-1 select-none text-[9px] uppercase tracking-widest transition-all animate-fade-in py-3 cursor-pointer"
          title="Розгорнути правий сайдбар"
        >
          <span>П</span><span>Р</span><span>А</span><span>В</span><span>А</span>
        </button>
      )}

      {/* 1. STATE LOGO / TOP HEAD BAR (Hides on toggle or printing) */}
      {isNavbarVisible && (
        <header className="border-b border-slate-200 bg-white shadow-xs px-6 py-2.5 print:hidden shrink-0 animate-fade-in" id="top_workspace_header">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-lg shadow-sm">
                <Compass className="h-4.5 w-4.5" />
              </div>
              <div className="text-left">
                <h1 className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5">
                  Кадастровий Помічник <span className="text-blue-600 uppercase text-[9px] bg-blue-50 px-1.5 py-0.5 rounded font-black tracking-wider border border-blue-100">PRO</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                  <BadgeCheck className="h-3.5 w-3.5 text-blue-600" />
                  <span>АРМ Інженера-Землевпорядника • УСК-2000</span>
                </p>
              </div>
            </div>

            {/* Layout Visibility Toggle Controls */}
            <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-lg border border-slate-150 gap-1.5 text-[11px] font-bold">
              <span className="text-slate-500 font-semibold px-2 text-[10px] uppercase font-mono">Відображення:</span>
              <button
                id="header_toggle_left_sidebar"
                onClick={() => setIsLeftSidebarVisible(!isLeftSidebarVisible)}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 active:scale-95 cursor-pointer ${isLeftSidebarVisible ? 'bg-white text-blue-700 shadow-3xs' : 'text-slate-450 hover:text-slate-700'}`}
              >
                {isLeftSidebarVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                Ліві форми
              </button>
              <button
                id="header_toggle_right_sidebar"
                onClick={() => setIsRightSidebarVisible(!isRightSidebarVisible)}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 active:scale-95 cursor-pointer ${isRightSidebarVisible ? 'bg-white text-blue-700 shadow-3xs' : 'text-slate-450 hover:text-slate-700'}`}
              >
                {isRightSidebarVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                Праві Координати
              </button>
              <button
                id="header_hide_navbar"
                onClick={() => setIsNavbarVisible(false)}
                className="px-2.5 py-1 rounded-md transition-all text-rose-600 hover:bg-rose-50 flex items-center gap-1 cursor-pointer"
                title="Сховати верхню навігаційну панель повністю"
              >
                <ChevronUp className="h-3.5 w-3.5" />
                Сховати Меню
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="reset_sample_state_btn"
                onClick={handleResetToSample}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-250 border border-slate-200 text-slate-750 font-bold hover:text-slate-900 rounded text-[11px] transition-all active:scale-95"
                title="Відновити демонстраційну ділянку"
              >
                <RefreshCcw className="h-3 w-3" />
                <span>Зразок</span>
              </button>

              <button
                id="open_print_preview_btn"
                onClick={() => setIsPrintOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-[11px] font-extrabold shadow-sm hover:bg-blue-700 transition-all active:scale-95"
                title="Друк кадастрового звіту"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Друк & Витяг</span>
              </button>
            </div>

          </div>
        </header>
      )}

      {/* 2. CORE WORKSPACE GRID */}
      <main className="flex-grow lg:min-h-0 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
        
        {/* ========================================== */}
        {/* COLUMN 1: PROPERTY METADATA & FORMS (Left) */}
        {/* ========================================== */}
        <section className={`${colSpanLeft} space-y-6 shrink-0 lg:h-full lg:overflow-y-auto pr-1`}>
          
          {/* Quick legal checklist panel with Block-level Toggle */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="quick_checklist_panel">
            <button
              onClick={() => setIsChecklistVisible(!isChecklistVisible)}
              className="w-full flex items-center justify-between p-3.5 bg-slate-50/70 border-b border-slate-100 hover:bg-slate-100/50 transition-colors cursor-pointer text-left"
              id="toggle_checklist_panel_btn"
            >
              <div className="flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Кадастрова перевірка
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-blue-800 bg-blue-100/50 px-1.5 py-0.2 rounded border border-blue-150">
                  {totalCompletedChecks}/{checks.length}
                </span>
                {isChecklistVisible ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </div>
            </button>
            
            {isChecklistVisible && (
              <div className="p-4 space-y-2 animate-fade-in">
                {checks.map((chk, i) => (
                  <div key={i} className="flex items-start justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-150">
                    <div className="flex items-start gap-1.5">
                      <input
                        type="checkbox"
                        checked={chk.checked}
                        readOnly
                        className="mt-0.5 w-3.5 h-3.5 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 inline-block pointer-events-none"
                      />
                      <div className="text-left leading-tight">
                        <span className="font-semibold text-slate-700 block">{chk.label}</span>
                        <span className="text-[10px] text-slate-450 block font-mono truncate max-w-[170px]" title={chk.detail}>
                          {chk.detail}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${chk.checked ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-500'}`}>
                      {chk.checked ? 'OK' : 'Нема'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Core parcel details form wrapper with Block-level Toggle */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="form_widget_block">
            <button
              onClick={() => setIsFormVisible(!isFormVisible)}
              className="w-full flex items-center justify-between p-3.5 bg-slate-50/70 border-b border-slate-100 hover:bg-slate-100/50 transition-colors cursor-pointer text-left"
              id="toggle_form_block_btn"
            >
              <div className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Реквізити ділянки та суб'єкта
                </span>
              </div>
              <div>
                {isFormVisible ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </div>
            </button>
            {isFormVisible && (
              <div className="animate-fade-in">
                <CadastralForm model={model} onUpdateModel={handleUpdateModel} />
              </div>
            )}
          </div>

          {/* Quick Regulatory Hints Alert box with Block-level Toggle */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="hints_widget_block">
            <button
              onClick={() => setIsHintsVisible(!isHintsVisible)}
              className="w-full flex items-center justify-between p-3.5 bg-slate-50/70 border-b border-slate-100 hover:bg-slate-100/50 transition-colors cursor-pointer text-left"
              id="toggle_hints_block_btn"
            >
              <div className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Довідкові Відомості КВЦПЗ
                </span>
              </div>
              <div>
                {isHintsVisible ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </div>
            </button>
            {isHintsVisible && (
              <div className="p-4 bg-blue-50/30 text-blue-900 text-xs font-sans space-y-2 text-left animate-fade-in">
                <p className="leading-relaxed">
                  Згідно Закону України про Державний земельний кадастр, кожен обмінний файл має відповідати <b>УСК-2000</b> (координатна система) та містити відомості про суміжних землекористувачів для проведення погодження меж.
                </p>
                <p className="leading-relaxed font-semibold">
                  Усі зміни координат автоматично перелічуються у га, розраховуючи кути та відстані меж.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ========================================== */}
        {/* COLUMN 2: CAD VISUAL EDITOR CANVAS (Middle) */}
        {/* ========================================== */}
        <section className={`${colSpanMid} flex flex-col h-[500px] lg:h-full min-h-0`}>
          <DrawingCanvas
            model={model}
            onUpdateModel={handleUpdateModel}
            selectedPointId={selectedPointId}
            onSelectPoint={setSelectedPointId}
          />
        </section>

        {/* ========================================== */}
        {/* COLUMN 3: POINTS LIST & IMPORTS (Right) */}
        {/* ========================================== */}
        <section className={`${colSpanRight} space-y-6 shrink-0 lg:h-full lg:overflow-y-auto pr-1`}>
          
          <PointsTable
            model={model}
            onUpdateModel={handleUpdateModel}
            selectedPointId={selectedPointId}
            onSelectPoint={setSelectedPointId}
          />

          <BuildingsRestrictionsEditor
            model={model}
            onUpdateModel={handleUpdateModel}
            selectedPointId={selectedPointId}
            onSelectPoint={setSelectedPointId}
          />

          {/* GeoJSON Importer/Exporter Collapsible Container */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="geojson_importer_widget_block">
            <button
              onClick={() => setIsImporterVisible(!isImporterVisible)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100 hover:bg-slate-100/50 transition-colors cursor-pointer text-left"
              id="toggle_importer_block_btn"
            >
              <div className="flex items-center gap-1.5">
                <Layers className="h-4.5 w-4.5 text-blue-600" />
                <span className="text-slate-800 font-bold text-xs uppercase tracking-wider">Імпорт & Експорт (GeoJSON)</span>
              </div>
              <div>
                {isImporterVisible ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
              </div>
            </button>
            {isImporterVisible && (
              <div className="p-4 bg-white animate-fade-in border-t border-slate-50">
                <GeoJSONImporter model={model} onUpdateModel={handleUpdateModel} />
              </div>
            )}
          </div>
        </section>

      </main>

      {/* 3. PRINT PREVIEW MODAL LIGHTBOX OVERLAY */}
      {isPrintOpen && (
        <CadastralPrintLayout
          model={model}
          onClose={() => setIsPrintOpen(false)}
        />
      )}

      {/* Bottom Status Bar from the Professional Polish theme */}
      <footer className="h-9 bg-white border-t border-slate-200 flex items-center justify-between px-6 text-[10px] font-medium text-slate-500 shrink-0 select-none print:hidden">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Підключено до Бази НКС України (ДЗК)
          </span>
          <span className="hidden sm:inline-block">
            Витрати: {model.buildings.length} буд. | {model.restrictions.length} обмеж. | {model.points.length} вершин меж
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold text-slate-700">М 1:{model.scale}</span>
          <span className="font-mono hidden md:inline-block">Кадастр №: {model.cadastralNumber || "не вказано"}</span>
        </div>
      </footer>
    </div>
  );
}
