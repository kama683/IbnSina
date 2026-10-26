import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { DATA_TD, DATA_TH, DATA_TR } from "@/components/ui/tableStyles";
import QueryBoundary from "@/components/ui/QueryBoundary";
import { formatTiyn } from "@/lib/currency";
import { getRefundRequests, type RefundRequestStatus } from "@/lib/api/refund-requests";

const STATUS: Record<RefundRequestStatus, { label: string; className: string }> = {
  pending: { label: "На рассмотрении", className: "bg-warn-soft text-warn-ink" },
  approved: { label: "Одобрен", className: "bg-brand-soft text-brand" },
  rejected: { label: "Отклонён", className: "bg-chip-gray text-ink-3" },
};

function formatCreated(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Вкладка «Мои заявки»: заявки на возврат, созданные текущим сотрудником.
 * Решение по ним принимает главврач (у него — отдельная очередь «Возвраты»);
 * заявку создают со страницы счёта. */
export default function MyRefundRequestsTab() {
  const requests = useQuery({
    queryKey: ["refund-requests", "mine"],
    queryFn: () => getRefundRequests(undefined, { mine: true }),
  });

  return (
    <QueryBoundary queries={[requests]}>
      {requests.data && requests.data.length === 0 ? (
        <p className="rounded-[14px] border border-line bg-white px-5 py-10 text-center text-sm text-ink-3">
          Вы ещё не создавали заявок на возврат. Заявка создаётся со страницы оплаченного счёта.
        </p>
      ) : (
        <section className="overflow-hidden rounded-[14px] border border-line bg-white">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr>
                <th className={DATA_TH}>Создана</th>
                <th className={DATA_TH}>Счёт</th>
                <th className={`${DATA_TH} text-right`}>Сумма</th>
                <th className={DATA_TH}>Причина</th>
                <th className={DATA_TH}>Статус</th>
                <th className={DATA_TH}>Решил</th>
              </tr>
            </thead>
            <tbody>
              {(requests.data ?? []).map((request) => (
                <tr key={request.id} className={DATA_TR}>
                  <td className={`${DATA_TD} whitespace-nowrap text-ink-3`}>{formatCreated(request.createdAt)}</td>
                  <td className={DATA_TD}>
                    <Link
                      to={`/invoices/${request.invoiceId}`}
                      className="font-medium text-brand hover:underline"
                    >
                      Открыть счёт
                    </Link>
                  </td>
                  <td className={`${DATA_TD} text-right font-medium`}>{formatTiyn(request.amount)}</td>
                  <td className={`${DATA_TD} max-w-[220px] truncate text-ink-2`} title={request.reason}>{request.reason}</td>
                  <td className={DATA_TD}>
                    <span
                      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-[3px] text-xs font-semibold ${STATUS[request.status].className}`}
                    >
                      {STATUS[request.status].label}
                    </span>
                  </td>
                  <td className={`${DATA_TD} text-ink-3`}>{request.decidedBy ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>
      )}
    </QueryBoundary>
  );
}
