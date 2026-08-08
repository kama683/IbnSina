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
import { createRefundRequest, type RefundRequest } from "@/lib/api/refund-requests";
import type { EmployeeRole } from "@/lib/api/employees";
import { MANAGE_CASH_ROLES } from "@/lib/roles";
import { formatTiyn, tengeInputToTiyn } from "@/lib/currency";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Наличные",
  card: "Карта",
  transfer: "Перевод",
};

const REFUND_STATUS_LABELS: Record<RefundRequest["status"], string> = {
  pending: "Заявка на возврат отправлена",
  approved: "Возврат одобрен",
  rejected: "Заявка на возврат отклонена",
};

type Props = {
  invoice: Invoice;
  payments: Payment[];
  refundRequests: RefundRequest[];
  currentEmployeeRole: EmployeeRole;
};

/** Этап 2, коммит 9 (docs/PHASE2_ANALYSIS.md) — приём оплаты. Только
 * последовательные отдельные Payment (решение 4, §4 плана) — форма всегда
 * на одну сумму/один способ за раз, не смешанный платёж. */
export default function InvoicePaymentsSection({
  invoice,
  payments,
  refundRequests,
  currentEmployeeRole,
}: Props) {
  const router = useRouter();
  const alreadyPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(invoice.total - alreadyPaid, 0);

  const [amountInput, setAmountInput] = useState(String(remaining / 100));
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [refundingPaymentId, setRefundingPaymentId] = useState<number | null>(null);
  const [refundAmountInput, setRefundAmountInput] = useState("0");
  const [refundReason, setRefundReason] = useState("");
  const [refundSaving, setRefundSaving] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

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

  function openRefundForm(payment: Payment) {
    setRefundingPaymentId(payment.id);
    setRefundAmountInput(String(payment.amount / 100));
    setRefundReason("");
    setRefundError(null);
  }

  async function handleRequestRefund(paymentId: number) {
    const amount = tengeInputToTiyn(refundAmountInput);
    if (amount <= 0 || !refundReason.trim()) return;
    setRefundSaving(true);
    setRefundError(null);
    try {
      await createRefundRequest(paymentId, amount, refundReason.trim());
      setRefundingPaymentId(null);
      router.refresh();
    } catch (err) {
      setRefundError(err instanceof Error ? err.message : "Не удалось создать заявку на возврат");
    } finally {
      setRefundSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">Оплата</h2>

      {payments.length > 0 && (
        <div className="mt-3 space-y-2">
          {payments.map((payment) => {
            const requestsForPayment = refundRequests.filter((r) => r.paymentId === payment.id);
            const hasActiveRequest = requestsForPayment.some(
              (r) => r.status === "pending" || r.status === "approved",
            );
            return (
              <div key={payment.id} className="rounded-lg border border-gray-100 px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className={payment.amount < 0 ? "text-red-600" : "text-gray-900"}>
                    {payment.amount < 0 ? "Возврат" : "Оплата"} · {METHOD_LABELS[payment.method]}
                  </span>
                  <span
                    className={`font-medium ${payment.amount < 0 ? "text-red-600" : "text-gray-900"}`}
                  >
                    {formatTiyn(payment.amount)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {payment.createdBy} · {new Date(payment.createdAt).toLocaleString("ru-RU")}
                  </span>
                </div>

                {payment.amount > 0 && (
                  <div className="mt-1.5">
                    {requestsForPayment.map((r) => (
                      <p key={r.id} className="text-xs text-gray-400">
                        {REFUND_STATUS_LABELS[r.status]} · {formatTiyn(r.amount)}
                        {r.decidedBy ? ` · ${r.decidedBy}` : ""}
                      </p>
                    ))}

                    {!hasActiveRequest && refundingPaymentId !== payment.id && (
                      <RoleGate role={currentEmployeeRole} allow={MANAGE_CASH_ROLES}>
                        <button
                          type="button"
                          onClick={() => openRefundForm(payment)}
                          className="mt-1 text-xs text-red-600 hover:underline"
                        >
                          Запросить возврат
                        </button>
                      </RoleGate>
                    )}

                    {refundingPaymentId === payment.id && (
                      <div className="mt-2 space-y-2 rounded-lg bg-gray-50 p-3">
                        <div className="flex flex-wrap items-end gap-2">
                          <label className="text-sm">
                            <span className="mb-1 block text-gray-600">Сумма, ₸</span>
                            <input
                              value={refundAmountInput}
                              onChange={(e) => setRefundAmountInput(e.target.value)}
                              className="w-28 rounded-lg border border-gray-200 px-3 py-2"
                            />
                          </label>
                          <label className="text-sm">
                            <span className="mb-1 block text-gray-600">Причина</span>
                            <input
                              value={refundReason}
                              onChange={(e) => setRefundReason(e.target.value)}
                              className="w-48 rounded-lg border border-gray-200 px-3 py-2"
                            />
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={refundSaving}
                            onClick={() => handleRequestRefund(payment.id)}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                          >
                            Отправить заявку
                          </button>
                          <button
                            type="button"
                            onClick={() => setRefundingPaymentId(null)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600"
                          >
                            Отмена
                          </button>
                        </div>
                        {refundError && <p className="text-xs text-red-600">{refundError}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
