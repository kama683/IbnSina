import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRefresh } from "@/lib/use-refresh";
import PatientsTable from "@/components/patients/PatientsTable";
import PatientsToolbar from "@/components/patients/PatientsToolbar";
import type { PatientsPage } from "@/lib/api/patients";

const PAGE_SIZE = 8;

type Props = {
  data: PatientsPage;
  search: string;
  area: string;
  page: number;
};

function buildPatientsUrl(next: {
  page?: number;
  search?: string;
  area?: string;
}) {
  const params = new URLSearchParams();
  const page = next.page ?? 1;
  const search = next.search ?? "";
  const area = next.area ?? "all";

  if (page > 1) params.set("page", String(page));
  if (search) params.set("search", search);
  if (area !== "all") params.set("area", area);

  const query = params.toString();
  return query ? `/patients?${query}` : "/patients";
}

export default function PatientsContent({
  data,
  search,
  area,
  page,
}: Props) {
  const navigateTo = useNavigate();
  const refresh = useRefresh();
  const [localSearch, setLocalSearch] = useState(search);

  function navigate(next: { page?: number; search?: string; area?: string }) {
    navigateTo(
      buildPatientsUrl({
        page: next.page ?? page,
        search: next.search ?? search,
        area: next.area ?? area,
      }),
      // Набор текста в поиске не должен засорять историю браузера.
      { replace: next.search !== undefined },
    );
  }

  function handleSearchChange(value: string) {
    setLocalSearch(value);
    navigate({ search: value, page: 1 });
  }

  function handleAreaChange(value: string) {
    navigate({ area: value, page: 1 });
  }

  return (
    <>
      <PatientsToolbar
        search={localSearch}
        onSearchChange={handleSearchChange}
        area={area}
        onAreaChange={handleAreaChange}
        areas={data.areas}
        defaultArea={data.areas[0] ?? "Участок №3"}
        onPatientCreated={() => void refresh()}
      />

      <PatientsTable
        patients={data.items}
        total={data.total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={(nextPage) => navigate({ page: nextPage })}
      />
    </>
  );
}
