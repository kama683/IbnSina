import type { ShiftReport } from "@/lib/api/cash-shifts";
import { formatTiyn } from "@/lib/currency";

type Props = {
  report: ShiftReport;
  title?: string;
};

/** Этап 2, коммит 13 (docs/PHASE2_ANALYSIS.md) — карточка отчёта по смене,
 * вынесена из CashRegisterContent (коммит 10), чтобы переиспользовать и
 * сразу после закрытия своей смены, и в истории смен (выбор произвольной
 * смены — для head_doctor "любая", п.13 плана). */
export default function ShiftReportCard({ report, title = "Отчёт по смене" }: Props) {
  return (
    <section className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-500">Наличными принято</dt>
          <dd className="text-gray-900">{formatTiyn(report.cashTotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Картой принято</dt>
          <dd className="text-gray-900">{formatTiyn(report.cardTotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Переводом принято</dt>
          <dd className="text-gray-900">{formatTiyn(report.transferTotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Возвраты</dt>
          <dd className="text-gray-900">{formatTiyn(report.refundsTotal)}</dd>
        </div>
        <div className="flex justify-between border-t border-gray-100 pt-1.5">
          <dt className="text-gray-500">Ожидаемо в кассе</dt>
          <dd className="text-gray-900">{formatTiyn(report.expectedCash)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Фактически в кассе</dt>
          <dd className="text-gray-900">
            {report.shift.actualCash !== null ? formatTiyn(report.shift.actualCash) : "—"}
          </dd>
        </div>
        <div className="flex justify-between font-medium">
          <dt className={report.discrepancy ? "text-red-600" : "text-gray-700"}>Расхождение</dt>
          <dd className={report.discrepancy ? "text-red-600" : "text-gray-900"}>
            {report.discrepancy !== null ? formatTiyn(report.discrepancy) : "—"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
