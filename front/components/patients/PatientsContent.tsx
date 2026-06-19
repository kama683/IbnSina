"use client";

import { useMemo, useState } from "react";
import type { Patient } from "@/lib/mock-data";
import PatientsTable from "@/components/patients/PatientsTable";
import PatientsToolbar from "@/components/patients/PatientsToolbar";

const PAGE_SIZE = 8;

type Props = {
  patients: Patient[];
};

export default function PatientsContent({ patients }: Props) {
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("all");
  const [page, setPage] = useState(1);

  const areas = useMemo(
    () => [...new Set(patients.map((p) => p.area))].sort(),
    [patients],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return patients.filter((patient) => {
      const matchesArea = area === "all" || patient.area === area;
      const matchesSearch =
        query === "" ||
        patient.fullName.toLowerCase().includes(query) ||
        patient.iin.includes(query.replace(/\s/g, ""));
      return matchesArea && matchesSearch;
    });
  }, [patients, search, area]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleAreaChange(value: string) {
    setArea(value);
    setPage(1);
  }

  return (
    <>
      <PatientsToolbar
        search={search}
        onSearchChange={handleSearchChange}
        area={area}
        onAreaChange={handleAreaChange}
        areas={areas}
      />

      <PatientsTable
        patients={paginated}
        total={filtered.length}
        page={currentPage}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </>
  );
}
