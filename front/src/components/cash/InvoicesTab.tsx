import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { shortInvoiceNumber } from "@/components/dashboard/reception/format";
import InvoiceStatusBadge from "@/components/invoices/InvoiceStatusBadge";
import ErrorState from "@/components/ui/ErrorState";
import PageLoader from "@/components/ui/PageLoader";
import { formatTiyn } from "@/lib/currency";
import { getInvoices, type InvoiceStatus } from "@/lib/api/invoices";

const PAGE_SIZE = 25;

const STATUS_FILTERS: { id: string; label: string; statuses?: InvoiceStatus[] }[] = [
  { id: "all", label: "Все" },
  { id: "unpaid", label: "Не оплачены", statuses: ["unpaid", "partial"] },
  { id: "draft", label: "Черновики", statuses: ["draft"] },
  { id: "paid", label: "Оплачены", statuses: ["paid"] },
  { id: "closed", label: "Возвраты и отмены", statuses: ["refunded", "cancelled"] },
];

const PERIODS = [
  { id: "today", label: "Сегодня", days: 0 },
  { id: "week", label: "7 дней", days: 6 },
  { id: "all", label: "Всё время", days: null },
] as const;

function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatCreated(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Вкладка «Счета»: список счетов клиники с фильтром по статусу и периоду.
 * Бэкенд отдаёт страницами — просим на одну строку больше, чтобы узнать, есть
 * ли что показывать по кнопке «Показать ещё». */
export default function InvoicesTab() {
  const [filterId, setFilterId] = useState("unpaid");
  const [periodId, setPeriodId] = useState<(typeof PERIODS)[number]["id"]>("all");
  const [pages, setPages] = useState(1);

  const filter = STATUS_FILTERS.find((item) => item.id === filterId)!;
  const period = PERIODS.find((item) => item.id === periodId)!;
  const visible = PAGE_SIZE * pages;

  const invoices = useQuery({
    queryKey: ["invoices", "list", { status: filterId, period: periodId, limit: visible }],
    queryFn: () => {
      const today = new Date();
      const from = period.days === null ? undefined : new Date(today.getTime() - period.days * 86_400_000);
      return getInvoices({
        status: filter.statuses,
        from: from ? isoDate(from) : undefined,
        limit: visible + 1,
      });
    },
    placeholderData: keepPreviousData,
  });

  const rows = invoices.data?.slice(0, visible) ?? [];
  const hasMore = (invoices.data?.length ?? 0) > visible;

  function selectFilter(id: string) {
    setFilterId(id);
    setPages(1);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectFilter(item.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filterId === item.id
                  ? "bg-[#e8f5ee] text-[#1a5c3a]"
                  : "bg-white text-gray-500 ring-1 ring-gray-200 hover:text-gray-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <select
          value={periodId}
          onChange={(event) => {
            setPeriodId(event.target.value as typeof periodId);
            setPages(1);
          }}
          aria-label="Период"
          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700"
        >
          {PERIODS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {invoices.isError ? (
        <ErrorState
          title="Не удалось загрузить счета"
          message={invoices.error.message}
          onRetry={() => void invoices.refetch()}
        />
      ) : !invoices.data ? (
        <PageLoader />
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-gray-200/80 bg-white px-5 py-10 text-center text-sm text-gray-400">
          Счетов по выбранным условиям нет
        </p>
      ) : (
        <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-medium uppercase tracking-wider text-gray-400">
                <th className="px-4 py-2.5">Счёт</th>
                <th className="px-4 py-2.5">Пациент</th>
                <th className="px-4 py-2.5">Создан</th>
                <th className="px-4 py-2.5 text-right">Сумма</th>
                <th className="px-4 py-2.5 text-right">Оплачено</th>
                <th className="px-4 py-2.5">Статус</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="border-b border-gray-50 text-[13px] transition-colors last:border-0 hover:bg-gray-50/80"
                >
                  <td className="px-4 py-2.5 font-medium text-gray-900">
                    <Link to={`/invoices/${invoice.id}`} className="hover:text-[#1a5c3a] hover:underline">
                      {shortInvoiceNumber(invoice.invoiceNumber)}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{invoice.patientName ?? "—"}</td>
                  <td className="px-4 py-2.5 text-gray-500">{formatCreated(invoice.createdAt)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-900">{formatTiyn(invoice.total)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500">
                    {invoice.paidAmount > 0 ? formatTiyn(invoice.paidAmount) : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {invoice.awaitingApproval ? (
                      <span className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium leading-4 text-amber-700">
                        Ждёт главврача
                      </span>
                    ) : (
                      <InvoiceStatusBadge status={invoice.status} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMore && (
            <div className="border-t border-gray-100 p-3 text-center">
              <button
                type="button"
                onClick={() => setPages((value) => value + 1)}
                className="text-sm font-medium text-[#1a5c3a] hover:underline"
              >
                Показать ещё
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
