import { Bell } from "lucide-react";
import type { Employee } from "@/lib/api/employees";
import { ROLE_LABELS } from "@/lib/roles";
import HeaderSearch from "@/components/layout/HeaderSearch";

type HeaderProps = {
  employee: Employee;
  className?: string;
};

export default function Header({ employee, className = "" }: HeaderProps) {
  return (
    <header
      className={`sticky top-0 z-30 flex h-14 shrink-0 items-center border-b border-gray-200/80 bg-white px-6 ${className}`}
    >
      <div className="grid w-full grid-cols-[1fr_minmax(0,28rem)_1fr] items-center gap-4">
        <div />

        <HeaderSearch />

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Уведомления"
          >
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8f5ee] text-xs font-semibold text-[#1a5c3a]">
              {employee.initials}
            </div>
            <div className="hidden text-left lg:block">
              <p className="text-sm font-medium leading-tight text-gray-900">
                {employee.shortName}
              </p>
              <p className="text-[11px] leading-tight text-gray-500">
                {employee.positionTitle || ROLE_LABELS[employee.role]}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
