import { useQuery } from "@tanstack/react-query";
import RefundsQueueContent from "@/components/refunds/RefundsQueueContent";
import QueryBoundary from "@/components/ui/QueryBoundary";
import { getRefundRequests } from "@/lib/api/refund-requests";
import { useEmployee } from "@/lib/auth/employee-context";

/** Вкладка «Возвраты»: очередь заявок на возврат. Доступ по роли
 * (DECIDE_REFUND_ROLES) проверяет <RequireRole> в router.tsx. */
export default function RefundsTab() {
  const employee = useEmployee();
  const requests = useQuery({
    queryKey: ["refund-requests", "list"],
    queryFn: () => getRefundRequests(),
  });

  return (
    <QueryBoundary queries={[requests]}>
      {requests.data && (
        <RefundsQueueContent initialRequests={requests.data} currentEmployeeRole={employee.role} />
      )}
    </QueryBoundary>
  );
}
