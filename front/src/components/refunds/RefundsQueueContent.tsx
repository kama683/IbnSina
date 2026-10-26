import { Link } from "react-router-dom";
import { useState } from "react";
import RoleGate from "@/components/auth/RoleGate";
import { buttonClass } from "@/components/ui/buttonStyles";
import { DATA_TD, DATA_TH, DATA_TR } from "@/components/ui/tableStyles";
import {
  approveRefundRequest,
  rejectRefundRequest,
  type RefundRequest,
  type RefundRequestStatus,
} from "@/lib/api/refund-requests";
import type { EmployeeRole } from "@/lib/api/employees";
import { DECIDE_REFUND_ROLES } from "@/lib/roles";
import { formatTiyn } from "@/lib/currency";
import { useRefresh } from "@/lib/use-refresh";

const STATUS_CONFIG: Record<RefundRequestStatus, { label: string; className: string }> = {
  pending: { label: "На рассмотрении", className: "bg-warn-soft text-warn-ink" },
  approved: { label: "Одобрен", className: "bg-brand-soft text-brand" },
  rejected: { label: "Отклонён", className: "bg-chip-gray text-ink-3" },
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
  const refresh = useRefresh();

  async function handleApprove(id: number) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await approveRefundRequest(id);
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      void refresh(); // счётчик на вкладке «Возвраты» и суммы кассы
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
      void refresh();
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
      <label className="flex items-center gap-2 text-sm text-ink-2">
        <input
          type="checkbox"
          checked={onlyPending}
          onChange={(e) => setOnlyPending(e.target.checked)}
          className="h-4 w-4 accent-brand"
        />
        Только на рассмотрении
      </label>

      {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

      <section className="overflow-hidden rounded-[14px] border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr>
                <th className={DATA_TH}>Счёт</th>
                <th className={`${DATA_TH} text-right`}>Сумма</th>
                <th className={DATA_TH}>Причина</th>
                <th className={DATA_TH}>Кем создана</th>
                <th className={DATA_TH}>Статус</th>
                <th className={`${DATA_TH} w-px`} />
              </tr>
            </thead>
            <tbody>
              {visibleRequests.map((r) => (
                <tr key={r.id} className={DATA_TR}>
                  <td className={`${DATA_TD} whitespace-nowrap`}>
                    <Link to={`/invoices/${r.invoiceId}`} className="font-medium text-brand hover:underline">
                      Счёт № {r.invoiceId}
                    </Link>
                  </td>
                  <td className={`${DATA_TD} whitespace-nowrap text-right font-medium`}>
                    {formatTiyn(r.amount)}
                  </td>
                  <td className={`${DATA_TD} max-w-[260px] truncate text-ink-2`} title={r.reason}>
                    {r.reason}
                  </td>
                  <td className={`${DATA_TD} text-ink-3`}>{r.requestedBy ?? "—"}</td>
                  <td className={DATA_TD}>
                    <span
                      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-[3px] text-xs font-semibold ${STATUS_CONFIG[r.status].className}`}
                    >
                      {STATUS_CONFIG[r.status].label}
                    </span>
                  </td>
                  <td className={`${DATA_TD} whitespace-nowrap py-2`}>
                    {r.status === "pending" && (
                      <RoleGate role={currentEmployeeRole} allow={DECIDE_REFUND_ROLES}>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => handleApprove(r.id)}
                            className={buttonClass("primary", "sm")}
                          >
                            Одобрить
                          </button>
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => handleReject(r.id)}
                            className={buttonClass("secondary", "sm")}
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
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-ink-3">
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
