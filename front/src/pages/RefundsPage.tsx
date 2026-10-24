import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/layout/PageHeader";
import RefundsQueueContent from "@/components/refunds/RefundsQueueContent";
import QueryBoundary from "@/components/ui/QueryBoundary";
import { getRefundRequests } from "@/lib/api/refund-requests";
import { useEmployee } from "@/lib/auth/employee-context";

// Доступ по роли (MANAGE_CASH_ROLES) проверяет <RequireRole> в router.tsx.
export default function RefundsPage() {
  const employee = useEmployee();
  const requests = useQuery({
    queryKey: ["refund-requests", "list"],
    queryFn: () => getRefundRequests(),
  });

  return (
    <div className="mx-auto max-w-[1000px] space-y-5">
      <PageHeader title="Возвраты" />

      <QueryBoundary queries={[requests]}>
        {requests.data && (
          <RefundsQueueContent
            initialRequests={requests.data}
            currentEmployeeRole={employee.role}
          />
        )}
      </QueryBoundary>
    </div>
  );
}
