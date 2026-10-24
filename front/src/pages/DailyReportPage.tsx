import { useQuery } from "@tanstack/react-query";
import DailyReportContent from "@/components/reports/DailyReportContent";
import PageHeader from "@/components/layout/PageHeader";
import QueryBoundary from "@/components/ui/QueryBoundary";
import { getDailyReport } from "@/lib/api/reports";

/** Сегодняшняя дата в часовом поясе пользователя (YYYY-MM-DD). Раньше здесь
 * был toISOString() — это UTC, и ночью (в Казахстане до 05:00) «сегодня»
 * показывало вчерашний день. */
function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// Доступ по роли (VIEW_DAILY_REPORT_ROLES) проверяет <RequireRole> в router.tsx.
export default function DailyReportPage() {
  const date = todayIso();
  const report = useQuery({
    queryKey: ["reports", "daily", date],
    queryFn: () => getDailyReport(date),
  });

  return (
    <div className="mx-auto max-w-[600px] space-y-5">
      <PageHeader title="Отчёт за день" />

      <QueryBoundary queries={[report]}>
        {report.data && (
          <DailyReportContent initialDate={date} initialReport={report.data} />
        )}
      </QueryBoundary>
    </div>
  );
}
