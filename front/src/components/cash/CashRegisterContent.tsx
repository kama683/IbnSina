import { useState } from "react";
import { useRefresh } from "@/lib/use-refresh";
import ShiftReportCard from "@/components/cash/ShiftReportCard";
import {
  closeShift,
  getShiftReport,
  openShift,
  type CashShift,
  type ShiftReport,
} from "@/lib/api/cash-shifts";
import { formatTiyn, tengeInputToTiyn } from "@/lib/currency";

type Props = {
  initialShift: CashShift | null;
  shiftHistory: CashShift[];
};

/** Этап 2, коммит 10 (docs/PHASE2_ANALYSIS.md) — открытие/закрытие кассовой
 * смены. Одна открытая смена на кассира одновременно — сервер сам вернёт 409
 * при повторном открытии (partial unique index в CashShift), здесь просто
 * показываем сообщение. После закрытия сразу подтягиваем отчёт по смене
 * (GET /cash-shifts/{id}/report, коммит 5) и показываем расхождение по кассе.
 * Коммит 13: история смен ниже — клик по любой строке подтягивает и её
 * отчёт тем же ShiftReportCard (для head_doctor — история включает чужие
 * смены, GET /cash-shifts теперь отдаёт все; для reception — только свои). */
export default function CashRegisterContent({ initialShift, shiftHistory }: Props) {
  const [shift, setShift] = useState(initialShift);
  const [report, setReport] = useState<ShiftReport | null>(null);
  const [reportTitle, setReportTitle] = useState("Отчёт по смене");
  const [openingBalanceInput, setOpeningBalanceInput] = useState("0");
  const [actualCashInput, setActualCashInput] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyBusyId, setHistoryBusyId] = useState<number | null>(null);
  const refresh = useRefresh();

  async function handleOpen() {
    setSaving(true);
    setError(null);
    try {
      const opened = await openShift(tengeInputToTiyn(openingBalanceInput));
      setShift(opened);
      setReport(null);
      void refresh(); // сводка кассы и «Стойка»
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось открыть смену");
    } finally {
      setSaving(false);
    }
  }

  async function handleClose() {
    if (!shift) return;
    setSaving(true);
    setError(null);
    try {
      const closed = await closeShift(shift.id, tengeInputToTiyn(actualCashInput));
      const closedReport = await getShiftReport(closed.id);
      setShift(null);
      setReport(closedReport);
      setReportTitle("Отчёт по закрытой смене");
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось закрыть смену");
    } finally {
      setSaving(false);
    }
  }

  async function handleShowHistoryReport(historyShift: CashShift) {
    setHistoryBusyId(historyShift.id);
    try {
      const shiftReport = await getShiftReport(historyShift.id);
      setReport(shiftReport);
      setReportTitle(
        `Отчёт по смене от ${new Date(historyShift.openedAt).toLocaleDateString("ru-RU")}${
          historyShift.cashierName ? ` · ${historyShift.cashierName}` : ""
        }`,
      );
    } catch {
      // тихо игнорируем — карточка отчёта просто не обновится
    } finally {
      setHistoryBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
        {shift ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Смена открыта</h2>
              <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                Открыта
              </span>
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Открыта</dt>
                <dd className="text-gray-900">{new Date(shift.openedAt).toLocaleString("ru-RU")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Кассир</dt>
                <dd className="text-gray-900">{shift.cashierName ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Начальный остаток</dt>
                <dd className="text-gray-900">{formatTiyn(shift.openingBalance)}</dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-gray-100 pt-4">
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Фактически в кассе, ₸</span>
                <input
                  value={actualCashInput}
                  onChange={(e) => setActualCashInput(e.target.value)}
                  className="w-40 rounded-lg border border-gray-200 px-3 py-2"
                />
              </label>
              <button
                type="button"
                disabled={saving}
                onClick={handleClose}
                className="rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Закрыть смену
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-base font-semibold text-gray-900">Смена закрыта</h2>
            <div className="mt-4 flex flex-wrap items-end gap-2">
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Начальный остаток, ₸</span>
                <input
                  value={openingBalanceInput}
                  onChange={(e) => setOpeningBalanceInput(e.target.value)}
                  className="w-40 rounded-lg border border-gray-200 px-3 py-2"
                />
              </label>
              <button
                type="button"
                disabled={saving}
                onClick={handleOpen}
                className="rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Открыть смену
              </button>
            </div>
          </>
        )}

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
      </section>

      {report && <ShiftReportCard report={report} title={reportTitle} />}

      {shiftHistory.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-900">История смен</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-medium uppercase tracking-wider text-gray-400">
                  <th className="px-5 py-2.5">Открыта</th>
                  <th className="px-5 py-2.5">Кассир</th>
                  <th className="px-5 py-2.5">Статус</th>
                  <th className="w-32 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {shiftHistory.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-50 transition-colors last:border-0 hover:bg-gray-50/80"
                  >
                    <td className="px-5 py-3 text-sm text-gray-900">
                      {new Date(row.openedAt).toLocaleString("ru-RU")}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{row.cashierName ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${
                          row.status === "open"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {row.status === "open" ? "Открыта" : "Закрыта"}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        disabled={historyBusyId === row.id}
                        onClick={() => handleShowHistoryReport(row)}
                        className="text-xs text-[#1a5c3a] hover:underline disabled:opacity-50"
                      >
                        Отчёт
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
