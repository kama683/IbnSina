import { useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PatientCreateModal from "@/components/patients/PatientCreateModal";
import PatientsFilters from "@/components/patients/PatientsFilters";
import PatientsTable from "@/components/patients/PatientsTable";
import PageHeader from "@/components/layout/PageHeader";
import { buttonClass } from "@/components/ui/buttonStyles";
import { useEmployee } from "@/lib/auth/employee-context";
import type { PatientsFilter, PatientsPage } from "@/lib/api/patients";
import { HAS_DOCTOR_PROFILE_ROLES } from "@/lib/roles";
import { useRefresh } from "@/lib/use-refresh";

type Props = {
  /** undefined — первая загрузка. */
  data: PatientsPage | undefined;
  /** Всего пациентов в базе (для подписи под заголовком). */
  baseTotal: number | undefined;
  search: string;
  filter: PatientsFilter;
  page: number;
  pageSize: number;
};

function buildPatientsUrl(next: { page?: number; search?: string; filter?: PatientsFilter }) {
  const params = new URLSearchParams();
  if ((next.page ?? 1) > 1) params.set("page", String(next.page));
  if (next.search) params.set("search", next.search);
  if (next.filter && next.filter !== "all") params.set("filter", next.filter);
  const query = params.toString();
  return query ? `/patients?${query}` : "/patients";
}

/** «пациент / пациента / пациентов». */
function patientsWord(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;
  if (last === 1 && lastTwo !== 11) return "пациент";
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return "пациента";
  return "пациентов";
}

export default function PatientsContent({ data, baseTotal, search, filter, page, pageSize }: Props) {
  const navigateTo = useNavigate();
  const refresh = useRefresh();
  const employee = useEmployee();
  const [localSearch, setLocalSearch] = useState(search);
  const [createOpen, setCreateOpen] = useState(false);

  function navigate(next: { page?: number; search?: string; filter?: PatientsFilter }) {
    navigateTo(
      buildPatientsUrl({
        page: next.page ?? page,
        search: next.search ?? search,
        filter: next.filter ?? filter,
      }),
      // Набор текста в поиске не должен засорять историю браузера.
      { replace: next.search !== undefined },
    );
  }

  return (
    <div className="mx-auto max-w-[1240px] space-y-6">
      <PageHeader
        title="Пациенты"
        subtitle={baseTotal !== undefined ? `${baseTotal} ${patientsWord(baseTotal)} в базе` : undefined}
        actions={
          <button type="button" onClick={() => setCreateOpen(true)} className={buttonClass("primary", "md")}>
            <Plus className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />
            Добавить пациента
          </button>
        }
      />

      <PatientsFilters
        search={localSearch}
        onSearchChange={(value) => {
          setLocalSearch(value);
          navigate({ search: value, page: 1 });
        }}
        filter={filter}
        onFilterChange={(next) => navigate({ filter: next, page: 1 })}
        // «Мои пациенты» есть только у тех, кто сам принимает
        showMine={HAS_DOCTOR_PROFILE_ROLES.includes(employee.role)}
      />

      <PatientsTable
        patients={data?.items}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={(nextPage) => navigate({ page: nextPage })}
      />

      <PatientCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          void refresh();
        }}
      />
    </div>
  );
}
