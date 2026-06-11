import React from 'react';
import { Point, CadastralModel } from '../../types';
import { calculateDistance, calculateDirectionalAngle, formatToDMS } from '../../utils/geo';
import northArrow from '@/assets/icons/north-arrow.svg';

interface CadastralPlanDocProps {
  model: CadastralModel;
  areaSqM: number;
  areaHectares: number;
}

export default function CadastralPlanDoc({
  model,
  areaSqM,
  areaHectares,
}: CadastralPlanDocProps) {
  const drawW = 350;
  const drawH = 350;
  const pad = 30;

  // Manual box calculation for the static drawing inside PDF
  const bounds = React.useMemo(() => {
    if (model.points.length === 0) {
      return { minX: 5612000, maxX: 5613000, minY: 3248000, maxY: 3249000 };
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    model.points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });
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
        <div className="flex flex-col items-center justify-center p-4 my-6 bg-slate-50 border border-slate-205 rounded-md print:bg-white print:border-black max-w-lg mx-auto">
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
                  <circle
                    cx={screenP.u}
                    cy={screenP.v}
                    r="5"
                    fill="white"
                    stroke="black"
                    strokeWidth="1.5"
                  />
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

                  <text
                    x={midX}
                    y={midY - 4}
                    textAnchor="middle"
                    fontSize="7.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                    fill="black"
                  >
                    {edgeDist.toFixed(1)} м
                  </text>
                </g>
              );
            })}

            {/* Compass Direction Anchor */}
            <image
              id="print_north_arrow"
              href={northArrow}
              x="15"
              y="20"
              width="30"
              height="40"
            />

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
          <div>
            <span className="text-xs font-bold block border-b border-black pb-1 mb-1 font-sans">
              Каталог поворотних точок меж
            </span>
            <table className="w-full text-left text-[10px] border-collapse font-mono">
              <thead>
                <tr className="border-b font-sans font-bold text-slate-605 print:text-black">
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

          <div>
            <span className="text-xs font-bold block border-b border-black pb-1 mb-1 font-sans">
              Експлікація лінійних вимірів
            </span>
            <table className="w-full text-left text-[10px] border-collapse font-mono">
              <thead>
                <tr className="border-b font-sans font-bold text-slate-605 print:text-black">
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
          <span className="text-xs font-bold block border-b border-black pb-1 mb-1 font-sans">
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

        {/* Land Use Explication table */}
        <div className="mt-4">
          <span className="text-xs font-bold block border-b border-black pb-1 mb-1 font-sans">
            Експлікація земельних угідь (за формою КВЗУ)
          </span>
          <table className="w-full text-[10px] text-left border-collapse leading-relaxed font-sans">
            <thead>
              <tr className="border-b font-sans font-bold text-slate-605 print:text-black">
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
            <div className="text-[10px] text-slate-550 print:text-black">Кваліфікаційний сертифікат: {model.surveyorCertificate}</div>
            <div className="text-[10px] text-slate-550 print:text-black">Установа: {model.surveyorOrganization}</div>
          </div>
          <div className="flex justify-between text-[10px] font-mono select-none pt-2 border-t border-slate-200">
            <span>Підпис: ______________</span>
            <span>Дата: {model.surveyDate || '___.___.___'}</span>
          </div>
        </div>

        <div className="flex flex-col justify-between h-20 border-l pl-4 border-slate-300">
          <span className="font-sans font-bold text-slate-500 uppercase tracking-widest text-[9px] print:text-black">ПОГОДЖЕННЯ МЕЖ ЗАМОВНИКОМ:</span>
          <div className="font-sans leading-tight">
            <div className="font-bold underline">{model.ownerName}</div>
            <div className="text-[10px] text-slate-550 print:text-black">З правовими та просторовими межами поворотних точок згоден.</div>
            <div className="text-[10px] text-slate-555 print:text-black">Обмеження за кодами КВЦПЗ урахував.</div>
          </div>
          <div className="flex justify-between text-[10px] font-mono select-none pt-2 border-t border-slate-200">
            <span>Підпис: ______________</span>
            <span>М. П.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
