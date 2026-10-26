import { formatTiyn } from "@/lib/currency";
import { useCashOverview } from "@/components/cash/useCashOverview";

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[14px] border border-line bg-white px-5 py-4">
      <p className="text-[13px] text-ink-3">{label}</p>
      <p className="mt-1 text-2xl font-bold leading-8 text-ink">{value}</p>
      <p className="mt-0.5 min-h-4 truncate text-xs text-ink-3">{hint}</p>
    </div>
  );
}

const DASH = "—";

/** Ряд из четырёх карточек вкладки «Смена». Дневной отчёт по клинике доступен
 * только главврачу, поэтому у регистратора вместо «Клиника сегодня» и
 * «Возвраты сегодня» — те же показатели по его смене. */
export default function ShiftKpis() {
  const { isHead, pending, clinicToday, shiftReport, hasShift, received } = useCashOverview();
  const waiting = pending.data ? `ждут решения: ${pending.data.length}` : undefined;

  return (
    <section aria-label="Сводка кассы" className="grid grid-cols-2 gap-5 lg:grid-cols-4">
      <Kpi
        label="Принято за смену"
        value={received !== null ? formatTiyn(received) : DASH}
        hint={shiftReport ? `платежей: ${shiftReport.paymentsCount}` : hasShift ? "считаем…" : "смена не открыта"}
      />
      <Kpi
        label="Наличных в кассе"
        value={shiftReport ? formatTiyn(shiftReport.expectedCash) : DASH}
        hint={shiftReport ? `стартовый остаток ${formatTiyn(shiftReport.shift.openingBalance)}` : undefined}
      />
      {isHead ? (
        <>
          <Kpi
            label="Клиника сегодня"
            value={clinicToday.data ? formatTiyn(clinicToday.data.total) : DASH}
            hint={clinicToday.data ? `платежей: ${clinicToday.data.paymentsCount}` : undefined}
          />
          <Kpi
            label="Возвраты сегодня"
            value={clinicToday.data ? formatTiyn(clinicToday.data.refundsTotal) : DASH}
            hint={waiting}
          />
        </>
      ) : (
        <>
          <Kpi
            label="Платежей за смену"
            value={shiftReport ? String(shiftReport.paymentsCount) : DASH}
            hint={hasShift ? undefined : "смена не открыта"}
          />
          <Kpi
            label="Возвраты за смену"
            value={shiftReport ? formatTiyn(shiftReport.refundsTotal) : DASH}
            hint={waiting}
          />
        </>
      )}
    </section>
  );
}
