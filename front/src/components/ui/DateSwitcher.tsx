import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, isoToRu } from "@/lib/dates";

type Props = {
  /** YYYY-MM-DD */
  date: string;
  onChange: (date: string) => void;
};

const ARROW =
  "flex h-10 w-10 items-center justify-center text-ink-2 transition-colors hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand";

/** Блок выбора даты «‹ 26.10.2026 ›»: стрелки на день назад/вперёд, по клику на
 * дату открывается календарь. */
export default function DateSwitcher({ date, onChange }: Props) {
  return (
    <div className="flex h-10 items-center overflow-hidden rounded-[10px] border border-field-line bg-white">
      <button type="button" aria-label="Предыдущий день" onClick={() => onChange(addDays(date, -1))} className={ARROW}>
        <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />
      </button>
      <label className="relative flex h-full min-w-[120px] cursor-pointer items-center justify-center px-2 text-sm font-semibold text-ink">
        {isoToRu(date)}
        <input
          type="date"
          value={date}
          aria-label="Дата приёмов"
          onChange={(event) => event.target.value && onChange(event.target.value)}
          onClick={(event) => event.currentTarget.showPicker?.()}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <button type="button" aria-label="Следующий день" onClick={() => onChange(addDays(date, 1))} className={ARROW}>
        <ChevronRight className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />
      </button>
    </div>
  );
}
