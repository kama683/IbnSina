import Link from "next/link";
import CashRegisterContent from "@/components/cash/CashRegisterContent";
import { getCurrentShift, getShifts } from "@/lib/api/cash-shifts";
import { getCurrentEmployee } from "@/lib/api/employees";
import { MANAGE_CASH_ROLES } from "@/lib/roles";

export default async function CashRegisterPage() {
  const employee = await getCurrentEmployee();

  if (!MANAGE_CASH_ROLES.includes(employee.role)) {
    return (
      <div className="mx-auto max-w-[700px] space-y-5">
        <div>
          <p className="text-xs text-gray-400">
            <Link href="/" className="hover:text-gray-600">
              Главная
            </Link>
            {" / "}
            <span className="text-gray-600">Касса</span>
          </p>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900">Касса</h1>
        </div>
        <div className="rounded-xl border border-gray-200/80 bg-white p-5 text-sm text-gray-500 shadow-sm">
          Касса недоступна для вашей роли.
        </div>
      </div>
    );
  }

  const [shift, allShifts] = await Promise.all([getCurrentShift(), getShifts()]);
  // Собственная открытая смена уже показана в карточке выше — в истории её дублировать не нужно.
  const shiftHistory = allShifts.filter((row) => row.id !== shift?.id);

  return (
    <div className="mx-auto max-w-[700px] space-y-5">
      <div>
        <p className="text-xs text-gray-400">
          <Link href="/" className="hover:text-gray-600">
            Главная
          </Link>
          {" / "}
          <span className="text-gray-600">Касса</span>
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900">Касса</h1>
      </div>

      <CashRegisterContent initialShift={shift} shiftHistory={shiftHistory} />
    </div>
  );
}
