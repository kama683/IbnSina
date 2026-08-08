"use client";

import { useState } from "react";
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
};

/** Этап 2, коммит 10 (docs/PHASE2_ANALYSIS.md) — открытие/закрытие кассовой
 * смены. Одна открытая смена на кассира одновременно — сервер сам вернёт 409
 * при повторном открытии (partial unique index в CashShift), здесь просто
 * показываем сообщение. После закрытия сразу подтягиваем отчёт по смене
 * (GET /cash-shifts/{id}/report, коммит 5) и показываем расхождение по кассе. */
export default function CashRegisterContent({ initialShift }: Props) {
  const [shift, setShift] = useState(initialShift);
  const [report, setReport] = useState<ShiftReport | null>(null);
  const [openingBalanceInput, setOpeningBalanceInput] = useState("0");
  const [actualCashInput, setActualCashInput] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    setSaving(true);
    setError(null);
    try {
      const opened = await openShift(tengeInputToTiyn(openingBalanceInput));
      setShift(opened);
      setReport(null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось закрыть смену");
    } finally {
      setSaving(false);
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

      {report && (
        <section className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Отчёт по закрытой смене</h2>
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
      )}
    </div>
  );
}
