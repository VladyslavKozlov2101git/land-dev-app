import React from 'react';
import { CadastralModel } from '../../types';

interface BoundaryActDocProps {
  model: CadastralModel;
}

export default function BoundaryActDoc({ model }: BoundaryActDocProps) {
  return (
    <div className="relative print:break-before-page min-h-[1050px] flex flex-col justify-between pt-4" id="boundary_act_print_page">
      <div>
        <div className="text-center space-y-1 font-serif">
          <h1 className="text-lg font-bold uppercase tracking-wide">
            АКТ
          </h1>
          <h2 className="text-md font-bold uppercase tracking-normal">
            прийому-передачі межових знаків на збереження
          </h2>
          <p className="text-xs italic text-center text-slate-500 print:text-black py-1">
            сформовано відповідно до Інструкції про встановлення (відновлення) меж земельних ділянок в натурі (на місцевості)
          </p>
        </div>

        <div className="flex justify-between mt-6 text-xs font-bold font-serif px-1.5">
          <span>Місце складання: {model.address.split(',')[2]?.trim() || 'населений пункт'}</span>
          <span>Дата складання: {model.surveyDate || new Date().toLocaleDateString('uk-UA')}</span>
        </div>

        <div className="text-xs text-justify leading-relaxed mt-4 space-y-3 font-serif">
          <p>
            Ми, нижчепідписані, Сертифікований інженер-землевпорядник <span className="font-bold font-sans">{model.surveyorName}</span> (кваліфікаційний сертифікат {model.surveyorCertificate}), що діє від імені {model.surveyorOrganization || 'виконавця'}, з однієї сторони, та власник земельної ділянки <span className="font-bold font-sans">{model.ownerName}</span> (ІПН / Код {model.ownerCode}), з другої сторони, у присутності суміжних землекористувачів склали цей акт про те, що виконавцем робіт було перенесено в натуру (на місцевість) межі земельної ділянки з кадастровим номером <span className="font-mono font-bold">{model.cadastralNumber}</span>, розташованої за адресою: <span className="font-bold font-sans">{model.address}</span>.
          </p>
          <p>
            Поворотні точки межових знаків у кількості <span className="font-bold">{model.points.length} штук</span>, марковані тимчасовими межовими знаками встановленого стандарту, здано власнику земельної ділянки на збереження у поворотних точках відповідно до креслення кадастрового плану. Власник ознайомлений зі кримінальною та фінансовою відповідальністю за самовільне переміщення чи знищення межових знаків на підставі ст. 56 Кодексу України про адміністративні правопорушення.
          </p>
          <p>
            При встановленні меж жодних суперечок чи заперечень суміжними власниками заявлено не було. Межові знаки погоджені в повному обсязі.
          </p>
        </div>

        <div className="mt-6">
          <span className="text-xs font-bold block border-b border-black pb-1 mb-2 font-serif">
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

      <div className="mt-8 border-t-2 border-black pt-4 grid grid-cols-2 gap-6 text-xs font-serif">
        <div className="space-y-4">
          <span className="font-bold block uppercase tracking-wider text-[10px] font-sans">ЗДАВ (Кадастровий Інженер):</span>
          <div className="pt-2">
            <div>_____________/ <span className="font-bold font-sans">{model.surveyorName}</span></div>
            <div className="text-[10px] text-slate-500 font-sans mt-1">Сертифікат {model.surveyorCertificate}</div>
          </div>
        </div>

        <div className="space-y-4 border-l pl-4 border-slate-300">
          <span className="font-bold block uppercase tracking-wider text-[10px] font-sans">ПРИЙНЯВ (Землевласник):</span>
          <div className="pt-2">
            <div>_____________/ <span className="font-bold font-sans">{model.ownerName}</span></div>
            <div className="text-[10px] text-slate-500 font-sans mt-1">Власник за документами ДРРП</div>
          </div>
        </div>
      </div>
    </div>
  );
}
