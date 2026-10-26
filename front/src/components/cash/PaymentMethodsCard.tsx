import { formatTiyn } from "@/lib/currency";
import { useCashOverview } from "@/components/cash/useCashOverview";

const METHODS = [
  { key: "cashTotal", label: "Наличные", bar: "bg-brand" },
  { key: "cardTotal", label: "Карта", bar: "bg-info" },
  { key: "transferTotal", label: "Перевод", bar: "bg-warn-ink" },
] as const;

/** Карточка «Способы оплаты за смену»: доли по наличным, карте и переводу. */
export default function PaymentMethodsCard() {
  const { shiftReport, hasShift, received } = useCashOverview();
  const hasPayments = shiftReport !== undefined && received !== null && received > 0;

  return (
    <section className="rounded-[14px] border border-line bg-white p-6">
      <h2 className="text-base font-semibold text-ink">Способы оплаты за смену</h2>

      {hasPayments && (
        <div
          className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-chip-gray"
          role="img"
          aria-label="Доли способов оплаты"
        >
          {METHODS.map((method) => {
            const amount = shiftReport[method.key];
            return amount > 0 ? (
              <div key={method.key} className={method.bar} style={{ width: `${(amount / received) * 100}%` }} />
            ) : null;
          })}
        </div>
      )}

      <ul className={`space-y-2.5 text-sm ${hasPayments ? "mt-4" : "mt-5"}`}>
        {METHODS.map((method) => (
          <li key={method.key} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-ink-2">
              <span aria-hidden className={`h-2 w-2 rounded-full ${method.bar}`} />
              {method.label}
            </span>
            <span className="font-semibold text-ink">
              {shiftReport ? formatTiyn(shiftReport[method.key]) : "—"}
            </span>
          </li>
        ))}
      </ul>

      {!hasPayments && (
        <p className="mt-4 text-[13px] text-ink-3">
          {hasShift ? "За смену платежей пока нет" : "Разбивка обновится после открытия смены"}
        </p>
      )}
    </section>
  );
}
