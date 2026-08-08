"use client";

import { useState } from "react";
import Link from "next/link";
import RoleGate from "@/components/auth/RoleGate";
import {
  approveRefundRequest,
  rejectRefundRequest,
  type RefundRequest,
  type RefundRequestStatus,
} from "@/lib/api/refund-requests";
import type { EmployeeRole } from "@/lib/api/employees";
import { DECIDE_REFUND_ROLES } from "@/lib/roles";
import { formatTiyn } from "@/lib/currency";

const STATUS_CONFIG: Record<RefundRequestStatus, { label: string; className: string }> = {
  pending: { label: "На рассмотрении", className: "bg-amber-50 text-amber-700" },
  approved: { label: "Одобрен", className: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "Отклонён", className: "bg-gray-100 text-gray-500" },
};

type Props = {
  initialRequests: RefundRequest[];
  currentEmployeeRole: EmployeeRole;
};

/** Этап 2, коммит 11 (docs/PHASE2_ANALYSIS.md) — очередь заявок на возврат.
 * Reception видит всё (создаёт заявки со страницы счёта), решает только
 * head_doctor (= _DECIDE_REFUND в back/app/routers/refund_requests.py). */
export default function RefundsQueueContent({ initialRequests, currentEmployeeRole }: Props) {
  const [requests, setRequests] = useState(initialRequests);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onlyPending, setOnlyPending] = useState(true);

  async function handleApprove(id: number) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await approveRefundRequest(id);
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось одобрить возврат");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: number) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await rejectRefundRequest(id);
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отклонить возврат");
    } finally {
      setBusyId(null);
    }
  }

  const visibleRequests = onlyPending
    ? requests.filter((r) => r.status === "pending")
    : requests;

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={onlyPending}
          onChange={(e) => setOnlyPending(e.target.checked)}
        />
        Только на рассмотрении
      </label>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-medium uppercase tracking-wider text-gray-400">
                <th className="px-5 py-2.5">Счёт</th>
                <th className="px-5 py-2.5">Сумма</th>
                <th className="px-5 py-2.5">Причина</th>
                <th className="px-5 py-2.5">Кем создана</th>
                <th className="px-5 py-2.5">Статус</th>
                <th className="w-40 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {visibleRequests.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-gray-50 transition-colors last:border-0 hover:bg-gray-50/80"
                >
                  <td className="px-5 py-3 text-sm">
                    <Link href={`/invoices/${r.invoiceId}`} className="text-[#1a5c3a] hover:underline">
                      Счёт № {r.invoiceId}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-900">{formatTiyn(r.amount)}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{r.reason}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{r.requestedBy ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${STATUS_CONFIG[r.status].className}`}
                    >
                      {STATUS_CONFIG[r.status].label}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    {r.status === "pending" && (
                      <RoleGate role={currentEmployeeRole} allow={DECIDE_REFUND_ROLES}>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => handleApprove(r.id)}
                            className="rounded-lg bg-[#1a5c3a] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                          >
                            Одобрить
                          </button>
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => handleReject(r.id)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 disabled:opacity-50"
                          >
                            Отклонить
                          </button>
                        </div>
                      </RoleGate>
                    )}
                  </td>
                </tr>
              ))}
              {visibleRequests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                    Заявок нет
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
