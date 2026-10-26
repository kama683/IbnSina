import { useQuery } from "@tanstack/react-query";
import { getShiftReport } from "@/lib/api/cash-shifts";
import { getRefundRequests } from "@/lib/api/refund-requests";
import { getDailyReport, getReceptionSummary } from "@/lib/api/reports";
import { useEmployee } from "@/lib/auth/employee-context";
import { todayIso } from "@/lib/dates";
import { DECIDE_REFUND_ROLES } from "@/lib/roles";

/** Сводка для шапки кассы: открыта ли смена, сколько счетов не оплачено и
 * сколько заявок на возврат ждут решения (у главврача — все, у регистратора —
 * свои). Ключи запросов общие для всех вкладок, так что React Query шлёт один
 * запрос, а `useRefresh()` после оплаты/решения обновляет счётчики. */
export function useCashSummary() {
  const employee = useEmployee();
  const isHead = DECIDE_REFUND_ROLES.includes(employee.role);

  const summary = useQuery({
    queryKey: ["reports", "reception-summary"],
    queryFn: getReceptionSummary,
    refetchInterval: 30_000,
  });
  const pending = useQuery({
    queryKey: ["refund-requests", isHead ? "pending" : "mine-pending"],
    queryFn: () => getRefundRequests("pending", { mine: !isHead }),
  });

  return { isHead, summary, pending };
}

/** Данные вкладки «Смена»: отчёт открытой смены и (у главврача) выручка
 * клиники за сегодня. Без открытой смены отчёта нет — цифры показываются как «—». */
export function useCashOverview() {
  const { isHead, summary, pending } = useCashSummary();

  const shiftId = summary.data?.shift?.id;
  const report = useQuery({
    queryKey: ["cash-shifts", "report", shiftId],
    queryFn: () => getShiftReport(shiftId!),
    enabled: shiftId !== undefined,
    refetchInterval: 30_000,
  });
  const clinicToday = useQuery({
    queryKey: ["reports", "daily", todayIso()],
    queryFn: () => getDailyReport(todayIso()),
    enabled: isHead,
  });

  const data = report.data;
  return {
    isHead,
    pending,
    clinicToday,
    shiftReport: data,
    hasShift: Boolean(summary.data?.shift),
    received: data ? data.cashTotal + data.cardTotal + data.transferTotal : null,
  };
}
