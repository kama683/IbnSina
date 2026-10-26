import { Bell } from "lucide-react";
import HeaderSearch from "@/components/layout/HeaderSearch";

type HeaderProps = {
  className?: string;
};

/** Шапка: глобальный поиск слева, уведомления справа. Имя сотрудника — только
 * внизу сайдбара. */
export default function Header({ className = "" }: HeaderProps) {
  return (
    <header
      className={`sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-line bg-white px-4 sm:px-8 ${className}`}
    >
      <div className="min-w-0 flex-1">
        <div className="max-w-[520px]">
          <HeaderSearch />
        </div>
      </div>

      <button
        type="button"
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-field-line bg-white text-ink-2 transition-colors hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        aria-label="Уведомления"
      >
        <Bell className="h-5 w-5" strokeWidth={1.8} aria-hidden />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-notify" />
      </button>
    </header>
  );
}
