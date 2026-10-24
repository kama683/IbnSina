import { useEmployee } from "@/lib/auth/employee-context";

// Временная заглушка: настоящий дашборд переносится в коммите 4.
export default function DashboardPage() {
  const employee = useEmployee();

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div>
        <p className="text-xs text-gray-400">Главная</p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900">
          Добрый день, {employee.firstNamePatronymic}
        </h1>
      </div>
    </div>
  );
}
