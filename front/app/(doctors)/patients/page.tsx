import Link from "next/link";
import PatientsContent from "@/components/patients/PatientsContent";
import { getCurrentEmployee } from "@/lib/api/employees";
import { getPatients } from "@/lib/api/patients";
import { ANY_STAFF_ROLES } from "@/lib/roles";

type Props = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    area?: string;
  }>;
};

export default async function PatientsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Number.parseInt(params.page ?? "1", 10) || 1;
  const search = params.search ?? "";
  const area = params.area ?? "all";

  const employee = await getCurrentEmployee();

  if (!ANY_STAFF_ROLES.includes(employee.role)) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-5">
        <div>
          <p className="text-xs text-gray-400">
            <Link href="/" className="hover:text-gray-600">
              Главная
            </Link>
            {" / "}
            <span className="text-gray-600">Пациенты</span>
          </p>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900">
            Пациенты
          </h1>
        </div>
        <div className="rounded-xl border border-gray-200/80 bg-white p-5 text-sm text-gray-500 shadow-sm">
          Список пациентов недоступен для вашей роли.
        </div>
      </div>
    );
  }

  const data = await getPatients({ page, limit: 8, search, area });

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div>
        <p className="text-xs text-gray-400">
          <Link href="/" className="hover:text-gray-600">
            Главная
          </Link>
          {" / "}
          <span className="text-gray-600">Пациенты</span>
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900">
          Пациенты
        </h1>
      </div>

      <PatientsContent
        data={data}
        search={search}
        area={area}
        page={page}
      />
    </div>
  );
}
