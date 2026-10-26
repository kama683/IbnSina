import { Link } from "react-router-dom";
import { shortInvoiceNumber } from "@/components/dashboard/reception/format";
import { formatTiyn } from "@/lib/currency";
import type { ReceptionSummary } from "@/lib/api/reports";

const MAX_ROWS = 3;

type Props = {
  invoices: ReceptionSummary["invoices"];
  state: "loading" | "error" | "ready";
  onRetry: () => void;
};

/** «Ждут оплаты»: счёт, пациент, сумма к оплате (у частично оплаченного —
 * остаток). Черновик со скидкой выше порога вместо суммы помечен янтарным
 * «ждёт главврача» — выставить его нельзя, пока скидку не подтвердят. */
export default function AwaitingPayment({ invoices, state, onRetry }: Props) {
  const rows = invoices.awaitingPayment.slice(0, MAX_ROWS);
  const total = invoices.unpaidCount + invoices.awaitingApprovalCount;
  const hidden = total - rows.length;

  return (
    <section className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-medium text-gray-900">Ждут оплаты</h2>

      {state === "loading" ? (
        <p className="mt-3 text-[13px] text-gray-400">Загрузка…</p>
      ) : state === "error" ? (
        <p className="mt-3 text-[13px] text-gray-500">
          Не удалось загрузить.{" "}
          <button type="button" onClick={onRetry} className="text-[#1a5c3a] hover:underline">
            Повторить
          </button>
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-[13px] text-gray-500">Все счета оплачены</p>
      ) : (
        <ul className="mt-2 divide-y divide-gray-50">
          {rows.map((invoice) => (
            <li key={invoice.id}>
              <Link
                to={`/invoices/${invoice.id}`}
                className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-[13px] transition-colors hover:bg-gray-50"
              >
                <span className="truncate text-gray-700">
                  {shortInvoiceNumber(invoice.number)}
                  <span className="text-gray-400"> · {invoice.patientName ?? "—"}</span>
                </span>
                {invoice.awaitingApproval ? (
                  <span className="shrink-0 text-amber-700">ждёт главврача</span>
                ) : (
                  <span className="shrink-0 font-medium text-gray-900">
                    {formatTiyn(invoice.total - invoice.paidAmount)}
                  </span>
                )}
              </Link>
            </li>
          ))}
          {hidden > 0 && (
            <li className="pt-1.5 text-xs text-gray-400">
              <Link to="/cash-register/invoices" className="hover:text-gray-600">
                и ещё {hidden} → все счета
              </Link>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
