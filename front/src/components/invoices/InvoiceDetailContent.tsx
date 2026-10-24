import { useRefresh } from "@/lib/use-refresh";
import { useState } from "react";
import RoleGate from "@/components/auth/RoleGate";
import InvoiceStatusBadge from "@/components/invoices/InvoiceStatusBadge";
import {
  approveInvoiceDiscount,
  cancelInvoice,
  issueInvoice,
  type Invoice,
} from "@/lib/api/invoices";
import type { EmployeeRole } from "@/lib/api/employees";
import { APPROVE_DISCOUNT_ROLES, MANAGE_CASH_ROLES } from "@/lib/roles";
import { formatTiyn } from "@/lib/currency";

type Props = {
  invoice: Invoice;
  currentEmployeeRole: EmployeeRole;
  children?: React.ReactNode;
};

/** Этап 2, коммит 8 (docs/PHASE2_ANALYSIS.md) — карточка счёта: позиции,
 * итоги, выставление, подтверждение скидки, отмена. children — точка
 * расширения для оплаты/возврата/квитанции (коммиты 9/11/12). */
export default function InvoiceDetailContent({ invoice, currentEmployeeRole, children }: Props) {
  const refresh = useRefresh();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discountBlocked, setDiscountBlocked] = useState(false);

  async function handleIssue() {
    setSaving(true);
    setError(null);
    setDiscountBlocked(false);
    try {
      await issueInvoice(invoice.id);
      await refresh();
    } catch (err) {
      if (err instanceof Error && err.message.includes("подтверждение")) {
        setDiscountBlocked(true);
      }
      setError(err instanceof Error ? err.message : "Не удалось выставить счёт");
    } finally {
      setSaving(false);
    }
  }

  async function handleApproveDiscount() {
    setSaving(true);
    setError(null);
    try {
      await approveInvoiceDiscount(invoice.id);
      setDiscountBlocked(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось подтвердить скидку");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    setSaving(true);
    setError(null);
    try {
      await cancelInvoice(invoice.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отменить счёт");
    } finally {
      setSaving(false);
    }
  }

  const canCancel = invoice.status === "draft" || invoice.status === "unpaid";

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Счёт № {invoice.invoiceNumber}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Выставлен {invoice.createdBy ?? "—"} · {new Date(invoice.createdAt).toLocaleString("ru-RU")}
            </p>
          </div>
          <InvoiceStatusBadge status={invoice.status} />
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-gray-100">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-medium uppercase tracking-wider text-gray-400">
                <th className="px-4 py-2">Услуга</th>
                <th className="px-4 py-2">Кол-во</th>
                <th className="px-4 py-2">Цена</th>
                <th className="px-4 py-2">Скидка</th>
                <th className="px-4 py-2">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2 text-gray-900">{item.serviceName}</td>
                  <td className="px-4 py-2 text-gray-600">{item.quantity}</td>
                  <td className="px-4 py-2 text-gray-600">{formatTiyn(item.priceSnapshot)}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {item.discountAmount > 0 ? formatTiyn(item.discountAmount) : "—"}
                  </td>
                  <td className="px-4 py-2 font-medium text-gray-900">
                    {formatTiyn(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Подытог</span>
              <span>{formatTiyn(invoice.subtotal)}</span>
            </div>
            {invoice.discountTotal > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Скидка</span>
                <span>−{formatTiyn(invoice.discountTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold text-gray-900">
              <span>Итого</span>
              <span>{formatTiyn(invoice.total)}</span>
            </div>
            {invoice.discountApprovedBy && (
              <p className="pt-1 text-xs text-gray-400">
                Скидка подтверждена: {invoice.discountApprovedBy}
              </p>
            )}
          </div>
        </div>

        {discountBlocked && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-800">
              Скидка выше порога — нужно подтверждение главного врача.
            </p>
            <RoleGate role={currentEmployeeRole} allow={APPROVE_DISCOUNT_ROLES}>
              <button
                type="button"
                disabled={saving}
                onClick={handleApproveDiscount}
                className="mt-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                Подтвердить скидку
              </button>
            </RoleGate>
          </div>
        )}

        {error && !discountBlocked && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <RoleGate role={currentEmployeeRole} allow={MANAGE_CASH_ROLES}>
          <div className="mt-4 flex gap-2">
            {invoice.status === "draft" && (
              <button
                type="button"
                disabled={saving}
                onClick={handleIssue}
                className="rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Выставить
              </button>
            )}
            {canCancel && (
              <button
                type="button"
                disabled={saving}
                onClick={handleCancel}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Отменить счёт
              </button>
            )}
          </div>
        </RoleGate>
      </section>

      {children}
    </div>
  );
}
