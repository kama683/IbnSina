"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RoleGate from "@/components/auth/RoleGate";
import {
  createInvoicePayment,
  type Invoice,
  type Payment,
  type PaymentMethod,
} from "@/lib/api/invoices";
import type { EmployeeRole } from "@/lib/api/employees";
import { MANAGE_CASH_ROLES } from "@/lib/roles";
import { formatTiyn, tengeInputToTiyn } from "@/lib/currency";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Наличные",
  card: "Карта",
  transfer: "Перевод",
};

type Props = {
  invoice: Invoice;
  payments: Payment[];
  currentEmployeeRole: EmployeeRole;
};

/** Этап 2, коммит 9 (docs/PHASE2_ANALYSIS.md) — приём оплаты. Только
 * последовательные отдельные Payment (решение 4, §4 плана) — форма всегда
 * на одну сумму/один способ за раз, не смешанный платёж. */
export default function InvoicePaymentsSection({ invoice, payments, currentEmployeeRole }: Props) {
  const router = useRouter();
  const alreadyPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(invoice.total - alreadyPaid, 0);

  const [amountInput, setAmountInput] = useState(String(remaining / 100));
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPay = invoice.status === "unpaid" || invoice.status === "partial";

  async function handlePay() {
    const amount = tengeInputToTiyn(amountInput);
    if (amount <= 0) return;
    setSaving(true);
    setError(null);
    try {
      await createInvoicePayment(invoice.id, amount, method);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось провести оплату");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">Оплата</h2>

      {payments.length > 0 && (
        <div className="mt-3 space-y-2">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm"
            >
              <span className={payment.amount < 0 ? "text-red-600" : "text-gray-900"}>
                {payment.amount < 0 ? "Возврат" : "Оплата"} · {METHOD_LABELS[payment.method]}
              </span>
              <span className={`font-medium ${payment.amount < 0 ? "text-red-600" : "text-gray-900"}`}>
                {formatTiyn(payment.amount)}
              </span>
              <span className="text-xs text-gray-400">
                {payment.createdBy} · {new Date(payment.createdAt).toLocaleString("ru-RU")}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex justify-between text-sm">
        <span className="text-gray-500">Остаток к оплате</span>
        <span className="font-semibold text-gray-900">{formatTiyn(remaining)}</span>
      </div>

      {canPay && (
        <RoleGate role={currentEmployeeRole} allow={MANAGE_CASH_ROLES}>
          <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-gray-100 pt-4">
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">Сумма, ₸</span>
              <input
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-32 rounded-lg border border-gray-200 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">Способ</span>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="rounded-lg border border-gray-200 px-3 py-2"
              >
                {Object.entries(METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={saving}
              onClick={handlePay}
              className="rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Принять оплату
            </button>
          </div>
          {error && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </RoleGate>
      )}
    </section>
  );
}
