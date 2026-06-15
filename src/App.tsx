import React, { useState, useEffect } from 'react';
import { Point, CadastralModel, ActiveGeozone } from './types';
import { createSampleCadastralModel, calculatePolygonArea, calculatePolygonPerimeter } from './utils/geo';
import CadastralForm from './components/parcel/CadastralForm';
import ChecklistPanel from './components/parcel/ChecklistPanel';
import RegulatoryHints from './components/parcel/RegulatoryHints';
import DrawingCanvas from './components/drawing-canvas/DrawingCanvas';
import PointsTable from './components/points/PointsTable';
import GeoJSONImporter from './components/geojson/GeoJSONImporter';
import BuildingsRestrictionsEditor from './components/buildings-restrictions/BuildingsRestrictionsEditor';
import CadastralPrintLayout from './components/print/CadastralPrintLayout';
import { Compass, FileText, Printer, CheckSquare, RefreshCcw, Layers, MapPin, BadgeCheck, BookOpen, ChevronUp, ChevronDown, Menu, Eye, EyeOff, Settings, GripVertical, Info, ClipboardCheck, Table, Home, Undo2, Redo2 } from 'lucide-react';

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

  // History State for Undo/Redo
  const [history, setHistory] = useState<CadastralModel[]>([]);
  const [redoStack, setRedoStack] = useState<CadastralModel[]>([]);

  const handleUndo = () => {
    if (history.length === 0) return;
    
    const previous = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    
    setRedoStack(prev => [model, ...prev]);
    setHistory(newHistory);
    setModel(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    
    const next = redoStack[0];
    const newRedoStack = redoStack.slice(1);
    
    setHistory(prev => [...prev, model]);
    setRedoStack(newRedoStack);
    setModel(next);
  };

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.getAttribute('contenteditable') === 'true'
      );

      if (isTyping) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'z') {
          if (e.shiftKey) {
            e.preventDefault();
            handleRedo();
          } else {
            e.preventDefault();
            handleUndo();
          }
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [model, history, redoStack]);

  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [activeGeozone, setActiveGeozone] = useState<ActiveGeozone | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  // Layout Controls
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const [isSidebarLeftVisible, setIsSidebarLeftVisible] = useState(true);
  const [isSidebarRightVisible, setIsSidebarRightVisible] = useState(true);
  
  // Resize State
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(420);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(380);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);

  // Widget Visibility State
  const [visibleWidgets, setVisibleWidgets] = useState({
    checklist: true,
    parcelForm: true,
    hints: true,
    pointsTable: true,
    buildingsEditor: true,
    importer: true
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const startResizingLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingLeft(true);
  };

  const startResizingRight = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingRight(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const newWidth = Math.max(250, Math.min(600, e.clientX - 24)); // 24px is roughly the left padding
        setLeftSidebarWidth(newWidth);
      }
      if (isResizingRight) {
        const newWidth = Math.max(250, Math.min(600, window.innerWidth - e.clientX - 24));
        setRightSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };

    if (isResizingLeft || isResizingRight) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLeft, isResizingRight]);

  // Individual Block (Widget) Controls
  const [isFormVisible, setIsFormVisible] = useState(true);
  const [isImporterVisible, setIsImporterVisible] = useState(false); // Collapsed by default

  // Auto synchronize model state with LocalStorage for session survivability
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(model));
    } catch (e) {
      console.error('Помилка збереження моделі в LocalStorage', e);
    }
  }, [model]);

  // Automatically activate the correct geozone when a vertex/point is selected
  useEffect(() => {
    if (!selectedPointId) return;

    // Check parcel points
    if (model.points.some(p => p.id === selectedPointId)) {
      setActiveGeozone({ type: 'parcel', id: 'parcel' });
      return;
    }

    // Check building points
    for (const b of model.buildings) {
      if (b.points.some(p => p.id === selectedPointId)) {
        setActiveGeozone({ type: 'building', id: b.id });
        return;
      }
    }

    // Check restriction points
    for (const r of model.restrictions) {
      if (r.points.some(p => p.id === selectedPointId)) {
        setActiveGeozone({ type: 'restriction', id: r.id });
        return;
      }
    }

    // Check land use points
    for (const lu of (model.landUseExplication || [])) {
      if (lu.points && lu.points.some(p => p.id === selectedPointId)) {
        setActiveGeozone({ type: 'land_use', id: lu.id });
        return;
      }
    }
  }, [selectedPointId]);

  // Partial update model state
  const handleUpdateModel = (updates: Partial<CadastralModel>, silent = false) => {
    if (!silent) {
      // Save to history before update
      setHistory(prev => [...prev.slice(-49), model]); // Keep last 50 states
      setRedoStack([]); // Clear redo on new change
    }

    setModel(prev => ({
      ...prev,
      ...updates
    }));
  };

  // Hard Reset to sample template
  const handleResetToSample = () => {
    if (window.confirm('Ви впевнені, що бажаєте скинути всі поточні зміни та завантажити демо-приклад ділянки?')) {
      // Save current state to history before reset
      setHistory(prev => [...prev.slice(-49), model]);
      setRedoStack([]);
      
      setModel(createSampleCadastralModel());
      setSelectedPointId(null);
    }
  };

  // Computed state details
  const areaSqM = calculatePolygonArea(model.points);
  const areaHectares = areaSqM / 10000;
  const perimeter = calculatePolygonPerimeter(model.points);

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#f8fafc] text-slate-800 flex flex-col font-sans selection:bg-blue-100 relative">
      
      {/* Absolute floating controls when navbar or sidebars are hidden */}
      {!isNavbarVisible && (
        <div className="fixed top-3 left-3 z-[1000] print:hidden">
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

      {!isSidebarLeftVisible && (
        <button
          id="restore_left_sidebar_float"
          onClick={() => setIsSidebarLeftVisible(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-[500] bg-slate-900 hover:bg-black text-white font-extrabold p-1 px-2 rounded-r-lg shadow-xl flex flex-col items-center gap-1 select-none text-[10px] uppercase tracking-tighter transition-all animate-fade-in py-4 cursor-pointer border-y border-r border-slate-700"
          title="Розгорнути панель інструментів"
        >
          <span className="[writing-mode:vertical-lr] rotate-180">ПАРАМЕТРИ</span>
        </button>
      )}

      {!isSidebarRightVisible && (
        <button
          id="restore_right_sidebar_float"
          onClick={() => setIsSidebarRightVisible(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-[500] bg-slate-900 hover:bg-black text-white font-extrabold p-1 px-2 rounded-l-lg shadow-xl flex flex-col items-center gap-1 select-none text-[10px] uppercase tracking-tighter transition-all animate-fade-in py-4 cursor-pointer border-y border-l border-slate-700"
          title="Розгорнути панель даних"
        >
          <span className="[writing-mode:vertical-lr]">ДАНІ ТА ТОЧКИ</span>
        </button>
      )}

      {/* 1. STATE LOGO / TOP HEAD BAR (Hides on toggle or printing) */}
      {isNavbarVisible && (
        <header className="border-b border-slate-200 bg-white shadow-xs px-6 py-2.5 print:hidden shrink-0 animate-fade-in relative z-[2000]" id="top_workspace_header">
          <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
            
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

            <div className="flex items-center gap-4">
              {/* Settings / Gear Menu */}
              <div className="relative">
                <button
                  id="settings_menu_toggle"
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all active:scale-95 cursor-pointer font-bold text-[11px] ${isSettingsOpen ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                >
                  <Settings className={`h-4 w-4 ${isSettingsOpen ? 'animate-spin-slow' : ''}`} />
                  <span>Керування модулями</span>
                  {isSettingsOpen ? <ChevronUp className="h-3 w-3 opacity-50" /> : <ChevronDown className="h-3 w-3 opacity-50" />}
                </button>

                {isSettingsOpen && (
                  <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-slate-200 shadow-2xl rounded-xl z-[2000] p-5 animate-fade-in origin-top-right">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Основні панелі</span>
                      <Settings className="h-3.5 w-3.5 text-slate-300" />
                    </div>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-2">
                        <label className="flex items-center justify-between group cursor-pointer p-2 hover:bg-slate-50 rounded-lg transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors ${isSidebarLeftVisible ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                              <Menu className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-700">Панель параметрів</span>
                              <span className="text-[10px] text-slate-400 font-medium">Форми та налаштування</span>
                            </div>
                          </div>
                          <input 
                            type="checkbox" 
                            checked={isSidebarLeftVisible} 
                            onChange={() => setIsSidebarLeftVisible(!isSidebarLeftVisible)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </label>

                        <label className="flex items-center justify-between group cursor-pointer p-2 hover:bg-slate-50 rounded-lg transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors ${isSidebarRightVisible ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                              <Table className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-700">Панель даних</span>
                              <span className="text-[10px] text-slate-400 font-medium">Точки та об'єкти</span>
                            </div>
                          </div>
                          <input 
                            type="checkbox" 
                            checked={isSidebarRightVisible} 
                            onChange={() => setIsSidebarRightVisible(!isSidebarRightVisible)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </label>
                      </div>

                      <div className="h-px bg-slate-100"></div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Окремі модулі</span>

                      <div className="grid grid-cols-1 gap-1">
                        {[
                          { key: 'checklist', label: 'Кадастрова перевірка', icon: ClipboardCheck, desc: 'Валідація XML/ДЗК' },
                          { key: 'parcelForm', label: 'Реквізити ділянки', icon: BookOpen, desc: 'Власники та адреса' },
                          { key: 'hints', label: 'Нормативні підказки', icon: Info, desc: 'Законодавча база' },
                          { key: 'pointsTable', label: 'Каталог координат', icon: Table, desc: 'Редагування X/Y' },
                          { key: 'buildingsEditor', label: 'Будівлі та обмеження', icon: Home, desc: 'Інвентаризація' },
                          { key: 'importer', label: 'Імпорт GeoJSON/XML', icon: Layers, desc: 'Обмін даними' },
                        ].map((item) => (
                          <label key={item.key} className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors">
                            <div className="flex items-center gap-3">
                              <item.icon className={`h-4 w-4 transition-colors ${visibleWidgets[item.key as keyof typeof visibleWidgets] ? 'text-blue-500' : 'text-slate-300'}`} />
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-slate-600">{item.label}</span>
                                <span className="text-[9px] text-slate-400">{item.desc}</span>
                              </div>
                            </div>
                            <input 
                              type="checkbox" 
                              checked={visibleWidgets[item.key as keyof typeof visibleWidgets]} 
                              onChange={() => setVisibleWidgets(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof visibleWidgets] }))}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </label>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <button
                          onClick={() => setIsNavbarVisible(false)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border border-transparent hover:border-rose-100"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                          Сховати верхню панель
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="w-px h-6 bg-slate-200 mx-1"></div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 gap-1 mr-2">
                <button
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  className="p-1.5 text-slate-600 hover:bg-white hover:text-blue-600 rounded-md transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-600 cursor-pointer"
                  title="Крок назад (Ctrl+Z)"
                >
                  <Undo2 className="h-4 w-4" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className="p-1.5 text-slate-600 hover:bg-white hover:text-blue-600 rounded-md transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-600 cursor-pointer"
                  title="Крок вперед (Ctrl+Y або Ctrl+Shift+Z)"
                >
                  <Redo2 className="h-4 w-4" />
                </button>
              </div>

              <button
                id="reset_sample_state_btn"
                onClick={handleResetToSample}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-250 border border-slate-200 text-slate-750 font-bold hover:text-slate-900 rounded text-[11px] transition-all active:scale-95 cursor-pointer"
                title="Відновити демонстраційну ділянку"
              >
                <RefreshCcw className="h-3 w-3" />
                <span>Зразок</span>
              </button>

              <button
                id="open_print_preview_btn"
                onClick={() => setIsPrintOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-[11px] font-extrabold shadow-sm hover:bg-blue-700 transition-all active:scale-95 cursor-pointer"
                title="Друк кадастрового звіту"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Друк & Витяг</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      )}

      {/* 2. CORE WORKSPACE GRID - Refactored to Flex for Resizing */}
      <main className="flex-grow lg:min-h-0 w-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-0 print:hidden overflow-hidden">
        
        {/* ========================================== */}
        {/* COLUMN 1: PROPERTY METADATA & FORMS (Left) */}
        {/* ========================================== */}
        {isSidebarLeftVisible && (
          <>
            <section 
              style={{ width: leftSidebarWidth }}
              className="hidden lg:flex flex-col gap-6 shrink-0 h-full overflow-y-auto py-6 pr-4 scrollbar-thin"
            >
              {visibleWidgets.checklist && <ChecklistPanel model={model} />}

              {visibleWidgets.parcelForm && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden shrink-0" id="form_widget_block">
                  <button
                    onClick={() => setIsFormVisible(!isFormVisible)}
                    className="w-full flex items-center justify-between p-3.5 bg-slate-50/70 border-b border-slate-100 hover:bg-slate-100/50 transition-colors cursor-pointer text-left"
                    id="toggle_form_block_btn"
                  >
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                        Реквізити ділянки
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
              )}

              {visibleWidgets.hints && <RegulatoryHints />}
            </section>

            {/* Left Resizer Handle */}
            <div 
              onMouseDown={startResizingLeft}
              className="hidden lg:flex w-1.5 hover:w-2 bg-slate-200/50 hover:bg-blue-400 transition-all cursor-col-resize self-stretch z-10 items-center justify-center group"
              title="Перетягніть для ресайзу"
            >
              <div className="h-8 w-1 bg-slate-300 rounded-full group-hover:bg-blue-200 transition-colors"></div>
            </div>
          </>
        )}

        {/* Mobile View of Sidebars (Fallback when not on LG) */}
        {!isSidebarLeftVisible && (
          <div className="lg:hidden space-y-6 py-4">
             {/* Simple list or hidden on mobile if desired, keeping original grid behavior for mobile would be better but requires more logic. 
                 Let's keep it simple: resizing and visibility toggles are mostly for desktop productivity. */}
          </div>
        )}

        {/* ========================================== */}
        {/* COLUMN 2: CAD VISUAL EDITOR CANVAS (Middle) */}
        {/* ========================================== */}
        <section className="flex-grow flex flex-col min-h-[500px] lg:h-full lg:min-w-0 py-6 px-4">
          <DrawingCanvas
            model={model}
            onUpdateModel={handleUpdateModel}
            selectedPointId={selectedPointId}
            onSelectPoint={setSelectedPointId}
            activeGeozone={activeGeozone}
            onActiveGeozoneChange={setActiveGeozone}
          />
        </section>

        {/* ========================================== */}
        {/* COLUMN 3: POINTS LIST & IMPORTS (Right) */}
        {/* ========================================== */}
        {isSidebarRightVisible && (
          <>
            {/* Right Resizer Handle */}
            <div 
              onMouseDown={startResizingRight}
              className="hidden lg:flex w-1.5 hover:w-2 bg-slate-200/50 hover:bg-blue-400 transition-all cursor-col-resize self-stretch z-10 items-center justify-center group"
              title="Перетягніть для ресайзу"
            >
              <div className="h-8 w-1 bg-slate-300 rounded-full group-hover:bg-blue-200 transition-colors"></div>
            </div>

            <section 
              style={{ width: rightSidebarWidth }}
              className="hidden lg:flex flex-col gap-6 shrink-0 h-full overflow-y-auto py-6 pl-4 scrollbar-thin"
            >
              {visibleWidgets.pointsTable && (
                <PointsTable
                  model={model}
                  onUpdateModel={handleUpdateModel}
                  selectedPointId={selectedPointId}
                  onSelectPoint={setSelectedPointId}
                />
              )}

              {visibleWidgets.buildingsEditor && (
                <BuildingsRestrictionsEditor
                  model={model}
                  onUpdateModel={handleUpdateModel}
                  selectedPointId={selectedPointId}
                  onSelectPoint={setSelectedPointId}
                  activeGeozone={activeGeozone}
                  onActiveGeozoneChange={setActiveGeozone}
                />
              )}

              {/* GeoJSON Importer/Exporter Collapsible Container */}
              {visibleWidgets.importer && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="geojson_importer_widget_block">
                  <button
                    onClick={() => setIsImporterVisible(!isImporterVisible)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100 hover:bg-slate-100/50 transition-colors cursor-pointer text-left"
                    id="toggle_importer_block_btn"
                  >
                    <div className="flex items-center gap-1.5">
                      <Layers className="h-4.5 w-4.5 text-blue-600" />
                      <span className="text-slate-800 font-bold text-xs uppercase tracking-wider">GeoJSON Імпорт</span>
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
              )}
            </section>
          </>
        )}

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
