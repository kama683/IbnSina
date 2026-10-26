import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import PatientsContent from "@/components/patients/PatientsContent";
import ErrorState from "@/components/ui/ErrorState";
import { getPatients, type PatientsFilter } from "@/lib/api/patients";

const FILTERS: PatientsFilter[] = ["all", "mine", "dispensary", "new"];
const PAGE_SIZE = 8;

// Доступ по роли (ANY_STAFF_ROLES) проверяет <RequireRole> в router.tsx.
export default function PatientsPage() {
  // Поиск, вкладка и страница живут в URL — ссылкой можно поделиться выборкой.
  const [searchParams] = useSearchParams();
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10) || 1;
  const search = searchParams.get("search") ?? "";
  const rawFilter = searchParams.get("filter") as PatientsFilter | null;
  const filter = rawFilter && FILTERS.includes(rawFilter) ? rawFilter : "all";

  const patients = useQuery({
    queryKey: ["patients", "list", { page, limit: PAGE_SIZE, search, filter }],
    queryFn: () => getPatients({ page, limit: PAGE_SIZE, search, filter }),
    // При наборе в поиске прошлая выдача остаётся на экране до прихода новой:
    // иначе лоадер снёс бы поле ввода вместе с фокусом.
    placeholderData: keepPreviousData,
  });

  // «N пациентов в базе» — всего в базе, а не в текущей выборке.
  const base = useQuery({
    queryKey: ["patients", "list", { page: 1, limit: 1, search: "", filter: "all" }],
    queryFn: () => getPatients({ page: 1, limit: 1 }),
    select: (data) => data.total,
  });

  if (patients.isError) {
    return (
      <ErrorState
        title="Не удалось загрузить пациентов"
        message={patients.error.message}
        onRetry={() => void patients.refetch()}
      />
    );
  }

  return (
    <PatientsContent
      data={patients.data}
      baseTotal={base.data}
      search={search}
      filter={filter}
      page={page}
      pageSize={PAGE_SIZE}
    />
  );
}
