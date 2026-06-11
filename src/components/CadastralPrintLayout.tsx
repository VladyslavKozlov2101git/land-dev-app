import React, { useRef } from 'react';
import { CadastralModel, Point } from '../types';
import { calculateDistance, calculateDirectionalAngle, formatToDMS, calculatePolygonArea, calculateCentroid, calculatePolygonPerimeter } from '../utils/geo';
import { Printer, ArrowLeft, Layers, FileCode, Users, CheckCircle } from 'lucide-react';

interface CadastralPrintLayoutProps {
  model: CadastralModel;
  onClose: () => void;
}

export default function CadastralPrintLayout({ model, onClose }: CadastralPrintLayoutProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handleTriggerPrint = () => {
    window.print();
  };

  // Base calculations
  const areaSqM = calculatePolygonArea(model.points);
  const areaHectares = areaSqM / 10000;
  const perimeter = calculatePolygonPerimeter(model.points);

  // SVG parameters for print preview (fixed crisp size for physical printing)
  const drawW = 350;
  const drawH = 350;
  const pad = 30;

  // Manual box calculation for the static drawing inside PDF
  const bounds = React.useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    model.points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });
    // Add 25% margin
    const dx = maxX - minX || 100;
    const dy = maxY - minY || 100;
    const center = { x: minX + dx / 2, y: minY + dy / 2 };
    const maxDelta = Math.max(dx, dy) * 1.35;

    return {
      minX: center.x - maxDelta / 2,
      maxX: center.x + maxDelta / 2,
      minY: center.y - maxDelta / 2,
      maxY: center.y + maxDelta / 2,
    };
  }, [model.points]);

  const mapToPrintScreen = (x: number, y: number) => {
    const rangeX = bounds.maxX - bounds.minX;
    const rangeY = bounds.maxY - bounds.minY;

    const normX = rangeX === 0 ? 0.5 : (x - bounds.minX) / rangeX;
    const normY = rangeY === 0 ? 0.5 : (y - bounds.minY) / rangeY;

    // Flip vertical for CAD standard
    const u = pad + normY * (drawW - 2 * pad);
    const v = drawH - pad - normX * (drawH - 2 * pad);

    return { u, v };
  };

  const getPointsPolygonPath = (pts: Point[]): string => {
    if (pts.length === 0) return '';
    const mapped = pts.map(p => {
      const { u, v } = mapToPrintScreen(p.x, p.y);
      return `${u},${v}`;
    });
    return `M ${mapped.join(' L ')} Z`;
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-70 backdrop-blur-xs flex flex-col z-50 overflow-y-auto p-4 md:p-8" id="print_modal_overlay">
      
      {/* Top action bar - Hidden in Print mode! */}
      <div className="max-w-4xl w-full mx-auto bg-slate-800 text-white rounded-t-xl p-4 flex items-center justify-between border-b border-slate-700 print:hidden shrink-0">
        <button
          id="close_print_modal_btn"
          onClick={onClose}
          className="flex items-center gap-1 text-xs hover:text-slate-300 font-medium bg-slate-750 hover:bg-slate-700 p-2 rounded-lg transition-colors border border-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Назад до Реєстру
        </button>

        <span className="text-xs font-bold font-mono text-blue-400 uppercase tracking-widest bg-blue-900/30 px-3 py-1 rounded-md border border-blue-800/40">
          Друк Кадастрової Документації
        </span>

        <button
          id="start_print_doc_btn"
          onClick={handleTriggerPrint}
          className="flex items-center gap-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white p-2 px-4 rounded-lg transition-all shadow-md focus:ring-2 focus:ring-blue-500"
        >
          <Printer className="h-4.5 w-4.5" /> ДРУК В PDF / ПРИНТЕР
        </button>
      </div>

      {/* Main A4 Printable pages compilation container */}
      <div
        ref={printAreaRef}
        className="max-w-4xl w-full mx-auto bg-white rounded-b-xl overflow-hidden shadow-2xl p-6 md:p-12 space-y-16 text-black print:mx-0 print:p-0 print:shadow-none print:rounded-none"
        id="cadastral_pages_scroll_area"
        style={{ fontFamily: '"Times New Roman", Times, serif' }} // High-quality standard serif font for official documents!
      >
        
        {/* ========================================================== */}
        {/* DOCUMENT 1: КАДАСТРОВИЙ ПЛАН ЗЕМЕЛЬНОЇ ДІЛЯНКИ (Page 1) */}
        {/* ========================================================== */}
        <div className="relative print:break-after-page min-h-[1050px] flex flex-col justify-between" id="cadastral_plan_doc_print_page">
          <div>
            {/* Header Stamp */}
            <div className="flex justify-between text-xs font-sans tracking-tight leading-5">
              <div className="text-[10px] uppercase font-bold text-slate-500 print:text-black">
                Помічник кадастрового інженера та землевпорядника
              </div>
              <div className="text-right text-[10.5px]">
                Додаток до витягу з кадастру<br />
                Масштаб <span className="font-bold">1:{model.scale}</span><br />
                Система координат: <span className="font-bold">{model.coordinateSystem}</span> ({model.zone})
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center mt-6 space-y-1">
              <h1 className="text-lg font-bold uppercase tracking-wide leading-tight">
                КАДАСТРОВИЙ ПЛАН ЗЕМЕЛЬНОЇ ДІЛЯНКИ
              </h1>
              <p className="text-xs font-bold font-sans">
                Кадастровий номер: <span className="font-mono text-sm underline select-all">{model.cadastralNumber || "НЕПРИСВОЄНИЙ"}</span>
              </p>
            </div>

            {/* General Attributes Info box */}
            <table className="w-full text-left text-xs mt-4 border-collapse font-sans">
              <tbody>
                <tr className="border-b">
                  <td className="py-1.5 font-bold w-48 text-slate-700 print:text-black">Місце розташування:</td>
                  <td className="py-1.5">{model.address}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-1.5 font-bold text-slate-700 print:text-black">Цільове призначення:</td>
                  <td className="py-1.5">Код {model.purposeCode} — {model.purposeName}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-1.5 font-bold text-slate-700 print:text-black">Власник (користувач):</td>
                  <td className="py-1.5 font-bold">{model.ownerName} (ІПН / Код: {model.ownerCode})</td>
                </tr>
                <tr className="border-b">
                  <td className="py-1.5 font-bold text-slate-700 print:text-black">Загальна площа по межі:</td>
                  <td className="py-1.5 font-bold">{areaHectares.toFixed(4)} га ({areaSqM.toFixed(1)} кв.м)</td>
                </tr>
              </tbody>
            </table>

            {/* Map visual section */}
            <div className="flex flex-col items-center justify-center p-4 my-6 bg-slate-50 border border-slate-200 rounded-md print:bg-white print:border-black max-w-lg mx-auto">
              <svg
                id="static_print_svg"
                width={drawW}
                height={drawH}
                className="mx-auto"
              >
                {/* 1. Restrictions Zone shade */}
                {model.restrictions.map((r, rIdx) => {
                  const pathStr = getPointsPolygonPath(r.points);
                  if (!pathStr) return null;
                  return (
                    <path
                      key={`pr_r_${rIdx}`}
                      d={pathStr}
                      fill="none"
                      stroke="#d97706"
                      strokeWidth="1"
                      strokeDasharray="4 3"
                    />
                  );
                })}

                {/* 2. Parcel Geometry */}
                {model.points.length >= 3 && (
                  <path
                    d={getPointsPolygonPath(model.points)}
                    fill="none"
                    stroke="#000000"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeMiterlimit="10"
                  />
                )}

                {/* 3. Render building shapes */}
                {model.buildings.map((b, bIdx) => {
                  const pathStr = getPointsPolygonPath(b.points);
                  if (!pathStr) return null;
                  return (
                    <g key={`pr_b_${bIdx}`}>
                      <path
                        d={pathStr}
                        fill="none"
                        stroke="#000000"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                      {/* Diagonal cross hatch representation */}
                      <path
                        d={pathStr}
                        fill="url(#print-hatch)"
                      />
                    </g>
                  );
                })}

                {/* 4. Boundaries labeling & indexes */}
                {model.points.map((p, index) => {
                  const next = model.points[(index + 1) % model.points.length];
                  const screenP = mapToPrintScreen(p.x, p.y);
                  const screenNext = mapToPrintScreen(next.x, next.y);

                  const midX = (screenP.u + screenNext.u) / 2;
                  const midY = (screenP.v + screenNext.v) / 2;
                  const edgeDist = calculateDistance(p, next);

                  return (
                    <g key={`pr_lbl_${index}`}>
                      {/* Vertex circles */}
                      <circle
                        cx={screenP.u}
                        cy={screenP.v}
                        r="5"
                        fill="white"
                        stroke="black"
                        strokeWidth="1.5"
                      />
                      {/* Numerical index label */}
                      <text
                        x={screenP.u}
                        y={screenP.v + 3}
                        textAnchor="middle"
                        fontSize="8"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                        fill="black"
                      >
                        {index + 1}
                      </text>

                      {/* Boundary segment length text */}
                      <text
                        x={midX}
                        y={midY - 4}
                        textAnchor="middle"
                        fontSize="7.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                        fill="black"
                        backgroundColor="white"
                      >
                        {edgeDist.toFixed(1)} м
                      </text>
                    </g>
                  );
                })}

                {/* Compass Direction Anchor */}
                <g id="print_north_arrow" transform="translate(30, 45)">
                  <circle cx="0" cy="0" r="14" fill="none" stroke="black" strokeWidth="0.75" />
                  <line x1="0" y1="14" x2="0" y2="-14" stroke="black" strokeWidth="1" />
                  <polygon points="0,-14 -4,-2 4,-2" fill="black" />
                  <text x="-3" y="-17" fontSize="8" fontFamily="sans-serif" fontWeight="bold">Пн</text>
                </g>

                {/* Hatch pattern def */}
                <defs>
                  <pattern id="print-hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="0" y2="6" stroke="black" strokeWidth="0.5" />
                  </pattern>
                </defs>
              </svg>

              <div className="text-[10px] text-slate-500 font-sans mt-2 flex justify-between w-full max-w-sm">
                <span>Масштаб креслення: 1:{model.scale}</span>
                <span>Суцільний контур — Межа ділянки</span>
                <span>Штриховка — Споруди</span>
              </div>
            </div>

            {/* Coordinate Grid points specifications */}
            <div className="grid grid-cols-2 gap-6 mt-4">
              {/* Coordinates catalog table */}
              <div>
                <span className="text-xs font-bold block border-b border-black pb-1 mb-1">
                  Каталог поворотних точок меж
                </span>
                <table className="w-full text-left text-[10px] border-collapse font-mono">
                  <thead>
                    <tr className="border-b font-sans font-bold text-slate-600 print:text-black">
                      <th className="py-1">Точка</th>
                      <th className="py-1">Північ - X (м)</th>
                      <th className="py-1">Схід - Y (м)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.points.map((p, idx) => (
                      <tr key={`pr_pt_${idx}`} className="border-b border-slate-100">
                        <td className="py-1 font-bold">{idx + 1}</td>
                        <td className="py-1">{p.x.toFixed(3)}</td>
                        <td className="py-1">{p.y.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Angle calculations catalog table */}
              <div>
                <span className="text-xs font-bold block border-b border-black pb-1 mb-1">
                  Експлікація лінійних вимірів
                </span>
                <table className="w-full text-left text-[10px] border-collapse font-mono">
                  <thead>
                    <tr className="border-b font-sans font-bold text-slate-600 print:text-black">
                      <th className="py-1">Межа</th>
                      <th className="py-1">Довжина (м)</th>
                      <th className="py-1">Дирекц. кут</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.points.map((p, idx) => {
                      const next = model.points[(idx + 1) % model.points.length];
                      const label = `${idx + 1} — ${idx === model.points.length - 1 ? 1 : idx + 2}`;
                      const dist = calculateDistance(p, next);
                      const angle = calculateDirectionalAngle(p, next);
                      
                      return (
                        <tr key={`pr_edge_${idx}`} className="border-b border-slate-100">
                          <td className="py-1 font-bold">{label}</td>
                          <td className="py-1 font-bold text-slate-900">{dist.toFixed(2)}</td>
                          <td className="py-1">{formatToDMS(angle)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Subadjacent borders landowners table */}
            <div className="mt-4">
              <span className="text-xs font-bold block border-b border-black pb-1 mb-1">
                Експлікація суміжних землекористувачів
              </span>
              <table className="w-full text-xs text-left border-collapse leading-relaxed">
                <tbody>
                  {model.adjacentBoundaries.map((adj) => (
                    <tr className="border-b" key={adj.id}>
                      <td className="py-1 font-bold w-24">Межа {adj.fromPoint}-{adj.toPoint}:</td>
                      <td className="py-1">{adj.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Land Use Explication table (Експлікація угідь) */}
            <div className="mt-4">
              <span className="text-xs font-bold block border-b border-black pb-1 mb-1 font-sans">
                Експлікація земельних угідь (за формою КВЗУ)
              </span>
              <table className="w-full text-[10px] text-left border-collapse leading-relaxed font-sans">
                <thead>
                  <tr className="border-b font-sans font-bold text-slate-600 print:text-black">
                    <th className="py-1 w-20">Код угіддя</th>
                    <th className="py-1">Назва угіддя</th>
                    <th className="py-1 w-32 text-right">Площа (кв.м)</th>
                    <th className="py-1 w-32 text-right">Площа (га)</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-[9.5px]">
                  {(model.landUseExplication || []).map((lu) => (
                    <tr className="border-b" key={lu.id}>
                      <td className="py-1 font-bold">{lu.code}</td>
                      <td className="py-1 font-sans">{lu.name}</td>
                      <td className="py-1 text-right">{lu.area.toFixed(1)}</td>
                      <td className="py-1 text-right">{(lu.area / 10000).toFixed(4)}</td>
                    </tr>
                  ))}
                  {(!model.landUseExplication || model.landUseExplication.length === 0) && (
                    <tr className="border-b">
                      <td colSpan={4} className="py-1 text-center italic font-sans py-2">Дані експлікації відсутні</td>
                    </tr>
                  )}
                  <tr className="font-bold bg-slate-50/50 border-t border-black">
                    <td className="py-1 font-sans" colSpan={2}>Всього по межі ділянки:</td>
                    <td className="py-1 text-right">
                      {((model.landUseExplication || []).reduce((acc, curr) => acc + curr.area, 0)).toFixed(1)}
                    </td>
                    <td className="py-1 text-right">
                      {(((model.landUseExplication || []).reduce((acc, curr) => acc + curr.area, 0)) / 10000).toFixed(4)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer certification stamps */}
          <div className="border-2 border-black p-4 mt-8 grid grid-cols-2 gap-4 text-xs select-none">
            <div className="flex flex-col justify-between h-20">
              <span className="font-sans font-bold text-slate-500 uppercase tracking-widest text-[9px] print:text-black">ВИКОНАВЕЦЬ ПОЛЬОВИХ РОБІТ:</span>
              <div className="font-sans leading-tight">
                <div className="font-bold underline">{model.surveyorName}</div>
                <div className="text-[10px] text-slate-500 print:text-black">Кваліфікаційний сертифікат: {model.surveyorCertificate}</div>
                <div className="text-[10px] text-slate-500 print:text-black">Установа: {model.surveyorOrganization}</div>
              </div>
              <div className="flex justify-between text-[10px] font-mono select-none pt-2 border-t border-slate-200">
                <span>Підпис: ______________</span>
                <span>Дата: {model.surveyDate || '___.___.___'}</span>
              </div>
            </div>

            <div className="flex flex-col justify-between h-20 border-l pl-4 border-slate-300">
              <span className="font-sans font-bold text-slate-500 uppercase tracking-widest text-[9px] print:text-black font-sans">ПОГОДЖЕННЯ МЕЖ ЗАМОВНИКОМ:</span>
              <div className="font-sans leading-tight">
                <div className="font-bold underline">{model.ownerName}</div>
                <div className="text-[10px] text-slate-500 print:text-black">З правовими та просторовими межами поворотних точок згоден.</div>
                <div className="text-[10px] text-slate-500 print:text-black">Обмеження за кодами КВЦПЗ урахував.</div>
              </div>
              <div className="flex justify-between text-[10px] font-mono select-none pt-2 border-t border-slate-200">
                <span>Підпис: ______________</span>
                <span>М. П.</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================== */}
        {/* DOCUMENT 2: ВИТЯГ З ДЕРЖАВНОГО РЕЄСТРУ РЕЧОВИХ ПРАВ (Page 2) */}
        {/* ========================================================== */}
        <div className="relative print:break-before-page min-h-[1050px] flex flex-col justify-between pt-4" id="drrp_extract_print_page">
          <div>
            {/* National Coat of Arms styling simulation */}
            <div className="flex flex-col items-center justify-center space-y-1 text-center">
              <div className="border-2 border-black px-4 py-1.5 rounded-full font-bold text-sm tracking-widest font-mono select-none">
                У К Р А Ї Н А
              </div>
              <h2 className="text-sm font-bold tracking-tight uppercase">
                Міністерство юстиції України
              </h2>
              <h1 className="text-md font-bold text-center uppercase tracking-wide leading-tight max-w-md mx-auto pt-2">
                ВИТЯГ З ДЕРЖАВНОГО РЕЄСТРУ РЕЧОВИХ ПРАВ НА НЕРУХОМЕ МАЙНО ПРО РЕЄСТРАЦІЮ ПРАВА ВЛАСНОСТІ
              </h1>
            </div>

            {/* Technical Registration identifiers */}
            <div className="grid grid-cols-2 gap-4 mt-8 text-xs leading-relaxed font-mono">
              <div>
                <div>Індексний номер витягу: <span className="font-bold">482019310</span ></div>
                <div>Дата формування: <span className="font-bold">{new Date().toLocaleDateString('uk-UA')}</span></div>
              </div>
              <div className="text-right">
                <div>Реєстраційний номер об'єкта нерухомості:</div>
                <div className="font-bold underline text-sm tracking-wider">{model.drrpRegNumber || "2647382910321"}</div>
              </div>
            </div>

            {/* Subsection: Object of ownership */}
            <div className="mt-6">
              <h3 className="text-sm font-bold border-b-2 border-black pb-1 uppercase tracking-wide">
                1. ВІДОМОСТІ ПРО ОБ'ЄКТ НЕРУХОМОГО МАЙНА
              </h3>
              <table className="w-full text-left text-xs mt-2 border-collapse leading-relaxed">
                <tbody>
                  <tr className="border-b">
                    <td className="py-1.5 font-bold w-52">Тип об'єкта:</td>
                    <td className="py-1.5">Земельна ділянка</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1.5 font-bold">Площа:</td>
                    <td className="py-1.5 font-bold">{areaHectares.toFixed(4)} га ({areaSqM.toFixed(1)} кв.м)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1.5 font-bold">Кадастровий номер:</td>
                    <td className="py-1.5 font-bold font-mono text-[12.5px]">{model.cadastralNumber}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1.5 font-bold">Цільове призначення:</td>
                    <td className="py-1.5">Код {model.purposeCode} — {model.purposeName}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1.5 font-bold">Категорія земель:</td>
                    <td className="py-1.5">{model.category}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1.5 font-bold">Адреса / Місцезнаходження:</td>
                    <td className="py-1.5">{model.address}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Subsection: Owner details */}
            <div className="mt-6">
              <h3 className="text-sm font-bold border-b-2 border-black pb-1 uppercase tracking-wide">
                2. АКТУАЛЬНІ ВІДОМОСТІ ПРО ПРАВО ВЛАСНОСТІ
              </h3>
              <table className="w-full text-left text-xs mt-2 border-collapse leading-relaxed">
                <tbody>
                  <tr className="border-b">
                    <td className="py-1.5 font-bold w-52 mr-2">Форма власності:</td>
                    <td className="py-1.5">{model.ownershipForm}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1.5 font-bold">Розмір частки:</td>
                    <td className="py-1.5 font-mono font-bold">{model.ownerShare}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1.5 font-bold">Власник/набувач:</td>
                    <td className="py-1.5 font-bold text-sm underline">{model.ownerName}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1.5 font-bold">Реквізити платника (ІПН/ЄДРПОУ):</td>
                    <td className="py-1.5 font-mono">{model.ownerCode}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1.5 font-bold">Документ правоутворення:</td>
                    <td className="py-1.5 italic text-slate-800">{model.ownerDocument}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1.5 font-bold">Номер та дата рішення ДРРП:</td>
                    <td className="py-1.5">Рішення № {model.drrpDecisionNumber} від {model.drrpDecisionDate || 'не вказано'}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1.5 font-bold">Державний реєстратор:</td>
                    <td className="py-1.5 font-bold">{model.drrpRegistrar}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Subsection: Encumbrances and Restrictions */}
            <div className="mt-6">
              <h3 className="text-sm font-bold border-b-2 border-black pb-1 uppercase tracking-wide">
                3. СПЕЦІАЛЬНІ ОБМЕЖЕННЯ / ЗАБОРОНИ ТА ІПОТЕКИ
              </h3>
              <table className="w-full text-left text-xs mt-2 border-collapse leading-relaxed">
                <tbody>
                  <tr className="border-b">
                    <td className="py-1.5 font-bold w-52 text-red-700 print:text-black">Стан обтяжень прав власника:</td>
                    <td className="py-1.5 font-bold font-mono text-red-900 print:text-black">{model.drrpEncumbrances}</td>
                  </tr>

                  {model.restrictions.length > 0 ? (
                    model.restrictions.map((r, i) => (
                      <tr className="border-b" key={r.id}>
                        <td className="py-1.5 font-bold text-amber-900 print:text-black">Обмеження № {i + 1} (ДЗК):</td>
                        <td className="py-1.5">
                          <span className="font-bold">Код {r.code} ({r.name})</span>. Охоронна площа: {r.area} кв. м. {r.description}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-b">
                      <td className="py-1.5 font-bold text-emerald-800 print:text-black">Обмеження за ДЗК:</td>
                      <td className="py-1.5 italic">Межі охоронних зон чи ЛЕП не зафіксовано в системі обміну ДЗК.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer signature and stamp marker */}
          <div className="flex justify-between items-end mt-12 text-xs">
            <div className="space-y-1">
              <div>Витяг сформовано за допомогою сертифікованого ГІС-сектора.</div>
              <div className="font-mono text-[9px] text-slate-500">Системний ID сесії: {model.cadastralNumber.replace(/:/g, '')}</div>
            </div>
            <div className="text-right border-t border-black pt-2 w-72">
              <div className="font-bold">{model.drrpRegistrar}</div>
              <div className="text-[10px] text-slate-500 print:text-black">Державний реєстратор / Нотаріус</div>
              <div className="text-[10px] mt-4 select-none">М. П. _______________ (Підпис)</div>
            </div>
          </div>
        </div>

        {/* ========================================================== */}
        {/* DOCUMENT 3: АКТ ПРИЙОМУ-ПЕРЕДАЧІ МЕЖОВИХ ЗНАКІВ (Page 3) */}
        {/* ========================================================== */}
        <div className="relative print:break-before-page min-h-[1050px] flex flex-col justify-between pt-4" id="boundary_act_print_page">
          <div>
            <div className="text-center space-y-1">
              <h1 className="text-lg font-bold uppercase tracking-wide">
                АКТ
              </h1>
              <h2 className="text-md font-bold uppercase tracking-normal">
                прийому-передачі межових знаків на збереження
              </h2>
              <p className="text-xs font-serif italic text-center text-slate-500 print:text-black py-1">
                сформовано відповідно до Інструкції про встановлення (відновлення) меж земельних ділянок в натурі (на місцевості)
              </p>
            </div>

            <div className="flex justify-between mt-6 text-xs font-bold font-serif px-1.5">
              <span>Місце складання: {model.address.split(',')[2]?.trim() || 'населений пункт'}</span>
              <span>Дата складання: {model.surveyDate || new Date().toLocaleDateString('uk-UA')}</span>
            </div>

            {/* Act Narrative Text representing official guidelines */}
            <div className="text-xs text-justify leading-relaxed mt-4 space-y-3 font-serif">
              <p>
                Ми, нижепідписані, Сертифікований інженер-землевпорядник <span className="font-bold font-sans">{model.surveyorName}</span> (кваліфікаційний сертифікат {model.surveyorCertificate}), що діє від імені {model.surveyorOrganization || 'виконавця'}, з однієї сторони, та власник земельної ділянки <span className="font-bold font-sans">{model.ownerName}</span> (ІПН / Код {model.ownerCode}), з другої сторони, у присутності суміжних землекористувачів склали цей акт про те, що виконавцем робіт було перенесено в натуру (на місцевість) межі земельної ділянки з кадастровим номером <span className="font-mono font-bold">{model.cadastralNumber}</span>, розташованої за адресою: <span className="font-bold font-sans">{model.address}</span>.
              </p>
              <p>
                Поворотні точки межових знаків у кількості <span className="font-bold">{model.points.length} штук</span>, марковані тимчасовими межовими знаками встановленого стандарту, здано власнику земельної ділянки на збереження у поворотних точках відповідно до креслення кадастрового плану. Власник ознайомлений зі кримінальною та фінансовою відповідальністю за самовільне переміщення чи знищення межових знаків на підставі ст. 56 Кодексу України про адміністративні правопорушення.
              </p>
              <p>
                При встановленні меж жодних суперечок чи заперечень суміжними власниками заявлено не було. Межові знаки погоджені в повному обсязі.
              </p>
            </div>

            {/* Expansions point detail */}
            <div className="mt-6">
              <span className="text-xs font-bold block border-b border-black pb-1 mb-2">
                Таблиця винесених в натуру межових знаків
              </span>
              <table className="w-full text-[10px] text-left border-collapse font-mono leading-relaxed">
                <thead>
                  <tr className="border-b font-sans font-bold">
                    <th className="py-1">Межовий знак №</th>
                    <th className="py-1">Координата X (Північ, м)</th>
                    <th className="py-1">Координата Y (Схід, м)</th>
                    <th className="py-1 font-sans">Тип знаку</th>
                    <th className="py-1 font-sans">Погоджено суміжником</th>
                  </tr>
                </thead>
                <tbody>
                  {model.points.map((p, idx) => {
                    // Match boundary adjacent descriptions
                    const boundDesc = model.adjacentBoundaries.find(b => b.fromPoint === (idx + 1).toString())?.description || 'Землі комунальної власності';
                    return (
                      <tr className="border-b border-slate-100" key={`act_p_${idx}`}>
                        <td className="py-1.5 font-bold">№ {idx + 1}</td>
                        <td className="py-1.5">{p.x.toFixed(3)}</td>
                        <td className="py-1.5">{p.y.toFixed(3)}</td>
                        <td className="py-1.5 font-sans">Тимчасовий (арматура)</td>
                        <td className="py-1.5 font-sans font-semibold text-[8px] truncate max-w-[150px]" title={boundDesc}>
                          {boundDesc.split('—')[1]?.trim() || boundDesc}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Execution Signings stamps split */}
          <div className="mt-8 border-t-2 border-black pt-4 grid grid-cols-2 gap-6 text-xs">
            <div className="space-y-4">
              <span className="font-bold block uppercase tracking-wider text-[10px]">ЗДАВ (Кадастровий Інженер):</span>
              <div className="pt-2">
                <div>_____________/ <span className="font-bold">{model.surveyorName}</span></div>
                <div className="text-[10px] text-slate-500 font-sans mt-1">Сертифікат {model.surveyorCertificate}</div>
              </div>
            </div>

            <div className="space-y-4 border-l pl-4 border-slate-300">
              <span className="font-bold block uppercase tracking-wider text-[10px]">ПРИЙНЯВ (Землевласник):</span>
              <div className="pt-2">
                <div>_____________/ <span className="font-bold">{model.ownerName}</span></div>
                <div className="text-[10px] text-slate-500 font-sans mt-1">Власник за документами ДРРП</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
