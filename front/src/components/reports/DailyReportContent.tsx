import type { DailyReport } from "@/lib/api/reports";
import { formatTiyn } from "@/lib/currency";

type Props = {
  report: DailyReport;
  /** Дата сменилась, цифры ещё прошлого дня. */
  loading?: boolean;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="text-ink-3">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}

/** Этап 2, коммит 13 (docs/PHASE2_ANALYSIS.md, п.13 плана) — дневной отчёт
 * по всей клинике (только head_doctor, = _VIEW_DAILY_REPORT в
 * back/app/routers/reports.py). Дату выбирают в шапке кассы. */
export default function DailyReportContent({ report, loading = false }: Props) {
  return (
    <section
      aria-label="Отчёт за день"
      aria-busy={loading}
      className={`max-w-[560px] rounded-[14px] border border-line bg-white p-6 transition-opacity ${
        loading ? "opacity-50" : ""
      }`}
    >
      <p className="text-[13px] text-ink-3">Итого принято</p>
      <p className="mt-1 text-[32px] font-bold leading-10 text-ink">{formatTiyn(report.total)}</p>

      <dl className="mt-4 divide-y divide-row-line border-t border-row-line text-sm">
        <Row label="Наличными" value={formatTiyn(report.cashTotal)} />
        <Row label="Картой" value={formatTiyn(report.cardTotal)} />
        <Row label="Переводом" value={formatTiyn(report.transferTotal)} />
      </dl>

      <dl className="mt-2 divide-y divide-row-line border-t border-row-line text-sm">
        <Row label="Возвраты" value={formatTiyn(report.refundsTotal)} />
        <Row label="Платежей за день" value={String(report.paymentsCount)} />
        <Row label="Счетов затронуто" value={String(report.invoicesTouchedCount)} />
      </dl>
    </section>
  );
}
