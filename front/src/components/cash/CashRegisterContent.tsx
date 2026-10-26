import type { ReactNode } from "react";
import { useState } from "react";
import { useRefresh } from "@/lib/use-refresh";
import ShiftReportCard from "@/components/cash/ShiftReportCard";
import { DATA_TD, DATA_TH, DATA_TR } from "@/components/ui/tableStyles";
import {
  closeShift,
  getShiftReport,
  openShift,
  type CashShift,
  type ShiftReport,
} from "@/lib/api/cash-shifts";
import { formatTiyn, tengeInputToTiyn } from "@/lib/currency";

const INPUT =
  "h-[46px] w-44 rounded-[10px] border border-field-line bg-white px-3.5 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand";
const PRIMARY_BUTTON =
  "inline-flex h-[46px] items-center justify-center rounded-[10px] bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50";

type Props = {
  initialShift: CashShift | null;
  shiftHistory: CashShift[];
  /** Карточка справа от смены («Способы оплаты за смену»). */
  aside?: ReactNode;
};

/** Этап 2, коммит 10 (docs/PHASE2_ANALYSIS.md) — открытие/закрытие кассовой
 * смены. Одна открытая смена на кассира одновременно — сервер сам вернёт 409
 * при повторном открытии (partial unique index в CashShift), здесь просто
 * показываем сообщение. После закрытия сразу подтягиваем отчёт по смене
 * (GET /cash-shifts/{id}/report, коммит 5) и показываем расхождение по кассе.
 * Коммит 13: история смен ниже — клик по любой строке подтягивает и её
 * отчёт тем же ShiftReportCard (для head_doctor — история включает чужие
 * смены, GET /cash-shifts теперь отдаёт все; для reception — только свои). */
export default function CashRegisterContent({ initialShift, shiftHistory, aside }: Props) {
  const [shift, setShift] = useState(initialShift);
  const [report, setReport] = useState<ShiftReport | null>(null);
  const [reportTitle, setReportTitle] = useState("Отчёт по смене");
  const [openingBalanceInput, setOpeningBalanceInput] = useState("0");
  const [actualCashInput, setActualCashInput] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyBusyId, setHistoryBusyId] = useState<number | null>(null);
  // «Принято» по прошлым сменам: список смен сумм не отдаёт, цифра появляется
  // после загрузки отчёта («Отчёт» в строке).
  const [receivedByShift, setReceivedByShift] = useState<Record<number, number>>({});
  const refresh = useRefresh();

  function rememberReceived(shiftReport: ShiftReport) {
    const total = shiftReport.cashTotal + shiftReport.cardTotal + shiftReport.transferTotal;
    setReceivedByShift((prev) => ({ ...prev, [shiftReport.shift.id]: total }));
  }

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
      rememberReceived(closedReport);
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
      rememberReceived(shiftReport);
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
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-[14px] border border-line bg-white p-6">
          {shift ? (
            <>
              <h2 className="text-base font-semibold text-ink">Закрыть смену</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-3">Открыта</dt>
                  <dd className="text-ink">{new Date(shift.openedAt).toLocaleString("ru-RU")}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-3">Кассир</dt>
                  <dd className="text-ink">{shift.cashierName ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-3">Начальный остаток</dt>
                  <dd className="text-ink">{formatTiyn(shift.openingBalance)}</dd>
                </div>
              </dl>

              <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-row-line pt-5">
                <label className="text-sm">
                  <span className="mb-1.5 block text-ink-2">Фактически в кассе, ₸</span>
                  <input
                    value={actualCashInput}
                    onChange={(e) => setActualCashInput(e.target.value)}
                    className={INPUT}
                  />
                </label>
                <button type="button" disabled={saving} onClick={handleClose} className={PRIMARY_BUTTON}>
                  Закрыть смену
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold text-ink">Открыть смену</h2>
              <p className="mt-1 text-[13px] text-ink-3">
                Смена закрыта. Укажите, сколько наличных в кассе на начало смены.
              </p>
              <div className="mt-5 flex flex-wrap items-end gap-3">
                <label className="text-sm">
                  <span className="mb-1.5 block text-ink-2">Начальный остаток, ₸</span>
                  <input
                    value={openingBalanceInput}
                    onChange={(e) => setOpeningBalanceInput(e.target.value)}
                    className={INPUT}
                  />
                </label>
                <button type="button" disabled={saving} onClick={handleOpen} className={PRIMARY_BUTTON}>
                  Открыть смену
                </button>
              </div>
            </>
          )}

          {error && (
            <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
          )}
        </section>

        {aside}
      </div>

      {report && <ShiftReportCard report={report} title={reportTitle} />}

      {shiftHistory.length > 0 && (
        <section className="overflow-hidden rounded-[14px] border border-line bg-white">
          <div className="px-6 py-4">
            <h2 className="text-base font-semibold text-ink">История смен</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr>
                  <th className={DATA_TH}>Открыта</th>
                  <th className={DATA_TH}>Закрыта</th>
                  <th className={DATA_TH}>Кассир</th>
                  <th className={`${DATA_TH} text-right`}>Принято</th>
                  <th className={DATA_TH}>Статус</th>
                  <th className={`${DATA_TH} w-px`} />
                </tr>
              </thead>
              <tbody>
                {shiftHistory.map((row) => (
                  <tr key={row.id} className={DATA_TR}>
                    <td className={`${DATA_TD} whitespace-nowrap`}>
                      {new Date(row.openedAt).toLocaleString("ru-RU")}
                    </td>
                    <td className={`${DATA_TD} whitespace-nowrap text-ink-3`}>
                      {row.closedAt ? new Date(row.closedAt).toLocaleString("ru-RU") : "—"}
                    </td>
                    <td className={`${DATA_TD} text-ink-2`}>{row.cashierName ?? "—"}</td>
                    <td className={`${DATA_TD} text-right`}>
                      {receivedByShift[row.id] !== undefined ? formatTiyn(receivedByShift[row.id]) : "—"}
                    </td>
                    <td className={DATA_TD}>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-[3px] text-xs font-semibold ${
                          row.status === "open" ? "bg-warn-soft text-warn-ink" : "bg-brand-soft text-brand"
                        }`}
                      >
                        {row.status === "open" ? "Открыта" : "Закрыта"}
                      </span>
                    </td>
                    <td className={`${DATA_TD} text-right`}>
                      <button
                        type="button"
                        disabled={historyBusyId === row.id}
                        onClick={() => handleShowHistoryReport(row)}
                        className="text-[13px] font-semibold text-brand hover:underline disabled:opacity-50"
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
