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
    <section className="rounded-[14px] border border-line bg-white p-6">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-3">Наличными принято</dt>
          <dd className="text-ink">{formatTiyn(report.cashTotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-3">Картой принято</dt>
          <dd className="text-ink">{formatTiyn(report.cardTotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-3">Переводом принято</dt>
          <dd className="text-ink">{formatTiyn(report.transferTotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-3">Возвраты</dt>
          <dd className="text-ink">{formatTiyn(report.refundsTotal)}</dd>
        </div>
        <div className="flex justify-between border-t border-row-line pt-1.5">
          <dt className="text-ink-3">Ожидаемо в кассе</dt>
          <dd className="text-ink">{formatTiyn(report.expectedCash)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-3">Фактически в кассе</dt>
          <dd className="text-ink">
            {report.shift.actualCash !== null ? formatTiyn(report.shift.actualCash) : "—"}
          </dd>
        </div>
        <div className="flex justify-between font-medium">
          <dt className={report.discrepancy ? "text-danger" : "text-ink-2"}>Расхождение</dt>
          <dd className={report.discrepancy ? "text-danger" : "text-ink"}>
            {report.discrepancy !== null ? formatTiyn(report.discrepancy) : "—"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
