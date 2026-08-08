import Link from "next/link";
import ServicesContent from "@/components/services/ServicesContent";
import { getCurrentEmployee } from "@/lib/api/employees";
import { getServices } from "@/lib/api/services";
import { VIEW_SERVICES_ROLES } from "@/lib/roles";

export default async function ServicesPage() {
  const employee = await getCurrentEmployee();

  if (!VIEW_SERVICES_ROLES.includes(employee.role)) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-5">
        <div>
          <p className="text-xs text-gray-400">
            <Link href="/" className="hover:text-gray-600">
              Главная
            </Link>
            {" / "}
            <span className="text-gray-600">Услуги</span>
          </p>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900">Услуги</h1>
        </div>
        <div className="rounded-xl border border-gray-200/80 bg-white p-5 text-sm text-gray-500 shadow-sm">
          Прейскурант недоступен для вашей роли.
        </div>
      </div>
    );
  }

  // includeInactive для head_doctor — он же ими и управляет (включает/выключает).
  const services = await getServices(employee.role === "head_doctor");

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div>
        <p className="text-xs text-gray-400">
          <Link href="/" className="hover:text-gray-600">
            Главная
          </Link>
          {" / "}
          <span className="text-gray-600">Услуги</span>
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900">Услуги</h1>
      </div>

      <ServicesContent initialServices={services} currentEmployeeRole={employee.role} />
    </div>
  );
}
