import { useQuery } from "@tanstack/react-query";
import { getShiftReport } from "@/lib/api/cash-shifts";
import { getRefundRequests } from "@/lib/api/refund-requests";
import { getDailyReport } from "@/lib/api/reports";
import { getReceptionSummary } from "@/lib/api/reports";
import { useEmployee } from "@/lib/auth/employee-context";
import { formatTiyn } from "@/lib/currency";
import { DECIDE_REFUND_ROLES } from "@/lib/roles";

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function Card({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "success" | "warning";
}) {
  const colors = {
    neutral: "bg-white border-gray-200/80",
    success: "bg-emerald-50 border-emerald-100",
    warning: "bg-amber-50 border-amber-100",
  }[tone];
  return (
    <div className={`rounded-xl border px-4 py-3 shadow-sm ${colors}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 text-xl font-medium leading-7 text-gray-900">{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

const METHODS = [
  { key: "cashTotal", label: "Наличные", bar: "bg-[#1a5c3a]" },
  { key: "cardTotal", label: "Карта", bar: "bg-sky-500" },
  { key: "transferTotal", label: "Перевод", bar: "bg-amber-400" },
] as const;

/** Дашборды вкладки «Касса»: что принято за смену, сколько наличных в кассе,
 * сколько счетов ждут оплаты, возвраты и разбивка по способам оплаты. У
 * главврача дополнительно — выручка клиники за сегодня (дневной отчёт доступен
 * только ему). Данные: сводка стойки + отчёт открытой смены; без смены цифры
 * показываются как «—». */
export default function CashDashboard() {
  const employee = useEmployee();
  const isHead = DECIDE_REFUND_ROLES.includes(employee.role);

  const summary = useQuery({
    queryKey: ["reports", "reception-summary"],
    queryFn: getReceptionSummary,
    refetchInterval: 30_000,
  });
  const shiftId = summary.data?.shift?.id;
  const report = useQuery({
    queryKey: ["cash-shifts", "report", shiftId],
    queryFn: () => getShiftReport(shiftId!),
    enabled: shiftId !== undefined,
    refetchInterval: 30_000,
  });
  // Свои заявки на рассмотрении (у главврача — все, ждущие его решения).
  const pending = useQuery({
    queryKey: ["refund-requests", isHead ? "pending" : "mine-pending"],
    queryFn: () => getRefundRequests("pending", { mine: !isHead }),
  });
  const clinicToday = useQuery({
    queryKey: ["reports", "daily", todayIso()],
    queryFn: () => getDailyReport(todayIso()),
    enabled: isHead,
  });

  const data = report.data;
  const hasShift = Boolean(summary.data?.shift);
  const received = data ? data.cashTotal + data.cardTotal + data.transferTotal : null;
  const dash = "—";

  return (
    <section aria-label="Сводка кассы" className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card
          label="Принято за смену"
          value={received !== null ? formatTiyn(received) : dash}
          hint={data ? `платежей: ${data.paymentsCount}` : hasShift ? "считаем…" : "смена не открыта"}
          tone={hasShift ? "success" : "neutral"}
        />
        <Card
          label="Наличных в кассе"
          value={data ? formatTiyn(data.expectedCash) : dash}
          hint={data ? `стартовый остаток ${formatTiyn(data.shift.openingBalance)}` : undefined}
        />
        <Card
          label="Не оплачено"
          value={summary.data ? String(summary.data.invoices.unpaidCount) : dash}
          hint={
            summary.data && summary.data.invoices.awaitingApprovalCount > 0
              ? `скидок ждёт главврача: ${summary.data.invoices.awaitingApprovalCount}`
              : "счета со статусом «Выставлен» и «Оплачен частично»"
          }
          tone={summary.data && summary.data.invoices.awaitingApprovalCount > 0 ? "warning" : "neutral"}
        />
        <Card
          label={isHead ? "Возвраты ждут решения" : "Мои заявки на возврат"}
          value={pending.data ? String(pending.data.length) : dash}
          hint={data && data.refundsTotal > 0 ? `возвращено за смену ${formatTiyn(data.refundsTotal)}` : "на рассмотрении"}
          tone={pending.data && pending.data.length > 0 ? "warning" : "neutral"}
        />
      </div>

      <div className="rounded-xl border border-gray-200/80 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-baseline justify-between">
          <p className="text-xs text-gray-500">Способы оплаты за смену</p>
          {received !== null && received > 0 && (
            <p className="text-xs text-gray-400">{formatTiyn(received)}</p>
          )}
        </div>
        {data && received !== null && received > 0 ? (
          <>
            <div
              className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-gray-100"
              role="img"
              aria-label="Доли способов оплаты"
            >
              {METHODS.map((method) => {
                const amount = data[method.key];
                return amount > 0 ? (
                  <div
                    key={method.key}
                    className={method.bar}
                    style={{ width: `${(amount / received) * 100}%` }}
                  />
                ) : null;
              })}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600">
              {METHODS.map((method) => (
                <li key={method.key} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${method.bar}`} />
                  {method.label}: <span className="font-medium text-gray-900">{formatTiyn(data[method.key])}</span>
                  <span className="text-gray-400">({Math.round((data[method.key] / received) * 100)}%)</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-2 text-[13px] text-gray-400">
            {hasShift ? "За смену платежей пока нет" : "Откройте смену — здесь появится разбивка по способам оплаты"}
          </p>
        )}
      </div>

      {isHead && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card
            label="Клиника сегодня"
            value={clinicToday.data ? formatTiyn(clinicToday.data.total) : dash}
            hint={clinicToday.data ? `платежей: ${clinicToday.data.paymentsCount}` : undefined}
          />
          <Card label="Наличные" value={clinicToday.data ? formatTiyn(clinicToday.data.cashTotal) : dash} />
          <Card
            label="Карта и перевод"
            value={clinicToday.data ? formatTiyn(clinicToday.data.cardTotal + clinicToday.data.transferTotal) : dash}
          />
          <Card
            label="Возвраты сегодня"
            value={clinicToday.data ? formatTiyn(clinicToday.data.refundsTotal) : dash}
            tone={clinicToday.data && clinicToday.data.refundsTotal > 0 ? "warning" : "neutral"}
          />
        </div>
      )}
    </section>
  );
}
