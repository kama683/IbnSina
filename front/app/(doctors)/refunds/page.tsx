import Link from "next/link";
import RefundsQueueContent from "@/components/refunds/RefundsQueueContent";
import { getCurrentEmployee } from "@/lib/api/employees";
import { getRefundRequests } from "@/lib/api/refund-requests";
import { MANAGE_CASH_ROLES } from "@/lib/roles";

export default async function RefundsPage() {
  const employee = await getCurrentEmployee();

  if (!MANAGE_CASH_ROLES.includes(employee.role)) {
    return (
      <div className="mx-auto max-w-[1000px] space-y-5">
        <div>
          <p className="text-xs text-gray-400">
            <Link href="/" className="hover:text-gray-600">
              Главная
            </Link>
            {" / "}
            <span className="text-gray-600">Возвраты</span>
          </p>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900">Возвраты</h1>
        </div>
        <div className="rounded-xl border border-gray-200/80 bg-white p-5 text-sm text-gray-500 shadow-sm">
          Возвраты недоступны для вашей роли.
        </div>
      </div>
    );
  }

  const requests = await getRefundRequests();

  return (
    <div className="mx-auto max-w-[1000px] space-y-5">
      <div>
        <p className="text-xs text-gray-400">
          <Link href="/" className="hover:text-gray-600">
            Главная
          </Link>
          {" / "}
          <span className="text-gray-600">Возвраты</span>
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900">Возвраты</h1>
      </div>

      <RefundsQueueContent initialRequests={requests} currentEmployeeRole={employee.role} />
    </div>
  );
}
