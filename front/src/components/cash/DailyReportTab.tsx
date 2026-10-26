import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useOutletContext } from "react-router-dom";
import type { CashOutletContext } from "@/pages/CashRegisterPage";
import DailyReportContent from "@/components/reports/DailyReportContent";
import QueryBoundary from "@/components/ui/QueryBoundary";
import { getDailyReport } from "@/lib/api/reports";

/** Вкладка «Отчёт за день»: дата берётся из шапки кассы. Доступ по роли
 * (VIEW_DAILY_REPORT_ROLES) проверяет <RequireRole> в router.tsx. */
export default function DailyReportTab() {
  const { date } = useOutletContext<CashOutletContext>();
  const report = useQuery({
    queryKey: ["reports", "daily", date],
    queryFn: () => getDailyReport(date),
    // при смене даты прошлые цифры остаются на экране, пока грузятся новые
    placeholderData: keepPreviousData,
  });

  return (
    <QueryBoundary queries={[report]}>
      {report.data && <DailyReportContent report={report.data} loading={report.isPlaceholderData} />}
    </QueryBoundary>
  );
}
