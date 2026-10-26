import AppointmentsContent from "@/components/appointments/AppointmentsContent";
import { useEmployee } from "@/lib/auth/employee-context";

// Доступ по роли (VIEW_SCHEDULE_ROLES) проверяет <RequireRole> в router.tsx.
export default function AppointmentsPage() {
  const employee = useEmployee();

  return (
    <AppointmentsContent
      currentEmployeeId={employee.id}
      currentEmployeeRole={employee.role}
    />
  );
}
