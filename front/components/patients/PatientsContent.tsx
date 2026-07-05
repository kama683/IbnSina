"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
  const router = useRouter();
  const [localSearch, setLocalSearch] = useState(search);

  function navigate(next: { page?: number; search?: string; area?: string }) {
    router.push(
      buildPatientsUrl({
        page: next.page ?? page,
        search: next.search ?? search,
        area: next.area ?? area,
      }),
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
        onPatientCreated={() => router.refresh()}
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
