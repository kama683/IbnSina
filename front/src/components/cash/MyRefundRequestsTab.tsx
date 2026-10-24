import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import QueryBoundary from "@/components/ui/QueryBoundary";
import { formatTiyn } from "@/lib/currency";
import { getRefundRequests, type RefundRequestStatus } from "@/lib/api/refund-requests";

const STATUS: Record<RefundRequestStatus, { label: string; className: string }> = {
  pending: { label: "На рассмотрении", className: "bg-amber-50 text-amber-700" },
  approved: { label: "Одобрен", className: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "Отклонён", className: "bg-gray-100 text-gray-500" },
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
        <p className="rounded-xl border border-gray-200/80 bg-white px-5 py-10 text-center text-sm text-gray-400">
          Вы ещё не создавали заявок на возврат. Заявка создаётся со страницы оплаченного счёта.
        </p>
      ) : (
        <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-medium uppercase tracking-wider text-gray-400">
                <th className="px-4 py-2.5">Создана</th>
                <th className="px-4 py-2.5">Счёт</th>
                <th className="px-4 py-2.5 text-right">Сумма</th>
                <th className="px-4 py-2.5">Причина</th>
                <th className="px-4 py-2.5">Статус</th>
                <th className="px-4 py-2.5">Решил</th>
              </tr>
            </thead>
            <tbody>
              {(requests.data ?? []).map((request) => (
                <tr
                  key={request.id}
                  className="border-b border-gray-50 text-[13px] last:border-0 hover:bg-gray-50/80"
                >
                  <td className="px-4 py-2.5 text-gray-500">{formatCreated(request.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    <Link
                      to={`/invoices/${request.invoiceId}`}
                      className="font-medium text-gray-900 hover:text-[#1a5c3a] hover:underline"
                    >
                      Открыть счёт
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-900">{formatTiyn(request.amount)}</td>
                  <td className="max-w-[220px] truncate px-4 py-2.5 text-gray-600">{request.reason}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium leading-4 ${STATUS[request.status].className}`}
                    >
                      {STATUS[request.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{request.decidedBy ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </QueryBoundary>
  );
}
