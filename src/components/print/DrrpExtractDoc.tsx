import React from 'react';
import { CadastralModel } from '../../types';

interface DrrpExtractDocProps {
  model: CadastralModel;
  areaSqM: number;
  areaHectares: number;
}

export default function DrrpExtractDoc({
  model,
  areaSqM,
  areaHectares,
}: DrrpExtractDocProps) {
  return (
    <div className="relative print:break-before-page min-h-[1050px] flex flex-col justify-between pt-4" id="drrp_extract_print_page">
      <div>
        <div className="flex flex-col items-center justify-center space-y-1 text-center font-sans">
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

        <div className="grid grid-cols-2 gap-4 mt-8 text-xs leading-relaxed font-mono">
          <div>
            <div>Індексний номер витягу: <span className="font-bold">482019310</span></div>
            <div>Дата формування: <span className="font-bold">{new Date().toLocaleDateString('uk-UA')}</span></div>
          </div>
          <div className="text-right">
            <div>Реєстраційний номер об'єкта нерухомості:</div>
            <div className="font-bold underline text-sm tracking-wider">{model.drrpRegNumber || "2647382910321"}</div>
          </div>
        </div>

        <div className="mt-6 font-sans">
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

        <div className="mt-6 font-sans">
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
                <td className="py-1.5 font-bold">Реквізити власника (ІПН/ЄДРПОУ):</td>
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

        <div className="mt-6 font-sans">
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

      <div className="flex justify-between items-end mt-12 text-xs font-sans">
        <div className="space-y-1">
          <div>Витяг сформовано за допомогою сертифікованого ГІС-сектора.</div>
          <div className="font-mono text-[9px] text-slate-500">Системний ID сесії: {model.cadastralNumber.replace(/:/g, '')}</div>
        </div>
        <div className="text-right border-t border-black pt-2 w-72">
          <div className="font-bold">{model.drrpRegistrar}</div>
          <div className="text-[10px] text-slate-550 print:text-black">Державний реєстратор / Нотаріус</div>
          <div className="text-[10px] mt-4 select-none">М. П. _______________ (Підпис)</div>
        </div>
      </div>
    </div>
  );
}
