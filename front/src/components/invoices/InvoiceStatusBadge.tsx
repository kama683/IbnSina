import type { InvoiceStatus } from "@/lib/api/invoices";

const CONFIG: Record<InvoiceStatus, { label: string; className: string }> = {
  draft: { label: "Черновик", className: "bg-gray-100 text-gray-600" },
  unpaid: { label: "Выставлен", className: "bg-sky-50 text-sky-700" },
  partial: { label: "Оплачен частично", className: "bg-amber-50 text-amber-700" },
  paid: { label: "Оплачен", className: "bg-emerald-50 text-emerald-700" },
  refunded: { label: "Возвращён", className: "bg-red-50 text-red-600" },
  cancelled: { label: "Аннулирован", className: "bg-gray-100 text-gray-400" },
};

export default function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const config = CONFIG[status];
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium leading-4 ${config.className}`}
    >
      {config.label}
    </span>
  );
}
