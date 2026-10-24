import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/layout/PageHeader";
import QueueContent from "@/components/queue/QueueContent";
import QueryBoundary from "@/components/ui/QueryBoundary";
import { getQueueAppointments } from "@/lib/api/appointments";
import { useEmployee } from "@/lib/auth/employee-context";

// Доступ по роли (VIEW_SCHEDULE_ROLES) проверяет <RequireRole> в router.tsx.
export default function QueuePage() {
  const employee = useEmployee();
  const queue = useQuery({
    queryKey: ["appointments", "queue"],
    queryFn: getQueueAppointments,
  });

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader title="Живая очередь" />

      <QueryBoundary queries={[queue]}>
        <QueueContent
          appointments={queue.data ?? []}
          currentEmployeeId={employee.id}
          currentEmployeeRole={employee.role}
        />
      </QueryBoundary>
    </div>
  );
}
