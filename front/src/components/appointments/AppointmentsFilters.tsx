import DateSwitcher from "@/components/ui/DateSwitcher";
import PillTabs from "@/components/ui/PillTabs";
import { todayIso } from "@/lib/dates";
import type { AppointmentTab, TabCounts } from "@/lib/queue";

type Props = {
  date: string;
  onDateChange: (date: string) => void;
  tab: AppointmentTab;
  onTabChange: (tab: AppointmentTab) => void;
  counts: TabCounts;
};

/** Панель фильтров списка: дата, «Сегодня», вкладки со счётчиками. */
export default function AppointmentsFilters({
  date,
  onDateChange,
  tab,
  onTabChange,
  counts,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <DateSwitcher date={date} onChange={onDateChange} />

        <button
          type="button"
          onClick={() => onDateChange(todayIso())}
          className="h-10 rounded-[10px] border border-field-line bg-white px-4 text-sm font-semibold text-ink transition-colors hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Сегодня
        </button>
      </div>

      <PillTabs
        ariaLabel="Фильтр приёмов по статусу"
        value={tab}
        onChange={onTabChange}
        tabs={[
          { value: "all", label: "Все", count: counts.all },
          { value: "next", label: "Далее", count: counts.next },
          { value: "done", label: "Проведены", count: counts.done },
          { value: "cancelled", label: "Отменены", count: counts.cancelled },
        ]}
      />
    </div>
  );
}
