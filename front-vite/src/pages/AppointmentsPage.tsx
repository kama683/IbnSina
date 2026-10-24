import AppointmentsContent from "@/components/appointments/AppointmentsContent";
import PageHeader from "@/components/layout/PageHeader";
import { useEmployee } from "@/lib/auth/employee-context";

// Доступ по роли (VIEW_SCHEDULE_ROLES) проверяет <RequireRole> в router.tsx.
export default function AppointmentsPage() {
  const employee = useEmployee();

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader title="Приёмы" />

      <AppointmentsContent
        currentEmployeeId={employee.id}
        currentEmployeeRole={employee.role}
        doctorShortName={employee.shortName}
      />
    </div>
  );
}
