"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import type { Invoice, Payment, PaymentMethod } from "@/lib/api/invoices";
import type { Patient } from "@/lib/types";
import { formatTiyn } from "@/lib/currency";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Наличные",
  card: "Карта",
  transfer: "Перевод",
};

function formatIin(iin: string) {
  return iin.replace(/(\d{6})(\d{6})/, "$1 $2");
}

type Props = {
  invoice: Invoice;
  patient: Patient;
  payments: Payment[];
};

/** Этап 2, коммит 12 (docs/PHASE2_ANALYSIS.md, п.12 плана) — печатная
 * квитанция по счёту: клиника, пациент, позиции, итог, оплаты, кассир (=
 * createdBy у каждого платежа). Sidebar/Header скрыты через print:hidden в
 * app/(doctors)/layout.tsx — эта страница печатается сама по себе. */
export default function ReceiptContent({ invoice, patient, payments }: Props) {
  return (
    <div className="mx-auto max-w-[700px] py-5">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          href={`/invoices/${invoice.id}`}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к счёту
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-[#1a5c3a] px-4 py-2 text-sm font-medium text-white hover:bg-[#14472e]"
        >
          <Printer className="h-4 w-4" />
          Печать
        </button>
      </div>

      <div className="rounded-xl border border-gray-200/80 bg-white p-8 shadow-sm print:rounded-none print:border-0 print:shadow-none">
        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">IbnSina</h1>
            <p className="text-xs text-gray-500">Многопрофильная поликлиника</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">Квитанция № {invoice.invoiceNumber}</p>
            <p className="text-xs text-gray-500">
              {new Date(invoice.createdAt).toLocaleString("ru-RU")}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400">Пациент</p>
            <p className="font-medium text-gray-900">{patient.fullName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">ИИН</p>
            <p className="font-medium text-gray-900">{formatIin(patient.iin)}</p>
          </div>
        </div>

        <table className="mt-5 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-[10px] font-medium uppercase tracking-wider text-gray-400">
              <th className="py-2">Услуга</th>
              <th className="py-2">Кол-во</th>
              <th className="py-2">Цена</th>
              <th className="py-2">Скидка</th>
              <th className="py-2 text-right">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id} className="border-b border-gray-50 last:border-0">
                <td className="py-2 text-gray-900">{item.serviceName}</td>
                <td className="py-2 text-gray-600">{item.quantity}</td>
                <td className="py-2 text-gray-600">{formatTiyn(item.priceSnapshot)}</td>
                <td className="py-2 text-gray-600">
                  {item.discountAmount > 0 ? formatTiyn(item.discountAmount) : "—"}
                </td>
                <td className="py-2 text-right font-medium text-gray-900">
                  {formatTiyn(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 flex justify-end">
          <div className="w-full max-w-[220px] space-y-1 text-sm">
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
            <div className="flex justify-between border-t border-gray-100 pt-1 text-base font-semibold text-gray-900">
              <span>Итого</span>
              <span>{formatTiyn(invoice.total)}</span>
            </div>
          </div>
        </div>

        {payments.length > 0 && (
          <div className="mt-6 border-t border-gray-100 pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Оплаты</p>
            <div className="space-y-1.5 text-sm">
              {payments.map((payment) => (
                <div key={payment.id} className="flex justify-between">
                  <span className={payment.amount < 0 ? "text-red-600" : "text-gray-700"}>
                    {payment.amount < 0 ? "Возврат" : "Оплата"} · {METHOD_LABELS[payment.method]} ·{" "}
                    {payment.createdBy ?? "—"}
                  </span>
                  <span className={payment.amount < 0 ? "text-red-600" : "text-gray-900"}>
                    {formatTiyn(payment.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
