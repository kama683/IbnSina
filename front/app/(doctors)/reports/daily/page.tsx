import Link from "next/link";
import DailyReportContent from "@/components/reports/DailyReportContent";
import { getCurrentEmployee } from "@/lib/api/employees";
import { getDailyReport } from "@/lib/api/reports";
import { VIEW_DAILY_REPORT_ROLES } from "@/lib/roles";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function DailyReportPage() {
  const employee = await getCurrentEmployee();

  if (!VIEW_DAILY_REPORT_ROLES.includes(employee.role)) {
    return (
      <div className="mx-auto max-w-[600px] space-y-5">
        <div>
          <p className="text-xs text-gray-400">
            <Link href="/" className="hover:text-gray-600">
              Главная
            </Link>
            {" / "}
            <span className="text-gray-600">Отчёт за день</span>
          </p>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900">
            Отчёт за день
          </h1>
        </div>
        <div className="rounded-xl border border-gray-200/80 bg-white p-5 text-sm text-gray-500 shadow-sm">
          Отчёт недоступен для вашей роли.
        </div>
      </div>
    );
  }

  const date = todayIso();
  const report = await getDailyReport(date);

  return (
    <div className="mx-auto max-w-[600px] space-y-5">
      <div>
        <p className="text-xs text-gray-400">
          <Link href="/" className="hover:text-gray-600">
            Главная
          </Link>
          {" / "}
          <span className="text-gray-600">Отчёт за день</span>
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900">
          Отчёт за день
        </h1>
      </div>

      <DailyReportContent initialDate={date} initialReport={report} />
    </div>
  );
}
