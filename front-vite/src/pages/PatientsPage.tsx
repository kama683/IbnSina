import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import PageHeader from "@/components/layout/PageHeader";
import PatientsContent from "@/components/patients/PatientsContent";
import QueryBoundary from "@/components/ui/QueryBoundary";
import { getPatients } from "@/lib/api/patients";

// Доступ по роли (ANY_STAFF_ROLES) проверяет <RequireRole> в router.tsx.
export default function PatientsPage() {
  // Поиск/участок/страница живут в URL — ссылкой можно поделиться выборкой.
  const [searchParams] = useSearchParams();
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10) || 1;
  const search = searchParams.get("search") ?? "";
  const area = searchParams.get("area") ?? "all";

  const patients = useQuery({
    queryKey: ["patients", "list", { page, limit: 8, search, area }],
    queryFn: () => getPatients({ page, limit: 8, search, area }),
    // При наборе в поиске прошлая выдача остаётся на экране до прихода новой:
    // иначе лоадер снёс бы поле ввода вместе с фокусом.
    placeholderData: keepPreviousData,
  });

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader title="Пациенты" />

      <QueryBoundary queries={[patients]}>
        {patients.data && (
          <PatientsContent
            data={patients.data}
            search={search}
            area={area}
            page={page}
          />
        )}
      </QueryBoundary>
    </div>
  );
}
