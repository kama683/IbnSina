import { useState } from "react";
import { getDailyReport, type DailyReport } from "@/lib/api/reports";
import { formatTiyn } from "@/lib/currency";

type Props = {
  initialDate: string;
  initialReport: DailyReport;
};

/** Этап 2, коммит 13 (docs/PHASE2_ANALYSIS.md, п.13 плана) — дневной отчёт
 * по всей клинике (только head_doctor, = _VIEW_DAILY_REPORT в
 * back/app/routers/reports.py). Выбор даты — обычный date input, перезапрос
 * при смене. */
export default function DailyReportContent({ initialDate, initialReport }: Props) {
  const [date, setDate] = useState(initialDate);
  const [report, setReport] = useState(initialReport);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDateChange(value: string) {
    setDate(value);
    setLoading(true);
    setError(null);
    try {
      const updated = await getDailyReport(value);
      setReport(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить отчёт");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <label className="text-sm">
        <span className="mb-1 block text-gray-600">Дата</span>
        <input
          type="date"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2"
        />
      </label>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <section
        className={`rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm ${loading ? "opacity-50" : ""}`}
      >
        <dl className="space-y-1.5 text-sm">
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
          <div className="flex justify-between border-t border-gray-100 pt-1.5 text-base font-semibold">
            <dt className="text-gray-700">Итого принято</dt>
            <dd className="text-gray-900">{formatTiyn(report.total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Возвраты</dt>
            <dd className="text-gray-900">{formatTiyn(report.refundsTotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Платежей за день</dt>
            <dd className="text-gray-900">{report.paymentsCount}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Счетов затронуто</dt>
            <dd className="text-gray-900">{report.invoicesTouchedCount}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
