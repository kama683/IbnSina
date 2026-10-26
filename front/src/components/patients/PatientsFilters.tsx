import { Search } from "lucide-react";
import PillTabs from "@/components/ui/PillTabs";
import type { PatientsFilter } from "@/lib/api/patients";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  filter: PatientsFilter;
  onFilterChange: (filter: PatientsFilter) => void;
  showMine: boolean;
};

/** Поиск по ФИО или ИИН и вкладки-фильтры списка пациентов. */
export default function PatientsFilters({ search, onSearchChange, filter, onFilterChange, showMine }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="relative w-full max-w-[440px]">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-3"
          strokeWidth={1.8}
          aria-hidden
        />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Поиск по ФИО или ИИН"
          aria-label="Поиск по ФИО или ИИН"
          className="h-[42px] w-full rounded-[10px] border border-field-line bg-white pl-10 pr-4 text-sm text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        />
      </div>

      <PillTabs
        ariaLabel="Фильтр пациентов"
        value={filter}
        onChange={onFilterChange}
        tabs={[
          { value: "all", label: "Все" },
          ...(showMine ? [{ value: "mine" as const, label: "Мои пациенты" }] : []),
          { value: "dispensary", label: "Диспансерные" },
          { value: "new", label: "Новые" },
        ]}
      />
    </div>
  );
}
