import DoctorDashboard from "@/components/dashboard/doctor/DoctorDashboard";
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
        <div className="mx-auto max-w-[1400px] space-y-5">
          <div>
            <p className="text-xs text-gray-400">Главная</p>
            <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900">
              Добрый день, {employee.firstNamePatronymic}
            </h1>
          </div>
          {/* Этап 0: для accountant/admin рабочих виджетов ещё нет — появятся
              на следующих этапах (финансы/учёт, соответственно). */}
          <div className="rounded-xl border border-gray-200/80 bg-white p-5 text-sm text-gray-500 shadow-sm">
            Рабочее пространство для вашей роли появится на следующих этапах.
          </div>
        </div>
      );
  }
}
