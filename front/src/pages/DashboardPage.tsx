import DoctorDashboard from "@/components/dashboard/doctor/DoctorDashboard";
import PageHeader from "@/components/layout/PageHeader";
import ReceptionHome from "@/components/dashboard/reception/ReceptionHome";
import { useEmployee } from "@/lib/auth/employee-context";

/** Главная: экран зависит от роли из GET /api/employees/me. Регистратору —
 * «Стойка», врачу/медсестре/главврачу — врачебный дашборд, остальным —
 * заглушка (рабочих виджетов для них ещё нет). */
export default function DashboardPage() {
  const employee = useEmployee();

  switch (employee.role) {
    case "reception":
      return <ReceptionHome />;
    case "doctor":
    case "head_doctor":
    case "nurse":
      return <DoctorDashboard />;
    default:
      return (
        <div className="mx-auto max-w-[1240px] space-y-6">
          <PageHeader title={`Добрый день, ${employee.firstNamePatronymic}`} />
          {/* Этап 0: для accountant/admin рабочих виджетов ещё нет — появятся
              на следующих этапах (финансы/учёт, соответственно). */}
          <div className="rounded-xl border border-gray-200/80 bg-white p-5 text-sm text-gray-500 shadow-sm">
            Рабочее пространство для вашей роли появится на следующих этапах.
          </div>
        </div>
      );
  }
}
